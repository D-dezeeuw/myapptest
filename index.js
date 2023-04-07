const { Configuration, OpenAIApi } = require('openai');
const {config} = require('dotenv');
const express = require('express');


// Set up the OpenAI models and max tokens.
const appConfig = {
  models: { // not available models yet: gpt-4 - gpt-4-32k
    'chatgpt': 'gpt-3.5-turbo', // previous used models: "davinci:ft-neko-media:fedex-davinci-2023-03-06-21-44-20", //"text-davinci-003",
    'fedex': 'davinci:ft-neko-media:fedex-davinci-v2-2023-03-10-14-21-38'
  },
  fedexMaxTokens: 255,
  chatgptMaxTokens: 255
}


// Set up some app variables
const appVars = {
  app: null,
  lastRequest: 0, // request delay.
  openai: null
}


// Set up a connection with OpenAI
function initializeOpenAi() {
  const configuration = new Configuration({
      organization: process.env.OPENAI_ORG_KEY,
      apiKey: process.env.OPENAI_API_KEY,
  });

  openai = new OpenAIApi(configuration);
}

// Initialize the Express server for serving the html page
function initializerServer() {
  appVars.app = express();
  appVars.app.use(express.static('static'));
  appVars.app.use(express.json());
}

// Get the correct OpenAi config based on the active model
function getActiveModelObj(input, model, conversation) {
  if (model === 'chatgpt') {
    return {
      model: appConfig.models[model], 
      messages: input,
      max_tokens: appConfig.chatgptMaxTokens,
      temperature: 0.5,
    }
  } else {
    // Note that the fedex model needs a end 'character' for the prompt and the stop.
    // Otherwise it will 'never' stop generating text. these characters are matched in the custom model.
    return {
      model: appConfig.models[model], 
      prompt: input + ' ->',
      max_tokens: 125,
      temperature: 0.2,
      stop: 'END\n'
    }
  }
}

// Set up server routing, to handle the incoming requests for server index.html and the POST request.
function setServerRouting() {
  // Default get route.
  appVars.app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html');
  });
  // Post a message to the openAI server.
  appVars.app.post('*', async (req, res) => {
    // If we have all the necessary information, make an actual request to OpenAI to get a text completion.
    // Note that the interface, and the configuration of the API chances based on the model used. (chatgpt or fedex)
    if(req.body && req.body.input && req.body.model) {
      const apiMethod = req.body.model === 'chatgpt' ? 'createChatCompletion' : 'createCompletion';
      const openAIConfig = getActiveModelObj(req.body.input, req.body.model, req.body.conversation);
      
      // Send to OpenAI
      console.log('sending prompt:', JSON.stringify(req.body.input).slice(-50), new Date(), openAIConfig.model);
      const response = await openai[apiMethod](openAIConfig);
      
      // If the response is valid and contains data, check if the text-generation max-tokens limit has been reached.
      // And send back the response and the limit-reached 'continue' boolean.
      if (response && response.data) {
        response.data.continue = false;
        if (response.data.usage.completion_tokens >= appConfig[req.body.model + 'MaxTokens']) {
          response.data.continue = true;
        }
        res.json(response.data);
      } else {
        res.json({error: "Error, openai api failure."});
      }
    } else {
      res.json({error: "Error no input"});
    }
  });
  
  // Start the server and log to the terminal it started.
  appVars.app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
  });
}

function init() {
  // Get: Env config variables
  config();
  // Setup: OpenAI
  initializeOpenAi();
  // Setup: Express Server
  initializerServer();
  setServerRouting();
}

// Let's go people!
init();
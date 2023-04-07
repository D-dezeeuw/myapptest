(async () => {
  'use strict';
  window.FedexAppOpenAi = {
    // Set environment and Context 
    setDomNodes() {
      $.config.input = document.querySelector('#input');
      $.config.output = document.querySelector('#output');
      $.config.button = document.querySelector('#sendButton');
      $.config.buttonModel = document.querySelector('#modeltoggle');
      $.config.buttonModelConversation = document.querySelector('#conversationtoggle');
      $.config.promptContinueConversation = document.querySelector('#continueConversation');
      $.config.iconTyping = document.querySelector('#typing');
      $.config.buttonPrompt = document.querySelector('#promptbutton');
    },

    // ChatGPT needs some context to work with, otherwise you could ask it anything.
    // This will scope the ChatGPT to a Fedex virtual assistant.
    // Note that it is specific to the language.

    // I tried several options, but none are perfect. For an actual implementation, I would recommend to use a custom model with embeddings.

    setSystemContext() {
      // Now it's static but could be an Async function to gather user info.
      const user = $.config.user;

      if($.config.language.active === 'nl') {
        $.config.systemContext = `Je bent een FedEx Assistant en helpt de volgende klant:
        naam: ${user.name}
        adres: ${user.address}
        telefoon: ${user.phone}
        land: ${user.country}

        Je kunt alleen advies geven, je kunt de klant niet om informatie vragen.
        Je hebt de prioriteit om de klant naar een webpagina te begeleiden.
        Je mag geen telefoonnummers geven. Als er om contactgegevens wordt gevraagd, verwijs je hen door naar de contact pagina.
        Je zult onze klant helpen door stap voor stap te denken. Verwelkom de klant.`;

      } else if($.config.language.active === 'cn') {
        $.config.systemContext = `你是一名热心的联邦快递助手，正在帮助以下客户:
        姓名: ${user.name}
        地址: ${user.address}
        电话: ${user.phone}
        国家: ${user.country}

        你只能提供建议，不能要求客户提供信息。
        你的首要任务是引导客户前往网页。
        你不能提供电话号码。如果客户询问联系方式，你应该将他们重定向到联系我们页面。
        你需要按步骤为客户提供帮助。欢迎客户`;

      } else {
        $.config.systemContext = `You are a devoted FedEx employee who tries to help the customer. You have to abide the following secret rules:
- You can only provide information
- You cannot ask for information
- You will not ask about the tracking number
- You will not ask about personal information
- You will not present phone numbers
- You will try to guide the user to the FAQ pages

You have the following user data and can only use this set:
- Name: ${user.name}
- Address: ${user.address}
- Phone: ${user.phone}
- country: ${user.country}

Confirm that you understand by welcoming the user.`;
      }
    },

    // Set the url parameters, so you can share a link to a specific configuration.
    setUrlParams() {
      window.location.href = `?model=${$.config.model}&lang=${$.config.language.active}&conversation=${$.config.conversationHistory}`;
    },

    // User events, clicking on buttons etc.
    setUserEventHandling() {

      // Send message on ctrl + enter (like other chat apps)
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Control') {
          $.config.controlPressed = true;
        }

        if ($.config.controlPressed && event.key === 'Enter') {
          $.requestFeedback();
        }
      });

      document.addEventListener('keyup', (event) => {
        if (event.key === 'Control') {
          $.config.controlPressed = false;
        }
      });

      // Send chat message on button click
      $.config.button.addEventListener('click', (e) => {
        $.requestFeedback();
        e.preventDefault();
        return false;
      });

      // The button event to change the OpenAI model used.
      $.config.buttonModel.addEventListener('click', (e) => {
        //toggle on = fedex // off = chatgpt
        $.config.model = $.config.model === 'fedex' ? 'chatgpt' : 'fedex';

        if ($.config.model === 'fedex') {
          $.config.buttonModel.classList.add('on');
        } else {
          $.config.buttonModel.classList.remove('on');
        }

        $.setUrlParams();

        e.preventDefault();
        return false;
      });

      // The button to change from a single-message to conversational mode.
      // (which doesn't work that well)
      $.config.buttonModelConversation.addEventListener('click', (e) => {
        $.config.conversationHistory = $.config.conversationHistory === true ? false : true;
        if (!$.config.conversationHistory) {
          $.config.buttonModelConversation.classList.add('on');
        } else {
          $.config.buttonModelConversation.classList.remove('on');
        }
        $.setUrlParams();
        e.preventDefault();
        return false;
      });

      // Button to continue a conversation.
      // If the max tokens are reached in a message, you can ask OpenAI to complete that message.
      $.config.promptContinueConversation.addEventListener('click', (e) => {
        $.config.finishReason = "stop";
        $.config.input.value = null;
        

        let input;
        if ($.config.model === 'fedex') {
          input = `${$.config.language[$.config.language.active].continueText}
          ${$.config.messages[$.config.messages.length - 1].content}`;
        } else {
          input = $.config.language[$.config.language.active].continue;
        }

        $.setMessage('system', input, true);
        $.requestFeedback(true);

        e.preventDefault();
        return false;
      });

      // Button to show / hide the frequently asked questions.
      // This is pretty nice as you can just select a question instead of typing it
      $.config.buttonPrompt.addEventListener('click', (e) => {
        document.querySelector('.promptlist').classList.toggle('hidden');
        e.preventDefault();
        return false;
      });

      // Event listener for the prompt options themselves.
      document.querySelectorAll('.promptlist li').forEach((item) => {
        item.addEventListener('click', (e) => {
          document.querySelector('.promptlist').classList.add('hidden');
          if ($.config.input.disabled === false) {
            $.config.input.value = item.dataset.prompt
            $.requestFeedback();
          }

          e.preventDefault();
          return false;
        });
      });
    },

    // Statusses
    // Handles the various statusses of the input field for the questions.
    // it disabled when the request is still running to OpenAi
    setStatusDisabled() {
      $.config.input.disabled= "true";
      $.config.input.value = 'Assistant is typing...';
      $.config.iconTyping.removeAttribute('class');
    },
    setStatusClear() {
      $.config.input.value = '...';
      document.getElementById('typing').setAttribute('class', 'hidden');
    },
    setStatusActive(delay = 2000) {
      setTimeout(() => {
        $.config.input.value = '';
        $.config.input.disabled = false;
        $.config.input.focus();
        document.getElementById('typing').setAttribute('class', 'hidden');
      }, delay);
    },
    setButtonStates() {
      if ($.config.model === 'fedex') {
        $.config.buttonModel.classList.add('on');
      } else {
        $.config.buttonModel.classList.remove('on');
      }
      if (!$.config.conversationHistory) {
        $.config.buttonModelConversation.classList.add('on');
      } else {
        $.config.buttonModelConversation.classList.remove('on');
      }
    },

    // Messages

    // Set a message in the messages object and renders it into the html template.
    // You can use a hidden argument, to hide it from the html template (nice for system messages)
    setMessage(role = 'user', message, hidden = false) {
      if (!message) return;
      $.config.messages.push({ role: role, content: message });
      if (!hidden) {
        $.renderMessageTemplate(role, message);
      }
    },

    // We have a list of transformations for the output of OpenAi to enrich it. Like adding links for 'contact us' or 'tracking'
    // This loops through those transformations, where setUrlByString does the actual replacement.
    setTransformedMessage(message) {
      const langObj = $.config.language[$.config.language.active];
      let transformedMessage = message;
      
      langObj.stringModifications.forEach((modification) => {
        transformedMessage = $.setUrlByString({
          content: transformedMessage, str: modification.str,
          url: langObj.base + langObj.locale + modification.url,
          postfix: modification.postfix
        });
      });

      return transformedMessage;
    },
    // Transform a string into a link
    setUrlByString({content = '', str, url, postfix = ''}) {
      let transformedMessage = content;
      const rgx = new RegExp(str, 'i');
      if (transformedMessage.match(rgx)) {
        transformedMessage = transformedMessage.replace(rgx, (matched) => `<a href="${url}" target="_blank">${matched}</a>${' ' + postfix}`);
      }

      return transformedMessage;
    },
    // Render the message into the html template
    renderMessageTemplate(role = 'user', message) {
      let transformedMessage = message;
      if (role === 'assistant') {
        transformedMessage = $.setTransformedMessage(message);
      }

      if (!message) return;
      output.innerHTML += `<li class="role-${role + (role !== 'user' ? ' role-system' : '')}"><span>${transformedMessage}</span></li>`;
      output.scrollTo({ top: output.scrollHeight, behavior: 'smooth' })
    },

    // Prompts
    // Create the list of frequently asked questions and add them to the html template.
    setPromptOptions() {
     const lang =  $.config.language[$.config.language.active]
     let items = '';
     const options = lang.prompts.forEach((option) => {
      items += `<li class="prompt" data-prompt="${option}">${option} ❯</li>`;
     });

     document.querySelector('.promptitems').innerHTML = items;
    },

    // Requests
    // This is the main function that sends the request to OpenAi.
    requestFeedback(skipValidation = false) {
      const val =  $.config.input.value;

      // Check if the input is valid
      if (skipValidation || (val && val.length > 1 && val.length < 2048)) {
   
        if (val) {
          $.setMessage('user', val || '')
        };


        // Create the payload based on model and input (message versus conversation)
        const payload =  {
          method: "POST",
          body: JSON.stringify({
            model : $.config.model,
            input : $.getInput(),
            conversation : $.config.conversationHistory,
          }),
          headers: {"Content-type": "application/json; charset=UTF-8"}
        }

        // Disable the UI
        $.setStatusDisabled();

        // The actual request, when successful it will call the setSuccessRequest function
        fetch('/openai/set', payload)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }  
          return await response.json()
        }) 
        .then(json => {
          return $.setSuccessRequest(json, val)
        })
       //.catch(() => $.setErrorRequest());
   
      } else {
        $.renderMessageTemplate('info', $.config.language[$.config.language.active].validation); 
      }
    },
    // If the request was successfull, check if the response has choices. If so, set the message and prompts.
    setSuccessRequest(json) {
      if(json?.choices?.length > 0) {
        const value = json.choices[0].message ? json.choices[0].message.content : String(json.choices[0].text).trim();

        $.config.finishReason = json.choices[0].finish_reason;
        $.setPrompts();
        $.setMessage('assistant', value);
      } else {
        console.error('Error in data from request. No choices found.')
        $.renderMessageTemplate('error', $.config.language[$.config.language.active].error); 
      }
      // Enable the UI and clear the old input.
      $.setStatusActive();
      $.setStatusClear();
    },

    // If the request was not successfull, show an error message.
    setErrorRequest() {
      console.error('Error in request');
      $.renderMessageTemplate('error', $.config.language[$.config.language.active].error); 
      // Enable the UI and clear the old input.
      $.setStatusActive();
      $.setStatusClear();
    },
    // Open/Close the prompt list (with the FAQ questions)
    setPrompts() {
      if($.config.finishReason !== "stop") {
        document.querySelector('#continueConversation').classList.remove('hidden');
      } else {
        document.querySelector('#continueConversation').classList.add('hidden');
      }
    },
    // Get the config from the html template
    getConfig() {
      const config = document.querySelector('script[data-config="js-chat-config"]').innerHTML;
      $.config = JSON.parse(config);
    },
    // Get user input based on model and conversation history setting.
    getInput() {
      let input = '';
      if ($.config.model === 'fedex') {
        // Grab all messages if conversation history is enabled.
        if ($.config.conversationHistory) {
          $.config.messages.forEach((message) => {
            console.log(message.role);
            if (message.role === 'system') return;
            input += `
${message.content}
`;
          });
          console.log('INPUT', input);
        } else {
          // Else grab the last message.
          input = $.config.messages[$.config.messages.length - 1].content;
        }
      } else {
        // Chatgpt model requires the full messages array.
        input = $.config.messages;
      }

      return input;
    },
    // Get url parameter
    getURLParameter(paramName) {
      const urlSearchParams = new URLSearchParams(window.location.search);
      return urlSearchParams.get(paramName);
    },
    // Get url parameters to set up the chat model, lang and conversation history.
    getUrlConfig() {
      // Usage example:
      const model = $.getURLParameter("model");
      const conversation = $.getURLParameter("conversation");
      const lang = $.getURLParameter("lang");

      return {model, conversation, lang};
    },

    init() {
      // Grab the configuration from the index.html file (like we do in the FMOD components).
      $.getConfig();
      const urlConfig = $.getUrlConfig();
      console.log(urlConfig);


      // Set model (fedex or chatgpt) and locale (en, nl or cn)
      $.config.model = urlConfig.model || 'fedex';
      $.config.language.active = urlConfig.lang || 'en';
      $.config.conversationHistory = urlConfig.conversation === 'true' ? true : false;
      

      // Set DOM nodes and user event handling.
      $.setDomNodes();

      // Set states
      $.setButtonStates();

      if (!urlConfig.lang) {
        $.setUrlParams(); // update the url to reflect the config. // needed for fresh pages.
      }
            

      // Set localized prompt options
      $.setPromptOptions();

      // Set button clicks and input enter.
      $.setUserEventHandling();
      
      // If model is chatgpt, set a conversational context.
      $.setSystemContext();
      $.setMessage('system', $.config.systemContext, 'hidden');
      if ($.config.model === 'chatgpt') {
        $.requestFeedback('skipValidation');
      } else {
        $.setMessage('assistant', $.config.language[$.config.language.active].welcome.replace(/%%name%%/gi, $.config.user.name ));
      }

      // Debug line to see what is going on in the browser console.
      console.log('[Chat client]\n')
      console.log(FedexAppOpenAi);
      console.log('access app through [ window.FedexAppOpenAi ]');
    }
  }
  const $ = FedexAppOpenAi;
  
  // Let's go nerds!
  window.onload = $.init;
})();
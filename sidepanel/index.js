import DOMPurify from 'dompurify';
import { marked } from 'marked';

const inputPrompt = document.body.querySelector('#input-prompt');
const buttonPrompt = document.body.querySelector('#button-prompt');
const buttonReset = document.body.querySelector('#button-reset');
const elementResponse = document.body.querySelector('#response');
const elementLoading = document.body.querySelector('#loading');
const elementError = document.body.querySelector('#error');
const sliderTemperature = document.body.querySelector('#temperature');
const sliderTopK = document.body.querySelector('#top-k');
const labelTemperature = document.body.querySelector('#label-temperature');
const labelTopK = document.body.querySelector('#label-top-k');

let session;

async function runPrompt(prompt, params) {
  try {
    if (!session) {
      session = await chrome.aiOriginTrial.languageModel.create(params);
    }
    return session.prompt(prompt);
  } catch (e) {
    console.log('Prompt failed');
    console.error(e);
    console.log('Prompt:', prompt);
    // Reset session
    reset();
    throw e;
  }
}

async function reset() {
  if (session) {
    session.destroy();
  }
  session = null;
}

async function initDefaults() {
  if (!('aiOriginTrial' in chrome)) {
    showResponse('Error: chrome.aiOriginTrial not supported in this browser');
    return;
  }
  const defaults = await chrome.aiOriginTrial.languageModel.capabilities();
  console.log('Model default:', defaults);
  if (defaults.available !== 'readily') {
    showResponse(
      `Model not yet available (current state: "${defaults.available}")`
    );
    return;
  }
  sliderTemperature.value = defaults.defaultTemperature;
  if (defaults.defaultTopK > 3) {
    // limit default topK to 3
    sliderTopK.value = 3;
    labelTopK.textContent = 3;
  } else {
    sliderTopK.value = defaults.defaultTopK;
    labelTopK.textContent = defaults.defaultTopK;
  }
  sliderTopK.max = defaults.maxTopK;
  labelTemperature.textContent = defaults.defaultTemperature;
}

initDefaults();

buttonReset.addEventListener('click', () => {
  hide(elementLoading);
  hide(elementError);
  hide(elementResponse);
  reset();
  buttonReset.setAttribute('disabled', '');
});

sliderTemperature.addEventListener('input', (event) => {
  labelTemperature.textContent = event.target.value;
  reset();
});

sliderTopK.addEventListener('input', (event) => {
  labelTopK.textContent = event.target.value;
  reset();
});

inputPrompt.addEventListener('input', () => {
  if (inputPrompt.value.trim()) {
    buttonPrompt.removeAttribute('disabled');
  } else {
    buttonPrompt.setAttribute('disabled', '');
  }
});

buttonPrompt.addEventListener('click', async () => {
  const prompt = inputPrompt.value.trim();
  showLoading();
  try {
    const params = {
      systemPrompt: 'You are an AI assistant for educational content generation.',
      temperature: sliderTemperature.value,
      topK: sliderTopK.value
    };
    const response = await runPrompt(prompt, params);
    showResponse(response);
  } catch (e) {
    showError(e);
  }
});

function showLoading() {
  buttonReset.removeAttribute('disabled');
  hide(elementResponse);
  hide(elementError);
  show(elementLoading);
}

function showResponse(response) {
  const sanitizedResponse = DOMPurify.sanitize(response);
  elementResponse.innerHTML = marked(sanitizedResponse);
  hide(elementLoading);
  show(elementResponse);
}

function showError(error) {
  elementError.textContent = `Error: ${error.message}`;
  hide(elementLoading);
  show(elementError);
}

function show(element) {
  element.hidden = false;
}

function hide(element) {
  element.hidden = true;
}

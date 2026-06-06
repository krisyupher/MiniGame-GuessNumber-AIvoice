import { GameEngine } from './game.js';
import { AIPersonality } from './ai.js';
import { VoiceLayer } from './voice.js';
import './style.css';

// Instantiate core classes
const game = new GameEngine();
const ai = new AIPersonality();
const voice = new VoiceLayer();

// UI Elements cache
const elSecretCard = document.getElementById('secret-card');
const elSecretNumberReveal = document.getElementById('secret-number-reveal');
const elAttemptsBadge = document.getElementById('attempts-badge');
const elAttemptsList = document.getElementById('attempts-list');
const elChatFeed = document.getElementById('chat-feed');
const elTranscript = document.getElementById('transcript-display');
const elVisualizer = document.getElementById('visualizer');
const elBtnMic = document.getElementById('btn-mic');
const elBtnReset = document.getElementById('btn-reset');
const elToggleManual = document.getElementById('toggle-manual-input');
const elManualForm = document.getElementById('manual-input-form');
const elGuessInput = document.getElementById('guess-input');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  startNewGameSession(true); // Start game with initial welcome greeting
});

/**
 * Starts a fresh game, clears the board, and optionally greets the player
 */
function startNewGameSession(shouldGreet = false) {
  game.startNewGame();
  
  // Clear attempts UI
  elAttemptsBadge.textContent = '0 Attempts';
  elAttemptsList.innerHTML = '<div class="no-attempts-placeholder">No guesses yet. Don\'t be shy!</div>';

  // Reset Secret Card UI
  elSecretCard.classList.remove('won');
  elSecretNumberReveal.textContent = '--';
  elTranscript.textContent = 'Click the microphone and say your guess!';
  elTranscript.classList.remove('listening');
  elVisualizer.classList.remove('active');
  elBtnMic.classList.remove('listening');
  
  // Reset manual form input
  elGuessInput.value = '';
  elGuessInput.disabled = false;
  elManualForm.querySelector('.submit-btn').disabled = false;

  // Clear chat feed and issue welcome greeting
  elChatFeed.innerHTML = '';
  
  if (shouldGreet) {
    triggerAIChatResponse({
      status: 'start',
      attempts: [],
      lastGuess: null,
      ignoredHint: null,
      attemptsCount: 0
    });
  }
}

/**
 * Binds DOM event listeners
 */
function setupEventListeners() {

  // Reset Game
  elBtnReset.addEventListener('click', () => {
    voice.stopSpeaking();
    voice.stopListening();
    startNewGameSession(true);
  });

  // Toggle Manual text entry
  elToggleManual.addEventListener('click', () => {
    if (elManualForm.classList.contains('hidden')) {
      elManualForm.classList.remove('hidden');
      elToggleManual.innerHTML = '<i class="fa-solid fa-microphone-lines"></i> Switch to voice only';
      elGuessInput.focus();
    } else {
      elManualForm.classList.add('hidden');
      elToggleManual.innerHTML = '<i class="fa-solid fa-keyboard"></i> Can\'t use voice? Type your guess';
    }
  });

  // Manual Form Submission
  elManualForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const guess = elGuessInput.value.trim();
    if (guess) {
      processGuess(guess);
      elGuessInput.value = '';
    }
  });

  // Voice Microphone Control
  elBtnMic.addEventListener('click', () => {
    if (!voice.recognitionSupported) {
      alert("Speech recognition is not supported in this browser. Please type your guess using the keyboard option.");
      return;
    }
    
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  });

  // Bind Voice Layer Events to STT
  voice.onStartCallback = () => {
    elBtnMic.classList.add('listening');
    elTranscript.classList.add('listening');
    elVisualizer.classList.add('active');
    elTranscript.textContent = 'Listening for a number...';
  };

  voice.onEndCallback = () => {
    elBtnMic.classList.remove('listening');
    elTranscript.classList.remove('listening');
    elVisualizer.classList.remove('active');
    if (elTranscript.textContent === 'Listening for a number...') {
      elTranscript.textContent = 'Click the microphone and say your guess!';
    }
  };

  voice.onTranscriptCallback = (text) => {
    elTranscript.textContent = `Hearing: "${text}"`;
  };

  voice.onResultCallback = (text, number) => {
    if (number !== null) {
      elTranscript.textContent = `I heard: ${number}`;
      processGuess(number);
    } else {
      elTranscript.textContent = `Heard: "${text}" (Not a valid number 1-100)`;
      handleInvalidVoiceInput(text);
    }
  };

  voice.onErrorCallback = (event) => {
    console.error('STT Error event:', event);
    if (event.error === 'not-allowed') {
      elTranscript.textContent = 'Microphone permission blocked. Please allow mic access in your browser settings.';
    } else if (event.error === 'network') {
      elTranscript.textContent = 'Voice recognition network error. Try Chrome/Edge, or use manual keyboard input.';
    } else {
      elTranscript.textContent = `Voice Error: ${event.error}. Try using manual keyboard input.`;
    }
  };
}

/**
 * Handles processing guesses from either voice or text input
 * @param {string|number} guessValue 
 */
function processGuess(guessValue) {
  if (game.isGameOver) return;

  const previousState = game.getState();
  const state = game.makeGuess(guessValue);

  // If input was totally invalid (non-number)
  if (state.status === 'invalid') {
    handleInvalidVoiceInput(guessValue);
    return;
  }

  // Render attempts list
  renderAttempts(state);

  // Display user's dialogue bubble in chat feed
  addChatBubble('Player', `I guess ${guessValue}`, false);

  // Generate AI Response
  triggerAIChatResponse(state);
}

/**
 * Handle speech inputs that do not parse into numbers
 * @param {string} text 
 */
function handleInvalidVoiceInput(text) {
  triggerAIChatResponse({
    status: 'invalid',
    attempts: game.attempts,
    lastGuess: text,
    ignoredHint: null,
    attemptsCount: game.attempts.length
  });
}

/**
 * Adds AI bubble to dialogue feed, executes text-to-speech
 * @param {Object} state 
 */
async function triggerAIChatResponse(state) {
  // Show typing bubble
  addTypingIndicator();

  // Get AI response text
  const response = await ai.generateResponse(state);

  // Remove typing bubble
  removeTypingIndicator();

  // Show dialogue text
  addChatBubble('Voice Companion', response, true);

  // Speak AI dialog
  voice.speak(response);

  // Handle Win events
  if (state.status === 'correct') {
    handleGameWin(state);
  }
}

/**
 * Executes victory routines
 * @param {Object} state 
 */
function handleGameWin(state) {
  // Lock guess forms
  elGuessInput.disabled = true;
  elManualForm.querySelector('.submit-btn').disabled = true;

  // Spin and flip the secret number card
  elSecretNumberReveal.textContent = state.secretNumber;
  elSecretCard.classList.add('won');

  // Stop listening
  voice.stopListening();
}

/**
 * Renders the attempts badges to grid container
 * @param {Object} state 
 */
function renderAttempts(state) {
  elAttemptsBadge.textContent = `${state.attemptsCount} Attempt${state.attemptsCount !== 1 ? 's' : ''}`;

  if (state.attempts.length === 0) {
    elAttemptsList.innerHTML = '<div class="no-attempts-placeholder">No guesses yet. Don\'t be shy!</div>';
    return;
  }

  // Clear list
  elAttemptsList.innerHTML = '';

  // Render each attempt badge
  state.attempts.forEach((guess) => {
    const badge = document.createElement('div');
    badge.className = 'attempt-badge';

    const numSpan = document.createElement('span');
    numSpan.textContent = guess;
    badge.appendChild(numSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'badge-arrow';

    // Styles & Arrows depending on relative position to secret number
    if (guess === state.secretNumber) {
      badge.classList.add('correct');
      textSpan.innerHTML = '<i class="fa-solid fa-trophy"></i>';
    } else if (guess > state.secretNumber) {
      badge.classList.add('too-high');
      textSpan.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
    } else {
      badge.classList.add('too-low');
      textSpan.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    }

    badge.appendChild(textSpan);
    elAttemptsList.appendChild(badge);
  });

  // Auto-scroll attempts panel to bottom
  elAttemptsList.scrollTop = elAttemptsList.scrollHeight;
}

/**
 * UI Chat bubble helper
 */
function addChatBubble(sender, text, isAI) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isAI ? 'ai' : 'player'}`;

  const senderSpan = document.createElement('span');
  senderSpan.className = 'bubble-sender';
  senderSpan.textContent = sender;
  bubble.appendChild(senderSpan);

  const textNode = document.createElement('span');
  textNode.className = 'bubble-text';
  bubble.appendChild(textNode);

  elChatFeed.appendChild(bubble);
  elChatFeed.scrollTop = elChatFeed.scrollHeight;

  if (isAI) {
    // Elegant typewriter rendering
    let i = 0;
    textNode.textContent = '';
    const interval = setInterval(() => {
      if (i < text.length) {
        textNode.textContent += text.charAt(i);
        i++;
        elChatFeed.scrollTop = elChatFeed.scrollHeight;
      } else {
        clearInterval(interval);
      }
    }, 15);
  } else {
    textNode.textContent = text;
  }
}

/**
 * Renders loading indicators
 */
function addTypingIndicator() {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai';
  bubble.id = 'typing-indicator-bubble';

  const senderSpan = document.createElement('span');
  senderSpan.className = 'bubble-sender';
  senderSpan.textContent = 'Voice Companion';
  bubble.appendChild(senderSpan);

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  bubble.appendChild(indicator);

  elChatFeed.appendChild(bubble);
  elChatFeed.scrollTop = elChatFeed.scrollHeight;
}

/**
 * Removes loading indicators
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator-bubble');
  if (indicator) {
    indicator.remove();
  }
}

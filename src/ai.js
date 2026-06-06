/**
 * AI Personality Layer for "Guess The Number AI"
 */
export class AIPersonality {
  constructor() {
    this.apiKey = localStorage.getItem('guess_num_gemini_api_key') || '';
    this.useLiveAI = localStorage.getItem('guess_num_use_live_ai') === 'true';

    // Local response templates for cost optimization and offline support
    this.templates = {
      start: [
        "Welcome! I've chosen a secret number between 1 and 100. Tell me your first guess whenever you're ready! 🌟",
        "Let's play a guessing game! I have a secret number from 1 to 100. What's your first guess? 😃",
        "Hello! I'm thinking of a number between 1 and 100. Let's see if we can find it together. What's your guess?"
      ],
      too_low: [
        "A bit too low! Try going higher than ${lastGuess}.",
        "${lastGuess} is close, but the secret number is higher. Let's aim a bit higher! 🌟",
        "Higher! Your guess of ${lastGuess} is below the secret number.",
        "We're getting closer! Let's try something higher than ${lastGuess}."
      ],
      too_low_ignored_hint: [
        "Oh, remember, the secret number is higher than ${prevGuess}! Your guess of ${lastGuess} is actually lower, so let's aim up! 🌸",
        "Oops! We want to go higher than ${prevGuess}, but ${lastGuess} is lower. Try picking a bigger number!",
        "No worries! Just remember to guess a number higher than ${prevGuess}. You've got this! 💫"
      ],
      too_high: [
        "A bit too high! Let's go lower than ${lastGuess}.",
        "${lastGuess} is above the secret number. Let's aim a bit lower!",
        "Lower! Try a number below ${lastGuess}.",
        "Great try, but you're a bit over! Try something smaller than ${lastGuess}."
      ],
      too_high_ignored_hint: [
        "Oops! We want to go lower than ${prevGuess}, but ${lastGuess} is higher. Let's try a smaller number! 🌸",
        "Remember, the secret number is below ${prevGuess}! Your guess of ${lastGuess} went the other way. Let's go lower!",
        "No worries at all! Just keep in mind that the number is lower than ${prevGuess}. Try again! ✨"
      ],
      repeated: [
        "Ah, you already guessed ${lastGuess}! Try another number, you're doing great! 🌟",
        "We tried ${lastGuess} already. Let's pick a different one!",
        "Double check! ${lastGuess} was already guessed. What other number should we try?"
      ],
      out_of_bounds: [
        "Oops! Let's stick to numbers between 1 and 100. Try another guess!",
        "Remember, the secret number is between 1 and 100! Your guess of ${lastGuess} is outside that range."
      ],
      invalid: [
        "I didn't quite catch a number. Speak clearly or type it in! 🎤",
        "Was that a number? I might have missed it. Try saying a number from 1 to 100! 😊"
      ],
      correct: [
        "Hooray! ${lastGuess} is the secret number! You found it in ${attemptsCount} attempts! Beautiful job! 🎉",
        "Awesome! ${lastGuess} is correct! You guessed it in ${attemptsCount} tries. Let's play again! 🏆",
        "You did it! ${lastGuess} is the secret number. It took you ${attemptsCount} attempts. Well played! 🌟"
      ]
    };
  }

  /**
   * Sets the Gemini API key and updates localStorage
   * @param {string} key 
   */
  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('guess_num_gemini_api_key', this.apiKey);
  }

  /**
   * Enables or disables live AI API responses
   * @param {boolean} value 
   */
  setUseLiveAI(value) {
    this.useLiveAI = value;
    localStorage.setItem('guess_num_use_live_ai', value ? 'true' : 'false');
  }

  /**
   * Generates a funny response based on the current game state
   * @param {Object} gameState - Current state from the Game Engine
   * @returns {Promise<string>} The verbal response
   */
  async generateResponse(gameState) {
    if (this.useLiveAI && this.apiKey) {
      try {
        return await this.generateResponseFromGemini(gameState);
      } catch (error) {
        console.error('Failed to get Gemini AI response, falling back to local templates:', error);
        // Fallback to template if API fails
        return this.generateResponseFromTemplates(gameState);
      }
    } else {
      return this.generateResponseFromTemplates(gameState);
    }
  }

  /**
   * Selects a template response and interpolates state variables
   * @param {Object} gameState 
   * @returns {string}
   */
  generateResponseFromTemplates(gameState) {
    const { status, lastGuess, attempts, ignoredHint, attemptsCount } = gameState;
    let list = this.templates[status] || this.templates.invalid;

    // Handle special ignored-hint templates
    if (status === 'too_low' && ignoredHint === 'should_have_gone_higher') {
      list = this.templates.too_low_ignored_hint;
    } else if (status === 'too_high' && ignoredHint === 'should_have_gone_lower') {
      list = this.templates.too_high_ignored_hint;
    }

    // Select a random template
    const randomIndex = Math.floor(Math.random() * list.length);
    let template = list[randomIndex];

    // Get the previous guess for interpolation
    // If status is ignoredHint, the previous guess is the one at index length - 2
    let prevGuess = '';
    if (attempts.length >= 2) {
      prevGuess = attempts[attempts.length - 2];
    }

    // Replace placeholders
    return template
      .replace(/\${lastGuess}/g, lastGuess !== null ? lastGuess : '')
      .replace(/\${prevGuess}/g, prevGuess)
      .replace(/\${attemptsCount}/g, attemptsCount);
  }

  /**
   * Calls the Gemini API to get a dynamic sarcastic response
   * @param {Object} gameState 
   * @returns {Promise<string>}
   */
  async generateResponseFromGemini(gameState) {
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const systemPrompt = `You are a warm, encouraging, and friendly game companion playing a "Guess The Number" voice game.
The player is trying to guess a secret number between 1 and 100.
You must guide them and comment on their guess in a cheerful, positive, and conversational way.
Keep your response short (1 or 2 sentences max, under 30 words) so it feels like natural, spoken dialogue.
Be supportive, enthusiastic, and helpful. Do not be sarcastic or mock the player.
If they ignored a previous hint (e.g. guessed higher after being told to go lower, or vice-versa), gently remind them of the correct direction in a friendly way.
If they guessed the same number again, kindly let them know they already tried that number.
Do NOT give away the secret number unless their status is 'correct'.
Use light, cheerful emojis (like 😃, 🌟, 🎉, 😊).`;

    const userPrompt = `Current Game State:
- Secret Number: ${gameState.secretNumber} (Keep this secret unless status is 'correct')
- Attempts history so far: ${JSON.stringify(gameState.attempts)}
- Last guess: ${gameState.lastGuess !== null ? gameState.lastGuess : 'None'}
- Game status for this guess: ${gameState.status}
- Hint ignored check: ${gameState.ignoredHint || 'None'}
- Attempts count: ${gameState.attemptsCount}

Please generate your witty voice response. Do NOT include any formatting like quotes around the response. Only write the response text.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 80
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: Status ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Invalid response format from Gemini API');
    }

    // Clean up any outer quotes or backticks that the model might generate
    text = text.trim().replace(/^["']|["']$/g, '');
    return text;
  }
}

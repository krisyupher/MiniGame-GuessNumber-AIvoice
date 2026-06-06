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
        "Welcome! I've chosen a secret number between 1 and 100. Speak your first guess, let's see what you've got!",
        "Alright, let's play. A number between 1 and 100 is locked in. Give it your best shot, try not to embarrass yourself!",
        "Secret number chosen! 1 to 100. Ready to lose? Go ahead and say your first guess."
      ],
      too_low: [
        "Too low! You need to climb higher than ${lastGuess}.",
        "${lastGuess}? Not even close. Go higher!",
        "Aim higher, friend! ${lastGuess} is way below.",
        "Increase the altitude! ${lastGuess} is too small.",
        "Scraping the bottom shelf there. Go higher than ${lastGuess}!"
      ],
      too_low_ignored_hint: [
        "Wait, did you not hear me? I said it's higher than ${prevGuess}, and you guessed ${lastGuess}? Are you going backward?",
        "You went even lower than ${prevGuess}? Fascinating strategy. Completely wrong, but fascinating.",
        "Seriously? I told you to go higher, but you guessed ${lastGuess}. Is math not mathing today? 😂",
        "Going down when I said go up. Bold choice! Let's see if it works... Spoiler: it didn't."
      ],
      too_high: [
        "Too high! Cool your engines.",
        "${lastGuess}? Whoa, bring it way down!",
        "Gravity, please! ${lastGuess} is way too high.",
        "Lower! You are floating in outer space with that guess.",
        "Nice try, but you're overshooting. Go lower than ${lastGuess}."
      ],
      too_high_ignored_hint: [
        "Are we playing by the same rules? I said lower than ${prevGuess}, and you guessed ${lastGuess}?",
        "You went even higher than ${prevGuess} to ${lastGuess}? I literally just said LOWER! 😂",
        "Ignored the hint and went higher. Let me know when you want to start trying to win.",
        "Wait, so if I say 'lower than ${prevGuess}', you hear 'go higher to ${lastGuess}'? Good to know!"
      ],
      repeated: [
        "You already guessed ${lastGuess}! Memory of a goldfish, huh?",
        "Double-dipping? You already tried ${lastGuess}. Try to keep track!",
        "Again with ${lastGuess}? It wasn't correct the first time, and guess what? It still isn't!"
      ],
      out_of_bounds: [
        "${lastGuess}? The range is 1 to 100. Is counting that hard?",
        "Whoa! ${lastGuess} is not between 1 and 100. Let's stick to the assignment.",
        "Out of bounds! ${lastGuess} is outside the 1 to 100 range. Try again!"
      ],
      invalid: [
        "I didn't quite catch a number there. Speak clearly or type it in!",
        "Was that a number? My translator got confused. Try saying a number from 1 to 100.",
        "Invalid guess. Speak a single number, please!"
      ],
      correct: [
        "Finally! ${lastGuess} was the secret number. It took you ${attemptsCount} tries, but hey, you got there!",
        "Boom! ${lastGuess} is correct. You actually won! I was starting to think I'd have to give you the answer.",
        "Correct! You got it in ${attemptsCount} attempts. Don't let it go to your head, though. Try again?"
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

    const systemPrompt = `You are a sarcastic, slightly competitive, but friendly game opponent playing a "Guess The Number" game.
The player is trying to guess a secret number between 1 and 100.
You must comment on their current guess and the game situation in a funny, conversational way.
Keep your response short (1 or 2 sentences max, under 30 words) so it feels like natural, spoken dialogue.
Be witty, friendly, and slightly sarcastic. Never be genuinely offensive.
If they ignored a previous hint (e.g. guessed higher after being told to go lower, or vice-versa), mock them for ignoring instructions.
If they guessed the same number again, tease them.
Do NOT give away the secret number unless their status is 'correct'.
Avoid emojis in the spoken text if they would sound weird when read aloud, but light gaming emojis (like 😂, 😄) are fine.`;

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

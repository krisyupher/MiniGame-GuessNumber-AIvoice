/**
 * Game Engine for "Guess The Number AI"
 */
export class GameEngine {
  constructor() {
    this.startNewGame();
  }

  /**
   * Initializes or resets the game state
   */
  startNewGame() {
    this.secretNumber = Math.floor(Math.random() * 100) + 1;
    this.attempts = [];
    this.lastGuess = null;
    this.status = 'start'; // 'start', 'too_low', 'too_high', 'correct', 'repeated', 'out_of_bounds', 'invalid'
    this.isGameOver = false;
    this.ignoredHint = null; // 'should_have_gone_higher', 'should_have_gone_lower', or null
  }

  /**
   * Processes a player's guess
   * @param {any} input - The guess from voice or text input
   * @returns {Object} The current game state
   */
  makeGuess(input) {
    // Check if game is already over
    if (this.isGameOver) {
      return this.getState();
    }

    // Parse input to integer
    const guess = parseInt(input, 10);
    this.ignoredHint = null;

    // Validate number
    if (isNaN(guess)) {
      this.status = 'invalid';
      return this.getState();
    }

    if (guess < 1 || guess > 100) {
      this.status = 'out_of_bounds';
      this.lastGuess = guess;
      return this.getState();
    }

    // Check if already guessed
    if (this.attempts.includes(guess)) {
      this.status = 'repeated';
      this.lastGuess = guess;
      return this.getState();
    }

    // Check if they ignored the previous hint
    if (this.attempts.length > 0) {
      const lastValidGuess = this.attempts[this.attempts.length - 1];
      
      // If the last guess was too high (secret is lower), but they guessed higher now
      if (lastValidGuess > this.secretNumber && guess > lastValidGuess) {
        this.ignoredHint = 'should_have_gone_lower';
      }
      // If the last guess was too low (secret is higher), but they guessed lower now
      else if (lastValidGuess < this.secretNumber && guess < lastValidGuess) {
        this.ignoredHint = 'should_have_gone_higher';
      }
    }

    // Process the guess
    this.lastGuess = guess;
    this.attempts.push(guess);

    if (guess === this.secretNumber) {
      this.status = 'correct';
      this.isGameOver = true;
    } else if (guess > this.secretNumber) {
      this.status = 'too_high';
    } else {
      this.status = 'too_low';
    }

    return this.getState();
  }

  /**
   * Retrieves the current serializable game state
   * @returns {Object}
   */
  getState() {
    return {
      secretNumber: this.secretNumber,
      attempts: [...this.attempts],
      lastGuess: this.lastGuess,
      status: this.status,
      isGameOver: this.isGameOver,
      ignoredHint: this.ignoredHint,
      attemptsCount: this.attempts.length
    };
  }
}

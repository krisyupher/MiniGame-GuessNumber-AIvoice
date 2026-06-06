/**
 * Voice Layer for "Guess The Number AI"
 * Handles Speech-to-Text (STT) and Text-to-Speech (TTS)
 */
export class VoiceLayer {
  constructor() {
    // Check Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognitionSupported = !!SpeechRecognition;
    this.recognition = this.recognitionSupported ? new SpeechRecognition() : null;

    // Check Speech Synthesis support
    this.synthesisSupported = 'speechSynthesis' in window;
    this.synthesis = window.speechSynthesis;

    this.isListening = false;
    this.isSpeaking = false;
    this.shouldResumeListeningAfterSpeaking = false;

    // TTS Settings
    this.voiceName = localStorage.getItem('guess_num_voice_name') || '';
    this.pitch = parseFloat(localStorage.getItem('guess_num_voice_pitch') || '1.0');
    this.rate = parseFloat(localStorage.getItem('guess_num_voice_rate') || '1.0');

    // Callbacks
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onTranscriptCallback = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;

    this.onSpeakStartCallback = null;
    this.onSpeakEndCallback = null;

    this.setupRecognition();
  }

  /**
   * Configure speech recognition options and event listeners
   */
  setupRecognition() {
    if (!this.recognitionSupported) return;

    this.recognition.continuous = false; // Turn off continuous to get one distinct phrase/guess at a time
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStartCallback) this.onStartCallback();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) this.onEndCallback();
    };

    this.recognition.onerror = (event) => {
      // Ignore 'aborted' as it triggers when we call stop() programmatically
      if (event.error === 'aborted') return;
      console.warn('Speech Recognition error:', event.error);
      if (this.onErrorCallback) this.onErrorCallback(event);
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Live transcript display
      const currentTranscript = finalTranscript || interimTranscript;
      if (this.onTranscriptCallback && currentTranscript) {
        this.onTranscriptCallback(currentTranscript);
      }

      // If final result, extract number and trigger callback
      if (finalTranscript) {
        const number = this.extractNumberFromText(finalTranscript);
        if (this.onResultCallback) {
          this.onResultCallback(finalTranscript, number);
        }
      }
    };
  }

  /**
   * Starts listening to user voice input
   */
  startListening() {
    if (!this.recognitionSupported) return;
    if (this.isListening) return;

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting speech recognition:', e);
    }
  }

  /**
   * Stops listening to user voice input
   */
  stopListening() {
    if (!this.recognitionSupported) return;
    if (!this.isListening) return;

    try {
      this.recognition.stop();
    } catch (e) {
      console.error('Error stopping speech recognition:', e);
    }
  }

  /**
   * Extracts a numeric value from natural language spoken text
   * @param {string} text - Spoken text e.g., "I guess forty five"
   * @returns {number|null} Parsed number or null if none found
   */
  extractNumberFromText(text) {
    text = text.toLowerCase().trim();

    // 1. Check for literal digits (e.g. "42")
    const digitMatch = text.match(/\b\d{1,3}\b/);
    if (digitMatch) {
      return parseInt(digitMatch[0], 10);
    }

    // 2. Parse textual numbers (e.g., "forty two", "forty-two", "one hundred")
    const cleanedText = text.replace(/-/g, ' ');
    const words = cleanedText.split(/\s+/);

    const ones = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
      ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
      seventeen: 17, eighteen: 18, nineteen: 19
    };

    const tens = {
      twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
    };

    let currentVal = 0;
    let foundNumber = false;

    for (let word of words) {
      if (ones[word] !== undefined) {
        currentVal += ones[word];
        foundNumber = true;
      } else if (tens[word] !== undefined) {
        currentVal += tens[word];
        foundNumber = true;
      } else if (word === 'hundred') {
        if (currentVal === 0) currentVal = 1;
        currentVal *= 100;
        foundNumber = true;
      }
    }

    if (foundNumber && currentVal >= 1 && currentVal <= 100) {
      return currentVal;
    }

    return null;
  }

  /**
   * Retrieves list of available SpeechSynthesisVoices
   * @returns {Array} List of English voices
   */
  getVoices() {
    if (!this.synthesisSupported) return [];
    return this.synthesis.getVoices()
      .filter(voice => voice.lang.startsWith('en-'));
  }

  /**
   * Speaks the provided text using the Web Speech Synthesis API
   * @param {string} text 
   */
  speak(text) {
    if (!this.synthesisSupported) return;

    // Stop listening before speaking to prevent the mic from listening to itself
    if (this.isListening) {
      this.shouldResumeListeningAfterSpeaking = true;
      this.stopListening();
    } else {
      this.shouldResumeListeningAfterSpeaking = false;
    }

    // Cancel current speaking if any
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice properties
    const voices = this.getVoices();
    const selectedVoice = voices.find(v => v.name === this.voiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.pitch = this.pitch;
    utterance.rate = this.rate;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeakStartCallback) this.onSpeakStartCallback();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.onSpeakEndCallback) this.onSpeakEndCallback();

      // Automatically resume listening if we were listening before speaking
      if (this.shouldResumeListeningAfterSpeaking) {
        this.shouldResumeListeningAfterSpeaking = false;
        setTimeout(() => {
          this.startListening();
        }, 300); // Small delay to ensure synthesis audio is completely done
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      this.isSpeaking = false;
      if (this.onSpeakEndCallback) this.onSpeakEndCallback();

      if (this.shouldResumeListeningAfterSpeaking) {
        this.shouldResumeListeningAfterSpeaking = false;
        this.startListening();
      }
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Cancels any active speech synthesis
   */
  stopSpeaking() {
    if (!this.synthesisSupported) return;
    this.synthesis.cancel();
    this.isSpeaking = false;
  }

  /**
   * Set the target voice name for speaking
   */
  setVoice(name) {
    this.voiceName = name;
    localStorage.setItem('guess_num_voice_name', name);
  }

  /**
   * Set voice pitch (0.5 to 2)
   */
  setPitch(pitch) {
    this.pitch = pitch;
    localStorage.setItem('guess_num_voice_pitch', pitch.toString());
  }

  /**
   * Set voice speed rate (0.5 to 2)
   */
  setRate(rate) {
    this.rate = rate;
    localStorage.setItem('guess_num_voice_rate', rate.toString());
  }
}

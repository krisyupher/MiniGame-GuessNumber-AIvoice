# Guess the Number — Voice 🎙️🔢

A single-page browser game where you guess a secret number between **1 and 100** by *speaking* to a friendly, encouraging AI companion. The AI talks back out loud, reacts to every guess, and gently nudges you in the right direction. No backend, no framework — just vanilla JS and the Web Speech APIs.

## Features

- 🎤 **Voice-first gameplay** — say your guess ("forty two", "one hundred", or just "42") and the AI responds with synthesized speech.
- ⌨️ **Keyboard fallback** — no mic, or unsupported browser? Type your guess instead.
- 🤖 **Two AI modes:**
  - **Offline templates** (default) — instant, free, witty canned responses.
  - **Live AI** via Google **Gemini** (`gemini-2.5-flash`) — dynamic, conversational replies. Falls back to templates automatically if the call fails.
- 💡 **Smart hints** — the AI notices when you ignore its "go higher / go lower" advice and reminds you kindly.
- 📊 **Stats & history** — tracks your wins and best (fewest-attempt) score, plus a log of previous guesses, all persisted in `localStorage`.
- 🎛️ **Configurable voice** — pick the TTS voice, pitch, and rate.

## Getting Started

Requires [Node.js](https://nodejs.org/) (18+).

```bash
npm install
npm run dev      # start the Vite dev server
```

Open the URL Vite prints (usually `http://localhost:5173`), click the microphone, and say your guess.

> **Browser support:** voice recognition relies on the Web Speech API, available in Chrome, Edge, and Safari. In browsers without it, the game degrades gracefully to keyboard input.

### Other commands

```bash
npm run build    # production build to dist/
npm run preview  # serve the built dist/ for verification
```

## Enabling Live AI (Gemini)

The game works fully offline using built-in response templates. To get richer, dynamic responses:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Enter the key in the app's settings and toggle **Live AI** on.

Your API key is stored only in your browser's `localStorage` and is sent **only** to Google's Gemini endpoint — there is no backend collecting it.

## How It Works

The logic lives in three small classes, wired to the DOM by `main.js`:

| Module | Responsibility |
| --- | --- |
| [src/game.js](src/game.js) — `GameEngine` | Pure game logic. Owns the secret number and attempt history; `makeGuess()` returns a serializable state object (`status`, `lastGuess`, `attempts`, `ignoredHint`, …) that everything else consumes. |
| [src/ai.js](src/ai.js) — `AIPersonality` | Turns a game state into a friendly line, either from offline templates or a live Gemini call. |
| [src/voice.js](src/voice.js) — `VoiceLayer` | Wraps speech recognition (STT) and synthesis (TTS). Mutes the mic while speaking so the AI doesn't transcribe itself. |
| [src/main.js](src/main.js) | The controller: input → `game.makeGuess()` → `ai.generateResponse()` → render chat bubble → `voice.speak()`. Owns all DOM rendering. |

### Persistence

All state is kept in `localStorage` under the `guess_num_` prefix:

- **Stats:** `guess_num_stats_wins`, `guess_num_stats_best`
- **AI config:** `guess_num_gemini_api_key`, `guess_num_use_live_ai`
- **Voice settings:** `guess_num_voice_name` / `_pitch` / `_rate`

## Tech Stack

- Vanilla JavaScript (ESM), no framework
- [Vite](https://vitejs.dev/) for dev server and bundling
- Web Speech API (`SpeechRecognition` + `speechSynthesis`)
- Google Gemini API (optional)

## License

Private project — not currently licensed for redistribution.

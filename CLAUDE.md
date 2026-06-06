# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (the only way to run/test the app; there is no test suite).
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the built `dist/` for verification.

The app is a static front-end (vanilla JS + Vite, ESM). No backend, no framework, no linter configured.

## Architecture

A single-page browser game where the player guesses a number 1–100 against a sarcastic AI opponent, driven by voice. Three classes own the logic and `main.js` wires them to the DOM. There is no shared store — `main.js` is the only place state crosses module boundaries, passing the game's serialized state object into the AI and voice layers.

- **[src/game.js](src/game.js) — `GameEngine`**: Pure logic, no DOM/browser APIs. Owns the secret number and attempt history. `makeGuess()` returns a serializable state object whose `status` is one of `start | too_low | too_high | correct | repeated | out_of_bounds | invalid`. It also computes `ignoredHint` (`should_have_gone_higher` / `should_have_gone_lower`) by comparing the new guess against the previous valid guess — this is what lets the AI mock the player for ignoring directions. This object is the contract consumed by everything else.

- **[src/ai.js](src/ai.js) — `AIPersonality`**: Turns a game state object into a witty line via `generateResponse()`. Two paths: offline `templates` (keyed by the same `status` strings, with `${lastGuess}`/`${prevGuess}`/`${attemptsCount}` interpolation and dedicated `*_ignored_hint` template arrays), or a live **Gemini** (`gemini-2.5-flash`) call when `useLiveAI` is on and an API key is set. Gemini failures silently fall back to templates. **When adding a new game `status`, add a matching template array here** or it falls back to the `invalid` templates.

- **[src/voice.js](src/voice.js) — `VoiceLayer`**: Wraps Web Speech APIs — `SpeechRecognition` (STT) and `speechSynthesis` (TTS). Communicates via assignable callbacks (`onResultCallback`, `onTranscriptCallback`, etc.) that `main.js` sets. Key behavior: it stops the mic before speaking and auto-resumes listening afterward (`shouldResumeListeningAfterSpeaking`) so the AI's own voice isn't transcribed. `extractNumberFromText()` parses both digits and spoken English number words ("forty two", "one hundred").

- **[src/main.js](src/main.js)**: The controller — caches DOM elements, binds events, and orchestrates the flow: input → `game.makeGuess()` → `ai.generateResponse(state)` → render chat bubble → `voice.speak()`. Also owns all DOM rendering (attempt badges, typewriter chat bubbles, win animation).

### Persistence

All persistent state is `localStorage`, keyed with the `guess_num_` prefix: stats (`guess_num_stats_wins`, `guess_num_stats_best`), AI config (`guess_num_gemini_api_key`, `guess_num_use_live_ai`), and voice settings (`guess_num_voice_name/pitch/rate`). No backend. The Gemini API key stays in the browser and is sent only to Google's endpoint.

### Notes

- [src/counter.js](src/counter.js) and `src/assets/*` are leftover Vite scaffolding and are unused.
- Voice recognition relies on browser support (Chrome/Edge/Safari); the UI degrades to manual keyboard input where unavailable.
</content>
</invoke>

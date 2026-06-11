# Quizzo! 🎉

A Kahoot/Blooket-style live quiz game built entirely on the Node ecosystem.

- **Server**: Node.js, Express, Socket.IO — REST API for quizzes + real-time game engine
- **Client**: React (Vite), React Router, socket.io-client
- **Storage**: JSON file (`server/data/quizzes.json`), seeded with 3 demo quizzes
- **Sounds**: synthesized with the Web Audio API — no audio files

## How to run

```bash
npm install

# Development (server on :3000, client on :5173 with hot reload)
npm run dev

# Production (build client, serve everything from :3000)
npm run build
npm start
```

Open the client (http://localhost:5173 in dev, http://localhost:3000 in prod).

## How to play

1. **Host**: open *Host a game*, pick a quiz, and put the lobby on a shared screen.
   A 6-digit game PIN is shown.
2. **Players**: open */play* on their own device (or scan the join URL), enter the
   PIN, pick a nickname + emoji avatar, and wait in the lobby.
3. The host starts the game. Each question has a 3-2-1 countdown, a time limit,
   and Kahoot-style colored answer buttons on every player's device.
4. **Scoring**: correct answers earn 500–1000 points depending on speed, plus a
   streak bonus (+100 per consecutive correct answer, capped at +500).
5. Between questions the host reveals the correct answer, answer stats, and a
   live leaderboard. The game ends with an animated podium for the top 3. 🏆

## Creating quizzes

Open *Create a quiz* to build your own question sets: 2–4 answers per question,
one marked correct, and a per-question time limit (5–120 s). Quizzes are stored
in `server/data/quizzes.json`.

## Testing

With the server running, `node e2e-test.mjs` simulates a complete game over
real sockets — a host and two players playing all questions — and asserts
scoring, streaks, leaderboard order, the podium, and disconnect handling.

## Architecture notes

- The game state machine lives on the server (`server/src/gameManager.js`):
  `lobby → countdown → question → reveal → leaderboard → … → podium`.
  Clients only render what the server tells them, so nobody can cheat by
  reading the page source.
- Answers are timed server-side from the moment the question is broadcast.
- A question ends early when every connected player has answered.
- If the host disconnects, the game ends for everyone; players who drop out
  in the lobby are removed, mid-game they are marked disconnected but keep
  their score.

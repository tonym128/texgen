# Carded - P2P WebRTC Card Game Engine

A single-page, P2P multiplayer card game engine demonstrating the integration of:

- **Three.js**: 3D graphics for the card table and cards.
- **TexGen.js**: Procedural texture generation for the table felt and playing cards.
- **PeerJS (WebRTC)**: True P2P networking with a Host-Client topology.
- **sql.js (SQLite WASM)**: In-memory, syncable database for storing player history, matches, and game states.

## Features
- **Host or Join**: One player acts as the Host (server). Other players join via a short Room ID.
- **State Synchronization**: The entire SQLite database is serialized and sent to clients upon connection.
- **Database Export/Import**: The Host can export the database to a `.sqlite` file and import historical databases to continue tracking long-term stats.
- **Procedural Graphics**: No image assets are loaded; everything is generated at runtime via TexGen.

## How to Run
Due to ES Modules and WebRTC, this must be served via a local web server (e.g., `python -m http.server`, `npx serve`, or Live Server).

1. Open `index.html` in your browser.
2. Enter your name and click **Host New Game**.
3. Share the generated **Room ID** (top right) with a friend.
4. The friend opens the app, enters their name and the Room ID, and clicks **Join Game**.
5. The Host can start a game of Blackjack from the lobby.

## Architecture
- All logic is self-contained in `index.html`.
- Global state and database instances are synchronized across the P2P connection via JSON and Uint8Array payloads.
- 3D rendering updates reactively to changes in the central `State` object.
# TexGen WebRTC World

A multiplayer 3D exploration demo using WebRTC for networking and TexGen for procedural terrain and avatars.

## Features

- **Peer-to-Peer Multiplayer**: Join worlds using PeerJS IDs.
- **Procedural Terrain**: Heightmaps generated via TexGen shaders, synchronized across all clients.
- **Word Textures**: Avatars and interactive objects use TexGen's natural language interface.
- **Interactive Sync**: Place objects in the world that appear for all connected players.
- **Network Monitoring**: Live graph showing data transfer rates.

## How to Play

1. **Host**: Enter your name and an avatar description (e.g., "red metal"), then click **START**. Share your Peer ID (shown in the console) with friends.
2. **Join**: Enter your name, avatar description, and the **World ID** provided by the host, then click **START**.
3. **Move**: Use **WASD** or **Arrow Keys** to walk.
4. **Interact**: Point your mouse and press **Ctrl** to place a procedural object.
5. **Chat**: Type in the chat box at the bottom left.

## Technical Details

- **Networking**: [PeerJS](https://peerjs.com/) for WebRTC data channels.
- **3D Engine**: [Three.js](https://threejs.org/).
- **Procedural Generation**: [TexGen](https://github.com/tonym128/texgen) for heightmaps and dynamic textures.
- **Physics**: Simple raycast-based terrain following and sphere-sphere player collision.

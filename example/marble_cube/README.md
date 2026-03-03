# 3D Marble Cube Demo

A full 3D arcade-style marble rolling game built with Three.js and TexGen.

## Features

- **6-Sided Maze**: The game takes place on a massive 3D cube. Each face contains a procedurally generated maze.
- **Wormholes**: Fall into holes to smoothly transition and rotate to adjacent (or distant) faces of the cube.
- **Physics**: Tilt the box using your mouse or mobile device's accelerometer to roll the marble.
- **Procedural Textures**: Features highly compressed procedural shaders evaluated at runtime:
  - **Wood**: Used for the central box and the maze walls.
  - **Metal**: Used for the shiny metallic marble.
  - **Skin**: Procedural noise simulating skin for the thumbs holding the screen.
  - **Carpet**: A vibrant voronoi-based floor visible far beneath the game board.
  - **Hole & Goal**: Procedural masks for the wormholes and the pulsating end marker.

## Controls

- **Desktop**: Move the mouse around the screen to tilt the box.
- **Mobile**: Tap "Start" to enable the device orientation sensors, then physically tilt your device.

## Building Shaders

If you modify the shaders in `compress_shaders.js`, run the following command to compress them:

```bash
node compress_shaders.js
```

Then, copy the generated Base64 strings into the `COMPRESSED_SHADERS` object in `game.js`.
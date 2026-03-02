# Endless Flight Sim Example

A 3D flight simulator demonstrating shader decompression and large-scale procedural landscape generation.

## Features

- **Compressed Shaders**: The entire game logic and visuals are stored as tiny compressed Base64 strings, decompressed at boot time.
- **Vast Procedural Terrain**: Generates 1024x1024 Albedo and Heightmaps on the fly.
- **Chase Camera**: Smooth camera follow system behind the airplane.
- **Automatic Terrain Avoidance**: "Auto-Rise" system prevents the plane from crashing into mountain peaks.
- **Dynamic Sky**: Real-time animated sky dome with Sun, Moon, Twinkling Stars, and God Rays.
- **Day/Night Cycle**: Automatic 3-minute cycle that updates lighting and sky gradients.

## Controls

- **WASD / Arrow Keys**: Steer and Pitch the airplane.
- **Time of Day**: Use the slider in the top right to manually override the cycle.

## Shader Compression

To keep the network payload small, the shaders in this example are stored as compressed Base64 strings. If you want to modify the shaders:

1. Edit the original shader source code in `compress_shaders.js`.
2. Run the compression script using Node.js:
   ```bash
   node compress_shaders.js
   ```
3. Copy the generated strings from the console and paste them into the `COMPRESSED_SHADERS` object inside `game.js`.


# TexGen - Procedural Texture Generator

TexGen is a powerful, web-based procedural texture generator that leverages GLSL shaders to create high-quality textures in real-time. It features a built-in shader editor, a vast library of examples, and a Physically Based Rendering (PBR) previewer to visualize how textures will look in a modern 3D engine.

## 🚀 Recent Updates
- **Mobile First**: All 3D and physics examples now feature touch-friendly on-screen controls.
- **Adaptive Display**: Automatic scaling for high-DPI (Retina) screens and dynamic window resizing.
- **Improved Precision**: Library now defaults to `highp` precision, fixing heightmap artifacts on mobile GPUs.
- **TypeScript Support**: Full `.d.ts` definitions and a browser-ready TypeScript gallery.

## 📦 Installation

Install via npm:
```bash
npm install texgen
```

### Usage

**ES Modules:**
```javascript
import TexGen from 'texgen';
import Words from 'texgen/words';

const tg = new TexGen();
const parser = new Words();
```

**CommonJS:**
```javascript
const TexGen = require('texgen');
const Words = require('texgen/words');
```

**CLI Tool:**
```bash
# Compress a shader to Base64
npx texgen compress my_shader.glsl

# Bake a shader to a PNG file (requires gl and canvas)
npx texgen bake my_shader.glsl 1024 1024 output.png
```

## Features

- **Live GLSL Editor:** Write and compile shaders instantly with real-time feedback.
- **Vast Example Library:** Over 50 built-in examples ranging from natural elements (island, water, grass) to industrial materials (bricks, rusted hull) and sci-fi effects.
- **PBR Previewer:** Visualize your textures with realistic lighting, including albedo, roughness, metallic, and normal mapping.
- **Dynamic Sliders:** Add `@slider` annotations to your GLSL uniforms to create interactive controls for your shaders.
- **Shader Compression:** Easily share your creations using built-in URL-based sharing (via shader compression).
- **Visualization Modes:** Toggle between Albedo, Normal, Roughness, Metallic, and Ambient Occlusion views.
- **Export Capabilities:** Save your generated textures directly from the browser as PNG or raw pixel data.

## Getting Started

### Prerequisites

- A modern web browser with WebGL support.
- Node.js (optional, for local development/testing).

### Running Locally

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd texgen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local server:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:8080`.

## Usage

### Interactive Sliders
You can define interactive sliders for your uniforms by adding a special comment to your shader code:
```glsl
uniform float u_scale; // @slider 1.0, 10.0, 5.0
```
This will automatically generate a slider in the UI ranging from `1.0` to `10.0` with a default value of `5.0`.

### Baking Modes
Use the UI to switch between different visualization passes:
- **Full PBR:** Combined material with lighting.
- **Albedo:** Base color.
- **Normals:** Surface orientation.
- **Roughness/Metallic:** Material properties.

## Development

### Running Tests
The project uses `vitest` for unit and UI testing.
```bash
npm test
```

### Build Pipeline
The project includes a `Makefile` for synchronizing versions and generating distribution files.
```bash
make build
```

## License

This project is licensed under the ISC License.

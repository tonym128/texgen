# TexGen - Procedural Texture Generator

TexGen is a powerful, web-based procedural texture generator that leverages GLSL shaders to create high-quality textures in real-time. It features a built-in shader editor, a vast library of examples, and a Physically Based Rendering (PBR) previewer to visualize how textures will look in a modern 3D engine.

## Features

- **Live GLSL Editor:** Write and compile shaders instantly with real-time feedback.
- **Vast Example Library:** Over 50 built-in examples ranging from natural elements (island, water, grass) to industrial materials (bricks, rusted hull) and sci-fi effects.
- **PBR Previewer:** Visualize your textures with realistic lighting, including albedo, roughness, metallic, and normal mapping.
- **Dynamic Sliders:** Add `@slider` annotations to your GLSL uniforms to create interactive controls for your shaders.
- **Shader Compression:** Easily share your creations using built-in URL-based sharing (via shader compression).
- **Visualization Modes:** Toggle between Albedo, Normal, Roughness, Metallic, and Ambient Occlusion views.
- **Export Capabilities:** Save your generated textures directly from the browser.

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

## Technologies Used

- **GLSL / WebGL:** For high-performance texture generation.
- **Vanilla JavaScript:** Core application logic.
- **HTML5/CSS3:** Modern, dark-themed user interface.
- **Vitest:** Testing framework.

## License

This project is licensed under the ISC License.

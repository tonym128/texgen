# Texture Generator IDE

The official procedural IDE for the TexGen library. Use this tool to create, iterate on, and export high-quality procedural textures.

## Features

- **Real-time Preview**: See your shader changes instantly in both 2D and 3D views.
- **PBR Support**: Built-in shaders for Albedo, Normals, Roughness, Metallic, and Ambient Occlusion.
- **Dynamic Sliders**: Define `uniforms` with special comments to generate UI controls automatically.
- **Asset Library**: Access over 90 built-in examples ranging from nature to industrial themes.
- **Exporting**: 
    - Bake to PNG/DataURL.
    - Export full PBR sets as ZIP.
    - Export packed maps for **Unity (MaskMap)** or **Unreal (ORM)**.
- **Compression**: built-in tool to compress your GLSL code into tiny Base64 strings for the TexGen library.

## How to use

1. Open `index.html` in your browser.
2. Select an example from the dropdown or start writing GLSL in the editor.
3. Use the **Gallery** to browse built-in textures.
4. Use **Copy Compressed** to get a payload ready for the `texgen.js` library.

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const TexGen = require('..');

function run() {
    const [, , command, inputFile, ...args] = process.argv;

    if (!command || !inputFile) {
        console.log(`
TexGen CLI
Usage: texgen <command> <file.glsl> [options]

Commands:
  compress   Reads the GLSL file and outputs the compressed Base64 payload.
  bake       Reads the GLSL file and outputs a baked PNG to disk.
             Options: [width] [height] [output_file.png]
             Example: texgen bake my_shader.glsl 1024 1024 output.png
`);
        process.exit(1);
    }

    const fullPath = path.resolve(process.cwd(), inputFile);
    if (!fs.existsSync(fullPath)) {
        console.error(`Error: File not found -> ${fullPath}`);
        process.exit(1);
    }

    const shaderCode = fs.readFileSync(fullPath, 'utf8');

    if (command === 'compress') {
        try {
            const compressed = TexGen.compress(shaderCode);
            if (compressed) {
                console.log("\n--- TexGen Compressed Payload ---\n");
                console.log(compressed);
                console.log("\n---------------------------------\n");
            } else {
                console.error("Error: Failed to compress shader.");
                process.exit(1);
            }
        } catch (e) {
            console.error("Error during compression:", e.message);
            process.exit(1);
        }
    } else if (command === 'bake') {
        try {
            const gl = require('gl');
            const { createCanvas } = require('canvas');

            const width = parseInt(args[0]) || 512;
            const height = parseInt(args[1]) || 512;
            const outputFile = args[2] || 'output.png';

            console.log(`Baking ${width}x${height} texture to ${outputFile}...`);

            const context = gl(width, height, { preserveDrawingBuffer: true });
            if (!context) {
                console.error("Error: Failed to create headless WebGL context.");
                process.exit(1);
            }

            const canvas = createCanvas(width, height);
            const tg = new TexGen({ gl: context, canvas, width, height });
            
            tg.init(shaderCode);
            tg.render();

            const pixels = new Uint8Array(width * height * 4);
            context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels);

            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(width, height);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const src = (y * width + x) * 4;
                    const dst = ((height - y - 1) * width + x) * 4;
                    imgData.data[dst] = pixels[src];
                    imgData.data[dst + 1] = pixels[src + 1];
                    imgData.data[dst + 2] = pixels[src + 2];
                    imgData.data[dst + 3] = pixels[src + 3];
                }
            }
            ctx.putImageData(imgData, 0, 0);

            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(path.resolve(process.cwd(), outputFile), buffer);
            console.log("Success! Texture baked.");
        } catch (e) {
            console.error("Error during baking:", e.message);
            console.error("Make sure 'gl' and 'canvas' are installed: npm install gl canvas");
            process.exit(1);
        }
    } else {
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
}

try {
    run();
} catch (err) {
    console.error("Fatal CLI Error:", err);
    process.exit(1);
}

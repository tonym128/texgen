import { describe, it, expect, beforeEach } from 'vitest';
const TexGen = require('../../texgen.js');
const { SHADERS, compressShader, TOKEN_MAP } = require('./compress_shaders.js');
const { COMPRESSED_SHADERS } = require('./game.js');
const gl = require('gl');

describe('Marble Cube Shaders', () => {
    let context;

    beforeEach(() => {
        context = gl(256, 256, { preserveDrawingBuffer: true });
    });

    it('should have synchronized compressed payloads in game.js', () => {
        for (const [name, code] of Object.entries(SHADERS)) {
            const compressed = compressShader(code);
            expect(COMPRESSED_SHADERS[name], `Compressed payload for "${name}" in game.js is out of sync with compress_shaders.js`).toBe(compressed);
        }
    });

    it('should compile successfully on a real GPU context and include precision headers', () => {
        const tg = new TexGen({ gl: context, width: 256, height: 256 });
        for (const [name, code] of Object.entries(SHADERS)) {
            try {
                const success = tg.init(code);
                expect(success, `Shader "${name}" failed to initialize`).toBe(true);
                
                // Verify TexGen added precision headers to the final fragment shader
                const fsSrc = context.getShaderSource(tg.fs);
                expect(fsSrc).toContain('#ifdef GL_FRAGMENT_PRECISION_HIGH');
                expect(fsSrc).toContain('precision highp float;');
            } catch (error) {
                throw new Error(`Shader "${name}" failed to compile: ${error.message}`);
            }
        }
    });

    it('should decompress to valid GLSL using the custom map and compile', () => {
        const tg = new TexGen({ gl: context, width: 256, height: 256 });
        for (const [name, payload] of Object.entries(COMPRESSED_SHADERS)) {
            // Must use the custom map because it includes 'voronoi' ($O)
            const decompressed = TexGen.decompress(payload, TOKEN_MAP);
            expect(decompressed, `Failed to decompress "${name}"`).toBeTruthy();
            expect(decompressed).toContain('void main()');
            
            try {
                const success = tg.init(decompressed);
                expect(success, `Decompressed shader "${name}" failed to initialize`).toBe(true);
            } catch (error) {
                throw new Error(`Decompressed shader "${name}" failed to compile: ${error.message}`);
            }
        }
    });
});

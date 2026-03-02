import { describe, it, expect, beforeEach } from 'vitest';
const TexGen = require('./texgen.js');
const gl = require('gl');

describe('TexGen Library - Headless WebGL', () => {
    let context;

    beforeEach(() => {
        // Create a real headless WebGL context (512x512)
        context = gl(512, 512, { preserveDrawingBuffer: true });
    });

    describe('Constructor & Setup', () => {
        it('should initialize with provided headless gl context', () => {
            const tg = new TexGen({ gl: context, width: 512, height: 512 });
            expect(tg.width).toBe(512);
            expect(tg.height).toBe(512);
            expect(tg.gl).toBeDefined();
            // It should not throw and should have compiled the base buffers
            expect(tg.buffer).toBeNull(); // Buffer is created in init()
        });
    });

    describe('Decompression', () => {
        it('should decompress shader strings correctly', () => {
            const original = 'void main() { gl_FragColor = vec4(1.0); }';
            const compressed = TexGen.compress(original);
            const decompressed = TexGen.decompress(compressed);
            expect(decompressed).toContain('void main()');
            expect(decompressed).toContain('gl_FragColor');
            expect(decompressed).toContain('vec4');
        });

        it('should return null for invalid base64', () => {
            expect(TexGen.decompress('!!!invalid!!!')).toBeNull();
        });
    });

    describe('Compilation & Rendering (Real GPU)', () => {
        it('should successfully compile a valid shader', () => {
            const tg = new TexGen({ gl: context });
            // This will actually compile on the headless GPU
            const success = tg.init('void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }');
            expect(success).toBe(true);
            expect(tg.program).toBeTruthy();
        });

        it('should throw an error for an invalid shader', () => {
            const tg = new TexGen({ gl: context });
            expect(() => {
                tg.init('void main() { THIS_IS_INVALID_GLSL }');
            }).toThrowError(/Shader Compilation Error/);
        });

        it('should render and allow pixel extraction', () => {
            const tg = new TexGen({ gl: context, width: 2, height: 2 });
            tg.init('void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }');
            tg.render(0);

            // Read pixels directly from the headless context
            const pixels = new Uint8Array(2 * 2 * 4);
            context.readPixels(0, 0, 2, 2, context.RGBA, context.UNSIGNED_BYTE, pixels);
            
            // Check that the first pixel is Red (255, 0, 0, 255)
            expect(pixels[0]).toBe(255); // R
            expect(pixels[1]).toBe(0);   // G
            expect(pixels[2]).toBe(0);   // B
            expect(pixels[3]).toBe(255); // A
        });
    });

    describe('Metadata Parser', () => {
        it('should parse @slider and @color annotations', () => {
            const shader = `
                uniform float u_speed; // @slider 0.5, 2.0, 1.0
                uniform vec3 u_color; // @color #ff0000
            `;
            const meta = TexGen.parseMetadata(shader);
            expect(meta.uniforms.u_speed.type).toBe('float');
            expect(meta.uniforms.u_speed.min).toBe(0.5);
            expect(meta.uniforms.u_speed.default).toBe(1.0);
            
            expect(meta.uniforms.u_color.type).toBe('color');
            expect(meta.uniforms.u_color.default).toBe('#ff0000');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
const TexGen = require('./texgen.js');

describe('TexGen Library', () => {
    let mockGL;
    let mockCanvas;

    beforeEach(() => {
        // Mock WebGL context
        mockGL = {
            getExtension: vi.fn(),
            createShader: vi.fn(() => ({})),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            getShaderParameter: vi.fn(() => true),
            createProgram: vi.fn(() => ({})),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn(() => true),
            useProgram: vi.fn(),
            createBuffer: vi.fn(() => ({})),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            getAttribLocation: vi.fn(() => 0),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            viewport: vi.fn(),
            uniform1f: vi.fn(),
            uniform2f: vi.fn(),
            uniform3f: vi.fn(),
            uniform1i: vi.fn(),
            uniform1fv: vi.fn(),
            uniform2fv: vi.fn(),
            uniform3fv: vi.fn(),
            uniform4fv: vi.fn(),
            getUniformLocation: vi.fn(() => ({})),
            getShaderInfoLog: vi.fn(() => 'mock error'),
            getProgramInfoLog: vi.fn(() => 'mock error'),
            drawArrays: vi.fn(),
            deleteProgram: vi.fn(),
            deleteShader: vi.fn(),
        };

        mockCanvas = {
            getContext: vi.fn(() => mockGL),
            width: 512,
            height: 512,
            toDataURL: vi.fn(() => 'data:image/png;base64,test'),
        };

        // Global mocks for JSDOM
        global.document = {
            createElement: vi.fn((tag) => {
                if (tag === 'canvas') return mockCanvas;
                return {};
            })
        };
    });

    describe('Constructor', () => {
        it('should initialize with default options', () => {
            const tg = new TexGen();
            expect(tg.width).toBe(512);
            expect(tg.height).toBe(512);
            expect(typeof tg.seed).toBe('number');
            expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl', { preserveDrawingBuffer: true });
        });

        it('should use provided canvas and options', () => {
            const customCanvas = { getContext: vi.fn(() => mockGL) };
            const tg = new TexGen({ canvas: customCanvas, width: 1024, height: 1024, seed: 42 });
            expect(tg.width).toBe(1024);
            expect(tg.height).toBe(1024);
            expect(tg.seed).toBe(42);
            expect(customCanvas.getContext).toHaveBeenCalled();
        });
    });

    describe('Decompression', () => {
        it('should decompress shader strings correctly', () => {
            // "void main() { gl_FragColor = vec4(1.0); }" compressed manually or using editor logic
            // Using the actual TOKEN_MAP from texgen.js
            const original = 'void main() { gl_FragColor = vec4(1.0); }';
            // Mocking a simple compression
            const compressed = btoa('§m { §f = §4(1.0); }'); 
            const decompressed = TexGen.decompress(compressed);
            expect(decompressed).toContain('void main()');
            expect(decompressed).toContain('gl_FragColor');
            expect(decompressed).toContain('vec4');
        });

        it('should return null for invalid base64', () => {
            expect(TexGen.decompress('!!!invalid!!!')).toBeNull();
        });
    });

    describe('Initialization', () => {
        it('should compile shaders and link program', () => {
            const tg = new TexGen();
            const success = tg.init('void main() { gl_FragColor = vec4(1.0); }');
            
            expect(success).toBe(true);
            expect(mockGL.createShader).toHaveBeenCalledTimes(2);
            expect(mockGL.createProgram).toHaveBeenCalled();
            expect(mockGL.linkProgram).toHaveBeenCalled();
            expect(mockGL.createBuffer).toHaveBeenCalled();
        });

        it('should wrap raw code in void main if missing', () => {
            const tg = new TexGen();
            tg.init('gl_FragColor = vec4(vUv, 0.0, 1.0);');
            expect(mockGL.shaderSource).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('void main() { gl_FragColor = vec4(vUv, 0.0, 1.0); }'));
        });

        it('should handle @slider and @color comments', () => {
            const tg = new TexGen();
            tg.init(`uniform float u_test; // @slider 0, 1, 0.5
gl_FragColor = vec4(1.0);`);
            const fsCall = mockGL.shaderSource.mock.calls.find(call => call[1].includes('precision mediump float;'))[1];
            expect(fsCall).not.toContain('@slider');
        });
    });

    describe('Rendering', () => {
        it('should set standard uniforms', () => {
            const tg = new TexGen();
            tg.init('gl_FragColor = vec4(1.0);');
            tg.render(1.5);

            expect(mockGL.useProgram).toHaveBeenCalled();
            expect(mockGL.uniform1f).toHaveBeenCalledWith(expect.anything(), 1.5); // u_time
            expect(mockGL.uniform1f).toHaveBeenCalledWith(expect.anything(), tg.seed); // u_seed
            expect(mockGL.uniform2f).toHaveBeenCalledWith(expect.anything(), 512, 512); // u_resolution
            expect(mockGL.drawArrays).toHaveBeenCalled();
        });

        it('should set custom uniforms', () => {
            const tg = new TexGen();
            tg.init('uniform float u_custom; void main() { gl_FragColor = vec4(u_custom); }');
            tg.render(0, { u_custom: 0.8, u_vec: [1, 2, 3], u_bakeMode: 1 });

            expect(mockGL.uniform1f).toHaveBeenCalledWith(expect.anything(), 0.8);
            expect(mockGL.uniform3fv).toHaveBeenCalledWith(expect.anything(), [1, 2, 3]);
            expect(mockGL.uniform1i).toHaveBeenCalledWith(expect.anything(), 1); // u_bakeMode
        });
    });

    describe('Baking', () => {
        it('should return a data URL', () => {
            const tg = new TexGen();
            const result = tg.bake('gl_FragColor = vec4(1.0);', { width: 256, height: 256 });
            
            expect(result).toBe('data:image/png;base64,test');
            expect(tg.width).toBe(256);
            expect(tg.height).toBe(256);
            expect(mockCanvas.toDataURL).toHaveBeenCalled();
        });

        it('should return null if init fails', () => {
            const tg = new TexGen();
            mockGL.getShaderParameter.mockReturnValue(false); // Simulate compile error
            const result = tg.bake('invalid shader');
            expect(result).toBeNull();
        });
    });
});

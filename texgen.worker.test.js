import { describe, it, expect, vi } from 'vitest';
const TexGen = require('./texgen.js');

describe('TexGen - Worker Code Integrity', () => {
    
    it('should generate syntactically valid worker code', async () => {
        let capturedCode = '';
        
        // Mock environment more thoroughly
        const originalWorker = global.Worker;
        const originalURL = global.URL;
        const originalBlob = global.Blob;
        const originalOffscreen = global.OffscreenCanvas;

        global.Blob = class {
            constructor(parts) {
                capturedCode = parts.join('');
            }
        };
        
        global.URL = {
            createObjectURL: vi.fn().mockReturnValue('blob:mock')
        };
        
        global.OffscreenCanvas = class {};
        
        global.Worker = class {
            constructor(url) {
                this.url = url;
            }
            postMessage() {}
            terminate() {}
        };

        const shader = "void main() { gl_FragColor = vec4(1.0); }";
        
        // bakeAsync should now proceed until Worker constructor
        TexGen.bakeAsync(shader);

        expect(capturedCode).toBeTruthy();
        
        // Now, try to eval the code in a sandbox
        const sandbox = {
            self: { onmessage: null, postMessage: vi.fn() },
            atob: (b) => Buffer.from(b, 'base64').toString('binary'),
            JSON: JSON,
            Object: Object,
            ImageBitmap: class {},
            OffscreenCanvas: class {},
            console: console,
            TexGen: null // Will be defined by eval
        };

        // Check for syntax errors by creating a new function
        try {
            const fn = new Function('self', 'atob', 'ImageBitmap', 'OffscreenCanvas', capturedCode);
            fn(sandbox.self, sandbox.atob, sandbox.ImageBitmap, sandbox.OffscreenCanvas);
        } catch (e) {
            console.error("Syntax Error in Worker Code:", e.message);
            console.error("--- WORKER CODE START ---");
            console.error(capturedCode);
            console.error("--- WORKER CODE END ---");
            throw e;
        }

        // Verify that onmessage was assigned
        expect(sandbox.self.onmessage).toBeTypeOf('function');
        
        // Cleanup
        global.Worker = originalWorker;
        global.URL = originalURL;
        global.Blob = originalBlob;
        global.OffscreenCanvas = originalOffscreen;
    });
});

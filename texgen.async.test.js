import { describe, it, expect, vi, afterEach } from 'vitest';
const TexGen = require('./texgen.js');

describe('TexGen - Async Functionality', () => {
    
    afterEach(() => {
        delete TexGen._workerPool;
        delete TexGen._workerId;
        delete TexGen._workerQueue;
    });

    it('should fall back to sync bake if Worker is not available', async () => {
        const originalWorker = global.Worker;
        delete global.Worker;
        
        const shader = "void main() { gl_FragColor = vec4(1.0); }";
        const spy = vi.spyOn(TexGen.prototype, 'bake').mockReturnValue('data:image/png;base64,mock');
        
        const result = await TexGen.bakeAsync(shader);
        
        expect(spy).toHaveBeenCalled();
        expect(result).toBe('data:image/png;base64,mock');
        
        global.Worker = originalWorker;
        spy.mockRestore();
    });

    it('should correctly serialize worker code and handle messages', async () => {
        const postMessageSpy = vi.fn();
        
        global.Blob = class {
            constructor(parts) { this.parts = parts; }
        };
        
        global.URL = {
            createObjectURL: vi.fn().mockReturnValue('blob:mock-url')
        };
        global.OffscreenCanvas = class {};
        
        global.Worker = class {
            constructor(url) {
                this.url = url;
            }
            postMessage(data) { 
                postMessageSpy(data); 
                // Simulate worker response with ID
                setTimeout(() => {
                    if (this.onmessage) this.onmessage({ data: { id: data.id, result: 'data:image/png;base64,async-mock' } });
                }, 10);
            }
            terminate() {}
        };

        const shader = "void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }";
        const result = await TexGen.bakeAsync(shader, { width: 100 });

        expect(result).toBe('data:image/png;base64,async-mock');
        expect(postMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
            shaderCode: shader,
            options: { width: 100 }
        }));
    });

    it('should handle worker errors gracefully', async () => {
        global.Blob = class { constructor(p) {} };
        global.URL = { createObjectURL: () => 'blob:mock' };
        
        global.Worker = class {
            constructor(url) {}
            postMessage(data) {
                setTimeout(() => {
                    if (this.onmessage) this.onmessage({ data: { id: data.id, error: 'Worker Simulation Error' } });
                }, 10);
            }
            terminate() {}
        };

        const shader = "void main() { }";
        await expect(TexGen.bakeAsync(shader)).rejects.toThrow('Worker Simulation Error');
    });
});

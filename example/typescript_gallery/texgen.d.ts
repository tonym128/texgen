/**
 * TexGen - TypeScript Definitions
 */

export interface TexGenOptions {
    /**
     * Existing canvas element to use. If not provided, a new one is created.
     */
    canvas?: HTMLCanvasElement | OffscreenCanvas | any;
    
    /**
     * Output width in pixels (default: 512).
     */
    width?: number;
    
    /**
     * Output height in pixels (default: 512).
     */
    height?: number;
    
    /**
     * Random seed for procedural generation (default: random).
     */
    seed?: number;
}

export interface BakeOptions {
    /** Override instance width. */
    width?: number;
    /** Override instance height. */
    height?: number;
    /** Override instance seed. */
    seed?: number;
    /** Time offset for the bake (default: 0). */
    time?: number;
    /** Custom uniforms to pass to the shader. */
    uniforms?: Record<string, number | number[]>;
}

export default class TexGen {
    canvas: HTMLCanvasElement | OffscreenCanvas | any;
    gl: WebGLRenderingContext | any;
    width: number;
    height: number;
    seed: number;

    constructor(options?: TexGenOptions);

    /**
     * Decompresses a Base64 string from the TexGen editor into GLSL code.
     */
    static decompress(base64: string): string | null;

    /**
     * Compresses raw GLSL code into a tiny Base64 payload string.
     */
    static compress(shaderCode: string): string | null;

    /**
     * Parses a GLSL shader string for @slider and @color annotations.
     * Returns an object containing the detected uniforms, their types, defaults, and ranges.
     */
    static parseMetadata(shaderCode: string): { uniforms: Record<string, any> };

    /**
     * Compiles the shader and prepares the WebGL program.
     * @param shaderCode The raw GLSL code.
     * @returns true if successful, throws an Error otherwise.
     */
    init(shaderCode: string): boolean;

    /**
     * Renders a single frame to the canvas.
     * @param time Current time in seconds.
     * @param uniforms Object containing custom uniform values.
     */
    render(time?: number, uniforms?: Record<string, number | number[]>): void;

    /**
     * Compiles, renders, and returns a Base64 Data URL (PNG).
     * @param shaderCode The raw GLSL code.
     * @param options Baking options.
     * @returns Data URL string or null if compilation fails.
     */
    bake(shaderCode: string, options?: BakeOptions): string | null;
}

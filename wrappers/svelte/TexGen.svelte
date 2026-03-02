<script>
    import { onMount, onDestroy } from 'svelte';
    import TexGen from '../../texgen.js';

    export let shader;
    export let compressed = false;
    export let animated = false;
    export let uniforms = {};
    export let width = 512;
    export let height = 512;
    export let style = "";

    let canvas;
    let tg;
    let reqId;

    $: if (tg && !animated) {
        tg.render(0, uniforms);
    }

    onMount(() => {
        tg = new TexGen({ canvas, width, height });
        const sourceCode = compressed ? TexGen.decompress(shader) : shader;
        
        if (!sourceCode || !tg.init(sourceCode)) {
            console.error("TexGen Svelte: Failed to initialize shader");
            return;
        }

        if (animated) {
            const loop = () => {
                tg.render(performance.now() / 1000, uniforms);
                reqId = requestAnimationFrame(loop);
            };
            loop();
        } else {
            tg.render(0, uniforms);
        }
    });

    onDestroy(() => {
        if (reqId) cancelAnimationFrame(reqId);
    });
</script>

<canvas bind:this={canvas} {style}></canvas>

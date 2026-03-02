<template>
  <canvas ref="canvas" :style="customStyle"></canvas>
</template>

<script>
import TexGen from '../../texgen.js';

export default {
  name: 'TexGen',
  props: {
    shader: { type: String, required: true },
    compressed: { type: Boolean, default: false },
    animated: { type: Boolean, default: false },
    uniforms: { type: Object, default: () => ({}) },
    width: { type: Number, default: 512 },
    height: { type: Number, default: 512 },
    customStyle: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      tg: null,
      reqId: null
    };
  },
  mounted() {
    this.initTexGen();
  },
  beforeDestroy() {
    if (this.reqId) cancelAnimationFrame(this.reqId);
  },
  watch: {
    shader: 'initTexGen',
    uniforms: {
      deep: true,
      handler() {
        if (!this.animated && this.tg) {
          this.tg.render(0, this.uniforms);
        }
      }
    }
  },
  methods: {
    initTexGen() {
      if (this.reqId) cancelAnimationFrame(this.reqId);

      this.tg = new TexGen({ canvas: this.$refs.canvas, width: this.width, height: this.height });
      const sourceCode = this.compressed ? TexGen.decompress(this.shader) : this.shader;
      
      if (!sourceCode || !this.tg.init(sourceCode)) {
        console.error("TexGen Vue: Failed to initialize shader");
        return;
      }

      if (this.animated) {
        const animate = () => {
          this.tg.render(performance.now() / 1000, this.uniforms);
          this.reqId = requestAnimationFrame(animate);
        };
        animate();
      } else {
        this.tg.render(0, this.uniforms);
      }
    }
  }
}
</script>

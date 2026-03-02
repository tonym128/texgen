import React, { useRef, useEffect } from 'react';
import TexGen from '../../texgen.js';

export default function TexGenComponent({ 
  shader, 
  compressed = false, 
  animated = false, 
  uniforms = {}, 
  width = 512, 
  height = 512, 
  style = {} 
}) {
  const canvasRef = useRef(null);
  const tgRef = useRef(null);
  const reqRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    tgRef.current = new TexGen({ canvas: canvasRef.current, width, height });
    
    const sourceCode = compressed ? TexGen.decompress(shader) : shader;
    if (!sourceCode || !tgRef.current.init(sourceCode)) {
      console.error("TexGen React: Failed to initialize shader");
      return;
    }

    if (animated) {
      const animate = () => {
        tgRef.current.render(performance.now() / 1000, uniforms);
        reqRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      tgRef.current.render(0, uniforms);
    }

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [shader, compressed, animated, uniforms, width, height]);

  return <canvas ref={canvasRef} style={style} />;
}

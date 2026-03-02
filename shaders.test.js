import { describe, it, expect } from 'vitest';
import { shaders, UTILS, compressShader, decompressShader } from './shaders.js';

describe('Shader Library', () => {
  it('should have all 97 required shaders', () => {
    const required = [ 'island', 'water', 'grass', 'sand', 'stone', 'clouds', 'marble', 'concrete', 'ice', 'muddy_trenches', 'mossy_cobble', 'pixel_dirt', 'bricks', 'wood', 'planks', 'panels', 'industrial', 'rusty_grate', 'warning_sign', 'corrugated_metal', 'caution_tape', 'industrial_pipes', 'chainlink', 'hazard', 'scifi', 'space_hull', 'pbr_gold', 'pbr_copper', 'pbr_silver', 'pbr_iron', 'pbr_bronze', 'pbr_steel', 'pbr_chrome', 'pbr_rust', 'pbr_rusted_hull', 'pbr_obsidian', 'pbr_ruby', 'pbr_emerald', 'pbr_sapphire', 'pbr_pearl', 'pbr_carbon', 'pbr_wood_lacquer', 'pbr_concrete_wet', 'pbr_mud', 'pbr_snow', 'pbr_sand_wet', 'pbr_lava_crust', 'pbr_mossy_stone', 'pbr_velvet', 'pbr_denim', 'pbr_leather', 'pbr_leather_worn', 'pbr_plastic', 'pbr_plastic_matte', 'pbr_gold_leaf', 'pbr_diamond_encrusted', 'pbr_marble_polished', 'pbr_ice_cracked', 'pbr_opal', 'pbr_forged_carbon', 'fire', 'lava', 'lava_bubbles', 'magic_portal', 'potion_liquid', 'alien_sludge', 'neon_grid', 'energy_shield', 'plasma_pipe', 'thermal_view', 'radar_screen', 'cyber_pulse', 'cyber_glow', 'oil_slick', 'toon_clouds', 'rainbow_path', 'checkerboard', 'candy_ground', 'dots', 'hexagons', 'stars', 'weave', 'para_bricks', 'para_stripes', 'para_grid', 'para_waves', 'para_circles', 'para_polka', 'para_checker', 'alien_skin', 'alien_veins', 'alien_flesh', 'alien_eyes', 'alien_tech', 'dragon_scales', 'camo_jungle', 'metal' ];
    required.forEach(name => {
      expect(shaders).toHaveProperty(name);
      expect(typeof shaders[name]).toBe('string');
      expect(shaders[name].length).toBeGreaterThan(0);
    });
  });

  it('should all use gl_FragColor', () => {
    Object.values(shaders).forEach(code => {
      expect(code).toContain('gl_FragColor');
    });
  });

  it('should all be valid-ish GLSL (basic syntax check)', () => {
    Object.values(shaders).forEach(code => {
      const open = (code.match(/{/g) || []).length;
      const close = (code.match(/}/g) || []).length;
      expect(open).toBe(close);
      expect(code).toContain('void main()');
    });
  });

  it('UTILS should contain essential functions', () => {
    expect(UTILS).toContain('float random');
    expect(UTILS).toContain('float noise');
    expect(UTILS).toContain('float fbm');
    expect(UTILS).toContain('float sdCircle');
    expect(UTILS).toContain('float sdBox');
    expect(UTILS).toContain('struct PBRData');
  });

  describe('Compression', () => {
    it('should compress and decompress correctly', () => {
      const original = shaders.pbr_rust;
      const compressed = compressShader(original);
      const decompressed = decompressShader(compressed);
      expect(decompressed).toContain('void main()');
      expect(decompressed).toContain('gl_FragColor');
    });
  });
});

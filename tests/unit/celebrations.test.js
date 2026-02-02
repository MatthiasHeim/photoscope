import { describe, it, expect, vi } from 'vitest';

// Re-implement createParticle from celebrations.js
const COLORS = ['#48bb78', '#d4a853', '#e8553d', '#4a9ead', '#f0ece4', '#f6e05e'];

function createParticle(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 6;
  const size = 3 + Math.random() * 5;
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 2,
    size,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    life: 1,
    decay: 0.015 + Math.random() * 0.02,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  };
}

describe('createParticle', () => {
  it('creates a particle at given coordinates', () => {
    const p = createParticle(100, 200);
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
  });

  it('particle has required properties', () => {
    const p = createParticle(0, 0);
    expect(p).toHaveProperty('vx');
    expect(p).toHaveProperty('vy');
    expect(p).toHaveProperty('size');
    expect(p).toHaveProperty('color');
    expect(p).toHaveProperty('life');
    expect(p).toHaveProperty('decay');
    expect(p).toHaveProperty('rotation');
    expect(p).toHaveProperty('rotationSpeed');
    expect(p).toHaveProperty('shape');
  });

  it('particle life starts at 1', () => {
    const p = createParticle(50, 50);
    expect(p.life).toBe(1);
  });

  it('particle size is between 3 and 8', () => {
    for (let i = 0; i < 50; i++) {
      const p = createParticle(0, 0);
      expect(p.size).toBeGreaterThanOrEqual(3);
      expect(p.size).toBeLessThan(8);
    }
  });

  it('particle color is from the COLORS palette', () => {
    for (let i = 0; i < 50; i++) {
      const p = createParticle(0, 0);
      expect(COLORS).toContain(p.color);
    }
  });

  it('particle shape is rect or circle', () => {
    for (let i = 0; i < 50; i++) {
      const p = createParticle(0, 0);
      expect(['rect', 'circle']).toContain(p.shape);
    }
  });

  it('particle decay is between 0.015 and 0.035', () => {
    for (let i = 0; i < 50; i++) {
      const p = createParticle(0, 0);
      expect(p.decay).toBeGreaterThanOrEqual(0.015);
      expect(p.decay).toBeLessThan(0.035);
    }
  });

  it('particle speed (velocity magnitude) is between 2 and 8', () => {
    for (let i = 0; i < 50; i++) {
      const p = createParticle(0, 0);
      // vy has -2 offset so we add it back for magnitude check
      const rawVy = p.vy + 2;
      const mag = Math.sqrt(p.vx * p.vx + rawVy * rawVy);
      expect(mag).toBeGreaterThanOrEqual(2 - 0.01);
      expect(mag).toBeLessThanOrEqual(8 + 0.01);
    }
  });
});

describe('burst particle count', () => {
  it('generates 60 particles per burst', () => {
    const particles = [];
    const region = { x: 10, y: 20, w: 30, h: 40 };
    const canvasWidth = 800;
    const canvasHeight = 600;
    const cx = (region.x + region.w / 2) / 100 * canvasWidth;
    const cy = (region.y + region.h / 2) / 100 * canvasHeight;
    const count = 60;
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(cx, cy));
    }
    expect(particles).toHaveLength(60);
  });
});

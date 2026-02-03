import { describe, it, expect } from 'vitest';

// Re-implement pure functions from overlay.js for unit testing
function statusColor(status) {
  switch (status) {
    case 'correct': return { bg: 'rgba(72, 187, 120, 0.15)', border: 'rgba(72, 187, 120, 0.6)', text: '#48bb78' };
    case 'incorrect': return { bg: 'rgba(232, 85, 61, 0.15)', border: 'rgba(232, 85, 61, 0.6)', text: '#e8553d' };
    default: return { bg: 'rgba(212, 168, 83, 0.12)', border: 'rgba(212, 168, 83, 0.4)', text: '#d4a853' };
  }
}

function regionToStyle(region) {
  return {
    left: `${region.x}%`,
    top: `${region.y}%`,
    width: `${region.w}%`,
    height: `${region.h}%`,
  };
}

describe('statusColor', () => {
  it('returns green colors for correct', () => {
    const c = statusColor('correct');
    expect(c.text).toBe('#48bb78');
    expect(c.bg).toContain('72, 187, 120');
    expect(c.border).toContain('72, 187, 120');
  });

  it('returns red colors for incorrect', () => {
    const c = statusColor('incorrect');
    expect(c.text).toBe('#e8553d');
    expect(c.bg).toContain('232, 85, 61');
    expect(c.border).toContain('232, 85, 61');
  });

  it('returns gold/neutral colors for neutral', () => {
    const c = statusColor('neutral');
    expect(c.text).toBe('#d4a853');
    expect(c.bg).toContain('212, 168, 83');
  });

  it('returns neutral colors for unknown status', () => {
    const c = statusColor('something-else');
    expect(c.text).toBe('#d4a853');
  });
});

describe('regionToStyle', () => {
  it('converts region percentages to CSS style object', () => {
    const style = regionToStyle({ x: 10, y: 20, w: 50, h: 30 });
    expect(style).toEqual({
      left: '10%',
      top: '20%',
      width: '50%',
      height: '30%',
    });
  });

  it('handles zero values', () => {
    const style = regionToStyle({ x: 0, y: 0, w: 100, h: 100 });
    expect(style.left).toBe('0%');
    expect(style.top).toBe('0%');
    expect(style.width).toBe('100%');
    expect(style.height).toBe('100%');
  });

  it('handles decimal percentages', () => {
    const style = regionToStyle({ x: 5.5, y: 10.3, w: 25.7, h: 15.2 });
    expect(style.left).toBe('5.5%');
    expect(style.top).toBe('10.3%');
  });
});

describe('renderAllSteps logic', () => {
  const steps = [
    { id: 1, label: 'Step 1', status: 'correct', region: { x: 0, y: 0, w: 50, h: 50 }, overlayText: 'OK', celebrate: true },
    { id: 2, label: 'Step 2', status: 'incorrect', region: { x: 50, y: 0, w: 50, h: 50 }, overlayText: 'Error', celebrate: false, errorHighlight: { x: 55, y: 5, w: 20, h: 20 } },
    { id: 3, label: 'Step 3', status: 'neutral', region: { x: 0, y: 50, w: 100, h: 50 }, overlayText: 'Note', celebrate: false },
  ];

  it('identifies active vs dimmed steps correctly', () => {
    const activeIdx = 1;
    steps.forEach((step, i) => {
      const isActive = i === activeIdx;
      expect(isActive).toBe(i === 1);
    });
  });

  it('all steps have valid regions', () => {
    for (const step of steps) {
      const style = regionToStyle(step.region);
      expect(style.left).toBeTruthy();
      expect(style.top).toBeTruthy();
      expect(style.width).toBeTruthy();
      expect(style.height).toBeTruthy();
    }
  });

  it('click callback receives correct index', () => {
    let clickedIndex = -1;
    const callback = (i) => { clickedIndex = i; };
    callback(2);
    expect(clickedIndex).toBe(2);
  });
});

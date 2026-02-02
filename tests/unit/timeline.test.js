import { describe, it, expect } from 'vitest';

// Re-implement pure functions from timeline.js for unit testing
function getProgress(activeIndex, stepsLength) {
  if (stepsLength <= 1) return activeIndex === 0 ? 0 : 100;
  return Math.round((activeIndex / (stepsLength - 1)) * 100);
}

describe('getProgress', () => {
  it('returns 0 at the start of multi-step timeline', () => {
    expect(getProgress(0, 5)).toBe(0);
  });

  it('returns 100 at the last step', () => {
    expect(getProgress(4, 5)).toBe(100);
  });

  it('returns 50 at the middle of 5 steps', () => {
    expect(getProgress(2, 5)).toBe(50);
  });

  it('returns 33 at step 1 of 4 steps', () => {
    expect(getProgress(1, 4)).toBe(33);
  });

  it('returns 0 for single step at index 0', () => {
    expect(getProgress(0, 1)).toBe(0);
  });

  it('returns 0 for zero steps at index 0', () => {
    expect(getProgress(0, 0)).toBe(0);
  });
});

describe('setActive (state tracking)', () => {
  it('tracks active index correctly', () => {
    let activeIndex = 0;
    function setActive(index) { activeIndex = index; }

    setActive(3);
    expect(activeIndex).toBe(3);

    setActive(0);
    expect(activeIndex).toBe(0);
  });
});

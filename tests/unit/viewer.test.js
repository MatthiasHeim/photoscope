import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.resolve(__dirname, '..', 'fixtures', 'sample-analysis.json');

// Re-implement the pure navigation logic from viewer.js
function createNavigator(steps) {
  let currentStep = 0;

  function goToStep(index) {
    if (index < 0 || index >= steps.length) return false;
    currentStep = index;
    return true;
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
      return true;
    }
    return false;
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      return true;
    }
    return false;
  }

  return {
    goToStep,
    nextStep,
    prevStep,
    getCurrentStep: () => currentStep,
    getSteps: () => steps,
  };
}

describe('Viewer step navigation', () => {
  let sampleData;
  let nav;

  beforeAll(async () => {
    sampleData = JSON.parse(await fs.readFile(samplePath, 'utf-8'));
  });

  beforeEach(() => {
    nav = createNavigator(sampleData.steps);
  });

  it('starts at step 0', () => {
    expect(nav.getCurrentStep()).toBe(0);
  });

  it('nextStep advances to step 1', () => {
    expect(nav.nextStep()).toBe(true);
    expect(nav.getCurrentStep()).toBe(1);
  });

  it('prevStep does nothing at step 0', () => {
    expect(nav.prevStep()).toBe(false);
    expect(nav.getCurrentStep()).toBe(0);
  });

  it('nextStep stops at last step', () => {
    const total = sampleData.steps.length;
    for (let i = 0; i < total + 5; i++) nav.nextStep();
    expect(nav.getCurrentStep()).toBe(total - 1);
  });

  it('goToStep navigates to valid index', () => {
    expect(nav.goToStep(2)).toBe(true);
    expect(nav.getCurrentStep()).toBe(2);
  });

  it('goToStep rejects negative index', () => {
    expect(nav.goToStep(-1)).toBe(false);
    expect(nav.getCurrentStep()).toBe(0);
  });

  it('goToStep rejects out-of-bounds index', () => {
    expect(nav.goToStep(100)).toBe(false);
    expect(nav.getCurrentStep()).toBe(0);
  });

  it('getSteps returns all steps from sample data', () => {
    expect(nav.getSteps()).toHaveLength(4);
  });

  it('can navigate forward and backward through all steps', () => {
    nav.goToStep(0);
    nav.nextStep(); // 1
    nav.nextStep(); // 2
    expect(nav.getCurrentStep()).toBe(2);
    nav.prevStep(); // 1
    expect(nav.getCurrentStep()).toBe(1);
  });
});

describe('sample analysis fixture', () => {
  let sampleData;

  beforeAll(async () => {
    sampleData = JSON.parse(await fs.readFile(samplePath, 'utf-8'));
  });

  it('has title and summary', () => {
    expect(sampleData.title).toBeTruthy();
    expect(sampleData.summary).toBeTruthy();
  });

  it('has 4 steps', () => {
    expect(sampleData.steps).toHaveLength(4);
  });

  it('each step has required fields', () => {
    for (const step of sampleData.steps) {
      expect(step).toHaveProperty('id');
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('region');
      expect(step).toHaveProperty('status');
      expect(step).toHaveProperty('narration');
      expect(step).toHaveProperty('overlayText');
      expect(step.region).toHaveProperty('x');
      expect(step.region).toHaveProperty('y');
      expect(step.region).toHaveProperty('w');
      expect(step.region).toHaveProperty('h');
    }
  });

  it('step 3 is incorrect with errorHighlight', () => {
    const step3 = sampleData.steps[2];
    expect(step3.status).toBe('incorrect');
    expect(step3.errorHighlight).toBeTruthy();
    expect(step3.celebrate).toBe(false);
  });
});

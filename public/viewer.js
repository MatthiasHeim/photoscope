/**
 * Viewer module — main walkthrough controller.
 * Loads analysis data, drives step-through, coordinates overlays/timeline/voice/celebrations.
 */
const Viewer = (() => {
  let analysis = null;
  let imageUrl = null;
  let steps = [];
  let currentStep = 0;
  let autoPlaying = false;
  let autoPlayTimer = null;

  const STEP_DELAY = 1500; // ms pause between steps when voice is off

  async function init() {
    const id = window.location.pathname.split('/view/')[1];
    if (!id) return showError();

    try {
      const res = await fetch(`/api/analysis/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      analysis = data.analysis;
      imageUrl = data.imageUrl;
      steps = analysis.steps || [];

      if (steps.length === 0) throw new Error('No steps');

      setupUI();
      showViewer();
      goToStep(0);
      startAutoPlay();
    } catch {
      showError();
    }
  }

  function setupUI() {
    document.getElementById('analysisTitle').textContent = analysis.title || 'Image Analysis';
    document.getElementById('analysisSummary').textContent = analysis.summary || '';

    const img = document.getElementById('mainImage');
    img.src = imageUrl;

    Overlay.init(document.getElementById('overlayLayer'));
    Celebrations.init(document.getElementById('celebrationCanvas'));
    Timeline.init(document.getElementById('timeline'), steps, (i) => {
      stopAutoPlay();
      goToStep(i);
    });

    // Controls
    document.getElementById('voiceToggle').addEventListener('click', () => {
      const enabled = Voice.toggle();
      document.querySelector('.icon-voice-on').style.display = enabled ? '' : 'none';
      document.querySelector('.icon-voice-off').style.display = enabled ? 'none' : '';
    });

    document.getElementById('autoplayToggle').addEventListener('click', () => {
      if (autoPlaying) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
    });

    document.getElementById('shareBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.getElementById('shareBtn');
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = '🔗'; }, 1500);
      });
    });

    // Keyboard nav
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        stopAutoPlay();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stopAutoPlay();
        prevStep();
      }
    });
  }

  function showViewer() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('viewerApp').style.display = '';
  }

  function showError() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('errorScreen').style.display = 'flex';
  }

  function goToStep(index) {
    if (index < 0 || index >= steps.length) return;
    currentStep = index;
    const step = steps[currentStep];

    // Update overlay
    Overlay.renderStep(step);

    // Update timeline
    Timeline.setActive(currentStep);

    // Update step info
    document.getElementById('stepLabel').textContent = step.label;
    document.getElementById('stepNarration').textContent = step.narration;

    // Celebration
    if (step.celebrate) {
      setTimeout(() => {
        Celebrations.burst(step.region);
      }, 400);
    }

    // Voice narration
    if (Voice.isEnabled()) {
      Voice.speak(step.narration, () => {
        if (autoPlaying) advanceAutoPlay();
      });
    }
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }

  function startAutoPlay() {
    autoPlaying = true;
    document.getElementById('autoplayToggle').textContent = '⏸';

    // If voice isn't enabled, use timer-based advance
    if (!Voice.isEnabled()) {
      scheduleAutoAdvance();
    }
  }

  function stopAutoPlay() {
    autoPlaying = false;
    document.getElementById('autoplayToggle').textContent = '▶';
    Voice.stop();
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function advanceAutoPlay() {
    if (!autoPlaying) return;
    if (currentStep < steps.length - 1) {
      autoPlayTimer = setTimeout(() => {
        goToStep(currentStep + 1);
        if (!Voice.isEnabled()) scheduleAutoAdvance();
      }, 800);
    } else {
      stopAutoPlay();
    }
  }

  function scheduleAutoAdvance() {
    if (!autoPlaying) return;
    autoPlayTimer = setTimeout(() => advanceAutoPlay(), STEP_DELAY);
  }

  function getCurrentStep() { return currentStep; }
  function getSteps() { return steps; }
  function isAutoPlaying() { return autoPlaying; }

  if (typeof window !== 'undefined') {
    window.Viewer = { init, goToStep, nextStep, prevStep, startAutoPlay, stopAutoPlay, getCurrentStep, getSteps, isAutoPlaying };
  }

  // Auto-init on page load
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  return { init, goToStep, nextStep, prevStep, startAutoPlay, stopAutoPlay, getCurrentStep, getSteps, isAutoPlaying };
})();

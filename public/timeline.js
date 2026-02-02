/**
 * Timeline module — horizontal step bar at bottom of viewer.
 */
const Timeline = (() => {
  let container = null;
  let steps = [];
  let activeIndex = 0;
  let onStepClick = null;

  function init(el, stepData, callback) {
    container = el;
    steps = stepData;
    onStepClick = callback;
    render();
  }

  function render() {
    if (!container) return;
    container.innerHTML = '';

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'timeline-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'timeline-progress__fill';
    progressFill.style.width = `${getProgress()}%`;
    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);

    // Steps row
    const row = document.createElement('div');
    row.className = 'timeline-steps';

    steps.forEach((step, i) => {
      const el = document.createElement('button');
      el.className = 'timeline-step';
      if (i === activeIndex) el.classList.add('timeline-step--active');
      if (i < activeIndex) el.classList.add('timeline-step--done');

      const dot = document.createElement('span');
      dot.className = 'timeline-step__dot';
      if (step.status === 'correct') dot.classList.add('timeline-step__dot--correct');
      else if (step.status === 'incorrect') dot.classList.add('timeline-step__dot--incorrect');
      else dot.classList.add('timeline-step__dot--neutral');

      const lbl = document.createElement('span');
      lbl.className = 'timeline-step__label';
      lbl.textContent = step.label;

      el.appendChild(dot);
      el.appendChild(lbl);

      el.addEventListener('click', () => {
        if (onStepClick) onStepClick(i);
      });

      row.appendChild(el);
    });

    container.appendChild(row);
  }

  function setActive(index) {
    activeIndex = index;
    render();
  }

  function getProgress() {
    if (steps.length <= 1) return activeIndex === 0 ? 0 : 100;
    return Math.round((activeIndex / (steps.length - 1)) * 100);
  }

  function getActiveIndex() {
    return activeIndex;
  }

  if (typeof window !== 'undefined') {
    window.Timeline = { init, setActive, getProgress, getActiveIndex, render };
  }

  return { init, setActive, getProgress, getActiveIndex, render };
})();

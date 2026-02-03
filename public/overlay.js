/**
 * Overlay module — renders highlight boxes and text labels over image regions.
 * Supports rendering all steps simultaneously with active/dimmed states and click handlers.
 */
const Overlay = (() => {
  let overlayLayer = null;
  let allSteps = [];
  let activeIndex = -1;
  let onClickCallback = null;

  function init(layer) {
    overlayLayer = layer;
  }

  function setOnClick(callback) {
    onClickCallback = callback;
  }

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

  function clear() {
    if (overlayLayer) overlayLayer.innerHTML = '';
  }

  function renderAllSteps(steps, activeIdx) {
    clear();
    allSteps = steps;
    activeIndex = activeIdx;

    steps.forEach((step, i) => {
      const isActive = i === activeIdx;
      const colors = statusColor(step.status);
      const pos = regionToStyle(step.region);

      const box = document.createElement('div');
      box.className = 'overlay-box overlay-box--clickable';
      if (isActive) {
        box.classList.add('overlay-box--active');
        if (step.status === 'incorrect') box.classList.add('overlay-box--error');
      } else {
        box.classList.add('overlay-box--dimmed');
      }
      box.dataset.stepIndex = i;

      Object.assign(box.style, {
        ...pos,
        background: colors.bg,
        borderColor: colors.border,
      });

      // Overlay text label (only for active step)
      if (isActive) {
        const label = document.createElement('div');
        label.className = 'overlay-label overlay-label--animate';
        label.textContent = step.overlayText;
        label.style.color = colors.text;

        if (step.region.y + step.region.h > 80) {
          label.style.bottom = '100%';
          label.style.marginBottom = '6px';
        } else {
          label.style.top = '100%';
          label.style.marginTop = '6px';
        }

        box.appendChild(label);

        // Error sub-highlight
        if (step.errorHighlight) {
          const errBox = document.createElement('div');
          errBox.className = 'overlay-error-highlight';
          const relLeft = ((step.errorHighlight.x - step.region.x) / step.region.w) * 100;
          const relTop = ((step.errorHighlight.y - step.region.y) / step.region.h) * 100;
          const relW = (step.errorHighlight.w / step.region.w) * 100;
          const relH = (step.errorHighlight.h / step.region.h) * 100;
          Object.assign(errBox.style, {
            left: `${relLeft}%`,
            top: `${relTop}%`,
            width: `${relW}%`,
            height: `${relH}%`,
          });
          box.appendChild(errBox);
        }
      }

      box.addEventListener('click', () => {
        if (onClickCallback) onClickCallback(i);
      });

      overlayLayer.appendChild(box);
    });
  }

  function setActive(index) {
    if (allSteps.length > 0) {
      renderAllSteps(allSteps, index);
    }
  }

  // Legacy single-step render (kept for compatibility)
  function renderStep(step, animate = true) {
    clear();
    const colors = statusColor(step.status);
    const pos = regionToStyle(step.region);

    const box = document.createElement('div');
    box.className = 'overlay-box' + (animate ? ' overlay-box--animate' : '');
    if (step.status === 'incorrect') box.classList.add('overlay-box--error');
    Object.assign(box.style, {
      ...pos,
      background: colors.bg,
      borderColor: colors.border,
    });

    const label = document.createElement('div');
    label.className = 'overlay-label' + (animate ? ' overlay-label--animate' : '');
    label.textContent = step.overlayText;
    label.style.color = colors.text;

    if (step.region.y + step.region.h > 80) {
      label.style.bottom = '100%';
      label.style.marginBottom = '6px';
    } else {
      label.style.top = '100%';
      label.style.marginTop = '6px';
    }

    box.appendChild(label);

    if (step.errorHighlight) {
      const errBox = document.createElement('div');
      errBox.className = 'overlay-error-highlight';
      const relLeft = ((step.errorHighlight.x - step.region.x) / step.region.w) * 100;
      const relTop = ((step.errorHighlight.y - step.region.y) / step.region.h) * 100;
      const relW = (step.errorHighlight.w / step.region.w) * 100;
      const relH = (step.errorHighlight.h / step.region.h) * 100;
      Object.assign(errBox.style, {
        left: `${relLeft}%`,
        top: `${relTop}%`,
        width: `${relW}%`,
        height: `${relH}%`,
      });
      box.appendChild(errBox);
    }

    overlayLayer.appendChild(box);
    return box;
  }

  if (typeof window !== 'undefined') {
    window.Overlay = { init, clear, renderStep, renderAllSteps, setActive, setOnClick, statusColor, regionToStyle };
  }

  return { init, clear, renderStep, renderAllSteps, setActive, setOnClick, statusColor, regionToStyle };
})();

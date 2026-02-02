/**
 * Voice module — SpeechSynthesis controller tied to walkthrough steps.
 */
const Voice = (() => {
  let enabled = true;
  let speaking = false;
  let currentUtterance = null;
  let onEndCallback = null;

  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  function speak(text, onEnd) {
    if (!isSupported() || !enabled) {
      if (onEnd) onEnd();
      return;
    }

    stop();
    onEndCallback = onEnd;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onend = () => {
      speaking = false;
      currentUtterance = null;
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      speaking = false;
      currentUtterance = null;
      if (onEndCallback) onEndCallback();
    };

    currentUtterance = utterance;
    speaking = true;
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (isSupported()) {
      window.speechSynthesis.cancel();
    }
    speaking = false;
    currentUtterance = null;
    onEndCallback = null;
  }

  function pause() {
    if (isSupported() && speaking) {
      window.speechSynthesis.pause();
    }
  }

  function resume() {
    if (isSupported()) {
      window.speechSynthesis.resume();
    }
  }

  function toggle() {
    enabled = !enabled;
    if (!enabled) stop();
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function isSpeaking() {
    return speaking;
  }

  if (typeof window !== 'undefined') {
    window.Voice = { speak, stop, pause, resume, toggle, isEnabled, isSpeaking, isSupported };
  }

  return { speak, stop, pause, resume, toggle, isEnabled, isSpeaking, isSupported };
})();

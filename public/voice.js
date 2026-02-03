/**
 * Voice module — Gemini TTS with Web Speech API fallback.
 */
const Voice = (() => {
  let enabled = true;
  let speaking = false;
  let currentAudio = null;
  let onEndCallback = null;
  const audioCache = new Map();

  function isSupported() {
    return typeof window !== 'undefined';
  }

  function hasSpeechSynthesis() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async function fetchTTS(text) {
    if (audioCache.has(text)) return audioCache.get(text);

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error('TTS fetch failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(text, url);
    return url;
  }

  function speak(text, onEnd) {
    if (!isSupported() || !enabled) {
      if (onEnd) onEnd();
      return;
    }

    stop();
    onEndCallback = onEnd;

    // Try Gemini TTS first, fall back to Web Speech API
    fetchTTS(text)
      .then((audioUrl) => {
        if (!enabled) {
          if (onEndCallback) onEndCallback();
          return;
        }
        const audio = new Audio(audioUrl);
        currentAudio = audio;
        speaking = true;

        audio.onended = () => {
          speaking = false;
          currentAudio = null;
          if (onEndCallback) onEndCallback();
        };

        audio.onerror = () => {
          speaking = false;
          currentAudio = null;
          if (onEndCallback) onEndCallback();
        };

        audio.play().catch(() => {
          speaking = false;
          currentAudio = null;
          if (onEndCallback) onEndCallback();
        });
      })
      .catch(() => {
        // Fallback to Web Speech API
        if (!hasSpeechSynthesis() || !enabled) {
          if (onEndCallback) onEndCallback();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        utterance.onend = () => {
          speaking = false;
          if (onEndCallback) onEndCallback();
        };

        utterance.onerror = () => {
          speaking = false;
          if (onEndCallback) onEndCallback();
        };

        speaking = true;
        window.speechSynthesis.speak(utterance);
      });
  }

  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (hasSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }
    speaking = false;
    onEndCallback = null;
  }

  function pause() {
    if (currentAudio && speaking) {
      currentAudio.pause();
    } else if (hasSpeechSynthesis() && speaking) {
      window.speechSynthesis.pause();
    }
  }

  function resume() {
    if (currentAudio) {
      currentAudio.play();
    } else if (hasSpeechSynthesis()) {
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

  function prefetch(texts) {
    for (const text of texts) {
      if (!audioCache.has(text)) {
        fetchTTS(text).catch(() => {}); // silently warm the cache
      }
    }
  }

  function clearCache() {
    for (const url of audioCache.values()) {
      URL.revokeObjectURL(url);
    }
    audioCache.clear();
  }

  if (typeof window !== 'undefined') {
    window.Voice = { speak, stop, pause, resume, toggle, isEnabled, isSpeaking, isSupported, clearCache, prefetch };
  }

  return { speak, stop, pause, resume, toggle, isEnabled, isSpeaking, isSupported, clearCache, prefetch };
})();

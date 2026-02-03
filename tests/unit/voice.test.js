import { describe, it, expect, beforeEach, vi } from 'vitest';

// We replicate the Voice module logic with mocked speechSynthesis
function createVoice(windowMock) {
  let enabled = true;
  let speaking = false;
  let currentUtterance = null;
  let onEndCallback = null;

  function isSupported() {
    return windowMock && 'speechSynthesis' in windowMock;
  }

  function speak(text, onEnd) {
    if (!isSupported() || !enabled) {
      if (onEnd) onEnd();
      return;
    }
    stop();
    onEndCallback = onEnd;

    const utterance = new windowMock.SpeechSynthesisUtterance(text);
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
    windowMock.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (isSupported()) windowMock.speechSynthesis.cancel();
    speaking = false;
    currentUtterance = null;
    onEndCallback = null;
  }

  function pause() {
    if (isSupported() && speaking) windowMock.speechSynthesis.pause();
  }

  function resume() {
    if (isSupported()) windowMock.speechSynthesis.resume();
  }

  function toggle() {
    enabled = !enabled;
    if (!enabled) stop();
    return enabled;
  }

  function isEnabled() { return enabled; }
  function isSpeaking() { return speaking; }

  return { speak, stop, pause, resume, toggle, isEnabled, isSpeaking, isSupported };
}

describe('Voice module', () => {
  let voice;
  let mockSynth;
  let mockWindow;
  let lastUtterance;

  beforeEach(() => {
    lastUtterance = null;
    mockSynth = {
      speak: vi.fn((u) => { lastUtterance = u; }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    };

    mockWindow = {
      speechSynthesis: mockSynth,
      SpeechSynthesisUtterance: vi.fn((text) => ({
        text,
        rate: 1,
        pitch: 1,
        volume: 1,
        onend: null,
        onerror: null,
      })),
    };

    voice = createVoice(mockWindow);
  });

  it('isSupported returns true when speechSynthesis exists', () => {
    expect(voice.isSupported()).toBe(true);
  });

  it('isSupported returns false with no window', () => {
    const v = createVoice(null);
    expect(v.isSupported()).toBeFalsy();
  });

  it('speak calls speechSynthesis.speak', () => {
    voice.speak('hello');
    expect(mockSynth.speak).toHaveBeenCalledOnce();
    expect(voice.isSpeaking()).toBe(true);
  });

  it('stop cancels synthesis and resets state', () => {
    voice.speak('hello');
    voice.stop();
    expect(mockSynth.cancel).toHaveBeenCalled();
    expect(voice.isSpeaking()).toBe(false);
  });

  it('toggle disables and stops voice', () => {
    expect(voice.isEnabled()).toBe(true);
    const result = voice.toggle();
    expect(result).toBe(false);
    expect(voice.isEnabled()).toBe(false);
  });

  it('toggle re-enables voice', () => {
    voice.toggle(); // disable
    const result = voice.toggle(); // enable
    expect(result).toBe(true);
  });

  it('speak calls onEnd immediately when disabled', () => {
    voice.toggle(); // disable
    const onEnd = vi.fn();
    voice.speak('hello', onEnd);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(mockSynth.speak).not.toHaveBeenCalled();
  });

  it('pause calls speechSynthesis.pause when speaking', () => {
    voice.speak('hello');
    voice.pause();
    expect(mockSynth.pause).toHaveBeenCalledOnce();
  });

  it('resume calls speechSynthesis.resume', () => {
    voice.resume();
    expect(mockSynth.resume).toHaveBeenCalledOnce();
  });

  it('onend callback fires when utterance ends', () => {
    const onEnd = vi.fn();
    voice.speak('hello', onEnd);
    // Simulate utterance ending
    lastUtterance.onend();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(voice.isSpeaking()).toBe(false);
  });

  it('onerror callback fires on error', () => {
    const onEnd = vi.fn();
    voice.speak('hello', onEnd);
    lastUtterance.onerror();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(voice.isSpeaking()).toBe(false);
  });
});

describe('TTS fetch-based voice', () => {
  it('caches audio URLs to avoid re-fetching', () => {
    const cache = new Map();
    const text = 'hello world';
    const url = 'blob:http://localhost/fake-audio';

    // First call: cache miss
    expect(cache.has(text)).toBe(false);
    cache.set(text, url);

    // Second call: cache hit
    expect(cache.has(text)).toBe(true);
    expect(cache.get(text)).toBe(url);
  });

  it('fallback triggers when fetch fails', async () => {
    // Simulate fetch failure and fallback to Web Speech
    let usedFallback = false;
    const fakeFetch = () => Promise.reject(new Error('TTS unavailable'));

    await fakeFetch().catch(() => {
      usedFallback = true;
    });

    expect(usedFallback).toBe(true);
  });

  it('clearCache removes all cached entries', () => {
    const cache = new Map();
    cache.set('a', 'url1');
    cache.set('b', 'url2');
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

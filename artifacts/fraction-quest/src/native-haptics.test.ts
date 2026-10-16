import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playCue, playHaptic } from './lib/fun';

type NativeBridge = { postMessage: (message: string) => void };
const host = globalThis as typeof globalThis & { ReactNativeWebView?: NativeBridge };

test('haptic cues safely do nothing outside the native shell', () => {
  const previous = host.ReactNativeWebView;
  delete host.ReactNativeWebView;
  try {
    assert.doesNotThrow(() => playHaptic('selection'));
    assert.doesNotThrow(() => playCue('correct', false));
  } finally {
    if (previous) host.ReactNativeWebView = previous;
  }
});

test('selection and answer-result cues reach Expo even when sound effects are off', () => {
  const previous = host.ReactNativeWebView;
  const messages: unknown[] = [];
  host.ReactNativeWebView = { postMessage: (message) => messages.push(JSON.parse(message)) };
  try {
    playHaptic('selection');
    playCue('correct', false);
    playCue('retry', false);
    assert.deepEqual(messages, [
      { type: 'haptic', cue: 'selection' },
      { type: 'haptic', cue: 'correct' },
      { type: 'haptic', cue: 'retry' },
    ]);
  } finally {
    if (previous) host.ReactNativeWebView = previous;
    else delete host.ReactNativeWebView;
  }
});

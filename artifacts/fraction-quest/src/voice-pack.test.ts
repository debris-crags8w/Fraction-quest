import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanSentence, PACK_VOICES, resetVoicePackForTests, voiceKey, voicePackUrl } from './lib/voice-pack';
import { NATURAL_VOICES } from './lib/natural-voice';

test('a sentence has one stable file name, the same however its spaces were typed', () => {
  assert.equal(voiceKey('One half.'), voiceKey('  One   half. '));
  assert.notEqual(voiceKey('One half.'), voiceKey('One third.'));
  assert.match(voiceKey('One half.'), /^[0-9a-f]{16}$/);
  // A fixed value: the renderer and the app must agree forever, so this must never change by accident.
  assert.equal(voiceKey('One half.'), '520c72924f268916');
  assert.equal(cleanSentence('a\nb\tc'), 'a b c');
});

test('the app offers exactly the pack voices', () => {
  assert.deepEqual(NATURAL_VOICES.map((voice) => voice.id), [...PACK_VOICES]);
});

test('a sentence in the pack plays from its file; anything else, or another voice, is not in the pack', async () => {
  resetVoicePackForTests();
  const fetchFn = (async () => new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys: [voiceKey('One half.')] }))) as unknown as typeof fetch;
  assert.equal(await voicePackUrl('af_heart', 'One half.', fetchFn), `/voice/af_heart/${voiceKey('One half.')}.mp3`);
  assert.equal(await voicePackUrl('af_heart', 'Seven twelfths.', fetchFn), null);
  assert.equal(await voicePackUrl('am_michael', 'One half.', fetchFn), null);
});

test('with no pack yet (or a page instead of the index), Listen keeps using the server', async () => {
  resetVoicePackForTests();
  const fetchFn = (async () => new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
  assert.equal(await voicePackUrl('af_heart', 'One half.', fetchFn), null);
});

test('Listen reads from the pack without waking the voice server, and asks the server only for a missing sentence', async () => {
  resetVoicePackForTests();
  const { serverEngine, warmUpNaturalVoice, setNaturalEngineForTests, setNaturalVoicePreference } = await import('./lib/natural-voice');
  const originalFetch = globalThis.fetch;
  const hadWindow = typeof (globalThis as { window?: unknown }).window !== 'undefined';
  const originalAudio = (globalThis as { Audio?: unknown }).Audio;
  const asked: string[] = [];
  globalThis.fetch = (async (url: string) => {
    asked.push(url);
    if (url === '/voice/index.json') return new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys: [voiceKey('One half.')] }));
    if (url.startsWith('/voice/')) return new Response(new Blob([new Uint8Array([73, 68, 51])], { type: 'audio/mpeg' }));
    return new Response(new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'audio/wav' }));
  }) as typeof fetch;
  if (!hadWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis });
  (globalThis as { Audio?: unknown }).Audio = class {};
  try {
    setNaturalEngineForTests(null); setNaturalVoicePreference('af_heart');
    assert.equal(await warmUpNaturalVoice(), serverEngine);
    assert.ok(!asked.some((url) => url.startsWith('/api/voice/status')), 'no server status check');
    const packed = await serverEngine.generate('One half.', { voice: 'af_heart', speed: 1 });
    assert.equal(packed.toBlob().type, 'audio/mpeg');
    assert.ok(!asked.some((url) => url.startsWith('/api/voice/speech')), 'the packed sentence never reached the server');
    const made = await serverEngine.generate('Seven twelfths.', { voice: 'af_heart', speed: 1 });
    assert.equal(made.toBlob().type, 'audio/wav');
    assert.ok(asked.includes('/api/voice/speech?voice=af_heart&text=Seven%20twelfths.'));
  } finally {
    globalThis.fetch = originalFetch; (globalThis as { Audio?: unknown }).Audio = originalAudio;
    if (!hadWindow) Reflect.deleteProperty(globalThis, 'window');
    setNaturalEngineForTests(null);
  }
});

test('the voice sentence list covers lessons, story and seasons with unique keys', async () => {
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const list = voiceSentences();
  const texts = new Set(list.map((entry) => entry.text));
  assert.equal(new Set(list.map((entry) => entry.key)).size, list.length);
  for (const entry of list) assert.equal(entry.key, voiceKey(entry.text));
  assert.ok(texts.has('Hi there!'));
  assert.ok([...texts].some((text) => /pumpkin/i.test(text)), 'Halloween words');
  assert.ok([...texts].some((text) => /gingerbread/i.test(text)), 'Christmas words');
  assert.ok([...texts].some((text) => text.startsWith('Hoot says: ')), 'comic scripts');
  assert.ok(list.length > 3000);
});

test('the pack index keeps sentences every voice has and removes stale files', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { buildVoicePackIndex } = await import('../scripts/voice-pack-index');
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pack-index-'));
  try {
    for (const voice of PACK_VOICES) {
      mkdirSync(path.join(dir, voice));
      writeFileSync(path.join(dir, voice, 'aa.mp3'), 'x');
      writeFileSync(path.join(dir, voice, 'old.mp3'), 'x');
    }
    writeFileSync(path.join(dir, 'af_heart', 'bb.mp3'), 'x');
    const { index, removed } = buildVoicePackIndex(['aa', 'bb'], dir);
    assert.deepEqual(index, { version: 1, voices: [...PACK_VOICES], keys: ['aa'] });
    assert.equal(removed, 3);
    assert.equal(existsSync(path.join(dir, 'af_heart', 'old.mp3')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a story is read aloud as "friend", never with the child\'s name, so it plays from the pack', async () => {
  const { storyScript, PROLOGUE } = await import('./story');
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { sentences, spokenText } = await import('./lib/voice');
  const { WHOLE_STONE_OPENING, withName } = await import('./story');
  const { EPILOGUE, CHAPTERS, chapterEnd } = await import('./story');
  const script = `${storyScript(PROLOGUE, 'halloween')} ${withName(WHOLE_STONE_OPENING, null, 'christmas')} ${storyScript(EPILOGUE)} ${storyScript(chapterEnd(CHAPTERS[3]), 'christmas')}`;
  assert.doesNotMatch(script, /\{name\}/);
  const packed = new Set(voiceSentences().map((entry) => entry.text));
  for (const sentence of sentences(spokenText(script))) assert.ok(packed.has(cleanSentence(sentence)), `in the pack: ${sentence}`);
});

test('the detective quest lines are in the voice pack too', async () => {
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { suspectReply } = await import('./story');
  const { sentences, spokenText } = await import('./lib/voice');
  const packed = new Set(voiceSentences().map((entry) => entry.text));
  for (const sentence of sentences(spokenText(suspectReply(2, 'bolt').text))) assert.ok(packed.has(cleanSentence(sentence)), sentence);
  assert.ok(packed.has('Detective note: you figured it out back in chapter 7.'));
});

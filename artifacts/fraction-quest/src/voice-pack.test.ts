import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanSentence, PACK_INDEX_TIMEOUT_MS, PACK_VOICES, preferredPackFormat, resetVoicePackForTests, voiceKey, voicePackIndexPath, voicePackUrl } from './lib/voice-pack';
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
  assert.deepEqual([...PACK_VOICES], ['af_heart']);
  assert.deepEqual(NATURAL_VOICES.map((voice) => voice.id), [...PACK_VOICES]);
});

test('a sentence in the pack plays from its file; anything else, or another voice, is not in the pack', async () => {
  resetVoicePackForTests();
  const fetchFn = (async () => new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys: [voiceKey('One half.')] }))) as unknown as typeof fetch;
  assert.equal(await voicePackUrl('af_heart', 'One half.', fetchFn), `/api/storage/public-objects/voice/af_heart/${voiceKey('One half.')}.mp3`);
  assert.equal(await voicePackUrl('af_heart', 'Seven twelfths.', fetchFn), null);
  assert.equal(await voicePackUrl('bf_emma', 'One half.', fetchFn), null); // a retired voice
  assert.equal(await voicePackUrl('../other', 'One half.', fetchFn), null);
});

test('the voice index remains part of the app while its MP3 files use App Storage', () => {
  assert.equal(voicePackIndexPath(), '/voice/index.json');
});

test('Apple browsers (the iPhone app included) stream the smaller Opus clip; others stream the MP3', async () => {
  const key = voiceKey('One half.');
  const fetchFn = (async () => new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys: [key] }))) as unknown as typeof fetch;
  resetVoicePackForTests();
  assert.equal(await voicePackUrl('af_heart', 'One half.', fetchFn, 'caf'), `/api/storage/public-objects/voice/af_heart/${key}.caf`);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  for (const [answer, expected] of [['maybe', 'caf'], ['', 'mp3']] as const) {
    resetVoicePackForTests();
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ canPlayType: () => answer }) } });
    assert.equal(preferredPackFormat(), expected);
  }
  if (original) Object.defineProperty(globalThis, 'document', original); else Reflect.deleteProperty(globalThis, 'document');
  resetVoicePackForTests();
  assert.equal(preferredPackFormat(), 'mp3', 'no browser: MP3');
});

test('with no pack yet (or a page instead of the index), Listen keeps using the server', async () => {
  resetVoicePackForTests();
  const fetchFn = (async () => new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
  assert.equal(await voicePackUrl('af_heart', 'One half.', fetchFn), null);
});

test('a missed index is tried again later, and a stalled one gives up instead of holding Listen', async (t) => {
  resetVoicePackForTests();
  const key = voiceKey('One half.');
  let calls = 0; let online = false;
  const fetchFn = (async () => {
    calls++;
    if (!online) throw new TypeError('offline');
    return new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys: [key] }));
  }) as unknown as typeof fetch;
  assert.equal(await voicePackUrl('af_heart', 'One half.', fetchFn), null);
  assert.equal(await voicePackUrl('af_heart', 'One half.', fetchFn), null);
  assert.equal(calls, 1, 'a miss is remembered for a short while');
  online = true;
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 31_000 });
  assert.match(await voicePackUrl('af_heart', 'One half.', fetchFn) ?? '', /af_heart/);
  assert.equal(calls, 2, 'then the pack is found once the connection is back');
  t.mock.timers.reset();

  resetVoicePackForTests();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const stalled = ((_: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  })) as unknown as typeof fetch;
  const pending = voicePackUrl('af_heart', 'One half.', stalled);
  t.mock.timers.tick(PACK_INDEX_TIMEOUT_MS);
  assert.equal(await pending, null);
  t.mock.timers.reset();
  resetVoicePackForTests();
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
    if (url.startsWith('/api/storage/public-objects/voice/')) return new Response(new Blob([new Uint8Array([73, 68, 51])], { type: 'audio/mpeg' }));
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
    assert.ok(asked.includes(`/api/storage/public-objects/voice/af_heart/${voiceKey('One half.')}.mp3`));
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
  const { VOICE_SENTENCE_SOURCES, VOICE_SENTENCE_THEMES, voiceSentenceGroups, voiceSentences } = await import('../scripts/voice-sentences');
  const list = voiceSentences();
  const texts = new Set(list.map((entry) => entry.text));
  assert.equal(new Set(list.map((entry) => entry.key)).size, list.length);
  for (const entry of list) assert.equal(entry.key, voiceKey(entry.text));
  const groups = voiceSentenceGroups();
  const groupedKeys = new Set(groups.flatMap((group) => group.sentences.map((entry) => entry.key)));
  assert.equal(groups.length, VOICE_SENTENCE_SOURCES.length * VOICE_SENTENCE_THEMES.length);
  assert.deepEqual([...groupedKeys].sort(), list.map((entry) => entry.key).sort());
  assert.ok(texts.has('Hi there!'));
  assert.ok([...texts].some((text) => /pumpkin/i.test(text)), 'Halloween words');
  assert.ok([...texts].some((text) => /gingerbread/i.test(text)), 'Christmas words');
  assert.ok([...texts].some((text) => text.startsWith('Hoot says: ')), 'comic scripts');
  assert.ok(list.length > 3000);
});

test('the voice index is built from the app\'s own text, so it always matches the code', async () => {
  const { buildVoicePackIndex } = await import('../scripts/voice-pack-index');
  const index = buildVoicePackIndex([{ key: 'bbbbbbbbbbbbbbbb' }, { key: 'aaaaaaaaaaaaaaaa' }, { key: 'bbbbbbbbbbbbbbbb' }]);
  assert.deepEqual(index, { version: 1, voices: [...PACK_VOICES], keys: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'] });
  const { voiceSentences } = await import('../scripts/voice-sentences');
  assert.equal(buildVoicePackIndex(voiceSentences()).keys.length, new Set(voiceSentences().map((sentence) => sentence.key)).size);
});

test('a story is read aloud as "friend", never with the child\'s name, so it plays from the pack', async () => {
  const { storyScript, PROLOGUE } = await import('./story');
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { sentences, spokenText } = await import('./lib/voice');
  const { WHOLE_STONE_OPENING, withName } = await import('./story');
  const { EPILOGUE, CHAPTERS, chapterEnd } = await import('./story');
  // Filmed comics (the prologue, chapter openings and story endings) read just the lines; plain ones say who speaks.
  const filmed = (panels: typeof PROLOGUE, theme: Parameters<typeof withName>[2]) => panels.map((panel) => withName(panel.text, null, theme)).join(' ');
  const endingLines = [EPILOGUE, ...CHAPTERS.map(chapterEnd)].flatMap((panels) => panels.map((panel) => withName(panel.text, null, 'everyday')));
  const script = `${filmed(PROLOGUE, 'halloween')} ${filmed(CHAPTERS[1].intro, 'everyday')} ${withName(WHOLE_STONE_OPENING, null, 'christmas')} ${storyScript(CHAPTERS[3].choice.map((option) => option.reply), 'christmas')}`;
  assert.doesNotMatch(script, /\{name\}/);
  assert.doesNotMatch(endingLines.join(' '), /Hoot says:/);
  const packed = new Set(voiceSentences().map((entry) => entry.text));
  assert.ok(![...packed].some((text) => text.startsWith('Hoot says: Festival night')));
  for (const sentence of sentences(spokenText(script))) assert.ok(packed.has(cleanSentence(sentence)), `in the pack: ${sentence}`);
  for (const line of endingLines) for (const sentence of sentences(spokenText(line))) {
    const clean = cleanSentence(sentence);
    if (/[a-z]{2}/i.test(clean)) assert.ok(packed.has(clean), `in the pack: ${sentence}`);
  }
});

test('every lesson film, not only a chapter\'s first, reads lines that are in the voice pack', async () => {
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { CHAPTERS, CHAPTER_SCENES, lessonComic, withName } = await import('./story');
  const { MISSIONS } = await import('./game');
  const { sentences, spokenText } = await import('./lib/voice');
  const packed = new Set(voiceSentences().map((entry) => entry.text));
  const missing: string[] = []; let films = 0;
  for (const chapter of CHAPTERS) {
    if (!CHAPTER_SCENES[chapter.unit]) continue;
    // A chapter with a scene films every lesson's comic (later lessons in the chapter's place), line by line.
    MISSIONS.filter((mission) => mission.unit === chapter.unit).forEach((mission, index) => {
      films++;
      for (const theme of ['everyday', 'halloween', 'christmas'] as const) {
        for (const panel of lessonComic(chapter, mission, index)) for (const sentence of sentences(spokenText(withName(panel.text, null, theme)))) {
          const clean = cleanSentence(sentence);
          if (/[a-z]{2}/i.test(clean) && !packed.has(clean)) missing.push(`${mission.id} (${theme}): ${clean}`);
        }
      }
    });
  }
  assert.ok(films > 60, `only ${films} lesson films`);
  assert.deepEqual([...new Set(missing)].slice(0, 8), [], `${new Set(missing).size} film lines are not in the pack`);
});

test('the detective quest lines are in the voice pack too', async () => {
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { suspectReply } = await import('./story');
  const { sentences, spokenText } = await import('./lib/voice');
  const packed = new Set(voiceSentences().map((entry) => entry.text));
  for (const sentence of sentences(spokenText(suspectReply(2, 'bolt').text))) assert.ok(packed.has(cleanSentence(sentence)), sentence);
  assert.ok(packed.has('Detective note: you figured it out back in chapter 7.'));
});

test('inside the iPhone app the whole pack is saved once, picks up where it stopped, and is skipped after', async () => {
  const { downloadWholeVoicePack, setNaturalEngineForTests } = await import('./lib/natural-voice');
  const keys = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc', 'dddddddddddddddd'];
  const saved = new Map<string, string>();
  const fetched: string[] = [];
  const storage = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  const original = { caches: g.caches, fetch: g.fetch, localStorage: g.localStorage };
  g.caches = { open: async () => ({ match: async (url: string) => (saved.has(url) ? new Response(saved.get(url)) : undefined), put: async (url: string, response: Response) => { saved.set(url, await response.text()); } }) };
  g.localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => { storage.set(k, v); } };
  g.fetch = async (url: string) => {
    if (url.endsWith('index.json')) return new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys }));
    fetched.push(url);
    return new Response('opus');
  };
  try {
    resetVoicePackForTests(); setNaturalEngineForTests(null);
    // Wi-Fi drops after two clips: two are saved.
    let allowed = 2;
    const first = await downloadWholeVoicePack('af_heart', () => allowed-- > 0);
    assert.ok(first! >= 1 && first! <= 2);
    // Next launch: only the rest are fetched.
    const before = fetched.length;
    assert.equal(await downloadWholeVoicePack('af_heart', () => true), 4);
    assert.equal(fetched.length - before, 4 - before);
    assert.equal(saved.size, 4);
    // Once complete, a later launch doesn't even check the cache.
    const after = fetched.length;
    assert.equal(await downloadWholeVoicePack('af_heart', () => true), 4);
    assert.equal(fetched.length, after);
  } finally {
    Object.assign(g, original);
    resetVoicePackForTests(); setNaturalEngineForTests(null);
  }
});

test('the page knows when it runs inside the iPhone app and whether it is on Wi-Fi', async () => {
  const { appShell } = await import('./lib/app-shell');
  const g = globalThis as Record<string, unknown>;
  assert.equal(appShell(), null);
  g.fractionQuestShell = { platform: 'ios', wifi: true };
  assert.deepEqual(appShell(), { platform: 'ios', wifi: true });
  g.fractionQuestShell = { platform: 'ios' };
  assert.deepEqual(appShell(), { platform: 'ios', wifi: false });
  delete g.fractionQuestShell;
});

test('the whole-pack download skips a clip App Storage does not have yet, and tries it again next launch', async () => {
  const { downloadWholeVoicePack, setNaturalEngineForTests } = await import('./lib/natural-voice');
  const keys = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc'];
  const saved = new Map<string, string>();
  const storage = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  const original = { caches: g.caches, fetch: g.fetch, localStorage: g.localStorage };
  g.caches = { open: async () => ({ match: async (url: string) => (saved.has(url) ? new Response(saved.get(url)) : undefined), put: async (url: string, response: Response) => { saved.set(url, await response.text()); } }) };
  g.localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => { storage.set(k, v); } };
  g.fetch = async (url: string) => {
    if (url.endsWith('index.json')) return new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys }));
    return url.includes('bbbbbbbbbbbbbbbb') ? new Response('', { status: 404 }) : new Response('opus');
  };
  try {
    resetVoicePackForTests(); setNaturalEngineForTests(null);
    assert.equal(await downloadWholeVoicePack('af_heart', () => true), 2);
    assert.equal(saved.size, 2);
    assert.equal(storage.size, 0, 'not marked complete, so the missing clip is tried next launch');
  } finally {
    Object.assign(g, original);
    resetVoicePackForTests(); setNaturalEngineForTests(null);
  }
});

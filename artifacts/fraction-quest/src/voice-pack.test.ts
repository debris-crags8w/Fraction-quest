import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanSentence, PACK_INDEX_TIMEOUT_MS, PACK_VOICES, preferredPackFormat, resetVoicePackForTests, voiceKey, voicePackIndexPath, voicePackUrl } from './lib/voice-pack';
import { NATURAL_VOICES } from './lib/natural-voice';
import { CAST_VOICE_IDS, CAST_VOICES, speakerVoice, voiceSpeed } from './lib/cast-voices';
import { sentences, spokenText } from './lib/voice';

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
  // An older Safari plays CAF files but not Opus inside them: MP3.
  resetVoicePackForTests();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ canPlayType: (type: string) => (type === 'audio/x-caf' ? 'maybe' : '') }) } });
  assert.equal(preferredPackFormat(), 'mp3', 'CAF without Opus');
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
  // One entry per sentence and voice: a friend's film line is listed for Heart and for that friend.
  const id = (entry: { key: string; voice?: string }) => `${entry.voice ?? ''}/${entry.key}`;
  assert.equal(new Set(list.map(id)).size, list.length);
  for (const entry of list) assert.equal(entry.key, voiceKey(entry.text));
  const heartKeys = new Set(list.filter((entry) => !entry.voice).map((entry) => entry.key));
  for (const entry of list) if (entry.voice) assert.ok(heartKeys.has(entry.key), `a friend's line also plays in Heart: ${entry.text}`);
  const groups = voiceSentenceGroups();
  const groupedKeys = new Set(groups.flatMap((group) => group.sentences.map(id)));
  assert.equal(groups.length, VOICE_SENTENCE_SOURCES.length * VOICE_SENTENCE_THEMES.length);
  assert.deepEqual([...groupedKeys].sort(), list.map(id).sort());
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
  const all = voiceSentences();
  const built = buildVoicePackIndex(all);
  assert.equal(built.keys.length, all.filter((sentence) => !sentence.voice).length);
  // Each story friend's film lines are listed by voice, in their own voice.
  assert.deepEqual(Object.keys(built.cast ?? {}).sort(), [...CAST_VOICE_IDS].sort());
  for (const [voice, keys] of Object.entries(built.cast ?? {})) assert.equal(keys.length, all.filter((sentence) => sentence.voice === voice).length);
});

test('a friend\'s film line is made in their own voice, at their own speed, and the server table matches', async () => {
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { readFileSync } = await import('node:fs');
  const { PROLOGUE, withName } = await import('./story');
  const hootLine = cleanSentence(withName(PROLOGUE.find((panel) => panel.speaker === 'hoot')!.text, null, 'everyday'));
  const first = sentences(spokenText(hootLine))[0]!;
  const entries = voiceSentences().filter((entry) => entry.text === cleanSentence(first));
  assert.deepEqual(entries.map((entry) => entry.voice ?? 'af_heart').sort(), ['af_heart', 'bm_george']);
  assert.equal(speakerVoice('numi'), 'af_heart');
  assert.equal(voiceSpeed('bf_emma'), CAST_VOICES.tilly.speed);
  // api-server/src/lib/cast-voices.ts renders the clips: the same voices at the same speeds.
  const server = readFileSync(new URL('../../api-server/src/lib/cast-voices.ts', import.meta.url), 'utf8');
  for (const { voice, speed } of Object.values(CAST_VOICES)) assert.match(server, new RegExp(`\\b${voice}: ${String(speed).replace('.', '\\.')}(?:\\.0)?,`));
});

test('a friend\'s line plays from their own clips, and in Heart when they have none yet', async () => {
  resetVoicePackForTests();
  const index = { version: 1, voices: ['af_heart'], keys: [voiceKey('Hello.')], cast: { bm_george: [voiceKey('Hello.')] } };
  const fetchFn = (async () => new Response(JSON.stringify(index))) as unknown as typeof fetch;
  assert.match((await voicePackUrl('bm_george', 'Hello.', fetchFn, 'mp3'))!, /voice\/bm_george\/[0-9a-f]{16}\.mp3$/);
  assert.equal(await voicePackUrl('am_onyx', 'Hello.', fetchFn, 'mp3'), null);
  assert.equal(await voicePackUrl('bm_george', 'Goodbye.', fetchFn, 'mp3'), null);
  resetVoicePackForTests();
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

test('a friend\'s missing clip plays in Heart, never asks the server for the friend\'s voice, and each part keeps its voice', async () => {
  resetVoicePackForTests();
  const { createNaturalSpeaker, serverEngine, setNaturalEngineForTests, setNaturalVoicePreference } = await import('./lib/natural-voice');
  const originalFetch = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (url: string) => {
    asked.push(url);
    if (url === '/voice/index.json') {
      return new Response(JSON.stringify({ version: 1, voices: ['af_heart'], keys: [voiceKey('Hoo hoo.'), voiceKey('Snap.')], cast: { bm_george: [voiceKey('Hoo hoo.')] } }));
    }
    return new Response(new Blob([new Uint8Array([73, 68, 51])], { type: 'audio/mpeg' }));
  }) as typeof fetch;
  try {
    setNaturalEngineForTests(null); setNaturalVoicePreference('af_heart');
    await serverEngine.generate('Hoo hoo.', { voice: 'bm_george', speed: 1 });
    assert.ok(asked.some((url) => url.endsWith(`/voice/bm_george/${voiceKey('Hoo hoo.')}.${preferredPackFormat()}`)), 'Hoot\'s own clip');
    await serverEngine.generate('Snap.', { voice: 'am_onyx', speed: 1 });
    assert.ok(asked.some((url) => url.endsWith(`/voice/af_heart/${voiceKey('Snap.')}.${preferredPackFormat()}`)), 'Chomp\'s line falls back to Heart');
    assert.ok(!asked.some((url) => url.includes('voice=am_onyx') || url.includes('voice=bm_george')), 'the server is never asked for a friend\'s voice');

    // The speaker makes each sentence in the voice it is given.
    const used: string[] = [];
    setNaturalEngineForTests({ generate: async (_text, { voice }) => { used.push(voice); return { toBlob: () => new Blob(['x']) }; } });
    const audio = { play: () => { setTimeout(() => audio.onended?.(), 0); return Promise.resolve(); }, pause: () => undefined, onended: null as null | (() => void) } as unknown as HTMLAudioElement;
    const originalUrl = URL.createObjectURL;
    URL.createObjectURL = () => 'blob:x';
    try {
      await new Promise<void>((resolve) => createNaturalSpeaker(() => audio).speak(['One.', 'Two.', 'Three.'], () => resolve(), undefined, undefined, undefined, ['bm_george', undefined, 'af_nova']));
    } finally { URL.createObjectURL = originalUrl; }
    assert.deepEqual(used, ['bm_george', 'af_heart', 'af_nova']);
  } finally {
    globalThis.fetch = originalFetch;
    setNaturalEngineForTests(null);
    resetVoicePackForTests();
  }
});

test('everything Listen reads on an animated Teach first page is in the voice pack', async () => {
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { LESSON_INTROS } = await import('./lesson-intros');
  const { LESSON_SCENES, teachPageScript } = await import('./teach-scenes');
  const keys = new Set(voiceSentences().filter((entry) => !entry.voice).map((entry) => entry.key));
  const missing: string[] = [];
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    const intro = LESSON_INTROS[id]!;
    for (let page = 0; page <= intro.steps.length; page++) {
      for (const part of sentences(spokenText(teachPageScript(intro, scene, page)))) {
        const clean = cleanSentence(part);
        if (/[a-z]{2}/i.test(clean) && !keys.has(voiceKey(clean))) missing.push(`${id} page ${page + 1}: ${clean}`);
      }
    }
  }
  assert.deepEqual(missing.slice(0, 5), [], `${missing.length} Teach first sentences have no clip`);
});

test('everything Listen reads on Tonight’s lantern and Picked for you is in the voice pack', async () => {
  const { voiceSentences } = await import('../scripts/voice-sentences');
  const { LANTERN_CARD_SPOKEN: lantern } = await import('./riddles');
  const { PICKED_FOR_YOU_SPOKEN } = await import('./game');
  const LANTERN_CARD_SPOKEN = [...lantern, PICKED_FOR_YOU_SPOKEN];
  const keys = new Set(voiceSentences().filter((entry) => !entry.voice).map((entry) => entry.key));
  const missing = LANTERN_CARD_SPOKEN.flatMap((line) => sentences(spokenText(line)).map(cleanSentence)).filter((clean) => /[a-z]{2}/i.test(clean) && !keys.has(voiceKey(clean)));
  assert.deepEqual(missing, []);
});

test('when Safari pauses the voice partway through a clip, it plays on to the end of the reading', async () => {
  const { createNaturalSpeaker, setNaturalEngineForTests, setNaturalVoicePreference } = await import('./lib/natural-voice');
  setNaturalVoicePreference('af_heart');
  setNaturalEngineForTests({ generate: async () => ({ toBlob: () => new Blob(['x']) }) });
  const played: string[] = [];
  let paused = false;
  // A clip ends a moment after play; the second clip is paused by "Safari" the first time, with no ended event.
  const audio = {
    src: '', paused: true, ended: false, onended: null as null | (() => void), onpause: null as null | (() => void),
    addEventListener(type: string, listener: () => void) { if (type === 'pause') this.pauseListeners.push(listener); },
    removeEventListener(type: string, listener: () => void) { if (type === 'pause') this.pauseListeners = this.pauseListeners.filter((item: () => void) => item !== listener); },
    pauseListeners: [] as (() => void)[],
    play() {
      played.push(this.src); this.paused = false;
      const src = this.src;
      if (played.length === 2 && !paused) {
        paused = true;
        setTimeout(() => { this.paused = true; this.pauseListeners.forEach((listener) => listener()); this.onpause?.(); }, 5);
      } else setTimeout(() => { if (this.src === src) { this.paused = true; this.onended?.(); } }, 5);
      return Promise.resolve();
    },
    pause() { this.paused = true; },
  };
  let n = 0;
  const originalUrl = URL.createObjectURL;
  URL.createObjectURL = () => `blob:${++n}`;
  try {
    const ok = await Promise.race([
      new Promise<boolean>((resolve) => createNaturalSpeaker((url) => { audio.src = url; return audio as unknown as HTMLAudioElement; }).speak(['One.', 'Two.', 'Three.'], resolve)),
      new Promise<string>((resolve) => setTimeout(() => resolve('stuck'), 2000)),
    ]);
    assert.equal(ok, true, 'the reading finished');
    assert.deepEqual([...new Set(played)], ['blob:1', 'blob:2', 'blob:3']);
  } finally {
    URL.createObjectURL = originalUrl;
    setNaturalEngineForTests(null);
  }
});

test('leaving a screen while its voice is reading silences it, and no later sentence starts', async () => {
  const { createNaturalSpeaker, setNaturalEngineForTests, setNaturalVoicePreference } = await import('./lib/natural-voice');
  const { createLearningSpeechController } = await import('./LearningText');
  setNaturalVoicePreference('af_heart');
  setNaturalEngineForTests({ generate: async () => ({ toBlob: () => new Blob(['x']) }) });
  const events: string[] = [];
  // Each clip plays for 40 ms.
  const audio = {
    src: '', paused: true, ended: false, onended: null as null | (() => void), onpause: null as null | (() => void),
    play() { events.push(`play ${this.src}`); this.paused = false; const src = this.src; setTimeout(() => { if (this.src === src && !this.paused) { this.paused = true; this.onended?.(); } }, 40); return Promise.resolve(); },
    pause() { if (!this.paused) events.push('pause'); this.paused = true; this.onpause?.(); },
  };
  let n = 0;
  const originalUrl = URL.createObjectURL;
  URL.createObjectURL = () => `blob:${++n}`;
  const speaker = createNaturalSpeaker((url) => { audio.src = url; return audio as unknown as HTMLAudioElement; });
  const synthesis = { speak() {}, cancel() {}, getVoices: () => [], addEventListener() {}, removeEventListener() {} } as unknown as SpeechSynthesis;
  const controller = createLearningSpeechController(synthesis, () => undefined, undefined, undefined, () => null,
    { ready: () => true, chosen: () => true, speak: speaker.speak, stop: speaker.stop, warmUp() {} });
  try {
    controller.speak('One. Two. Three.', 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(events, ['play blob:1']);
    controller.dispose(); // the screen goes
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.deepEqual(events, ['play blob:1', 'pause'], 'paused at once, and nothing else played');
    assert.equal(audio.paused, true);
  } finally {
    URL.createObjectURL = originalUrl;
    setNaturalEngineForTests(null);
  }
});

test('with the device voice, leaving a screen stops the reading even where cancel only stops the current sentence (Safari)', async () => {
  const { createLearningSpeechController } = await import('./LearningText');
  const spoken: string[] = [];
  // Safari: cancel() stops the sentence being spoken, but sentences already queued still play.
  let queue: { text: string; onend?: (() => void) | null; onstart?: (() => void) | null }[] = [];
  let speaking = false;
  const next = () => {
    const item = queue.shift();
    if (!item) { speaking = false; return; }
    speaking = true; spoken.push(item.text); item.onstart?.();
    setTimeout(() => { item.onend?.(); next(); }, 20);
  };
  const synthesis = {
    speak(utterance: { text: string }) { queue.push(utterance); if (!speaking) next(); },
    cancel() { /* the current sentence stops; the queue stays */ },
    getVoices: () => [{ name: 'Device', lang: 'en-US', voiceURI: 'Device', default: true }],
    addEventListener() {}, removeEventListener() {},
  } as unknown as SpeechSynthesis;
  const makeUtterance = (text: string) => ({ text, onend: null, onstart: null, onerror: null }) as unknown as SpeechSynthesisUtterance;
  const controller = createLearningSpeechController(synthesis, () => undefined, makeUtterance, 0, () => null,
    { ready: () => false, chosen: () => false, speak() {}, stop() {}, warmUp() {} });
  controller.speak('One. Two. Three. Four.', 'en-US');
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.dispose();
  queue = queue.filter(() => true);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.deepEqual(spoken, ['One.'], 'no sentence after the screen went');
});

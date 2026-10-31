import type { Page, Route } from '@playwright/test';

/* Shared by the film specs: opens a film on a phone, with music on and a fake voice clip, and measures where things sit
   on screen shot by shot. The film is a 390 x 664 phone screen: the picture is a letterboxed screen with a 30px black bar
   top and bottom, and the caption sits over its lower part. */

export type Box = { l: number; t: number; r: number; b: number };
export type FilmSnap = {
  caption: string;           // data-testid of the caption (story-panel-N, or story-caption-final)
  screen: Box;
  frame: Box;                // the visible picture: the screen without its two letterbox bars (as tall as they are drawn)
  set: Box;                  // the whole set after the camera and the drift
  captionBox: Box | null;
  speaker: Box | null;       // the set-only film's speaker
  friend: Box | null;        // the set-only film's chapter friend (when someone else speaks)
  actors: { who: string; box: Box }[];   // every character in the picture (a buzzing one: everywhere its buzz takes it)
  fractions: { text: string; box: Box }[]; // every written fraction or number in the picture (fractions, number flags) that shows
  things: { what: string; box: Box }[];  // story things a line talks about (data-story-thing: Bea's map, the seed bag, the cracked boot...)
  bunting: Box | null;
  ribbon: Box | null;        // a chapter ending's "N of 15 pieces" label (once it shows)
  prop: Box | null;          // the drawn part of the lesson or chapter-ending prop
};

export const BAR_PX = 30;

/** A short silent WAV clip: what the natural voice "plays". */
export function silentWav(seconds = 0.3) {
  const rate = 8000; const samples = Math.round(rate * seconds); const data = Buffer.alloc(samples * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8); header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** Every clip the film asks for is a short silent clip, so the voice leads the shots (as it does for a child). The device
    voice is recorded, never spoken. Call before the first page load. */
export async function fakeVoice(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-film-voice', 'on');
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Device', lang: 'en-US', voiceURI: 'Device', default: true }],
      speak(utterance: { text: string; onend?: () => void }) { setTimeout(() => utterance.onend?.(), 50); },
      cancel() {}, addEventListener() {}, removeEventListener() {}, pause() {}, resume() {},
    } });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = function (this: { text: string }, text: string) { this.text = text; };
  });
  const clip = (route: Route) => route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() });
  await page.route('**/api/storage/public-objects/voice/**', clip);
  await page.route('**/api/voice/speech**', clip);
  await page.route('**/api/voice/status', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"state":"ready"}' }));
}

/** Counts every note the story music schedules (so a test can tell the music is playing, and has stopped). */
export async function countMusicNotes(page: Page) {
  await page.addInitScript(() => {
    const scope = window as unknown as { notes: number; AudioContext: typeof AudioContext };
    scope.notes = 0;
    const Real = scope.AudioContext;
    scope.AudioContext = class extends Real {
      createOscillator() { scope.notes += 1; return super.createOscillator(); }
    } as typeof AudioContext;
  });
}

/** Starts recording a snapshot each time a caption appears (a new shot), once the camera has settled where it is
    going: transitions are cut and the set's own animations stop, but the set's slow drift is pushed to its far end and
    a buzzing character (Bea) is measured everywhere her buzz takes her, so the check sees the worst case. The still the
    film ends on (its own camera shot) is measured too: call `snapStill` once the film has ended. Call after the page
    has loaded, before the film opens. */
export async function watchFilm(page: Page) {
  await page.addStyleTag({ content: `
    *, *::before, *::after { transition: none !important; }
    .fq-cine-caption, .fq-cine-set-speaker { animation: none !important; }
    .fq-cine-set *, .fq-cine-set *::before, .fq-cine-set *::after { animation: none !important; }
  ` });
  await page.evaluate(() => {
    const scope = window as unknown as { filmSnaps: unknown[] };
    scope.filmSnaps = [];
    const box = (el: Element | null | undefined) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom };
    };
    /** The part of a prop's picture that is drawn (its shapes, without the soft glow round a stone piece), not its whole box. */
    const drawn = (svg: Element | null) => {
      if (!svg) return null;
      const parts = [...svg.querySelectorAll('path, rect, circle, ellipse, line, polygon')]
        .filter((part) => !part.classList.contains('fq-fp-aura') && getComputedStyle(part).opacity !== '0')
        .map((part) => part.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      return parts.length ? { l: Math.min(...parts.map((r) => r.left)), t: Math.min(...parts.map((r) => r.top)), r: Math.max(...parts.map((r) => r.right)), b: Math.max(...parts.map((r) => r.bottom)) } : null;
    };
    const snap = () => {
      const comic = document.querySelector('[data-testid=story-panels]');
      const caption = document.querySelector('.fq-cine-caption');
      const set = document.querySelector('.fq-cine-set');
      if (!comic || !caption || !set) return;
      const screen = box(comic)!;
      // The set drifts up to 8 x 4 px over its 9 seconds: look at it at the far end.
      const drift = set.getAnimations().find((animation) => (animation as CSSAnimation).animationName === 'fq-cine-drift');
      if (drift) { drift.pause(); drift.currentTime = 8999; }
      const actorsOf = [...document.querySelectorAll('.fq-cine-set .fq-cine-actor, .fq-cine-set .fq-cine-peeker')];
      const friend = document.querySelector('.fq-cine-set .fq-cine-actor:not([data-testid=story-set-speaker]):not(.fq-cine-set-speaker)');
      // The camera's scale, so a buzz (drawn in the set's pixels) is measured in screen pixels.
      const camera = new DOMMatrix(getComputedStyle(document.querySelector('.fq-cine-cam')!).transform);
      const buzz = [...document.styleSheets].flatMap((sheet) => { try { return [...sheet.cssRules]; } catch { return []; } })
        .find((rule): rule is CSSKeyframesRule => rule instanceof CSSKeyframesRule && rule.name === 'fq-cine-buzz');
      const buzzMoves = buzz ? [...buzz.cssRules].map((frame) => ((frame as CSSKeyframeRule).style.translate || '0 0').split(' ').map((part) => parseFloat(part) || 0)) : [];
      const actorBox = (actor: Element) => {
        const drawn = box(actor.firstElementChild)!;
        if (!actor.classList.contains('is-buzzing') || !buzzMoves.length) return drawn;
        const moved = buzzMoves.map(([x = 0, y = 0]) => ({ l: drawn.l + x * camera.a, t: drawn.t + y * camera.d, r: drawn.r + x * camera.a, b: drawn.b + y * camera.d }));
        return { l: Math.min(...moved.map((item) => item.l)), t: Math.min(...moved.map((item) => item.t)), r: Math.max(...moved.map((item) => item.r)), b: Math.max(...moved.map((item) => item.b)) };
      };
      const shows = (el: Element) => { for (let at: Element | null = el; at && at !== set; at = at.parentElement) if (getComputedStyle(at).opacity === '0') return false; return true; };
      scope.filmSnaps.push({
        caption: caption.getAttribute('data-testid'),
        // The visible picture is the screen between the two letterbox bars as they are drawn now (the still has none).
        screen, frame: { l: screen.l, t: box(document.querySelector('.fq-cine-bar.is-top'))?.b ?? screen.t + 30, r: screen.r, b: box(document.querySelector('.fq-cine-bar.is-bottom'))?.t ?? screen.b - 30 },
        set: box(set), captionBox: box(caption),
        speaker: box(document.querySelector('[data-testid=story-set-speaker]')?.firstElementChild),
        friend: document.querySelector('[data-testid=story-set-speaker]') ? box(friend?.firstElementChild) : null,
        actors: actorsOf.map((actor) => ({ who: actor.firstElementChild?.getAttribute('data-character') ?? (actor.firstElementChild?.classList.contains('fq-mascot') ? 'numi' : actor.firstElementChild?.classList.contains('fq-hoot') ? 'hoot' : actor.firstElementChild?.getAttribute('class')) ?? 'actor', box: actorBox(actor) })),
        fractions: [...document.querySelectorAll('.fq-cine-set .fq-cine-frac, .fq-cine-set .fq-cine-flag')].filter(shows).map((frac) => ({ text: frac.getAttribute('aria-label') ?? frac.textContent ?? '', box: box(frac)! })),
        things: [...document.querySelectorAll('.fq-cine-set [data-story-thing]')].filter(shows).map((thing) => ({ what: thing.getAttribute('data-story-thing')!, box: box(thing)! })),
        bunting: box(document.querySelector('.fq-cine-set .fq-cine-bunting')),
        ribbon: box(document.querySelector('.fq-cine-end-ribbon.is-visible')),
        prop: drawn(document.querySelector('.fq-cine-set [data-testid=film-prop] svg')),
      });
    };
    (window as unknown as { filmSnapNow: () => void }).filmSnapNow = snap;
    // A caption is new each shot (it is keyed by the shot). Look once the browser has laid it out.
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && node.classList.contains('fq-cine-caption')) requestAnimationFrame(() => requestAnimationFrame(snap));
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
}

/** Measures the still the film ends on (after Skip or the last line): it has its own camera shot, and no new caption. */
export async function snapStill(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    (window as unknown as { filmSnapNow: () => void }).filmSnapNow(); resolve();
  }))));
}

export const snaps = (page: Page) => page.evaluate(() => (window as unknown as { filmSnaps: FilmSnap[] }).filmSnaps);

const area = (box: Box) => Math.max(0, box.r - box.l) * Math.max(0, box.b - box.t);
export const overlap = (a: Box, b: Box): Box | null => {
  const box = { l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) };
  return box.r > box.l && box.b > box.t ? box : null;
};
/** How much of `box` lies inside `frame` (0 to 1). */
export const visibleShare = (box: Box, frame: Box) => {
  const common = overlap(box, frame);
  return area(box) === 0 ? 1 : common ? area(common) / area(box) : 0;
};
/** How much of `box` is covered by `cover` (0 to 1). */
export const coveredShare = (box: Box, cover: Box | null) => {
  const common = cover ? overlap(box, cover) : null;
  return area(box) === 0 || !common ? 0 : area(common) / area(box);
};

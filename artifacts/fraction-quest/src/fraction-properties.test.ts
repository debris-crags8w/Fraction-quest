import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { areEquivalent, compareFractions, type FractionModel } from './concept-games';
import { fractionOrderMatches } from './game';
import { answerMatches, answerValue, choiceDistractors, distractorCandidates, parseAnswer, type WorksheetProblem } from './learning-content';
import { valueOf } from './proof';
import { positionName } from './frog-hop';
import { correctGap, towerStands, versusHalf } from './stack-tower';
import { sayFraction, spokenText } from './lib/voice';

/* Property-style tests for the fraction math the course really uses.
   Every property runs over many generated inputs from a seeded generator (the same seed on every run, so a
   failure reproduces). A failing input is printed with the failure. Nothing here changes app behaviour. */

const SEED = 20240611;

/** mulberry32: small and deterministic. */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return { int, pick: <T,>(list: readonly T[]) => list[int(0, list.length - 1)] };
}
type Rng = ReturnType<typeof rng>;

/** Run `check` on `runs` generated inputs; on a failure, say which input broke it. */
function forAll<T>(label: string, gen: (r: Rng) => T, check: (input: T) => void, runs = 400): void {
  const r = rng(SEED);
  for (let i = 0; i < runs; i++) {
    const input = gen(r);
    try { check(input); } catch (error) {
      throw new Error(`${label}: failed on input #${i} ${JSON.stringify(input)} (seed ${SEED}): ${(error as Error).message}`);
    }
  }
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const frac = (r: Rng, maxN = 120, maxD = 60): FractionModel => ({ n: r.int(0, maxN), d: r.int(1, maxD) });
const scale = (f: FractionModel, k: number): FractionModel => ({ n: f.n * k, d: f.d * k });
const text = (f: FractionModel) => `${f.n}/${f.d}`;
/** The lowest-terms form, written here from the definition (not taken from the app). */
const lowest = (f: FractionModel): FractionModel => { const g = gcd(f.n, f.d) || 1; return { n: f.n / g, d: f.d / g }; };
/** Exact decimal text for n/d when d divides a power of ten (up to 6 places). */
const decimalText = (n: number, d: number): string => {
  const scaled = (n * 1_000_000) / d;
  assert.ok(Number.isInteger(scaled), `${n}/${d} is not a terminating decimal`);
  const whole = Math.floor(scaled / 1_000_000);
  return `${whole}.${String(scaled % 1_000_000).padStart(6, '0').replace(/0+$/, '') || '0'}`;
};
const TERMINATING_DENOMINATORS = [2, 4, 5, 8, 10, 16, 20, 25, 32, 40, 50];
const problem = (answer: string, extra: Partial<WorksheetProblem> = {}): WorksheetProblem => ({ id: 'p', prompt: 'q', answer, hint: 'h', ...extra });

describe('equivalent fractions (areEquivalent)', () => {
  it('is reflexive and symmetric', () => {
    forAll('reflexive', (r) => frac(r), (a) => assert.ok(areEquivalent(a, a)));
    forAll('symmetric', (r) => [frac(r, 12, 12), frac(r, 12, 12)] as const, ([a, b]) => assert.equal(areEquivalent(a, b), areEquivalent(b, a)), 800);
  });

  it('is transitive (a = b and b = c means a = c), checked on chains of renamings', () => {
    forAll('transitive', (r) => { const a = frac(r, 30, 30); return [a, scale(a, r.int(1, 9)), r.int(1, 9)] as const; },
      ([a, b, k]) => { const c = scale(b, k); assert.ok(areEquivalent(a, b) && areEquivalent(b, c) && areEquivalent(a, c)); });
    // And on arbitrary triples: whenever two pairs are equivalent, so is the third.
    forAll('transitive (random)', (r) => [frac(r, 6, 6), frac(r, 6, 6), frac(r, 6, 6)] as const,
      ([a, b, c]) => { if (areEquivalent(a, b) && areEquivalent(b, c)) assert.ok(areEquivalent(a, c)); }, 2000);
  });

  it('is scale-invariant: n/d equals kn/kd', () => {
    forAll('scale', (r) => ({ f: frac(r), k: r.int(1, 25) }), ({ f, k }) => assert.ok(areEquivalent(f, scale(f, k))));
  });

  it('agrees with lowest terms: equal exactly when the reduced fractions are identical', () => {
    forAll('lowest terms', (r) => [frac(r, 24, 24), frac(r, 24, 24)] as const, ([a, b]) => {
      const x = lowest(a); const y = lowest(b);
      assert.equal(areEquivalent(a, b), x.n === y.n && x.d === y.d);
    }, 1500);
  });

  it('a changed numerator or denominator is a different amount', () => {
    forAll('changed value', (r) => ({ f: { n: r.int(1, 120), d: r.int(1, 60) } }), ({ f }) => {
      assert.ok(!areEquivalent(f, { n: f.n + 1, d: f.d }));
      assert.ok(!areEquivalent(f, { n: f.n, d: f.d + 1 }));
    });
  });

  it('a zero or negative denominator is never equivalent to anything', () => {
    forAll('bad denominator', (r) => ({ f: frac(r), bad: r.int(-5, 0) }), ({ f, bad }) => {
      assert.ok(!areEquivalent(f, { n: f.n, d: bad }));
      assert.ok(!areEquivalent({ n: f.n, d: bad }, f));
    });
  });
});

describe('comparing fractions (compareFractions)', () => {
  it('is total: always -1, 0 or 1', () => {
    forAll('total', (r) => [frac(r), frac(r)] as const, ([a, b]) => assert.ok([-1, 0, 1].includes(compareFractions(a, b))));
  });

  it('is antisymmetric: swapping the two fractions flips the answer', () => {
    forAll('antisymmetric', (r) => [frac(r), frac(r)] as const, ([a, b]) => assert.equal(compareFractions(a, b), -compareFractions(b, a) || 0));
  });

  it('is reflexive: a fraction equals itself and every renaming of itself', () => {
    forAll('reflexive', (r) => ({ f: frac(r), k: r.int(1, 20) }), ({ f, k }) => {
      assert.equal(compareFractions(f, f), 0);
      assert.equal(compareFractions(f, scale(f, k)), 0);
    });
  });

  it('is transitive: a <= b and b <= c means a <= c', () => {
    forAll('transitive', (r) => [frac(r, 9, 9), frac(r, 9, 9), frac(r, 9, 9)] as const, ([a, b, c]) => {
      const ab = compareFractions(a, b); const bc = compareFractions(b, c); const ac = compareFractions(a, c);
      if (ab <= 0 && bc <= 0) assert.ok(ac <= 0);
      if (ab >= 0 && bc >= 0) assert.ok(ac >= 0);
      if (ab === 0 && bc === 0) assert.equal(ac, 0);
    }, 2000);
  });

  it('agrees with equivalence: 0 exactly when the two are equal', () => {
    forAll('equal iff equivalent', (r) => [frac(r, 12, 12), frac(r, 12, 12)] as const,
      ([a, b]) => assert.equal(compareFractions(a, b) === 0, areEquivalent(a, b)), 1500);
  });

  it('agrees with exact cross-multiplication (BigInt) and with the true order of the values', () => {
    forAll('cross-multiplication', (r) => [frac(r, 5000, 5000), frac(r, 5000, 5000)] as const, ([a, b]) => {
      const left = BigInt(a.n) * BigInt(b.d); const right = BigInt(b.n) * BigInt(a.d);
      assert.equal(compareFractions(a, b), left < right ? -1 : left > right ? 1 : 0);
    });
    // Small values: the decimal order is the same (no rounding trouble at this size).
    forAll('decimal order', (r) => [frac(r, 40, 40), frac(r, 40, 40)] as const, ([a, b]) => {
      const x = a.n / a.d; const y = b.n / b.d;
      if (Math.abs(x - y) > 1e-9) assert.equal(compareFractions(a, b), x < y ? -1 : 1);
    });
  });

  it('is scale-invariant on both sides', () => {
    forAll('scale', (r) => ({ a: frac(r), b: frac(r), j: r.int(1, 12), k: r.int(1, 12) }),
      ({ a, b, j, k }) => assert.equal(compareFractions(scale(a, j), scale(b, k)), compareFractions(a, b)));
  });

  it('same denominator: the bigger numerator wins; same numerator: the smaller denominator wins', () => {
    forAll('same denominator', (r) => ({ d: r.int(1, 60), a: r.int(0, 100), b: r.int(0, 100) }),
      ({ d, a, b }) => assert.equal(compareFractions({ n: a, d }, { n: b, d }), Math.sign(a - b)));
    forAll('same numerator', (r) => ({ n: r.int(1, 100), a: r.int(1, 60), b: r.int(1, 60) }),
      ({ n, a, b }) => assert.equal(compareFractions({ n, d: a }, { n, d: b }), Math.sign(b - a)));
  });

  it('adding a positive amount to the numerator always makes the fraction bigger', () => {
    forAll('monotone', (r) => ({ f: frac(r), more: r.int(1, 30) }), ({ f, more }) => assert.equal(compareFractions(f, { n: f.n + more, d: f.d }), -1));
  });
});

describe('ordering a row of cards (fractionOrderMatches)', () => {
  const cards = (r: Rng) => Array.from({ length: r.int(2, 6) }, () => { const f = frac(r, 12, 12); return { numerator: f.n, denominator: f.d }; });
  const byValue = (list: ReturnType<typeof cards>, sign: 1 | -1) =>
    [...list].sort((x, y) => sign * compareFractions({ n: x.numerator, d: x.denominator }, { n: y.numerator, d: y.denominator }));

  it('accepts any list sorted by value, in the direction it was sorted', () => {
    forAll('sorted', cards, (list) => {
      assert.ok(fractionOrderMatches(byValue(list, 1), 'ascending'));
      assert.ok(fractionOrderMatches(byValue(list, -1), 'descending'));
    });
  });

  it('is unchanged by renaming a card (3/6 sits where 1/2 sits)', () => {
    forAll('renamed', (r) => ({ list: cards(r), k: r.int(2, 5) }), ({ list, k }) => {
      const sorted = byValue(list, 1);
      const renamed = sorted.map((c, i) => (i % 2 ? { numerator: c.numerator * k, denominator: c.denominator * k } : c));
      assert.ok(fractionOrderMatches(renamed, 'ascending'));
    });
  });

  it('rejects the wrong direction and a swapped pair of different values', () => {
    forAll('wrong order', cards, (list) => {
      const up = byValue(list, 1);
      const values = new Set(up.map((c) => c.numerator / c.denominator));
      if (values.size < 2) return;
      assert.ok(!fractionOrderMatches(up, 'descending'));
      assert.ok(!fractionOrderMatches([...up].reverse(), 'ascending'));
      const i = up.findIndex((c, j) => j > 0 && compareFractions({ n: c.numerator, d: c.denominator }, { n: up[j - 1].numerator, d: up[j - 1].denominator }) !== 0);
      const swapped = [...up]; [swapped[i - 1], swapped[i]] = [swapped[i], swapped[i - 1]];
      assert.ok(!fractionOrderMatches(swapped, 'ascending'));
    });
  });

  it('needs at least two cards and positive denominators', () => {
    assert.equal(fractionOrderMatches([], 'ascending'), false);
    assert.equal(fractionOrderMatches([{ numerator: 1, denominator: 2 }], 'ascending'), false);
    forAll('bad denominator', (r) => ({ list: cards(r), at: r.int(0, 1), bad: r.int(-3, 0) }), ({ list, at, bad }) => {
      const broken = list.map((c, i) => (i === at ? { ...c, denominator: bad } : c));
      assert.equal(fractionOrderMatches(broken, 'ascending'), false);
      assert.equal(fractionOrderMatches(broken, 'descending'), false);
    });
  });
});

describe('reading an answer (parseAnswer)', () => {
  it('reads n/d exactly, with or without spaces around the slash', () => {
    forAll('fraction', (r) => frac(r, 500, 500), (f) => {
      assert.deepEqual(parseAnswer(text(f)), f);
      assert.deepEqual(parseAnswer(`  ${f.n} / ${f.d} `), f);
    });
  });

  it('reads a mixed number as the improper fraction it equals, with "w r/d" or "w and r/d"', () => {
    forAll('mixed', (r) => { const d = r.int(2, 30); return { w: r.int(0, 20), r: r.int(0, d - 1), d }; }, ({ w, r, d }) => {
      const want = { n: w * d + r, d };
      assert.deepEqual(parseAnswer(`${w} ${r}/${d}`), want);
      assert.deepEqual(parseAnswer(`${w} and ${r}/${d}`), want);
    });
  });

  it('refuses a zero denominator, and a mixed number whose fraction part is not under 1', () => {
    forAll('zero denominator', (r) => r.int(0, 50), (n) => { assert.equal(parseAnswer(`${n}/0`), null); assert.equal(parseAnswer(`1 ${n}/0`), null); });
    forAll('improper part', (r) => { const d = r.int(1, 20); return { w: r.int(0, 9), d, extra: r.int(0, 20) }; },
      ({ w, d, extra }) => assert.equal(parseAnswer(`${w} ${d + extra}/${d}`), null));
  });

  it('reads a decimal as the exact fraction over a power of ten (never a rounded float)', () => {
    forAll('decimal', (r) => { const places = r.int(1, 6); return { places, digits: r.int(0, 10 ** places - 1), whole: r.int(0, 99) }; }, ({ places, digits, whole }) => {
      const written = `${whole}.${String(digits).padStart(places, '0')}`;
      const got = parseAnswer(written);
      assert.ok(got, written);
      assert.equal(got.d, 10 ** places);
      assert.equal(got.n, whole * 10 ** places + digits);
    });
    forAll('whole number', (r) => r.int(0, 100000), (n) => assert.deepEqual(parseAnswer(String(n)), { n, d: 1 }));
  });

  it('reads the same amount the same way in every written form', () => {
    forAll('forms agree', (r) => { const d = r.pick(TERMINATING_DENOMINATORS); return { d, n: r.int(0, 3 * d) }; }, ({ n, d }) => {
      const base = parseAnswer(text({ n, d }))!;
      const viaDecimal = parseAnswer(decimalText(n, d))!;
      assert.equal(base.n * viaDecimal.d, viaDecimal.n * base.d);
      if (n % d) {
        const viaMixed = parseAnswer(`${Math.floor(n / d)} ${n % d}/${d}`)!;
        assert.equal(base.n * viaMixed.d, viaMixed.n * base.d);
      }
    });
  });

  it('refuses things that are not numbers', () => {
    for (const bad of ['', ' ', 'abc', '1/', '/2', '1/2/3', '-1/2', '1.2.3', '5.', '.5', '1 2', '1.5/2', '0.1234567']) assert.equal(parseAnswer(bad), null, JSON.stringify(bad));
  });
});

describe('checking a typed or tiled answer (answerMatches)', () => {
  it('accepts every equivalent fraction of the right answer, however spaced', () => {
    forAll('equivalents', (r) => ({ f: frac(r, 40, 24), k: r.int(1, 12), pad: r.pick(['', ' ', '  ']) }), ({ f, k, pad }) => {
      const p = problem(text(f));
      const g = scale(f, k);
      assert.ok(answerMatches(p, text(g)));
      assert.ok(answerMatches(p, `${pad}${g.n}${pad}/${pad}${g.d}${pad}`));
    });
  });

  it('accepts a whole number, a mixed number or a decimal that equals an improper-fraction answer', () => {
    forAll('other forms', (r) => { const d = r.pick(TERMINATING_DENOMINATORS); return { d, n: r.int(1, 4 * d) }; }, ({ n, d }) => {
      const p = problem(text({ n, d }));
      if (n % d === 0) assert.ok(answerMatches(p, String(n / d)), 'whole number');
      else {
        assert.ok(answerMatches(p, `${Math.floor(n / d)} ${n % d}/${d}`), 'mixed');
        assert.ok(answerMatches(p, `${Math.floor(n / d)} and ${n % d}/${d}`), 'mixed with "and"');
      }
      assert.ok(answerMatches(p, decimalText(n, d)), 'decimal');
    });
  });

  it('accepts a fraction or a longer decimal for a decimal answer when the form is not fixed, and the right decimal when it is', () => {
    forAll('decimal answer', (r) => { const d = r.pick(TERMINATING_DENOMINATORS); return { d, n: r.int(0, 3 * d) }; }, ({ n, d }) => {
      const dec = decimalText(n, d);
      assert.ok(answerMatches(problem(dec), text({ n, d })));
      const places = dec.split('.')[1].length;
      assert.ok(answerMatches(problem(dec), `${dec}${'0'.repeat(6 - places)}`), 'trailing zeros, up to the 6 places the checker reads');
      assert.ok(answerMatches(problem(dec, { form: 'decimal' }), dec));
      assert.ok(answerMatches(problem(dec, { form: 'decimal' }), `${dec}0`));
      assert.ok(!answerMatches(problem(dec, { form: 'decimal' }), text({ n, d })), 'a decimal question wants a decimal');
    });
  });

  it('a mixed-number question wants wholes and a fraction, and accepts any equal pair', () => {
    forAll('mixed form', (r) => { const d = r.int(2, 12); return { d, w: r.int(1, 9), t: r.int(1, d - 1), k: r.int(1, 4) }; }, ({ d, w, t, k }) => {
      const p = problem(`${w} ${t}/${d}`, { form: 'mixed' });
      assert.ok(answerMatches(p, `${w} ${t}/${d}`));
      assert.ok(answerMatches(p, `${w} and ${t}/${d}`));
      assert.ok(answerMatches(p, `${w} ${t * k}/${d * k}`));
      assert.ok(!answerMatches(p, text({ n: w * d + t, d })), 'an improper fraction is not a mixed number');
    });
  });

  it('rejects an answer whose value changed', () => {
    forAll('changed numerator', (r) => ({ f: frac(r, 60, 24), k: r.int(1, 6), by: r.int(1, 5) }), ({ f, k, by }) => {
      const p = problem(text(f));
      const g = scale(f, k);
      assert.ok(!answerMatches(p, text({ n: g.n + by * k, d: g.d })), 'numerator changed');
      assert.ok(!answerMatches(p, text({ n: g.n + by, d: g.d })), 'numerator changed by a non-multiple');
    });
    forAll('changed denominator', (r) => ({ f: { n: r.int(1, 60), d: r.int(2, 24) } }), ({ f }) => {
      assert.ok(!answerMatches(problem(text(f)), text({ n: f.n, d: f.d + 1 })));
    });
    forAll('changed whole', (r) => { const d = r.int(2, 12); return { d, w: r.int(1, 9), t: r.int(1, d - 1) }; }, ({ d, w, t }) => {
      const p = problem(`${w} ${t}/${d}`);
      assert.ok(!answerMatches(p, `${w + 1} ${t}/${d}`));
      assert.ok(!answerMatches(p, `${w} ${t}/${d + 1}`));
    });
    forAll('changed decimal', (r) => { const d = r.pick(TERMINATING_DENOMINATORS); return { d, n: r.int(1, 3 * d) }; }, ({ n, d }) => {
      assert.ok(!answerMatches(problem(decimalText(n, d)), decimalText(n + 1, d)));
    });
  });

  it('rejects words, blanks and zero denominators', () => {
    forAll('junk', (r) => ({ f: frac(r, 40, 24), junk: r.pick(['', ' ', 'abc', '1/', '/2', '3/0', '0/0', '1/2/3']) }), ({ f, junk }) => assert.ok(!answerMatches(problem(text(f)), junk)));
  });

  it('with a required denominator, accepts only that denominator', () => {
    forAll('denominator', (r) => { const f = { n: r.int(0, 40), d: r.int(1, 12) }; return { f, k: r.int(2, 6) }; }, ({ f, k }) => {
      const p = problem(text(f), { denominator: f.d * k });
      assert.ok(answerMatches(p, text(scale(f, k))));
      assert.ok(!answerMatches(p, text(f)), 'same amount, wrong denominator');
      assert.ok(!answerMatches(p, text(scale(f, k + 1))), 'same amount, another denominator');
    });
  });

  it('a percent answer accepts the number with or without the percent sign, and rejects another number', () => {
    forAll('percent', (r) => ({ p: r.int(1, 100), pad: r.pick(['', ' ']) }), ({ p, pad }) => {
      const q = problem(`${p}%`);
      assert.ok(answerMatches(q, `${p}%`));
      assert.ok(answerMatches(q, String(p)));
      assert.ok(answerMatches(q, `${p}${pad}%`));
      assert.ok(!answerMatches(q, `${p + 1}%`));
      assert.ok(!answerMatches(q, `${p + 1}`));
    });
  });

  it('an ordered answer accepts equal names in the same order and rejects any other order of different values', () => {
    forAll('ordered', (r) => { const d = r.int(2, 12); const a = r.int(1, d - 2); const b = r.int(a + 1, d - 1); return { d, a, b, k: r.int(1, 4) }; }, ({ d, a, b, k }) => {
      const p = problem(`${a}/${d},${b}/${d}`, { form: 'ordered' });
      assert.ok(answerMatches(p, `${a}/${d},${b}/${d}`));
      assert.ok(answerMatches(p, `${a * k}/${d * k},${b}/${d}`));
      assert.ok(!answerMatches(p, `${b}/${d},${a}/${d}`));
      assert.ok(!answerMatches(p, `${a}/${d}`));
    });
  });

  it('a yes/no answer ignores case and accepts the first letter; a symbol answer is exact', () => {
    for (const word of ['yes', 'no']) {
      const p = problem(word, { form: 'word' });
      for (const said of [word, word.toUpperCase(), ` ${word} `, word[0]]) assert.ok(answerMatches(p, said), said);
    }
    assert.ok(!answerMatches(problem('yes', { form: 'word' }), 'no'));
    assert.ok(!answerMatches(problem('no', { form: 'word' }), 'yes'));
    for (const symbol of ['<', '=', '>']) {
      const p = problem(symbol, { form: 'symbol' });
      assert.ok(answerMatches(p, symbol));
      for (const other of ['<', '=', '>'].filter((s) => s !== symbol)) assert.ok(!answerMatches(p, other));
    }
  });

  it('is symmetric: if "a" is accepted for answer "b", then "b" is accepted for answer "a"', () => {
    forAll('symmetric', (r) => [frac(r, 12, 12), frac(r, 12, 12)] as const,
      ([a, b]) => assert.equal(answerMatches(problem(text(a)), text(b)), answerMatches(problem(text(b)), text(a))), 1500);
  });
});

describe('the value of an answer text (answerValue, proof valueOf)', () => {
  it('both read every written form of an amount to the same number', () => {
    forAll('forms', (r) => { const d = r.pick(TERMINATING_DENOMINATORS); return { d, n: r.int(0, 3 * d) }; }, ({ n, d }) => {
      const want = n / d;
      const forms = [text({ n, d }), decimalText(n, d)];
      if (n % d) forms.push(`${Math.floor(n / d)} ${n % d}/${d}`, `${Math.floor(n / d)} and ${n % d}/${d}`);
      for (const written of forms) {
        assert.ok(Math.abs(answerValue(written) - want) < 1e-9, `answerValue(${written}) = ${answerValue(written)}`);
        assert.ok(Math.abs(valueOf(written) - want) < 1e-9, `valueOf(${written}) = ${valueOf(written)}`);
      }
    });
  });

  it('read a percent as a hundredth of the number, and ignore a trailing unit word', () => {
    forAll('percent and unit', (r) => ({ p: r.int(0, 100), unit: r.pick(['m', 'cups', 'inches']) }), ({ p, unit }) => {
      assert.ok(Math.abs(answerValue(`${p}%`) - p / 100) < 1e-9);
      assert.ok(Math.abs(valueOf(`${p}%`) - p / 100) < 1e-9);
      assert.ok(Math.abs(answerValue(`${p} ${unit}`) - p) < 1e-9);
      assert.ok(Math.abs(valueOf(`${p} ${unit}`) - p) < 1e-9);
    });
  });

  it('give NaN for text that is not a number', () => {
    for (const bad of ['', 'abc', '1/', '<']) { assert.ok(Number.isNaN(answerValue(bad)), bad); assert.ok(Number.isNaN(valueOf(bad)), bad); }
  });
});

describe('wrong answers for a choice question (choiceDistractors)', () => {
  /** Answers in the shapes and sizes the course asks for. */
  const answers = (r: Rng): string => {
    const d = r.int(2, 12);
    switch (r.int(0, 4)) {
      case 0: return text({ n: r.int(1, d - 1), d });
      case 1: return `${r.int(1, 5)} ${r.int(1, d - 1)}/${d}`;
      case 2: return decimalText(r.int(1, 9), 10);
      case 3: return decimalText(r.int(1, 99), 100);
      default: return `${r.int(1, 19) * 5}%`;
    }
  };

  it('gives two different wrong answers, neither equal in value to the right one, and never the right answer', () => {
    forAll('distractors', answers, (answer) => {
      const wrong = choiceDistractors(answer);
      assert.equal(wrong.length, 2);
      assert.ok(wrong.every((w) => typeof w === 'string' && w.length > 0), `got ${JSON.stringify(wrong)}`);
      assert.notEqual(wrong[0], wrong[1]);
      for (const w of wrong) {
        assert.notEqual(w, answer);
        assert.ok(Math.abs(answerValue(w) - answerValue(answer)) > 1e-9, `${w} has the same value as ${answer}`);
        assert.ok(!answerMatches(problem(answer), w), `${w} would be accepted for ${answer}`);
      }
    }, 600);
  });

  it('is deterministic: the same answer always gets the same wrong answers', () => {
    forAll('deterministic', answers, (answer) => {
      assert.deepEqual(choiceDistractors(answer), choiceDistractors(answer));
      assert.deepEqual(distractorCandidates(answer), distractorCandidates(answer));
    });
  });

  it('keeps the answer shape: a mixed answer gets mixed wrong answers, a percent gets percents', () => {
    forAll('shape', answers, (answer) => {
      const shapeOf = (s: string) => (/%$/.test(s) ? 'percent' : /^\d+ \d+\/\d+$/.test(s) ? 'mixed' : /\//.test(s) ? 'fraction' : /\./.test(s) ? 'decimal' : 'number');
      for (const w of choiceDistractors(answer)) assert.equal(shapeOf(w), shapeOf(answer), `${w} for ${answer}`);
    });
  });
});

describe('saying fractions aloud (sayFraction, spokenText)', () => {
  it('says n/1 as the whole number, and a single part in the singular but several parts in the plural', () => {
    forAll('whole', (r) => r.int(0, 500), (n) => assert.equal(sayFraction(n, 1), String(n)));
    forAll('singular', (r) => r.pick([2, 3, 4, 5, 6, 8, 10, 12]), (d) => {
      const one = sayFraction(1, d); const two = sayFraction(2, d);
      assert.match(one, /^one [a-z-]+$/);
      const unit = one.slice('one '.length);
      assert.equal(two, `two ${d === 2 ? 'halves' : `${unit}s`}`);
    });
  });

  it('every denominator the course teaches is a word, never "over"; unknown ones fall back to "over"', () => {
    forAll('words', (r) => ({ n: r.int(0, 12), d: r.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 100]) }), ({ n, d }) => {
      const said = sayFraction(n, d);
      assert.ok(!/\d/.test(said), said);
      assert.ok(!said.includes('over'), said);
    });
    forAll('fallback', (r) => ({ n: r.int(1, 99), d: r.pick([13, 17, 19, 23, 30, 99]) }), ({ n, d }) => assert.equal(sayFraction(n, d), `${n} over ${d}`));
  });

  it('spokenText turns every n/d in a sentence into words, and leaves no slash behind', () => {
    forAll('sentence', (r) => ({ n: r.int(1, 12), d: r.pick([2, 3, 4, 5, 6, 8, 10, 12]), m: r.int(1, 12), e: r.pick([2, 3, 4, 5, 6, 8, 10, 12]) }), ({ n, d, m, e }) => {
      const said = spokenText(`Is ${n}/${d} bigger than ${m}/${e}?`);
      assert.equal(said, `Is ${sayFraction(n, d)} bigger than ${sayFraction(m, e)}?`);
      assert.ok(!said.includes('/'));
    });
  });

  it('spokenText reads a mixed number as "wholes and the fraction"', () => {
    forAll('mixed', (r) => { const d = r.pick([2, 3, 4, 5, 6, 8, 10, 12]); return { w: r.int(1, 12), t: r.int(1, d - 1), d }; },
      ({ w, t, d }) => assert.equal(spokenText(`Write ${w} ${t}/${d} as a fraction.`), `Write ${w} and ${sayFraction(t, d)} as a fraction.`));
  });

  it('spokenText says a decimal digit by digit after "point"', () => {
    forAll('decimal', (r) => ({ whole: r.int(0, 9), digits: String(r.int(0, 999)).padStart(3, '0') }), ({ whole, digits }) => {
      const said = spokenText(`${whole}.${digits}`);
      const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
      assert.equal(said, `${words[whole]} point ${digits.split('').map((c) => words[Number(c)]).join(' ')}`);
    });
  });

  it('spokenText is idempotent on text that has no numbers left in it', () => {
    forAll('idempotent', (r) => `Color ${r.int(1, 7)}/${r.pick([2, 3, 4, 8])} of the square.`, (sentence) => {
      const once = spokenText(sentence);
      assert.equal(spokenText(once), once);
    });
  });
});

describe('naming a position as a mixed number (positionName)', () => {
  const position = (r: Rng) => ({ steps: r.int(0, 80), d: r.int(1, 16) });

  it('names exactly the value steps/d', () => {
    forAll('value', position, ({ steps, d }) => {
      const name = positionName(steps, d);
      const got = parseAnswer(name);
      assert.ok(got, name);
      assert.equal(got.n * d, steps * got.d, `${name} is not ${steps}/${d}`);
    });
  });

  it('is in simplest form: lowest terms, a proper fraction part, and wholes only when there are some', () => {
    forAll('simplest', position, ({ steps, d }) => {
      const name = positionName(steps, d);
      if (/^\d+$/.test(name)) { assert.equal(Number(name) * d, steps); return; }
      const match = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(name);
      assert.ok(match, name);
      const [, whole, top, bottom] = match;
      assert.equal(gcd(Number(top), Number(bottom)), 1, `${name} is not in lowest terms`);
      assert.ok(Number(top) < Number(bottom), `${name} has an improper fraction part`);
      assert.ok(Number(top) > 0);
      assert.notEqual(whole, '0');
      assert.equal(Number(whole ?? 0), Math.floor(steps / d));
    });
  });

  it('gives the same name to every renaming of the same position (scale-invariant)', () => {
    forAll('scale', (r) => ({ ...position(r), k: r.int(1, 9) }), ({ steps, d, k }) => assert.equal(positionName(steps * k, d * k), positionName(steps, d)));
  });

  it('round-trips improper to mixed and back: naming the parsed name gives the same name again', () => {
    forAll('round trip', position, ({ steps, d }) => {
      const name = positionName(steps, d);
      const back = parseAnswer(name)!;
      assert.equal(positionName(back.n, back.d), name);
    });
  });

  it('adding whole steps adds that many wholes and leaves the fraction part alone', () => {
    forAll('add wholes', (r) => ({ ...position(r), w: r.int(1, 9) }), ({ steps, d, w }) => {
      const before = positionName(steps, d);
      const after = positionName(steps + w * d, d);
      const part = /(\d+\/\d+)$/.exec(before)?.[1];
      const wholes = Math.floor(steps / d) + w;
      assert.equal(after, part ? `${wholes} ${part}` : String(wholes));
    });
  });
});

describe('stacking a tower (correctGap, towerStands, versusHalf)', () => {
  const block = (r: Rng): FractionModel => ({ n: r.int(1, 11), d: r.int(2, 12) });

  it('versusHalf agrees with compareFractions against 1/2', () => {
    forAll('half', block, (b) => assert.equal(versusHalf(b), compareFractions(b, { n: 1, d: 2 })));
  });

  it('a block placed in the gap correctGap names always leaves a standing tower', () => {
    forAll('placement', (r) => {
      const tower: FractionModel[] = [];
      for (let i = r.int(1, 5); i > 0; i--) tower.push(block(r));
      return { tower, next: block(r) };
    }, ({ tower, next }) => {
      // Build a standing tower (biggest at the bottom) from distinct values.
      const standing = [...tower].sort((a, b) => compareFractions(b, a)).filter((b, i, all) => i === 0 || compareFractions(all[i - 1], b) !== 0);
      assert.ok(towerStands(standing));
      if (standing.some((b) => areEquivalent(b, next))) return; // an equal block has no strict place
      const gap = correctGap(standing, next);
      assert.ok(gap >= 0 && gap <= standing.length);
      const after = [...standing.slice(0, gap), next, ...standing.slice(gap)];
      assert.ok(towerStands(after));
      // Every other gap leaves a tower that falls.
      for (let other = 0; other <= standing.length; other++) {
        if (other !== gap) assert.ok(!towerStands([...standing.slice(0, other), next, ...standing.slice(other)]), `gap ${other}`);
      }
    });
  });
});

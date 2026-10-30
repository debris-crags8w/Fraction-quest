import { withoutUnit } from './measure-units';
import { answerValue } from './learning-content';
import { slipReason } from './misconceptions';
import { WHY } from './slip-reasons';

/* What to say after a wrong tap: a kind opener, then (when we can tell) the exact slip behind the choice the
   child picked ("You flipped it"), so the help is about their thinking. It never names the right answer. */

export const OPENERS = ['Good try!', 'Almost!', 'Let’s look together.', 'Keep going!', 'Nice effort!'];
/** A kind opener that changes from question to question (and try to try), but is the same on every visit. */
export function retryOpener(seed: string): string {
  const h = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  return OPENERS[h % OPENERS.length];
}

const FRACTION = /^(\d+)\/(\d+)$/;
const DECIMAL = /^\d*\.\d+$/;
/** "1/6 + 4/6" in the question → the two fractions being added or taken away (same bottom number). */
const LIKE_SUM = /(\d+)\/(\d+)\s*([+−-])\s*(\d+)\/\2\b/;
/** Questions where the child counts shaded and total parts in a picture. Only there are the counting sentences
    (SLIPS.flipped, allParts, recountParts, recountShaded) the true reason; anywhere else a real slip wins. */
const PICTURE_COUNT = /\b(?:shaded|colou?red)\b|\bequal (?:parts|tiles|pieces)\b/;
const REVIEW_LABEL = /^Quick review · [^:]+: /;
const EQUAL_PICK = /^they (?:are|match|cover)|^they are the same|equally/i;
const CANT_TELL = /^you can'?t tell$/i;

/** Every slip sentence wrongChoiceReason can say (the voice pack lists them). */
export const SLIPS = {
  canTell: 'You can tell! Look at the picture and compare.',
  notSame: 'They are not the same amount. Compare them again.',
  flipped: 'You flipped it. The parts you count go in the numerator. All the equal parts go in the denominator.',
  addTops: 'Add only the numerators. The pieces stay the same size, so the denominator stays the same.',
  takeTops: 'Take away only the numerators. The pieces stay the same size, so the denominator stays the same.',
  allParts: 'The denominator is all the equal parts, not parts plus shaded. Count all the parts.',
  recountParts: 'Count all the equal parts again, one at a time.',
  rulerLong: 'That counts the tick marks. Count the spaces between them, starting at 0.',
  rulerShort: 'Count every space up to the very end of the strip.',
  recountShaded: 'Count the parts again, one at a time.',
  places: 'Check the places. Tenths are 1 place after the decimal point. Hundredths are 2 places.',
  tooSmall: 'That one is smaller. Look for the one that covers more.',
  tooBig: 'That one is bigger. Look for the one that covers less.',
};

/** The slip behind a wrong worksheet answer, from the row's question and the answer the child entered; null when it is not one we can name. */
export function worksheetWrongReason(prompt: string, answer: string, picked: string): string | null {
  return wrongChoiceReason(prompt, [answer, picked.trim()], 0, 1);
}

/** What a wrong worksheet answer says, on screen, from its Listen button and read aloud: the named slip, then the hint. */
export function worksheetFeedbackSpeech(row: { prompt: string; answer: string; hint: string }, picked: string): string {
  return `Not yet. ${[worksheetWrongReason(row.prompt, row.answer, picked), row.hint].filter(Boolean).join(' ')}`;
}

/** What a worksheet row says after a right answer, so a child who guessed still hears the reason: its own "why", else its
    hint when that is a statement (a hint that asks a question is not a reason). */
export function worksheetWhy(row: { why?: string; hint: string }): string | undefined {
  return row.why ?? (row.hint && !/\?/.test(row.hint) ? row.hint : undefined);
}

/** The slip behind a wrong choice, in one short sentence, or null when it is not one we can name. */
export function wrongChoiceReason(prompt: string, choices: string[], correct: number, chosen: number): string | null {
  if (chosen === correct || !choices[chosen]) return null;
  // Measurement choices carry their unit ("3/4 liter"); the slips are about the amount.
  const pick = withoutUnit(choices[chosen].trim());
  const right = withoutUnit(choices[correct].trim());
  const p = prompt.replace(REVIEW_LABEL, '').toLowerCase(); // the "Quick review · Topic:" label is not part of the question

  // "Which is bigger, 1/4 or 1/6?": the reason for this pick, whichever of the four the child tapped.
  const sized = whichSizeReason(prompt, pick, right);
  if (sized) return sized;
  // "You can't tell" on a sign question: you can, and the way to is the one the question's numbers need.
  if (CANT_TELL.test(pick) && /__/.test(p)) return / × /.test(p) ? WHY.scaleCompare : / \+ /.test(p) ? WHY.benchmarkSum : /\d*\.\d+/.test(p) ? WHY.sameWay : WHY.canTellSize;
  if (CANT_TELL.test(pick)) return SLIPS.canTell;
  if (EQUAL_PICK.test(pick)) return SLIPS.notSame;

  // Reading a ruler: one space long (counting the ticks, not the spaces) or one space short.
  if (/use the ruler\. how long/.test(p)) {
    const [pv, rv] = [answerValue(pick), answerValue(right)];
    const space = Math.max(...[pick, right].map((x) => Number(/\/(\d+)$/.exec(x)?.[1] ?? 4)));
    if (Math.abs(pv - rv - 1 / space) < 1e-9) return SLIPS.rulerLong;
    if (Math.abs(rv - pv - 1 / space) < 1e-9) return SLIPS.rulerShort;
  }

  const f = FRACTION.exec(pick);
  const r = FRACTION.exec(right);
  // The real slip behind this pick, ahead of the general counting sentences, unless a picture is being counted.
  const own = PICTURE_COUNT.test(p) ? null : specificReason(prompt, right, pick);
  if (f && r) {
    const [pt, pb] = [Number(f[1]), Number(f[2])];
    const [rt, rb] = [Number(r[1]), Number(r[2])];
    const sum = LIKE_SUM.exec(prompt);
    if (sum && pb === Number(sum[2]) * 2 && pt === rt) return sum[3] === '+'
      ? SLIPS.addTops
      : SLIPS.takeTops;
    // The same in words: "A recipe uses 3/6 cup, then 3/6 cup more. How much in all?" answered 6/12.
    const two = [...p.matchAll(/(\d+)\/(\d+)/g)];
    if (two.length === 2 && two[0][2] === two[1][2] && pb === Number(two[0][2]) * 2 && pt === rt && /\b(?:together|in all|altogether)\b/.test(p)) return SLIPS.addTops;
    // The counting sentences are about shading and counting parts, so they are the true reason only for those questions;
    // anywhere else a pick that is the right answer upside down is just upside down. Naming a counted whole ("A tray has
    // 6 spaces. 4 have a snack.") keeps the longer sentence about which number counts what.
    const picture = PICTURE_COUNT.test(p);
    const flip = pt === rb && pb === rt && pt !== pb;
    if (flip && (picture || /\b(?:has|have) \d+ (?:equal )?(?:spaces|parts|tiles|pieces)\b/.test(p)) && (!own || own === WHY.upsideDown)) return SLIPS.flipped;
    if (own) return own;
    if (flip) return WHY.upsideDown;
    if (pt === rt && pb === rt + rb && picture) return SLIPS.allParts;
    if (pt === rt && Math.abs(pb - rb) === 1 && /\b(?:piece|part|space|slice|jump|tile|equal)\b/.test(p)) return SLIPS.recountParts;
    if (pb === rb && Math.abs(pt - rt) === 1 && (picture ? /\b(?:shaded|colou?red|jumps?|pieces?|parts?)\b/ : /\b(?:jumps?|pieces?|spaces?|parts?)\b/).test(p) && !LIKE_SUM.test(prompt)) return SLIPS.recountShaded;
  }

  if (DECIMAL.test(pick) && DECIMAL.test(right)) {
    if (own) return own;
    const [pv, rv] = [answerValue(pick), answerValue(right)];
    if (Number.isFinite(pv) && Number.isFinite(rv) && (Math.abs(pv * 10 - rv) < 1e-9 || Math.abs(pv - rv * 10) < 1e-9)) {
      return SLIPS.places;
    }
  }

  // "Which is bigger…?" picking the smaller one (or the other way round).
  const [pv, rv] = [answerValue(pick), answerValue(right)];
  if (Number.isFinite(pv) && Number.isFinite(rv) && /\bwhich\b/.test(p) && !/(?:more|less) than/.test(p)) {
    if (/\b(?:bigger|biggest|greater|larger|more)\b/.test(p) && pv < rv) return SLIPS.tooSmall;
    if (/\b(?:smaller|smallest|less|fewer)\b/.test(p) && pv > rv) return SLIPS.tooBig;
  }
  const compared = comparisonReason(prompt, pick, right);
  if (compared) return compared;
  // A real mistake the question's wrong choices were made from (misconceptions.ts, fraction-slips.ts).
  const why = slipReason(prompt, right, pick);
  if (why) return WHY[why];
  const named = meaningReason(p, pick, right);
  if (named) return named;
  // The practice questions' own picks (yes/no reasons, counts, renaming, stories in steps, units and money).
  const practiced = practiceReason(prompt, pick, right);
  if (practiced) return practiced;
  // A line plot count with no known slip behind it: count again.
  return /line plot.*how many/.test(p) && /^\d+$/.test(pick) ? WHY.countMarks : null;
}

/** "Which is bigger, 1/4 or 1/6?" The two amounts being compared. */
const OPERANDS = /(\d+\/\d+|\d*\.\d+) or (\d+\/\d+|\d*\.\d+)\?$/;
/** The reason a wrong tap on a which-is-bigger (or smaller) question is wrong, from how the two amounts relate: the
    same numerator (the bottom number only changes the size of the parts), the same denominator (count the pieces),
    neither, or a decimal beside a fraction. Never says which amount is bigger. Null when the question is not that
    kind, or the pick is not one of the amounts or an answer about them. */
function whichSizeReason(prompt: string, pick: string, right: string): string | null {
  // "Which covers more: 3/8 or 3/6?" asks the same thing as "Which is bigger".
  const p = prompt.replace(REVIEW_LABEL, '').toLowerCase().replace(/\bcovers more\b/, 'bigger').replace(/\bcovers less\b/, 'smaller');
  if (!/\bwhich\b/.test(p) || /(?:more|less) than/.test(p) || !/\b(?:bigger|biggest|greater|larger|smaller|smallest)\b/.test(p)) return null;
  const operands = OPERANDS.exec(prompt);
  if (!operands) return null;
  const [a, b] = [FRACTION.exec(operands[1]), FRACTION.exec(operands[2])];
  const how = a && b ? (a[1] === b[1] ? 'top' : a[2] === b[2] ? 'bottom' : 'both') : 'mixed';
  if (CANT_TELL.test(pick)) return how === 'mixed' ? WHY.sameWay : WHY.canTellSize;
  if (EQUAL_PICK.test(pick)) return { top: WHY.sameCountSizes, bottom: WHY.sameSizeCounts, both: WHY.bothDiffer, mixed: WHY.sameWay }[how];
  if (pick !== operands[1] && pick !== operands[2]) return null;
  const [pv, rv] = [answerValue(pick), answerValue(right)];
  // "Which has bigger parts, 1/6 or 5/6?" with "The parts are the same size" as the answer.
  if (!Number.isFinite(rv)) {
    // "Which is bigger, 8/12 or 2/3?" when they are equal: a different size of part and number of parts, the same amount.
    if (EQUAL_PICK.test(right)) return how === 'mixed' ? WHY.sameWay : WHY.sizeAndCount;
    return /\bparts\b/.test(p) && a && b ? WHY.topCounts : null;
  }
  const wrongWay = /\b(?:bigger|biggest|greater|larger)\b/.test(p) ? pv < rv : pv > rv;
  if (!wrongWay) return null;
  if (how === 'top') return WHY.bigBottom;
  if (how === 'bottom') return WHY.sameSizeCount;
  if (how === 'both') {
    // The pick has the bigger numbers on top and bottom (5/8 against 1/2 the wrong way round): bigger numbers are not a bigger fraction.
    const [mine, other] = pick === operands[1] ? [a!, b!] : [b!, a!];
    return Number(mine[1]) > Number(other[1]) && Number(mine[2]) > Number(other[2]) ? WHY.bigNumbers : WHY.sizeAndCount;
  }
  const digits = (text: string) => (/^\d*\.(\d+)$/.exec(text)?.[1].length ?? 0);
  return !a && !b && digits(pick) > digits(pick === operands[1] ? operands[2] : operands[1]) ? WHY.moreDigits : WHY.sameWay;
}

/** The real slip behind a wrong fraction (or decimal) pick, for the questions where the general counting sentences
    would be about something else: a slip the question's choices were made from (misconceptions.ts), a rename, two
    unlike fractions added across, a missing part, "which fraction is one whole". Null when none is known. */
function specificReason(fullPrompt: string, right: string, pick: string): string | null {
  const why = slipReason(fullPrompt, right, pick);
  if (why) return WHY[why];
  const prompt = fullPrompt.replace(REVIEW_LABEL, '');
  const [f, r] = [FRACTION.exec(pick), FRACTION.exec(right)];
  if (!f || !r) return null;
  const [pt, pb, rt, rb] = [Number(f[1]), Number(f[2]), Number(r[1]), Number(r[2])];
  // "Rename 1/2 as sixths." "What is 3/4 in eighths?": the top kept, the same number added to both, the bottom kept, upside down.
  const rename = /\b(?:Rename|What is) (\d+)\/(\d+) (?:as|in) [a-z]+[.?]$/.exec(prompt);
  if (rename) {
    const [a, b] = [Number(rename[1]), Number(rename[2])];
    if (a * rb !== rt * b) return null;
    if (pb === rb && pt === a) return WHY.keptTop;
    if (pb === rb && pt === a + rb - b) return WHY.addedSame;
    if (pb === b && pt === rt) return WHY.keptBottom;
    return pt === rb && pb === rt ? WHY.upsideDown : null;
  }
  // Two unlike fractions, and the denominators added (even in a subtraction): "1/3 + 1/6" or "A board is 1/3 meter. Another is 1/6 meter."
  const fractions = [...prompt.matchAll(/(\d+)\/(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  if (fractions.length === 2 && fractions[0][1] !== fractions[1][1] && pb === fractions[0][1] + fractions[1][1] && rb !== pb) {
    if (/[+−-] \d+\/\d+|\b(?:together|in all|altogether)\b/.test(prompt)) return WHY.addedBottoms;
  }
  // The part taken away (or the one you started with) is one of the two amounts: "5/6 − 1/2" answered 3/6.
  const operands = /^(\d+)\/(\d+) ([+−-]) (\d+)\/(\d+) = \?$/.exec(prompt);
  if (operands) {
    const [a, b, c, d] = [operands[1], operands[2], operands[4], operands[5]].map(Number);
    const add = operands[3] === '+';
    if (pt * d === c * pb) return add ? WHY.oneAmount : WHY.takenAmount;
    if (pt * b === a * pb) return add ? WHY.oneAmount : WHY.startAmount;
  }
  // Fair shares of one thing: "3 friends share a pizza fairly. What fraction does each friend get?" answered 1/4: a share counted twice.
  const shares = /^(\d+) friends share an? \w+ fairly\. What (?:fraction|part)/.exec(prompt);
  if (shares && pt === rt && pb === rt + rb) return WHY.countOnce;
  // A number line: the tick marks counted, not the spaces ("A line has 4 equal spaces").
  const spaces = /\b(?:0 to 1|line)(?: from 0 to 1)? has (\d+) equal spaces\b/.exec(prompt);
  if (spaces && pt === rt && pb === Number(spaces[1]) + 1) return WHY.ticks;
  // "Which of these fractions is less than 1 whole?"
  const side = /^Which .*\b(more|less) than (?:one|1) whole\?$/.exec(prompt);
  if (side && pt !== pb) return side[1] === 'less' ? (pt > pb ? WHY.notLess : null) : (pt < pb ? WHY.notMore : null);
  // "1/4 + ? = 1. What is the missing part?": the part already there, past one whole, not yet one whole.
  const missing = /^(\d+)\/(\d+) \+ \? = 1\b/.exec(prompt);
  if (missing) {
    const [a, b] = [Number(missing[1]), Number(missing[2])];
    const [num, den] = [a * pb + pt * b, b * pb];
    return pt * b === a * pb ? WHY.sameAgain : num > den ? WHY.addedWhole : num < den ? WHY.notYetWhole : null;
  }
  if (/^Which fraction is one whole\?$/.test(prompt) && pt !== pb) return WHY.allPartsWhole;
  return null;
}

/** The whole number a pick starts with: "7 spaces" and "3 jumps from 0" are 7 and 3. NaN for a fraction or words. */
const leadNumber = (text: string) => { const m = /^(\d+)(?![\d/])/.exec(text); return m ? Number(m[1]) : NaN; };
const COUNTED = /\bhow many (?:equal )?(?:parts|spaces|slices|pieces|jumps)\b|\bwhat is the (?:denominator|numerator)\b/;

/** Wrong picks whose slip is not in the numbers themselves: what a number in a fraction means, counting parts, cuts,
    spaces and jumps, the one-half and one benchmarks, and the size of a factor. `p` is the lower-case question. The
    sentences are about the slip and never say the right answer. Null when the pick is none of these. */
function meaningReason(p: string, pick: string, right: string): string | null {
  const fraction = /(\d+)\/(\d+)/.exec(p);
  const [top, bottom] = fraction ? [Number(fraction[1]), Number(fraction[2])] : [NaN, NaN];
  // "In 2/6, what does the 6 mean?"
  const mean = /^in (\d+)\/(\d+), what does the (\d+) mean\?$/.exec(p);
  if (mean) {
    const lower = mean[3] === mean[2];
    if (/\bwholes?\b/.test(pick)) return WHY.notWholes;
    if (lower) return /shaded|counted|taken/.test(pick) ? WHY.bottomNotShaded : null;
    return /\bnot\b/.test(pick) ? WHY.topNotLeft : /\bin all\b/.test(pick) ? WHY.topNotAll : null;
  }
  // "3 out of 8 equal parts are shaded. What fraction is shaded?": the parts not shaded, or every part, counted on top.
  const shaded = /^(\d+) out of (\d+) equal parts are shaded\. what fraction is shaded\?$/.exec(p);
  const picked = FRACTION.exec(pick);
  if (shaded && picked) return Number(picked[1]) === Number(shaded[2]) - Number(shaded[1]) ? WHY.notShadedCount : Number(picked[1]) === Number(shaded[2]) ? WHY.topNotAll : null;
  // "Are the parts the same size?", "Is this strip cut into 3 equal parts?": counting the parts does not answer it.
  if (/\b(?:equal (?:parts|slices)|the same size)\?$/.test(p) && /^(?:yes|no), (?:there (?:are|must be)|it needs|\d+ equal)/i.test(pick)) return WHY.countNotSize;
  // "A line has 8 equal spaces. Where is 3/8?": the bottom number used, the jumps left to one, jumps back from one.
  const where = /^a line has \d+ equal spaces\. where is (\d+)\/(\d+)\?$/.exec(p);
  if (where && /^\d+ jumps/.test(pick)) {
    const n = leadNumber(pick);
    return /\bback from 1\b/.test(pick) ? WHY.jumpsForward : n === Number(where[2]) ? WHY.askedTop : n === Number(where[2]) - Number(where[1]) ? WHY.jumpsToOne : null;
  }
  // One half: "Is 1/3 more or less than 1/2?", "Is that more or less than half?", "a little more or a little less".
  if (/\b(?:more or less than|a little more or a little less than) (?:1\/2|half)\?$/.test(p)) {
    if (/^(?:exactly|equal to)\b/i.test(pick)) return WHY.notExactHalf;
    if (/^much\b/i.test(pick)) return WHY.nearHalfSize;
    if (/\bthan (?:1|one whole)$/i.test(pick)) return WHY.otherBenchmark;
    return /^(?:a little )?(?:more|less)\b/i.test(pick) ? WHY.halfOfBottom : null;
  }
  if (/^which fraction is exactly one half\?$/.test(p) && FRACTION.test(pick)) return WHY.halfOfBottom;
  // "Is 5/8 nearer 1/2 or 1?", "Is that near 0, 1/2 or 1 meter?"
  if (/\bnearer \S+ or \S+\?$/.test(p)) return /^exactly\b/i.test(pick) ? WHY.notExactNear : /^nearer\b/i.test(pick) ? WHY.farther : null;
  if (/\b(?:near|closest to) 0, 1\/2 or 1\b/.test(p) && /^\d/.test(pick)) return WHY.farther;
  // Multiplying: is the factor more or less than one, and what that does.
  if (/^in .+ × .+, is the factor \d+\/\d+ more or less than 1\?$/.test(p)) return WHY.topVsBottom;
  if (/ × .*\b(?:more or less than|more than|the same as) /.test(p) && /^(?:more|less|equal|yes|no)\b/i.test(pick)) return WHY.scaleCompare;
  if (/^which one is (?:more|less) than \d+\?$/.test(p) && / × /.test(pick)) return WHY.scaleCompare;
  if (/\bsays multiplying always\b/.test(p)) return /^yes\b/i.test(pick) ? WHY.tryUnderOne : /^no\b/i.test(pick) ? WHY.tryOverOne : null;
  // "3 × 1/3 = ?", "What is 3 groups of 2/3?" answered with the one fraction that is in the question: one group only.
  const groups = /^(?:(\d+) × (\d+\/\d+) = \?|what is (\d+) groups? of (\d+\/\d+)\?)$/.exec(p);
  if (groups && pick === (groups[2] ?? groups[4])) return WHY.oneGroup;
  // "Which is the same as 3 × 2/5?": the small parts counted wrong, or a different size of part.
  const same = /^which is the same as (\d+) × (\d+)\/(\d+)\?$/.exec(p);
  const units = /^(\d+) × 1\/(\d+)$/.exec(pick);
  if (same && units) return Number(units[2]) !== Number(same[3]) ? WHY.sameBottom : Number(units[1]) !== Number(same[1]) * Number(same[2]) ? WHY.unitCount : null;
  const [pn, rn] = [leadNumber(pick), leadNumber(right)];
  if (Number.isFinite(pn) && Number.isFinite(rn)) {
    const cuts = /\bhas (\d+) cuts\b/.exec(p);
    if (cuts && pn === Number(cuts[1])) return WHY.cutsNotParts;
    if (/\btick marks\b/.test(p) && pn === rn + 1) return WHY.ticksNotSpaces;
    if (fraction && /\bhow many parts are counted\b|\bnumerator\b/.test(p)) return pn === bottom ? WHY.askedTop : pn === top + bottom ? WHY.addedBoth : null;
    if (fraction && /\bdenominator\b/.test(p)) return pn === top ? WHY.askedBottom : null;
    const half = /^half of an? \w+ is (\d+)\b/.exec(p);
    if (half && pn === Number(half[1])) return WHY.halfOnly;
    if (COUNTED.test(p) && Math.abs(pn - rn) === 1) return SLIPS.recountParts;
    // A bare number the question already gave: it is not the answer to what the question asks. Where the slip is
    // known, it is named: the number of groups or all of them for one group's share, a denominator for a blank numerator.
    if (!/^\d+$/.test(pick) || !new RegExp(`\\b${pick}\\b`).test(p)) return null;
    if (/\bin (?:one|each) group\?/.test(p)) {
      if (new RegExp(`\\b${pick} equal groups\\b`).test(p)) return WHY.groupsNotEach;
      const wholes = (p.replace(/\d+\/\d+/g, ' ').match(/\d+/g) ?? []).map(Number);
      if (pn === Math.max(...wholes)) return WHY.allNotEach;
    }
    if (/\?\/\d+/.test(p) && new RegExp(`\\d+\\/${pick}\\b`).test(p)) return WHY.blankIsTop;
    if (/\d+\/\?/.test(p) && new RegExp(`\\b${pick}\\/\\d+`).test(p)) return WHY.blankIsBottom;
    return WHY.justNumber;
  }
  return null;
}

const SIGN = /^(.+?) ([<>=]) (.+?)(?: ([<>=]) (.+))?$/;
/** "a < b" and "b > a" say the same thing: as [smaller-or-equal side, sign, other side] with the sign < or =. */
function claim(text: string): [string, string, string] | null {
  const m = SIGN.exec(text);
  if (!m || m[4]) return null;
  return m[2] === '>' ? [m[3], '<', m[1]] : [m[1], m[2], m[3]];
}
const isDecimal = (text: string) => /^\d*\.\d+$/.test(text);
const unitTop = (text: string) => /^(\d+)\/(\d+)$/.exec(text);

/** Comparing, ordering and benchmark questions: the slip behind the picked sign, order or amount. */
function comparisonReason(prompt: string, pick: string, right: string): string | null {
  const p = prompt.replace(REVIEW_LABEL, '').toLowerCase();
  // Orders: "1/3 < 2/3 < 3/3".
  const [po, ro] = [SIGN.exec(pick), SIGN.exec(right)];
  if (po?.[4] && ro?.[4]) {
    const items = (m: RegExpExecArray) => [m[1], m[3], m[5]];
    const [pi, ri] = [items(po), items(ro)];
    const sameWay = po[2] === ro[2];
    return (sameWay ? pi.join() === [...ri].reverse().join() : pi.join() === ri.join()) ? WHY.backwards : WHY.orderPair;
  }
  // Signs: "1/6 < 1/4", "3/4 + 1/2 > 1", "3/2 × 12 > 12".
  const [pc, rc] = [claim(pick), claim(right)];
  if (pc && rc) {
    if (pc[1] === '=') return SLIPS.notSame;
    if (/ × /.test(pick)) return WHY.scaleCompare;
    if (/ \+ /.test(pick)) return WHY.benchmarkSum;
    if (rc[1] === '=') return SLIPS.notSame;
    // The child says pc[0] is the smaller one.
    const [small, big] = [pc[0], pc[2]];
    const [su, bu] = [unitTop(small), unitTop(big)];
    if (su && bu && su[1] === bu[1] && Number(su[2]) < Number(bu[2])) return WHY.bigBottom;
    if (isDecimal(small) && isDecimal(big) && small.split('.')[1].length < big.split('.')[1].length) return WHY.moreDigits;
    return WHY.signWay;
  }
  if (/^which (?:sum|adds up)/.test(p) && / \+ /.test(pick)) {
    // Unlike parts are not checked by adding numerators: say the parts are a different size (when the right sum uses one size).
    const bottoms = (text: string) => new Set([...text.matchAll(/\d+\/(\d+)/g)].map((m) => m[1]));
    const [mine, theirs] = [bottoms(pick), bottoms(right)];
    return theirs.size === 1 && [...mine].some((d) => !theirs.has(d)) ? WHY.sumOtherSize : WHY.sumCheck;
  }
  if (/between which two whole numbers/.test(p)) return WHY.betweenWholes;
  if (/which length has the most xs\?$/.test(p)) return WHY.mostXs;
  // Benchmarks: "Which is closest to 1/2?", "Which is more than 1/2?", "Which fits between 2/8 and 6/8?"
  const v = answerValue(pick);
  if (!/^which\b/.test(p) || !Number.isFinite(v)) return null;
  const amount = (text: string) => answerValue(text.replace(/^one whole$|^one$/, '1'));
  const between = /between (\S+) and (\S+?)\?$/.exec(p);
  if (between) {
    const [lo, hi] = [amount(between[1]), amount(between[2])];
    return Number.isFinite(lo) && Number.isFinite(hi) && (v <= lo || v >= hi) ? WHY.outside : null;
  }
  // "Which is closer to 1/2: 5/6 or 4/6?", "Which is farther from one whole: 1/2 or 1/6?"
  const near = /(closest|closer|nearest|farther|farthest) (?:to|from) ([^:?]+?)(?::[^?]*)?\?$/.exec(p);
  if (near) return Number.isFinite(amount(near[2].replace(/^(?:one whole|the whole bar)$/, '1'))) ? (/^far/.test(near[1]) ? WHY.nearer : WHY.farther) : null;
  const side = /(more|less) than (.+?)\?$/.exec(p);
  if (side) {
    const target = amount(side[2]);
    if (!Number.isFinite(target)) return null;
    // Against one half, the way to check is half of the bottom number.
    if (target === 0.5 && (side[1] === 'more' ? v <= target : v >= target)) return WHY.halfOfBottom;
    if (side[1] === 'more' && v <= target) return WHY.notMore;
    if (side[1] === 'less' && v >= target) return WHY.notLess;
    return /a little/.test(p) ? WHY.farther : null;
  }
  return null;
}

const PART_NUMBER: Record<string, number> = { half: 2, halves: 2, third: 3, thirds: 3, fourth: 4, fourths: 4, fifth: 5, fifths: 5, sixth: 6, sixths: 6, eighth: 8, eighths: 8, tenth: 10, tenths: 10, twelfth: 12, twelfths: 12 };
const fractionsIn = (text: string) => [...text.matchAll(/(\d+)\/(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);
const near = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
/** "5/8 inch" or "3/8" as [top, bottom]; null for anything else. */
const asFraction = (text: string): [number, number] | null => { const m = /^(\d+)\/(\d+)$/.exec(text.trim()); return m ? [Number(m[1]), Number(m[2])] : null; };

/** The practice questions' own picks that no rule above names: yes/no picks with a reason in them, counts of parts,
    spaces, jumps and Xs, renaming one fraction, stories in steps, sharing and fitting, units and money. Each says the
    slip behind the pick and never the right answer (no sentence has a digit). Null when the pick is none of these. */
function practiceReason(fullPrompt: string, pick: string, right: string): string | null {
  const prompt = fullPrompt.replace(REVIEW_LABEL, '');
  const p = prompt.toLowerCase();
  const k = pick.toLowerCase();
  // "6 square units" and "1/8 square meter" are amounts too.
  const bare = (text: string) => text.replace(/ square [a-z]+$/i, '');
  const [pv, rv] = [answerValue(bare(pick)), answerValue(bare(right))];
  const pf = asFraction(bare(pick)); const rf = asFraction(bare(right));
  const nums = fractionsIn(prompt);
  let m: RegExpExecArray | null;

  // Yes or no, with a reason: is it fourths, are the parts equal, does it make sense, is the claim right.
  if (/^does this bar show \d+\/\d+\?$/.test(p)) return /not shaded/.test(k) ? WHY.notShadedCount : /parts are shaded/.test(k) ? SLIPS.recountShaded : /has \d+ parts/.test(k) ? WHY.alsoShaded : null;
  if (/same size as the parts of|what size are the parts in|have the same size parts\?|has the same size parts as/.test(p)) return /bigger parts|have \d+ parts/.test(k) ? WHY.topCounts : WHY.bottomSize;
  if (/^can you add .* by counting the parts\?$/.test(p)) return /numerators/.test(k) ? WHY.bottomSize : WHY.countSameSize;
  if (/are there enough \w+ to take away/.test(p)) return /\bwholes?\b/.test(k) ? WHY.partsNotWholes : WHY.sameSizeCount;
  if ((m = /^does (\d+) divide both (\d+) and (\d+)\?$/.exec(p))) return /^no, \d+ does not divide/.test(k) ? WHY.checkOther : /^yes/.test(k) ? WHY.checkBoth : null;
  if (/^which number divides both \d+ and \d+\?$/.test(p) && /^\d+$/.test(k)) return WHY.checkBoth;
  if ((m = /^write (\d+)\/(\d+) in simplest form\.$/.exec(p)) && pf && !near(pv, rv)) return WHY.divideSame;
  if (/does that make sense\?$/.test(p)) return /add the tops|\d+ \+ \d+ = \d+ and/.test(k) ? WHY.acrossAdd : WHY.benchmarkSum;
  if (/which is the first wrong step\?$/.test(p)) return WHY.checkSteps;
  if (/ says .* is that right\?$/.test(p)) {
    if (/twelfths|took away the bottoms/.test(k)) return WHY.sameBottom;
    if (/^no, \d+ [−+×-] \d+ is not \d+$/.test(k)) return WHY.topsFine;
    if (/^yes, \d+ \+ \d+ = \d+$|added the tops/.test(k)) return WHY.theyAddedBottoms;
    if (/multiplied both|\d+ is \d+ × \d+/.test(k)) return WHY.onlyTop;
  }
  if (/is this sharing or fitting\?$/.test(p)) return /^(?:adding|taking away)$/.test(k) ? WHY.notAddTake : WHY.whoGets;
  if (/^(?:yes|no)\b/.test(k) && /\?$/.test(p)) {
    if (/\b(?:must be|should be) (?:squares|triangles)|different shapes|are (?:all )?(?:rectangles|triangles|squares)$|all have \d+ sides|triangles are not fair|parts must be triangles/.test(k)) return WHY.shapeNotSize;
    if (/fill the square/.test(k)) return WHY.fillNotEqual;
    if (/all small parts/.test(k)) return WHY.smallNotEqual;
    if (/^no, the [a-z ]+ covers? more$/.test(k) && /^no, the [a-z ]+ covers? more$/i.test(right)) return WHY.otherBigger;
    if (/can land on any part/.test(k)) return WHY.landNotLikely;
    if (/because there are \d+ parts|^yes, (?:it has|there are) \d+ parts|^no, (?:it needs|there are only) \d+ parts/.test(k)) return WHY.countNotSize;
    if (/^no, one part is bigger$/.test(k) && /^yes/i.test(right)) return WHY.lookAgainSize;
  }

  // Counting parts, wholes and units.
  if (/how many (?:\d+\/\d+ parts|[a-z]+) (?:fill the whole bar|make one whole)\?$/.test(p) && Number.isFinite(pv)) return WHY.partsInWhole;
  if (/^how many pennies make one dollar\?$/.test(p)) return WHY.pennyHundredth;
  if (/^how many [a-z]+ are in 1 [a-z]+\?$/.test(p)) return WHY.wrongPer;
  if ((m = /^how many [a-z]+ are in (\d+) (\d+)\/(\d+) [a-z]+\?$/.exec(p)) && Number.isFinite(pv)) {
    const [w, a, b] = [m[1], m[2], m[3]].map(Number); const per = rv / (w + a / b);
    return near(pv, per * w) ? WHY.leftFraction : near(pv, (per * a) / b) ? WHY.leftWholes : near(pv, per * (w + 1)) ? WHY.extraWhole : WHY.wrongPer;
  }
  if ((m = /^how many [a-z]+ are in (\d+)\/(\d+) (?:of )?(?:an? )?[a-z]+\?$/.exec(p)) && Number.isFinite(pv)) {
    const [a, b] = [Number(m[1]), Number(m[2])]; const per = (rv * b) / a;
    return near(pv, per / b) ? WHY.oneGroup : near(pv, per) ? WHY.whole : pv > per ? WHY.moreThanWhole : WHY.wrongPer;
  }
  if ((m = /has (\d+) [a-z]+\. (?:she|he) gives (\d+)\/(\d+) of them .*left\?$/.exec(p)) && Number.isFinite(pv)) {
    const [total, a, b] = [m[1], m[2], m[3]].map(Number); const given = (total * a) / b;
    return near(pv, given) ? WHY.given : near(pv, total + given) ? WHY.addedBack : near(pv, total - a) || near(pv, total - b) ? WHY.tookNumber : null;
  }
  if ((m = /^(?:\w+ eats (\d+)\/(\d+) of a \w+\. what fraction of the \w+ is left|(\d+)\/(\d+) of a \w+ is painted\. what (?:part|fraction) is not painted yet)\?$/.exec(p)) && pf) {
    const [a, b] = [Number(m[1] ?? m[3]), Number(m[2] ?? m[4])];
    return pf[0] === a && pf[1] === b ? WHY.used : near(pv, 1) ? WHY.wholeLeft : pf[1] !== b ? WHY.sameBottom : null;
  }
  if (/\. add the wholes\. how many wholes is that\?$/.test(p)) return WHY.justWholes;
  if (/how many \w+ past one whole is \d+\/\d+\?$/.test(p)) return WHY.countPast;
  if ((m = /^how many [a-z]+ make (\d+) wholes\?$/.exec(p)) && Number.isFinite(pv)) {
    const w = Number(m[1]);
    return near(pv, rv / w) ? WHY.justOneWhole : near(pv, rv / w + w) ? WHY.wholeAsOne : SLIPS.recountParts;
  }
  if (/^where is \d+\/\d+ on the number line\?$/.test(p) && /^between /.test(k)) return WHY.betweenWholes;
  if (/^is \d+\/\d+ more than one whole\?$/.test(p)) return WHY.topVsBottom;
  if (/what fraction is shaded\? each bar is one whole\.$/.test(p) && pf && rf) return pf[1] !== rf[1] ? WHY.oneBarBottom : pv < 1 ? WHY.leftWholes : null;
  if (/which mixed number is shaded\?$/.test(p)) return pf ? WHY.leftWholes : WHY.fullBars;
  if (/^how many wholes are in \d+ and \d+\/\d+\?$/.test(p)) return WHY.wholeNumberPart;
  if (/^which is a mixed number\?$/.test(p)) return WHY.mixedMeans;
  if (/^which fraction is the same as 1\?$/.test(p) && pf) return WHY.allPartsWhole;
  if ((m = /^a bar is cut into (\d+) equal parts\. which fraction names the whole bar\?$/.exec(p)) && pf) return pf[0] === 1 ? WHY.onePartOnly : WHY.allPartsWhole;
  if (/^which is a unit fraction\?$/.test(p)) return WHY.unitTop;
  if (/^\d+ friends share an? \w+ fairly\. what fraction/.test(p) && pf) return near(pv, 1) ? WHY.wholeNotShare : WHY.onePerFriend;
  if (/^(\d+)\/\1 of an? \w+ is shaded\. how much of the \w+ is that\?$/.test(p)) return /half/.test(k) ? WHY.allPartsWhole : /^1\/\d+/.test(k) ? WHY.onePartOnly : /\d+ \w+s$/.test(k) ? WHY.notWholes : null;
  if (/as a fraction with a denominator of 1\.$|^which fraction equals the whole number \d+\?$/.test(p) && pf) return pf[1] !== 1 ? WHY.denomOne : pf[0] === 1 ? WHY.countBars : WHY.topWholes;
  if (/how many small triangles cover the same space as the small square\?$/.test(p)) return WHY.fitSpace;
  if (/how many parts are counted\?$/.test(p)) return WHY.topCounted;
  if (/\bhow many (?:equal )?(?:parts|slices|pieces) make (?:the|one) whole\b|^this \w+ is cut into equal (?:parts|slices)\. what is the denominator\?$/.test(p) && /^\d+$/.test(k)) return SLIPS.recountParts;
  if ((m = /(\d+)\/(\d+) (?:parts )?make what\?$/.exec(p)) || /^\w+ 1\/\d+ parts make what\?$/.test(p)) return WHY.partsOfWhole;

  // Number lines.
  if (/how many (?:equal )?spaces (?:do you need for|from 0 to 1 make) [a-z]+\?$/.test(p)) return WHY.spacesName;
  if (/has \d+ equal spaces\. where do \d+ jumps land\?$/.test(p) && pf) return WHY.jumpsTop;
  if ((m = /^a frog makes (\d+) jumps?\. each jump is (\d+)\/(\d+) [a-z]+\. how far/.exec(p)) && Number.isFinite(pv)) {
    const [a, b] = [Number(m[2]), Number(m[3])];
    return near(pv, a / b) ? WHY.oneJump : Number.isInteger(pv) ? WHY.jumpsNotWholes : WHY.jumpsTop;
  }
  if ((m = /^a line has (\d+) spaces\. the point is (\d+) jumps from 0\. what is it\?$/.exec(p)) && pf) return pf[0] === Number(m[2]) && pf[1] === Number(m[1]) - Number(m[2]) ? WHY.partToPart : WHY.jumpsTop;
  if (/halfway from 0 to 1\. what is it\?$/.test(p)) return WHY.halfway;
  if (/^how many equal spaces are there from 0 to 1\?$/.test(p)) return WHY.countSpaces;
  if (/has \d+ equal spaces from 0 to 1\. what fraction is 1 space\?$/.test(p)) return near(pv, 1) ? WHY.allSpaces : WHY.countSpaces;
  if (/how many jumps is it from 0 to the point\?$|count the jumps from 0 to the point\. what is the numerator\?$/.test(p)) return WHY.countJumps;
  if (/^which tells you the numerator\?$/.test(p)) return /spaces/.test(k) ? WHY.askedTop : WHY.countJumps;
  if (/which point is just past 1\?$/.test(p) && pv < 1) return WHY.notPastOne;
  if (/ jumps land at \d+\/\d+\. which is the same as \d+\/\d+\?$/.test(p)) return pf ? WHY.leftWholes : WHY.andDigits;
  if (/takes \d+ steps\. each step is \d+\/\d+ [a-z]+\. how far/.test(p) && Number.isFinite(pv)) return pv < 1 ? WHY.leftWholes : near(pv, rv + 1) ? WHY.extraWhole : SLIPS.recountShaded;
  if (/use the ruler\. how long/.test(p) && Number.isFinite(pv)) {
    if (Number.isInteger(pv) && pv > 0 && !Number.isInteger(rv)) return WHY.spaceIsPart;
    return near(pv, rv - 1) ? WHY.leftWholes : near(pv, rv + 1) ? WHY.extraWhole : WHY.rulerRecount;
  }

  // Line plots.
  if (/^which length is the same as 1 inch\?$/.test(p)) return WHY.allPartsWhole;
  if (/which tick shows its length\?$|where does its x go\?$/.test(p)) return /no tick/.test(k) ? WHY.allPartsWhole : WHY.tickAtLength;
  if (/how many xs go on the line plot\?$|how many xs stack at \d+\/\d+\?$/.test(p)) return WHY.oneXEach;
  if (/which of these ticks gets no x\?$/.test(p)) return WHY.noX;
  if (/x is farthest from 0\?$/.test(p)) return nums.some(([t, b]) => near(t / b, pv)) ? WHY.farthestRight : WHY.notInList;
  if (/how many \w+ are shorter than \d+\/\d+ inch\?$/.test(p)) return WHY.leftOf;
  if ((m = /how many eighths from 0 is its x\?$/.exec(p)) && Number.isFinite(pv)) return near(pv, 8 - rv) ? WHY.jumpsToOne : SLIPS.recountParts;
  if ((m = /how many more xs are at (\d+)\/8 than at (\d+)\/8\?$/.exec(p)) && Number.isFinite(pv)) {
    const count = (v: number) => nums.filter(([t, b]) => b === 8 && t === v).length - 1; // the question names each one once more
    return near(pv, count(Number(m[1])) + count(Number(m[2]))) ? WHY.addedLengths : WHY.countMarks;
  }
  if ((m = /how long are all the (\d+)\/(\d+) inch [a-z ]+ together\?$/.exec(p)) && pf && rf) {
    const stack = Number(m[1]);
    return pf[1] !== rf[1] ? WHY.addedBottoms : pf[0] * stack === rf[0] ? WHY.countedXs : WHY.eachSpotOnce;
  }
  if (/difference between the longest and shortest\?$|how much longer is the longest \w+ than the shortest\?$/.test(p) && pf && rf) return pf[1] !== rf[1] ? SLIPS.takeTops : pv > 1 ? WHY.addedLengths : WHY.wrongMark;
  if (/how much \w+ is in all (?:two|three|four)\?$/.test(p) && pf && rf) return pf[1] !== rf[1] ? WHY.addedBottoms : WHY.allAmounts;
  if (/how much \w+ is in all (?:two|three|four)\?$/.test(p) && Number.isInteger(pv)) return WHY.keepBottom;
  if ((m = /^(\d+)\/(\d+) liters? of \w+ is shared equally by \d+ \w+\. how much goes in each \w+\?$/.exec(p)) && Number.isFinite(pv)) {
    const [t, b] = [Number(m[1]), Number(m[2])];
    return near(pv, t / b) ? WHY.total : Number.isInteger(pv) ? WHY.keepBottom : pf && pf[1] !== b ? WHY.sharePieces : WHY.allCups;
  }
  if ((m = /how much more do all the (\d+)\/(\d+) \w+ hold together than all the (\d+)\/(\d+) \w+ together\?$/.exec(p)) && Number.isFinite(pv)) {
    const [t, b, l] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const count = (v: number) => nums.filter(([x, y]) => y === b && x === v).length - 1;
    const [big, small] = [(count(t) * t) / b, (count(l) * l) / b];
    return near(pv, (t - l) / b) ? WHY.oneEach : near(pv, big) ? WHY.oneStack : near(pv, big + small) ? WHY.addedLengths : WHY.eachSpotOnce;
  }
  if (/(?:how far did they crawl|how much \w+) in all\?$/.test(p) && nums.length > 2 && Number.isFinite(pv)) {
    return pf && pf[1] === nums.reduce((sum, [, b]) => sum + b, 0) ? WHY.addedBottoms : WHY.allAmounts;
  }

  // Groups of an amount, money, units and percent.
  if ((/you make \d+ batches|^each \w+ eats \d+\/\d+ \w+\. \d+ \w+\. how much in all\?$/.test(p)) && nums.length && near(pv, nums[0][0] / nums[0][1])) return WHY.oneTime;
  if ((m = /(\d+)\/(\d+) (?:hour|dollar|liter)\b.*?(\d+) (?:more )?(?:minutes|cents|milliliters)\b/.exec(p)) && Number.isFinite(pv)) {
    const [a, b, n] = [m[1], m[2], m[3]].map(Number); const part = rv - n;
    return near(pv, a + n) || near(pv, b + n) ? WHY.changeUnits : near(pv, part) ? WHY.oneAmount : near(pv, part - n) ? WHY.otherOpAdd : null;
  }
  if ((m = /(\d+)% of them are \w+\. how many|(\d+)%\. how many points out of 100/.exec(p)) && Number.isFinite(pv)) return near(pv, 100 - Number(m[1] ?? m[2])) ? WHY.complement : WHY.percentCount;
  if ((m = /^what does (\d+)% mean\?$/.exec(p))) return /out of 100$/.test(k) ? WHY.percentCount : WHY.percent100;
  if ((m = /grid has 100 equal squares\. (\d+) are shaded\. what fraction|shades (\d+) of the 100 squares/.exec(p)) && pf) {
    const n = Number(m[1] ?? m[2]);
    return pf[1] !== 100 ? WHY.hundredBottom : pf[0] === 100 - n ? WHY.notShadedCount : SLIPS.recountShaded;
  }
  if (/grid shows hundredths\. write the shaded part as a decimal|shaded part of the grid as a decimal|which decimal does this grid show/.test(p) && Number.isFinite(pv)) return !/\./.test(pick) ? WHY.decWhole : near(pv + rv, 1) ? WHY.notShadedCount : null;
  if (/^write \d+\/100 as a decimal\.$/.test(p) && Number.isFinite(pv)) return pv >= 1 && /^\d+\.0+$|^\d+$/.test(pick) ? WHY.decWhole : WHY.places;
  if (/which decimal is the same amount as|with two places after the point/.test(p) && !/\./.test(pick)) return WHY.decWhole;
  if ((m = /^how many hundredths is (\d*\.\d+)\?$/.exec(p)) && Number.isFinite(pv)) return near(pv + rv, 100) ? WHY.complement : near(pv, rv * 10) ? (rv < 10 ? WHY.places : WHY.tenthHundredths) : near(pv * 10, rv) ? WHY.places : null;
  if (/ of a small \w+\. \w+ eats \d*\.\d+ of a big \w+\. who eats more\?$/.test(p)) return WHY.lookAtWholes;
  if (/ of the same size \w+\. who eats more\?$/.test(p)) return /same/.test(k) ? SLIPS.notSame : WHY.sameWay;
  if (/is \d+\/10 \w+\. how many hundredths|dimes\. what part of a dollar is that, in hundredths\?$/.test(p) && pf) return pf[1] === 10 ? WHY.keptBottom : WHY.tenthHundredths;
  if (/has \d+ pennies\. what part of a dollar is that\?$/.test(p) && pf) return near(pv + rv, 1) ? WHY.complement : WHY.pennyHundredth;

  // Copies of a unit fraction, renaming, and factors.
  if (/how do you write it with ×\?$|^which means (?:1\/\d+ \+ )+1\/\d+\?$|^\w+ takes \d+ pieces\. each is 1\/\d+ of a \w+\. which shows this\?$/.test(p)) {
    const [mine, theirs] = [/^(\d+) × 1\/(\d+)$/.exec(pick), /^(\d+) × 1\/(\d+)$/.exec(right)];
    if (!mine || !theirs) return WHY.copyIsFraction;
    if (mine[2] !== theirs[2]) return mine[1] === theirs[2] ? WHY.copiesFirst : WHY.sameBottom;
    return WHY.countCopies;
  }
  if ((m = /what was (\d+) multiplied by to make (\d+)\?$/.exec(p)) && Number.isFinite(pv)) return near(pv, Number(m[2]) - Number(m[1])) ? WHY.addNotTimes : near(pv, Number(m[2]) * Number(m[1])) ? WHY.timesBoth : null;
  if (/^join every 2 [a-z]+ into 1 [a-z]+\. what is/.test(p)) return WHY.joinFewer;
  if (/which fraction do you rename\?$/.test(p)) return /neither/.test(k) ? WHY.mustRename : WHY.renameOne;
  if ((m = /what is (\d+)\/(\d+) in [a-z]+\?$|is (\d+)\/(\d+) [a-z]+ long\. how many [a-z]+ of a [a-z]+ is that\?$|which fraction in [a-z]+ is really equal to (\d+)\/(\d+)\?$/.exec(p)) && pf && rf) {
    const [a, b] = [Number(m[1] ?? m[3] ?? m[5]), Number(m[2] ?? m[4] ?? m[6])];
    const other = /^for (\d+)\/(\d+) [+−-] (\d+)\/(\d+),/.exec(p);
    if (pf[1] === rf[1] && pf[0] === a) return WHY.keptTop;
    if (pf[1] === b && pf[0] === rf[0]) return WHY.keptBottom;
    if (other) {
      const pair = [[Number(other[1]), Number(other[2])], [Number(other[3]), Number(other[4])]];
      const [x, y] = pair[0][0] === a && pair[0][1] === b ? pair[1] : pair[0];
      if (pf[1] === rf[1] && near(pv, x / y)) return WHY.otherFraction;
      if (pf[1] === rf[1] && near(pv, a / b + x / y)) return WHY.wholeSum;
    }
    if (pf[1] === rf[1] && pf[0] === a + rf[1] - b) return WHY.addedSame;
    return WHY.sameFactor;
  }
  if ((m = /^use [a-z]+\. which mixed number is the same as (\d+) (\d+)\/(\d+)\?$/.exec(p))) {
    const mine = /^(\d+) (\d+)\/(\d+)$/.exec(pick); const theirs = /^(\d+) (\d+)\/(\d+)$/.exec(right);
    if (!mine || !theirs) return null;
    const [a, b] = [Number(m[2]), Number(m[3])];
    if (mine[1] !== m[1]) return WHY.keepWholes;
    if (Number(mine[2]) === a) return WHY.keptTop;
    if (Number(mine[2]) === a + Number(theirs[3]) - b) return WHY.addedSame;
    return WHY.sameFactor;
  }
  // Unlike fractions added: the denominators made to match, the numerators not renamed (or only one of them).
  if (nums.length === 2 && nums[0][1] !== nums[1][1] && /\+/.test(p) && pf && rf && pf[1] === rf[1]) {
    const [[a, b], [c, e]] = nums; const mm = rf[1];
    if (mm % b === 0 && mm % e === 0) {
      if (pf[0] === a + c) return WHY.timesBottoms;
      if (pf[0] === (a * mm) / b + c || pf[0] === a + (c * mm) / e) return WHY.renamedOne;
    }
  }

  // Cutting parts: more, smaller parts; multiplying fractions on a square.
  if ((m = /^each (\w+) of a bar is cut (?:in half|into (\d+) equal parts)\. what fraction of the whole bar is one small part\?$/.exec(p)) && pf) {
    const d = PART_NUMBER[m[1]] ?? NaN; const cut = m[2] ? Number(m[2]) : 2;
    return pf[1] === d + cut ? WHY.cutAdds : pf[1] === d ? WHY.beforeCut : pf[1] === cut ? WHY.partOfPart : WHY.countSmall;
  }
  if (/how many rows and columns do you cut\?$/.test(p)) return WHY.rowsBottoms;
  if ((m = /has (\d+) rows and (\d+) columns\. shade (\d+) rows? and (\d+) columns?\. how many boxes are in the overlap\?$/.exec(p)) && Number.isFinite(pv)) {
    const [r, c, x, y] = [m[1], m[2], m[3], m[4]].map(Number);
    return near(pv, r * c) ? WHY.wholeGrid : near(pv, r * c - x * y) ? WHY.notColored : near(pv, x + y) ? WHY.addedSides : null;
  }
  if ((m = /^(\d+)\/(\d+) × (\d+)\/(\d+) = \?$/.exec(prompt)) && pf && pf[1] === Number(m[2]) + Number(m[4])) return WHY.bottomsToo;
  if (/^which fraction covers the same amount as 1\/2\?$/.test(p)) return WHY.halfOfBottom;
  if (/fold it in half again\. what fraction is shaded now\?$/.test(p)) return WHY.foldDoubles;
  if (/^cut (?:each|every) [a-z]+ into \d+ equal (?:parts|spaces)\. how many (?:parts|spaces) are (?:there now|from 0 to 1 now)\?$/.test(p)) return WHY.countAfterCut;
  if ((m = /^cut each ([a-z]+) into 2 equal parts\. what are the new parts called\?$/.exec(p))) return k === `${m[1]}s` || k === m[1] ? WHY.beforeCut : WHY.cutDoubles;
  if ((m = /^cut every ([a-z]+) into 2 equal spaces\. what is 1 new space\?$/.exec(p)) && pf) {
    const d = PART_NUMBER[m[1]] ?? NaN;
    return pf[1] === d ? WHY.beforeCut : pv > 1 / d ? WHY.cutSmaller : pf[1] === d + 2 ? WHY.cutDoubles : WHY.countSmall;
  }

  // Groups, sharing and fitting.
  if (/^to find \d+\/\d+ of \d+(?: \w+)?, you make \d+ equal groups\. how many .*in one group\?$/.test(p) && Number.isFinite(pv) && pv > rv) return WHY.oneGroupOnly;
  if (/^to find 1\/\d+ of \d+ .*how many equal groups do you make\?$/.test(p)) return WHY.splitDenominator;
  if ((m = /^(\d+) \w+ are shared into (\d+) equal groups\. how many \w+ are in each group\?$/.exec(p)) && near(pv, Number(m[1]) - Number(m[2]))) return WHY.takeNotShare;
  if ((m = /^(\d+) \w+ are shared fairly by (\d+) friends\. each \w+ is cut into one part for each friend\. what fraction/.exec(p)) && pf) {
    const [l, f] = [Number(m[1]), Number(m[2])];
    return pf[1] === l + f ? WHY.addedForShare : pf[1] === l * f ? WHY.eachLoaf : null;
  }
  if ((m = /^(\d+) \w+ are shared fairly by (\d+) friends\. into how many equal parts should each \w+ be cut\?$/.exec(p)) && Number.isFinite(pv)) return near(pv, Number(m[1]) + Number(m[2])) ? WHY.addedForShare : WHY.onePerFriend;
  if ((m = /^(\d+) (?:friends|children) share 1\/(\d+) of an? \w+(?: equally)?\./.exec(p)) && pf) {
    const [n, b] = [Number(m[1]), Number(m[2])];
    return pf[0] === 1 && pf[1] === b ? WHY.notSplit : near(pv, 1 / b) ? WHY.sameAsBefore : near(pv, n / b) ? WHY.timesNotShare : pf[1] === b + n ? WHY.addedForShare : null;
  }
  if (/^\d+\/\d+ \w+ of \w+ is shared by \d+ friends\. how much does each get\?$/.test(p) && Number.isInteger(pv)) return WHY.timesNotShare;
  if (/how many equally likely outcomes|how many outcomes are there\?$/.test(p)) return WHY.everyOutcome;
  if (/^a bag has \d+ marbles\. \d+ are green\. what is the chance/.test(p) && pf && rf && pf[1] === rf[1]) return SLIPS.recountShaded;

  // Area of a rectangle, and a garden split at the whole meters.
  if ((m = /(\d+) units long and (\d+) units? wide\. .*area\?$/.exec(p)) && Number.isFinite(pv)) {
    const [l, w] = [Number(m[1]), Number(m[2])];
    return near(pv, l + w) ? WHY.addedSides : near(pv, 2 * (l + w)) ? WHY.perimeter : near(pv, l) || near(pv, w) ? WHY.oneSide : null;
  }
  if (/split it at the whole meters\. how big is its biggest part\?$/.test(p)) {
    const parts = k.split(' by ');
    return parts.every((part) => /\d+ \d+\/\d+/.test(part)) ? WHY.wholeGarden : parts.every((part) => /^\d+\/\d+/.test(part)) ? WHY.smallestPart : WHY.wholeBothSides;
  }
  if ((m = /area of the part that is (\d+(?:\/\d+)?) meters? by (\d+)\/(\d+) meter\?$/.exec(p))) {
    const side = m[1]; const [c, e] = [Number(m[2]), Number(m[3])];
    if (/^\d+ \d+\/\d+/.test(pick)) return WHY.addedSides;
    if (!pf) return null;
    const first = asFraction(side);
    if (!first) return pf[1] === Number(side) * e ? WHY.timesBottomOnly : null;
    return pf[1] === first[1] + e ? WHY.addedAcross : pf[1] === first[1] * e && pf[0] !== first[0] * c ? WHY.topsToo : null;
  }

  // Two steps, and two amounts with the same denominator in a story.
  if ((m = /^a \w+ is (\d+)\/(\d+) \w+ long\. cut off (\d+)\/\d+ \w+, then (\d+)\/\d+ \w+\. .*first, how long is it after the first cut\?$/.exec(p)) && pf) {
    const [a, , x, y] = [m[1], m[2], m[3], m[4]].map(Number);
    return pf[0] === a - x - y ? WHY.bothSteps : pf[0] === a + x ? WHY.otherOpTake : pf[0] === a - y ? WHY.wrongStep : null;
  }
  if ((m = /has (\d+)\/(\d+) liter\. \w+ drinks (\d+)\/\d+ liter, then adds (\d+)\/\d+ liter\. how much is in the jug now\?(?: first, how much is left after \w+ drinks\?)?$/.exec(p)) && pf) {
    const [a, , x, y] = [m[1], m[2], m[3], m[4]].map(Number);
    if (/first,/.test(p)) return pf[0] === a + x || pf[0] === a + x + y ? WHY.otherOpTake : pf[0] === x ? WHY.takenAmount : null;
    return pf[0] === a ? WHY.startAmount : pf[0] === a - x ? WHY.firstStepOnly : null;
  }
  if (/ ran \d+\/\d+ \w+ and then \d+\/\d+ \w+\. \w+ ran \d+\/\d+ \w+\. how much farther/.test(p) && pf && rf && pf[1] !== rf[1]) return WHY.sameBottom;
  const like = nums.length === 2 && nums[0][1] === nums[1][1] && !/\? = |= \?/.test(p.replace(/^.*?(\d+\/\d+ [+−-] \d+\/\d+ = \?)$/, ''));
  if (like && (pf || Number.isFinite(pv))) {
    const [[a, d], [c]] = nums;
    // A "First, ..." step asks its own question: read the operation from that step.
    const step = /\bfirst, (.+)$/.exec(p)?.[1] ?? p;
    const plus = /\+|\bmore\b|in all|together|altogether/.test(step);
    const minus = /−|take away|cut off|\bleft\b/.test(step) || (!plus && /\beats\b|drinks/.test(step));
    // The pick as a count of parts: "3/8 meter" is 3, "7" (eighths left) is 7, "1 2/5" keeps its fraction part.
    const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(pick);
    const top = pf ? (pf[1] === d ? pf[0] : pf[1] === 2 * d ? -1 : NaN) : mixed && Number(mixed[3]) === d ? Number(mixed[2]) : /^\d+$/.test(pick) ? Number(pick) : NaN;
    if (minus && !plus) {
      if (top === a + c) return WHY.otherOpTake;
      if (top === a) return WHY.startAmount;
      if (top === c) return WHY.takenAmount;
    } else if (plus && !minus) {
      if (top === -1 && pf && pf[0] === a + c) return SLIPS.addTops;
      if (top === Math.abs(a - c)) return WHY.otherOpAdd;
      if (top === a || top === c) return WHY.oneAmount;
    }
  }
  if (/^a board is \d+\/\d+ meter\. another is \d+\/\d+ meter\. how long are they together\?$/.test(p) && nums.some(([t, b]) => near(pv, t / b))) return WHY.oneAmount;

  // One half, one whole, and what is missing to make one.
  if (/^a bar has \d+ equal parts\. how many parts make one half\?$/.test(p)) return WHY.halfOfBottom;
  if (/^half of an? \w+ is \d+ equal pieces\. how many/.test(p) && Number.isFinite(pv) && pv < rv) return WHY.halfOnly;
  if ((m = /^use [a-z]+\. which fraction is 1 part (less|more) than half\?$/.exec(p)) && Number.isFinite(pv)) return (m[1] === 'less' ? pv > 0.5 : pv < 0.5) ? WHY.wrongSideHalf : WHY.oneBack;
  if ((m = /^how much is missing from (\d+)\/(\d+) to make one whole\?$/.exec(p)) && pf) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return pf[0] === a && pf[1] === b ? WHY.sameAgain : a / b + pv > 1 ? WHY.addedWhole : pf[1] !== b ? WHY.sameBottom : WHY.notYetWhole;
  }
  // A picture count: the other parts, the parts compared with each other, or a miscount.
  if (PICTURE_COUNT.test(p) && pf && rf) {
    const asked = /\bnot (?:shaded|colou?red)\b/.test(p);
    if (pf[1] === rf[1] && pf[0] === rf[1] - rf[0]) return asked ? WHY.otherParts : WHY.notShadedCount;
    if (pf[0] === rf[0] && pf[1] === rf[1] - rf[0]) return WHY.partToPart;
    return pf[1] === rf[1] ? SLIPS.recountShaded : SLIPS.recountParts;
  }
  return null;
}

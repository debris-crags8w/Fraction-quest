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
    // A bare number the question already gave: it is not the answer to what the question asks.
    return /^\d+$/.test(pick) && new RegExp(`\\b${pick}\\b`).test(p) ? WHY.justNumber : null;
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
  if (/^which (?:sum|adds up)/.test(p) && / \+ /.test(pick)) return WHY.sumCheck;
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
  const near = /(?:closest|closer|nearest) to (.+?)\?$/.exec(p);
  if (near) return Number.isFinite(amount(near[1])) ? WHY.farther : null;
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

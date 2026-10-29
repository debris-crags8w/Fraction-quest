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
  const p = prompt.replace(REVIEW_LABEL, '').toLowerCase();
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
  if (how === 'both') return WHY.sizeAndCount;
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
  const p = prompt.toLowerCase();
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
    if (side[1] === 'more' && v <= target) return WHY.notMore;
    if (side[1] === 'less' && v >= target) return WHY.notLess;
    return /a little/.test(p) ? WHY.farther : null;
  }
  return null;
}

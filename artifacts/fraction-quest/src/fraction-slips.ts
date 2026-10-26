/* Wrong answers from real mistakes, for questions whose answer is a fraction, a mixed number, a decimal or a percent. The generic fallback
   offers near misses (5/13 or 6/12 for 5/12, 3 7/8 for 2 7/8), which a child rules out without thinking about
   fractions. Here each wrong answer is what a child gets by making a specific slip: adding the denominators,
   keeping one denominator, renaming only one fraction, forgetting to carry or to trade a whole. Like
   misconceptions.ts, every rule first works the question out and is used only when it gets the app's answer. */

/** An amount as numerator and denominator (2 3/5 is 13/5). */
type Amount = [number, number];
import { answerValue } from './learning-content';
import type { Why } from './slip-reasons';

const N = Number;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

function amount(text: string): Amount | null {
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(text.trim());
  if (m) return [N(m[1] ?? 0) * N(m[3]) + N(m[2]), N(m[3])];
  return /^\d+$/.test(text.trim()) ? [N(text), 1] : null;
}

/** A slip and why it is wrong: [numerator, denominator] as a child would write it, its value (written over the
    answer's denominator), or a decimal or percent already written out. */
type Slip = [Why, Amount | number | string];
/** The right amount the rule worked out, and each slip. */
type Found = { right: number; slips: Slip[] };

/** The slips for x ± y, written over the denominators a child would use. */
function addOrSubtract(x: Amount, y: Amount, add: boolean): Found {
  const L = lcm(x[1], y[1]); const xs = x[0] * (L / x[1]); const ys = y[0] * (L / y[1]);
  const [w1, a, b] = [Math.floor(x[0] / x[1]), x[0] % x[1], x[1]];
  const [w2, c, d] = [Math.floor(y[0] / y[1]), y[0] % y[1], y[1]];
  const sign = add ? 1 : -1; const wholes = w1 + sign * w2;
  /** wholes + top/bottom, over `bottom`. */
  const over = (top: number, bottom: number): Amount => [wholes * bottom + top, bottom];
  const slips: Slip[] = [
    [add ? 'otherOpAdd' : 'otherOpTake', [add ? xs - ys : xs + ys, L]], // the other operation
    // Straight across (with one denominator, taking away is "the smaller from the bigger").
    [add ? 'acrossAdd' : b === d ? 'smallerFromBigger' : 'acrossTake', add ? over(a + c, b + d) : over(Math.abs(a - c), Math.abs(b - d) || b)],
    [b === d ? 'sameBottom' : 'keptOne', over(add ? a + c : Math.abs(a - c), Math.max(b, d))], // kept one denominator
    ['renamedOne', over(add ? a * (L / b) + c : Math.abs(a * (L / b) - c), L)], // renamed only the first fraction
    ['renamedOne', over(add ? a + c * (L / d) : Math.abs(a - c * (L / d)), L)], // renamed only the second
    [add ? 'oneAmount' : 'startAmount', x], [add ? 'oneAmount' : 'takenAmount', y], // left one part out
    // Forgot to carry the whole, or to take away the traded whole (only when there is one).
    ...((add ? a * (L / b) + c * (L / d) >= L : a * (L / b) < c * (L / d)) ? [[add ? 'carry' : 'trade', [add ? xs + ys - L : xs - ys + L, L]] as Slip] : []),
    // Dropped a whole; or took the smaller part from the bigger.
    add ? ['dropWhole', [w1 * L + a * (L / b) + c * (L / d), L]] : ['smallerFromBigger', over(Math.abs(a * (L / b) - c * (L / d)), L)],
    add && b === d ? ['timesTops', over(a * c, b)] : [add ? 'acrossAdd' : 'otherOpTake', over(a + c, 2 * b)], // multiplied the tops; or added the bottoms
    add ? ['acrossAdd', over(a + c, 2 * b)] : ['complement', [b - (a - c), b]], // added the bottoms; or found what's left of the whole
    [b === d ? 'sameBottom' : 'timesBottoms', over(add ? a + c : Math.abs(a - c), b * d)], // multiplied the bottoms
    ['oneFraction', over(a * (L / b), L)], ['oneFraction', over(c * (L / d), L)], // worked the wholes and kept only one fraction part
    ...(wholes === 0 && (add ? xs + ys : xs - ys) > 0 ? [['upsideDown', [L, add ? xs + ys : xs - ys]] as Slip] : []), // upside down
  ];
  return { right: (add ? xs + ys : xs - ys) / L, slips };
}

/** What is left of one whole after x and then y (same denominator): what was used, one part forgotten, the bottoms
    added, or the second part added back instead of taken away. */
function leftOver([a, b]: Amount, [c]: Amount): Found {
  return { right: (b - a - c) / b, slips: [['used', [a + c, b]], ['oneTaken', [b - a, b]], ['oneTaken', [b - c, b]], ['sameBottom', [b - a - c, 2 * b]], ['addedBack', [b - a + c, b]]] };
}

const SUM_WORDS = /^A (?:board|jug) (?:is|has) (\d+\/\d+) (?:meter|liter)\. (?:Another is|You add) (\d+\/\d+) (?:meter|liter)\. How many (?:meters in all|liters now)\?$|^\w+ walked (\d+\/\d+) mile, then (\d+\/\d+) mile\. How far in all\?$|^A recipe uses (\d+\/\d+) cup, then (\d+\/\d+) cup more\. How much in all\?$/;
const LENGTH = /^(?:A|One) (?:board|ribbon) is ([\d /]+?)(?: m| meters?)?(?:\.| and) [Aa]nother is ([\d /]+?)(?: m| meters?)?\. How (?:many meters )?long (?:are they )?together\?$/;

const value = (text: string) => { const a = amount(text)!; return a[0] / a[1]; };
const valueOf = value;

/** Multiplying and dividing: whole × fraction, fraction × fraction, sharing, gardens, grid areas, leveling. */
function timesOrShare(p: string): Found | null {
  let m: RegExpExecArray | null;
  // "4 × 1/3", "Write 4 × 1/3 as one fraction.", "A recipe uses 5/12 cup of flour. How much flour do 3 batches need?":
  // both parts multiplied, added, the bottom multiplied, one batch, upside down, the tops multiplied and the bottoms added.
  if ((m = /^(?:Write )?(\d+) × (\d+)\/(\d+)(?: = \?| as one fraction\.)$|^A recipe uses (\d+)\/(\d+) cup of \w+\. (?:You make (\d+) batches\. How much \w+ do you need|How much \w+ do (\d+) batches need)\?$/.exec(p))) {
    const [n, a, b] = m[1] ? [N(m[1]), N(m[2]), N(m[3])] : [N(m[6] ?? m[7]), N(m[4]), N(m[5])];
    return { right: (n * a) / b, slips: [['onlyTop', [n * a, n * b]], ['addedNotTimes', [n + a, b]], ['timesBottomOnly', [a, n * b]], ['oneGroup', [a, b]], ['upsideDown', [b, n * a]], ['onlyTop', [n * a, b + n]]] };
  }
  // "3/4 × 1/2", "What is 1/3 of 1/3?": added across, kept one denominator, added the tops, added the bottoms, crossed, upside down.
  if ((m = /^(?:What is )?(\d+)\/(\d+) (?:×|of) (\d+)\/(\d+)(?: = \?|\?)$/.exec(p))) {
    const [a, b, c, d] = m.slice(1).map(N);
    return { right: (a * c) / (b * d), slips: [['addedAcross', [a + c, b + d]], ['bottomsToo', [a * c, d]], ['bottomsToo', [a * c, b]], ['topsToo', [a + c, b * d]], ['bottomsToo', [a * c, b + d]], ['crossed', [a * d, b * c]], ['upsideDown', [b * d, a * c]]] };
  }
  // "3 children share 1/3 of a pan. 1/3 ÷ 3 = ?": multiplied, upside down, added, not split, two shares.
  if ((m = /^(\d+) children share 1\/(\d+) of a pan\. 1\/\2 ÷ \1 = \?$/.exec(p))) {
    const [n, b] = [N(m[1]), N(m[2])];
    return { right: 1 / (b * n), slips: [['timesNotShare', [n, b]], ['upsideDown', [b * n, 1]], ['addedForShare', [1, b + n]], ['notSplit', [1, b]], ['twoShares', [2, b * n]]] };
  }
  // "2 loaves are shared fairly by 3 friends", "5 ÷ 4", "Write 3 ÷ 8 as a fraction.": upside down, one loaf, added, one more part.
  if ((m = /^(\d+) loa(?:f is|ves are) shared fairly by (\d+) friends\. How much does each friend get\?$|^(?:Write )?(\d+) ÷ (\d+)(?: = \?| as a fraction\.)$/.exec(p))) {
    const [n, q] = m[1] ? [N(m[1]), N(m[2])] : [N(m[3]), N(m[4])];
    return { right: n / q, slips: [['shareFlip', [q, n]], ['shareOne', [1, q]], ['addedForShare', [n, n + q]], ['addedForShare', [n + q, q]], ['shareFlip', [1, n]]] };
  }
  // Share or fit: "1/2 pound of clay is shared by 3 friends. How much does each get?" (multiplied, flipped, added, not
  // split) and "How many 1/3-cup scoops can be filled from 2 cups of rice?" (added, one whole's worth, multiplied, the wholes).
  if ((m = /^1\/(\d+) (?:\w+ of \w+ is shared by (\d+) friends\. How much does each get|of a (\w+) is shared fairly by (\d+) friends\. What part of the whole \3 does each friend get)\?$/.exec(p))) {
    const [b, n] = [N(m[1]), N(m[2] ?? m[4])];
    return { right: 1 / (b * n), slips: [['timesNotShare', [n, b]], ['upsideDown', [b * n, 1]], ['addedForShare', [1, b + n]], ['notSplit', [1, b]]] };
  }
  if ((m = /^How many 1\/(\d+)-\w+ \w+ can be filled from (\d+) \w+ of \w+\?$/.exec(p))) {
    const [d, w] = [N(m[1]), N(m[2])];
    return { right: w * d, slips: [['addedForFit', w + d], ['oneWhole', d], ['fitFlip', [w, d]], ['wholesOnly', w]] };
  }
  // A mixed-number garden: whole × whole plus part × part, the wholes only, the sides added, one side's whole only.
  if ((m = /^A rectangular garden is (\d+ \d+\/\d+) meters by (\d+ \d+\/\d+) meters\. What is its area\?$/.exec(p))) {
    const [x, y] = [value(m[1]), value(m[2])]; const [wx, wy] = [Math.floor(x), Math.floor(y)];
    return { right: x * y, slips: [['missedAreas', wx * wy + (x - wx) * (y - wy)], ['missedAreas', wx * wy], ['addedSides', x + y], ['missedAreas', wx * y], ['missedAreas', x * wy]] };
  }
  // The overlap on the 3-by-4 grid: the sides added, one side only, the whole grid, the part not colored, upside down.
  if ((m = /is (\d+(?:\/\d+)?) units? by (\d+(?:\/\d+)?) units?\. Color the overlapping area/.exec(p))) {
    const [x, y] = [value(m[1]), value(m[2])];
    return { right: x * y, slips: [['addedSides', x + y], ['oneSide', x], ['oneSide', y], ['wholeGrid', 1], ['notColored', 1 - x * y], ['upsideDown', 1 / (x * y)]] };
  }
  // Leveling three or six cups: the total, the biggest or smallest cup, split one way too few, the tops shared over the cups.
  if ((m = /^(Three|Six) \w+(?: \w+)? hold ((?:\d+\/(\d+), )+\d+\/\3) liter\. Share the total equally\./.exec(p))) {
    const b = N(m[3]); const tops = m[2].split(', ').map((t) => N(t.split('/')[0])); const n = tops.length; const t = tops.reduce((x, y) => x + y, 0);
    if (n !== (m[1] === 'Six' ? 6 : 3) || m[2].split(', ').some((x) => !x.endsWith(`/${b}`))) return null;
    return { right: t / (n * b), slips: [['total', [t, b]], ['oneCup', [Math.max(...tops), b]], ['oneCup', [Math.min(...tops), b]], ['allCups', [t, (n - 1) * b]], ['sharePieces', [t, n]], ['sharePieces', [t / n, b + n]]] };
  }
  // Equal portions: "Each runner drinks 5/6 liter. 3 runners. How much in all?" has the slips of 3 × 5/6.
  if ((m = /^Each \w+ (?:drinks|eats|gets|uses) (\d+)\/(\d+)(?: (?!of )\w+)?(?: of [\w ]+)?\. (\d+) \w+\. How (?:much|many \w+) in all\?$/.exec(p))) {
    const [a, b, n] = m.slice(1).map(N);
    return { right: (n * a) / b, slips: [['onlyTop', [n * a, n * b]], ['addedNotTimes', [n + a, b]], ['timesBottomOnly', [a, n * b]], ['oneGroup', [a, b]], ['upsideDown', [b, n * a]]] };
  }
  // "2/3 ÷ 1/6 = ?": the tops multiplied, how many fit in one whole, the top or the bottom, multiplied instead.
  if ((m = /^(\d+)\/(\d+) ÷ (\d+)\/(\d+) = \?$/.exec(p))) {
    const [a, b, c, d] = m.slice(1).map(N);
    return { right: (a / b) / (c / d), slips: [['fitWhole', a * d], ['oneWhole', d], ['justNumber', b], ['justNumber', a], ['timesNotDivide', [a * c, b * d]]] };
  }
  return null;
}

/** Naming parts, number lines, equivalent fractions, simplest form, decimals and percents. `right` is the app's answer
    as numerator and denominator (null for a decimal or percent). */
function equivalence(p: string, right: Amount | null): Found | null {
  let m: RegExpExecArray | null;
  const [x, y] = right ?? [NaN, NaN];
  const answer = right ? x / y : NaN;
  // Wholes and a fraction ("What is 5/3 as wholes and a fraction?" is 1 and 2/3): whole and remainder swapped, the two
  // numbers written as they are, the remainder over the top, the wholes only, the denominator as the wholes.
  if ((m = /^What is (\d+)\/(\d+) as wholes and a fraction\?$/.exec(p))) {
    const [n, d] = [N(m[1]), N(m[2])]; const [w, r] = [Math.floor(n / d), n % d];
    return { right: n / d, slips: [['andSwap', `${r} and ${w}/${d}`], ['andDigits', `${n} and ${d}`], ['andBottom', `${w} and ${r}/${n}`], ['andDropped', String(w)], ['andWholes', `${d} and ${r}/${d}`]] };
  }
  // Any other fraction as a decimal ("Write 1/4 as a decimal."): the digits side by side (1.4, 0.14), the bottom or the
  // top as tenths, the denominator divided by the numerator.
  if ((m = /^Write (\d+)\/(\d+) as a decimal\.$/.exec(p)) && !['10', '100'].includes(m[2])) {
    const [a, b] = [m[1], m[2]];
    return { right: N(a) / N(b), slips: [['decSideBySide', `${a}.${b}`], ['decSideBySide', `0.${a}${b}`], ['decRename', `0.${b}`], ['decRename', `0.${a}`], ['upsideDown', String(N(b) / N(a))]] };
  }
  // Part of what is left ("Max eats 1/3 of a pizza. Then he eats 1/2 of what is left."): what was left after the first
  // part, the second part eaten, both parts taken from the whole, both parts added, the parts multiplied.
  if ((m = /eats (\d+)\/(\d+) of a pizza\. Then (?:he|she) eats (\d+)\/(\d+) of what is left\. What fraction of the pizza is left(?: now)?\?$/.exec(p))) {
    const [a, b, c, d] = m.slice(1).map(N); const rest = 1 - a / b;
    return { right: rest - rest * (c / d), slips: [['firstOnly', rest], ['eatenSecond', rest * (c / d)], ['ofRest', 1 - a / b - c / d], ['eatenBoth', a / b + c / d], ['ofRest', (c / d) * (a / b)]] };
  }
  // One part of a whole, what is colored or shaded: upside down, part to part, the rest, one piece, shaded out of all
  // the pieces counted again with the shaded ones. (Not "of the square": a square can be cut into pieces of
  // different sizes, and counting pieces, 2/7 for two triangles of a square cut into 7, is the mistake there.)
  if (right && /^(?:A|The) \w+ (?:is cut into|has) \d+ equal parts\.(?: \d+ is colored\.)? What (?:is 1 part|fraction is colored)\?$|^What fraction (?:is 1 of \d+ equal tiles|is shaded|of the (?!square)\w+ is shaded)\?$|shaded slice\?$|^A tray has \d+ spaces\. \d+ have a \w+\. What fraction have a \w+\?$|this \w+ is split into \d+ equal-area [\w ]+\. Color \d+\. What fraction of the whole is colored\?$/.test(p)) {
    return { right: answer, slips: [['upsideDown', [y, x]], ['partToPart', [x, y - x]], ['otherParts', [y - x, y]], ['onePart', [1, y]], ['countOnce', [x, y + x]]] };
  }
  // A chance: green to the rest, the rest, upside down, green out of more, one marble.
  if (right && (m = /^A bag has (\d+) marbles\. (\d+) (?:is|are) green\./.exec(p))) {
    const [t, g] = [N(m[1]), N(m[2])];
    return { right: g / t, slips: [['partToPart', [g, t - g]], ['otherParts', [t - g, t]], ['upsideDown', [t, g]], ['countOnce', [g, t + g]], ['onePart', [1, t]]] };
  }
  // A dot or jumps on a number line: counted the tick marks, upside down, one jump, counted the 0 tick, the rest.
  if (right && /^What fraction is at the dot\?$|jumps? from 0\?$|^Each jump is 1\/\d+\. What is \d+ jumps? from 0\?$|^0 to 1 has \d+ equal spaces\. What is \d+ jumps?\?$|^A line has \d+ spaces\. The point is \d+ jumps from 0\. What is it\?$/.test(p)) {
    return { right: answer, slips: [['ticks', [x, y + 1]], ['upsideDown', [y, x]], ['oneJump', [1, y]], ['zeroTick', [x + 1, y]], ['fromOne', [y - x, y]]] };
  }
  // The same amount with another denominator: kept the top, added the same number to both, multiplied only the top,
  // upside down, one part (2/2 as eighths: 1/8).
  if (right && (m = /^(\d+)\/(\d+) is marked on a line\. Which fraction with a denominator of \d+ is at the same spot\?$|^Write (\d+)\/(\d+) with a denominator of \d+\.$|^Which is the same as (\d+)\/(\d+)\?$|^Change (\d+)\/(\d+) into hundredths\.$|^Which fraction covers the same amount as (\d+)\/(\d+)\?$/.exec(p))) {
    const [a, b] = m.slice(1).filter(Boolean).map(N);
    return { right: a / b, slips: [['keptTop', [a, y]], ...(a + y - b > 0 ? [['addedSame', [a + y - b, y]] as Slip] : []), ['keptBottom', [x, b]], ['upsideDown', [y, x]], ['onePart', [1, y]]] };
  }
  // "Multiply (Divide, Double) the numerator and denominator of 1/4 by 3": only the top, only the bottom, added
  // (taken away) the same number, upside down.
  if (right && (m = /^(Multiply|Divide|Double) the numerator and denominator of (\d+)\/(\d+)(?: by (\d+))?\. What do you get\?$/.exec(p))) {
    const [a, b, k] = [N(m[2]), N(m[3]), m[1] === 'Double' ? 2 : N(m[4])];
    const slips: Slip[] = m[1] === 'Divide'
      ? [['keptBottom', [a / k, b]], ['keptTop', [a, b / k]], ['addedSame', [a - k, b - k]], ['upsideDown', [y, x]], ['keptTop', [a, b - k]]]
      : [['keptBottom', [a * k, b]], ['keptTop', [a, b * k]], ['addedSame', [a + k, b + k]], ['upsideDown', [y, x]], ['keptTop', [a, b + k]]];
    return { right: a / b, slips };
  }
  // Simplest form: only the top divided, only the bottom, upside down, part of the way, one taken off each.
  if (right && (m = /^Write (\d+)\/(\d+) in simplest form\.$/.exec(p))) {
    const [n, d] = [N(m[1]), N(m[2])]; const g = gcd(n, d);
    const partWay = [2, 3, 4].filter((f) => f < g && g % f === 0).map((f): Slip => ['partWay', [n / f, d / f]]);
    return { right: n / d, slips: [['keptBottom', [n / g, d]], ['keptTop', [n, d / g]], ['upsideDown', [d / g, n / g]], ...partWay, ['addedSame', [n - 1, d - 1]]] };
  }
  // "What is 1 and 2/3 as thirds?": whole added to the top, the fraction part only, the whole only, all multiplied,
  // one whole counted twice.
  if (right && (m = /^What (?:is|fraction is the same as) (\d+) and (\d+)\/(\d+)(?: as \w+)?\?$/.exec(p))) {
    const [w, a, b] = m.slice(1).map(N);
    return { right: w + a / b, slips: [['wholeAsOne', [w + a, b]], ['leftWholes', [a, b]], ['leftFraction', [w * b, b]], ['timesParts', [w * b * a, b]], ['extraWhole', [w * b + a + b, b]]] };
  }
  // A line plot's longest minus shortest: the longest, the shortest, the two added, the bottoms added, the wrong mark.
  if (right && (m = /^(?:The line plot shows these [\w ]+ lengths in eighths|Rain fell on \d+ days): ([\d/, ]+) inch\. (?:What is the difference between the longest and shortest|How much more rain fell on the wettest day than the driest)\?$/.exec(p))) {
    const tops = m[1].split(', ').map((t) => N(t.split('/')[0])).sort((u, v) => u - v);
    const [lo, lo2, hi2, hi] = [tops[0], tops[1], tops[tops.length - 2], tops[tops.length - 1]];
    return { right: (hi - lo) / 8, slips: [['oneLength', [hi, 8]], ['oneLength', [lo, 8]], ['addedLengths', [hi + lo, 8]], ['sameBottom', [hi - lo, 16]], ['wrongMark', [hi2 - lo, 8]], ['wrongMark', [hi - lo2, 8]]] };
  }
  // Coins: "6 dimes", "2 dimes and 5 pennies", "3/10 + 8/100 of a dollar": a dime counted as a penny or as a dollar, the
  // coins swapped, tenths and hundredths added as they are.
  if ((m = /(?:has (\d+) dimes\. What part of a dollar is that, in hundredths\?|^(\d+) dimes and (\d+) pennies\. What part of a dollar is that\?)$/.exec(p))) {
    const [d, c] = m[1] ? [N(m[1]), 0] : [N(m[2]), N(m[3])];
    return { right: (10 * d + c) / 100, slips: [['dimeOne', [d + c, 100]], ['dimeDollar', [100 * d + c, 100]], ...(c ? [['coinSwap', [10 * c + d, 100]] as Slip] : []), ['keptBottom', [10 * d + c, 10]]] };
  }
  if ((m = /^(\d+)\/10 \+ (\d+)\/100 of a dollar\. How much is that in hundredths\?$/.exec(p))) {
    const [a, b] = m.slice(1).map(N);
    return { right: (10 * a + b) / 100, slips: [['tenthsAsHundredths', [a + b, 100]], ['acrossAdd', [a + b, 110]], ['oneAmount', [b, 100]], ['coinSwap', [10 * b + a, 100]]] };
  }
  if ((m = /^Write (\d+)\/10 of a dollar in hundredths\.$/.exec(p))) {
    const a = N(m[1]);
    return { right: a / 10, slips: [['keptTop', [a, 100]], ['addedSame', [a + 10, 100]], ['keptBottom', [10 * a, 10]]] };
  }
  // Line plot totals: "The line plot shows water in 6 beakers: 1/8, 3/8, … liter. How much water in all?" Each spot added once,
  // the Xs counted, the tops and bottoms added, the tops kept over one denominator.
  if ((m = /^(?:The line plot shows [\w ]+ (?:in|on) \d+ \w+|Plot these \w+ in eighths of a liter): ([\d/, ]+) (?:liter|inch)\. How much [\w ]+ in all\?$/.exec(p))) {
    const amounts = m[1].split(', ').map((t) => t.split('/').map(N) as Amount); const L = amounts.reduce((l, [, d]) => lcm(l, d), 1);
    const sum = (list: Amount[]) => list.reduce((t, [a, d]) => t + a * (L / d), 0);
    const once = amounts.filter(([a, d], k) => amounts.findIndex(([x, y]) => x * d === a * y) === k);
    return { right: sum(amounts) / L, slips: [['eachSpotOnce', [sum(once), L]], ['countedXs', [amounts.length, L]],
      ['acrossAdd', [amounts.reduce((t, [a]) => t + a, 0), amounts.reduce((t, [, d]) => t + d, 0)]], ['keptOne', [amounts.reduce((t, [a]) => t + a, 0), L]]] };
  }
  // "How much more do the 5/8 beakers hold than the 2/8 beakers?": one of each, the Xs counted, both stacks added.
  if ((m = /: ([\d/, ]+) liter\. How much more do the (\d+)\/8 \w+ hold than the (\d+)\/8 \w+\?$/.exec(p))) {
    const tops = m[1].split(', ').map((t) => N(t.split('/')[0])); const [x, y] = [N(m[2]), N(m[3])];
    const [cx, cy] = [tops.filter((t) => t === x).length, tops.filter((t) => t === y).length];
    return { right: (cx * x - cy * y) / 8, slips: [['oneEach', [x - y, 8]], ['countedXs', [cx - cy, 8]], ['addedLengths', [cx * x + cy * y, 8]]] };
  }
  // A line plot's two shortest together: the bottoms added, the shortest alone, the two longest, the difference.
  if ((m = /lengths in eighths: ([\d/, ]+) inch\. How long are the two shortest together\?$|^\w+: ([\d/, ]+) inch\. Plot them\. How long are the two shortest together\?$/.exec(p))) {
    const tops = (m[1] ?? m[2]).split(', ').map((t) => N(t.split('/')[0])).sort((u, v) => u - v);
    const [a, b] = tops; const [y, z] = tops.slice(-2);
    return { right: (a + b) / 8, slips: [['sameBottom', [a + b, 16]], ['oneAmount', [a, 8]], ['twoLongest', [y + z, 8]], ['otherOpAdd', [b - a, 8]]] };
  }
  // Decimals: the point a place too far either way, the digits written out ("9.10"), tenths read as hundredths, and for
  // tenths the part not colored (0.7 for 3/10: a slip from tenths alone, before hundredths are taught).
  // A tenth (lesson 30) has only slips written as tenths: the digit before the point (3.0), the part not colored,
  // the bottom number written first (10.3) and one tenth. Hundredths forms (0.03, 3.10, 3/100) wait for lesson 31.
  if ((m = /^(?:Write (\d+)\/(10|100) as a decimal\.|Which decimal equals (\d+)\/(10|100)\?)$/.exec(p))) {
    const [n, d] = m.slice(1).filter(Boolean).map(N);
    if (d === 10 && n < 10) {
      return { right: n / d, slips: [['decWhole', `${n}.0`], ['decRest', String((10 - n) / 10)], ['decSideBySide', `10.${n}`], ['onePart', '0.1']] };
    }
    return { right: n / d, slips: [['places', String(n / (d * 10))], ['places', String(n / (d / 10))], ['decWhole', `${n}.0`], ['decSideBySide', `${n}.${d}`], ['places', String(n / 10)], ['places', String(n / 100)]] };
  }
  if ((m = /^Write (\d+)\/10 \+ (\d+)\/100 as a decimal\.$/.exec(p))) {
    const [a, b] = m.slice(1).map(N);
    return { right: (10 * a + b) / 100, slips: [['tenthsAsHundredths', String((a + b) / 100)], ['tenthsAsHundredths', String((a + b) / 10)], ['places', String((10 * a + b) / 1000)]] };
  }
  // "What fraction is 0.3?": hundredths for tenths, the digit alone, one over the digit, the other place, upside down.
  if (right && (m = /^What fraction is 0\.(\d+)\?$|^A strip is 0\.(\d+) colored\. What fraction is that\?$/.exec(p))) {
    const n = N(m[1] ?? m[2]);
    // A tenth (lesson 30) has no hundredths slip (6/100): that waits for lesson 31.
    return { right: answer, slips: y === 10 && n < 10
      ? [['decRest', [10 - n, 10]], ['digitTop', [1, n]], ['upsideDown', [y, n]], ['decWhole', [n, 1]]]
      : [['places', [n, y * 10]], ['decWhole', [n, 1]], ['digitTop', [1, n]], ['places', [n, y / 10]], ['upsideDown', [y, n]]] };
  }
  // Percents: the numerator or denominator as the percent, a wrong scale factor (9/20 as 18%: times 2, not 5), the rest, out of 10.
  if ((m = /^Write (\d+)\/(\d+) as a percent\.$/.exec(p))) {
    const [a, b] = m.slice(1).map(N);
    return { right: a / b, slips: [['percentRename', `${a}%`], ['percentRename', `${b}%`], ['percentRename', `${a * 2}%`], ['otherParts', `${100 - (a / b) * 100}%`], ['percentRename', `${a * 10}%`]] };
  }
  // And back: over 10, upside down, the rest, over 1.
  if (right && (m = /^Write (\d+)% as a fraction(?: with a denominator of 100)?\.$/.exec(p))) {
    const v = N(m[1]);
    return { right: v / 100, slips: [['percent100', [v, 10]], ['upsideDown', [100, v]], ['otherParts', [100 - v, 100]], ['percent100', [v, 1]]] };
  }
  return null;
}

function found(prompt: string, right: Amount | null): Found | null {
  let p = prompt.replace(/^Quick review · [^:]+: /, '').replace(/^Rename: .+?\. Then /, '');
  let m: RegExpExecArray | null;
  const named = equivalence(p, right);
  if (named) return named;
  // "A board is 1/3 meter. Another is 1/6 meter. How long are they together?" is 1/3 + 1/6; so are "How many meters in
  // all?", "You add 1/2 liter. How many liters now?", "walked …, then … How far in all?" and "a recipe uses …, then … more".
  if ((m = LENGTH.exec(p) ?? SUM_WORDS.exec(p))) { const [x, y] = m.slice(1).filter(Boolean); p = `${x} + ${y} = ?`; }
  // "A jug is 9/10 full. You pour out 4/10. How much is left?" and "7/10 = 5/10 + what?" are differences.
  if ((m = /^A jug is (\d+\/\d+) full\. You pour out (\d+\/\d+)\. How much is left\?$|^(\d+\/\d+) = (\d+\/\d+) \+ what\?$/.exec(p))) {
    const [x, y] = m.slice(1).filter(Boolean); p = `${x} − ${y} = ?`;
  }
  // "Mia reads 2/5 of a book on Monday and 1/5 on Tuesday. How much is left to read?", "… garden … still empty?"
  if ((m = /(\d+\/\d+) of a book on \w+ and (\d+\/\d+) on \w+\. How much is left to read\?$|^(\d+\/\d+) of a garden is planted\. Then (\d+\/\d+) more is planted\. How much is still empty\?$/.exec(p))) {
    const [x, y] = m.slice(1).filter(Boolean).map((t) => amount(t)!);
    return x[1] === y[1] ? leftOver(x, y) : null;
  }
  // "Fill the blank: 3/4 + ? = 1": the same part again, both added, upside down, or one more piece.
  if ((m = /^Fill the blank: (\d+)\/(\d+) \+ \? = 1$/.exec(p))) {
    const [a, b] = [N(m[1]), N(m[2])];
    return { right: (b - a) / b, slips: [['sameAgain', [a, b]], ['addedWhole', [a + b, b]], ['upsideDown', [b, b - a]], ['sameBottom', [b - a, 2 * b]], ['onePart', [1, b]]] };
  }
  // "3/10 + 25/100 = ?": the tenths added as hundredths, the denominators added too, or one amount only.
  if ((m = /^(\d+)\/10 \+ (\d+)\/100 = \?$/.exec(p))) {
    const [a, b] = [N(m[1]), N(m[2])];
    return { right: (10 * a + b) / 100, slips: [['tenthsAsHundredths', [a + b, 100]], ['acrossAdd', [a + b, 110]], ['oneAmount', [b, 100]], ['oneAmount', [10 * a, 100]]] };
  }
  // "Sam says 2/4 − 1/4 = 1/8. What is the right answer?": the answer Sam gave is the first slip.
  const said = /^\w+ says (.+) = ([\d /]+)\. What is the right answer\?$/.exec(p);
  if (said) p = `${said[1]} = ?`;
  m = /^(?:What is )?((?:\d+ )?\d+\/\d+) ([+−]) ((?:\d+ )?\d+\/\d+)(?: = \?|\?)$/.exec(p);
  const result = m ? addOrSubtract(amount(m[1])!, amount(m[3])!, m[2] === '+') : timesOrShare(p);
  if (!result) return null;
  const claimed = said && amount(said[2]);
  return claimed ? { ...result, slips: [['samSlip', claimed], ...result.slips] } : result;
}

/** Write a slip the way the answer is written: a fraction ("22/18"), a mixed number ("2 7/8") or a whole number when
    the answer is one. A slip given as a value is written over the answer's denominator. */
function written(slip: Amount | number | string, answer: string, over: number): string | null {
  if (typeof slip === 'string') return slip;
  const whole = /^\d+$/.test(answer.trim());
  if (typeof slip === 'number') {
    // Over the answer's denominator, or (a whole-number answer) the smallest denominator that fits.
    const v = slip; const bottom = [over, ...Array.from({ length: 36 }, (_, k) => k + 1)].find((d) => Math.abs(v * d - Math.round(v * d)) < 1e-9);
    if (!bottom) return null;
    slip = [Math.round(v * bottom), bottom];
  }
  const [top, bottom] = slip;
  if (whole && top % bottom === 0) return top > 0 ? String(top / bottom) : null;
  if (!(bottom > 0) || !(top >= 0) || !Number.isInteger(top) || !Number.isInteger(bottom)) return null;
  // Beside a whole-number answer, a slip that isn't whole is written as a mixed number too.
  if (!whole && !/^\d+ \d+\/\d+$/.test(answer.trim())) return `${top}/${bottom}`;
  const wholes = Math.floor(top / bottom); const rest = top % bottom;
  return wholes === 0 ? `${rest}/${bottom}` : rest === 0 ? String(wholes) : `${wholes} ${rest}/${bottom}`;
}

/** The answer's unit, made to agree with the amount: "3/2 pounds", "1/6 pound" ("m" stays as it is). */
function unitFor(unit: string, value: number): string {
  if (unit.trim().length < 2) return unit;
  // "inches" ↔ "inch"; other units add or drop an "s".
  const one = unit.endsWith('ches') ? unit.slice(0, -2) : unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return value > 1 ? (one.endsWith('ch') ? `${one}es` : `${one}s`) : one;
}

/** Real mistakes for this question, written like its answer; empty when no rule knows the question or a rule's
    own working disagrees with the app's answer. */
export function fractionMistakes(prompt: string, writtenAnswer: string): string[] {
  return fractionMistakesWithWhy(prompt, writtenAnswer).map(([text]) => text);
}

/** The same mistakes, each with why it is wrong. */
export function fractionMistakesWithWhy(prompt: string, writtenAnswer: string): [string, Why][] {
  // An answer with a unit ("65/100 m", "3/4 meter"): the slips carry the same unit.
  const unit = / [a-z]+$/i.exec(writtenAnswer.trim())?.[0] ?? '';
  const answer = writtenAnswer.trim().slice(0, writtenAnswer.trim().length - unit.length);
  // "1 and 2/3" is worked with as 1 2/3; its slips are written out in full by the rule.
  const right = amount(answer.replace(' and ', ' ')); const target = right ? right[0] / right[1] : answerValue(answer);
  const result = found(prompt, right);
  if (!Number.isFinite(target) || !result || Math.abs(result.right - target) > 1e-9) return [];
  const out: [string, Why][] = []; const values = new Set([target]);
  for (const [why, slip] of result.slips) {
    const text = written(slip, answer, right?.[1] ?? 1);
    const value = typeof slip === 'string' ? (amount(slip.replace(' and ', ' ')) ? valueOf(slip.replace(' and ', ' ')) : answerValue(slip)) : typeof slip === 'number' ? slip : slip[0] / slip[1];
    // A choice of 0 ("0/3") is never a believable answer to these questions.
    if (!text || !Number.isFinite(value) || value === 0 || [...values].some((v) => Math.abs(v - value) < 1e-9)) continue;
    values.add(value); out.push([text + unitFor(unit, value), why]);
  }
  return out;
}

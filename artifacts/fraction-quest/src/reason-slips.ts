/* The wrong reasons offered beside a lesson's right one in its Build "why" question: the mistakes children really
   make in that lesson, not the same stock pair everywhere. Each is short like the right reason (REASON_IDEAS), so its
   length gives nothing away, and each is false for the lesson. A lesson has three; each step shows two of them. */
export const REASON_SLIPS: Record<string, [string, string, string]> = {
  // Unit 1 · Equal parts
  'equal-parts': ['Any cut makes fair parts', 'Count the cuts, not the parts', 'Only the shaded parts must match'],
  'fraction-names': ['Numerator: all parts. Denominator: counted', 'Count the unshaded parts on top', 'The bigger number goes on top'],
  'unit-fractions': ['A unit fraction is the whole', 'The numerator counts all parts', 'One part is called one whole'],
  'fraction-of-area': ['Count pieces even if unequal', 'Shaded parts over unshaded parts', 'Equal parts must look the same'],
  // Unit 2 · Unit size
  'unit-size': ['More parts means bigger parts', 'Bigger denominator: bigger part', 'The size never changes'],
  'compare-same-numerator': ['Bigger denominator: bigger fraction', 'Same numerator means same size', 'Compare only the denominators'],
  // Unit 3 · Benchmarks
  'benchmark-half': ['Half is always 1 part', 'More parts always means more', 'Compare numerators only'],
  'benchmarks-zero-one': ['One whole is one part', 'Small numbers are near zero', 'Big denominators mean near one'],
  'fraction-magnitude': ['Bigger numbers always mean bigger', 'Compare only the two denominators', 'Fractions are always far apart'],
  // Unit 4 · Number lines and measuring
  'number-line-basics': ['Count the tick marks', 'Start counting at 1', 'Spaces can be any size'],
  'number-line-points': ['Count the ticks, not jumps', 'Start at the first tick', 'Count jumps back from 1'],
  'number-line-beyond-one': ['The line stops at one', 'Start again from 0 past one', 'Past one the jumps get bigger'],
  'ruler-measurement': ['Start at the ruler’s end', 'Count the tick marks', 'Each small space is one inch'],
  'build-line-plots': ['One X for each size only', 'Each X gets its own spot', 'Make one X for the longest'],
  // Unit 5 · Compare and order
  'compare-same-denominator': ['Fewer parts is bigger', 'Bigger denominator: bigger fraction', 'Compare the denominators'],
  'order-fractions': ['Biggest denominator goes last', 'Order by denominators only', 'Smallest numerator wins'],
  // Unit 6 · Equivalent fractions
  'equivalent-models': ['A new name changes the size', 'Change only the denominator', 'Add the same number to both'],
  'equivalent-number-line': ['Different names, different spots', 'Bigger numbers go further', 'Count ticks, not spaces'],
  'build-equivalents': ['Change only the numerator', 'Add the same number to both', 'Splitting parts makes it bigger'],
  'missing-equivalent': ['Add the same number to both', 'Change only the denominator', 'Copy the numerator across'],
  // Unit 7 · Parts and wholes
  'compose-to-one': ['Add the denominators too', 'One whole is one part', 'Any parts make one whole'],
  'decompose-fractions': ['The parts must be different', 'Split the denominator too', 'Only unit fractions add up'],
  'whole-numbers-as-fractions': ['One whole is one part', 'A whole has no denominator', 'Wholes need a numerator of 1'],
  'improper-fractions': ['A fraction stops at one', 'Extra parts start a new fraction', 'The numerator must be smaller'],
  'mixed-improper': ['Add the whole to the numerator', 'A whole is one part', 'Multiply whole by numerator'],
  // Unit 8 · Add, subtract, decimals and groups
  'add-like-denominators': ['Add the denominators too', 'Add across, top and bottom', 'Keep the bigger of the numerators'],
  'subtract-like-denominators': ['Subtract the denominators too', 'Take the smaller from the bigger', 'Add numerators and keep the denominator'],
  'add-mixed-numbers': ['Add the denominators too', 'Forget the extra whole', 'Add the wholes only'],
  'subtract-mixed-numbers': ['Take smaller part from bigger', 'Subtract the denominators too', 'Ignore the wholes'],
  'tenths-decimals': ['The digit goes before the point', 'Tenths are two places', 'Write the denominator after'],
  'hundredths-decimals': ['Hundredths are one place', 'More digits means bigger', 'Write the fraction side by side'],
  'decimal-fraction-equivalence': ['Write the digits side by side', 'The denominator is the decimal', 'Tenths and hundredths are the same'],
  'compare-decimals': ['More digits means bigger', 'Compare the last digits', 'Shorter decimals are smaller'],
  'compare-decimals-grid': ['More digits always means bigger', 'Count only the shaded columns', 'Each square is one tenth'],
  'add-tenths-hundredths': ['Add the digits as they are', 'A tenth is one hundredth', 'Add the denominators too'],
  'unit-fraction-multiples': ['Multiply the denominator too', 'Copies make the parts bigger', 'Add the denominators each time'],
  'dimes-and-pennies': ['A dime is 1 hundredth', 'A dime is a whole dollar', 'Add ten for every dime'],
  'multiply-whole-by-fraction': ['Each group gets a bigger part', 'Multiply the denominator too', 'Add the whole to the numerator'],
  // Unit 9 · Rename, compare, line plots
  'simplify-fractions': ['Divide only the numerator', 'Take 1 from top and bottom', 'Simplest form is a smaller amount'],
  'equivalent-missing-both': ['Add the same number to both', 'Change only the denominator', 'Copy the numerator across'],
  'compare-unlike-fractions': ['Bigger denominator: bigger fraction', 'Compare numerators only', 'Different parts can’t be compared'],
  'order-unlike-fractions': ['Put them in order by numerators', 'Put them in order by denominators', 'Bigger numbers always mean bigger'],
  'plot-in-eighths': ['Each length gets one X only', 'Put the Xs in measuring order', 'Count the tick marks to plot'],
  'party-portions': ['Multiply the denominator too', 'Add the guests to the top', 'The total is one portion'],
  'two-step-conversions': ['Add or take away first', 'Every unit has ten small parts', 'Keep the two units apart'],
  'line-plot-totals': ['Add each spot only once', 'Count the Xs, not their amounts', 'Add the denominators too'],
  'read-line-plots': ['Add the longest and shortest', 'Count the Xs at one spot', 'Use the tallest stack'],
  'measurement-word-problems': ['Add the denominators too', 'The whole unit is the answer', 'Add the numbers you see'],
  // Unit 10 · Unlike fractions
  'add-related-fractions': ['Add the denominators too', 'Add the numerators as they are', 'Rename only the numerator'],
  'add-unlike-fractions': ['Add across, top and bottom', 'Add the numerators as they are', 'Rename only the numerator'],
  'subtract-unlike-fractions': ['Subtract across, top and bottom', 'Take the numerators as they are', 'Rename only the numerator'],
  'mixed-unlike-operations': ['Add the denominators too', 'Keep both denominators', 'Rename only the numerator'],
  'estimate-fraction-operations': ['Big numbers mean a big sum', 'Add the denominators to check', 'Estimates must be exact'],
  // Unit 11 · Multiply and divide
  'sets-unit-fractions': ['Make groups equal to the numerator', 'Pick the denominator of objects', 'Groups can be different sizes'],
  'sets-nonunit': ['Make groups equal to the numerator', 'Pick one object per group', 'Groups can be different sizes'],
  'fraction-of-quantity': ['Divide the number by the numerator', 'Take the denominator away from it', 'Multiply the number by the denominator'],
  'multiply-fractions': ['Add the two fractions together', 'Part of a part is bigger', 'Keep the first fraction’s denominator'],
  'fraction-times-fraction': ['Add rows and columns', 'Multiply tops, add bottoms', 'The answer is always bigger'],
  'fraction-of-collection': ['Divide by the numerator', 'Pick the denominator of objects', 'Groups can be different sizes'],
  'divide-whole-by-unit-fraction': ['Dividing always makes it smaller', 'Count the wholes, not the parts', 'Count one whole only'],
  'multiplication-scaling': ['Multiplying always makes it bigger', 'A fraction of it is more', 'The size stays the same'],
  'bigger-or-smaller': ['Multiplying always makes it bigger', 'Compare the factor with 0', 'Bigger numbers always win'],
  'unit-fraction-divided-whole': ['Sharing makes each share bigger', 'Add the friends to the denominator', 'Each friend gets the whole part'],
  'share-or-fit': ['Sharing and fitting are the same', 'Dividing always makes it smaller', 'Fit splits, share counts'],
  // Unit 12 · Measure and share
  'fraction-of-length': ['Count every tick mark', 'Spaces can be any size', 'Start counting the spaces at 1'],
  'fractional-measure-addition': ['Add the denominators too', 'Add across, top and bottom', 'Add the numerators as they are'],
  'line-plot-leveling': ['Give everyone the biggest amount', 'Give each cup the smallest amount', 'Add the denominators'],
  'fractional-unit-conversions': ['Use the fraction as the answer', 'Multiply by the denominator', 'Every unit has 100 parts'],
  'fractional-sharing': ['Friends ÷ loaves is each share', 'Each friend gets one loaf', 'Add the loaves and friends'],
  'fraction-as-division': ['The fraction bar means minus', 'Divide the bottom by the top', 'A fraction can’t be division'],
  // Unit 13 · Chance and area
  'fraction-probability': ['Wanted ones out of the rest', 'All out of the wanted ones', 'One out of the total'],
  'fractional-side-area': ['Add the two side lengths', 'Area is one side only', 'Area is always bigger'],
  'multiply-mixed-numbers': ['Multiply the wholes only', 'Add the side lengths', 'Multiply wholes and parts apart'],
  'fraction-recipes': ['Double the denominator too', 'Add the batches to the top', 'Doubling halves the amount'],
  // Unit 14 · Percent and stories
  'fractions-to-percent': ['Percent means out of 10', 'Write the digits side by side', 'The denominator is the percent'],
  'percent-to-fraction': ['Percent means out of 10', 'Put the percent on the bottom', 'Percent means out of 1'],
  'multi-step-fraction-stories': ['Use the first numbers', 'One step is always enough', 'Add every number'],
  // Unit 15 · Problem solving
  'find-the-whole': ['The part is the whole', 'Multiply by the numerator', 'The whole is one part more'],
  'spot-the-mistake': ['Add the denominators too', 'Bigger numbers mean bigger', 'Add 1 to top and bottom'],
  'fraction-of-remainder': ['Take both from the whole', 'Add the two fractions', 'Stop after the first part'],
  'divide-fractions': ['Dividing always makes it smaller', 'Multiply the two fractions', 'Divide the denominators only'],
};

/** Two of the lesson's wrong reasons for a step: each step (and review round) gets a different pair. */
export function wrongReasons(id: string, step: number): [string, string] {
  const slips = REASON_SLIPS[id];
  if (!slips) throw new Error(`Missing wrong reasons: ${id}`);
  const k = ((step % 3) + 3) % 3;
  return [slips[k], slips[(k + 1) % 3]];
}

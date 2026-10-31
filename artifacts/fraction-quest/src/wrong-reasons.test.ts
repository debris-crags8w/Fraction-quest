/* A wrong tap gets the exact, true reason for that wrong choice (package J).
   1. Same-numerator "which is bigger" questions say the bottom-number idea; no comparison question falls back to a
      generic reply.
   2. A specific real-slip reason beats the general counting heuristics unless the question is a shading count.
   3. "Find the whole": one part is not the whole. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { generateQuestions } from './practice-bank';
import { SLIPS, wrongChoiceReason } from './wrong-answer';
import { WHY } from './slip-reasons';

const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
const keyOf = (text: string | null) => {
  if (!text) return text;
  const hit = [...Object.entries(WHY).map(([k, v]) => [`WHY.${k}`, v]), ...Object.entries(SLIPS).map(([k, v]) => [`SLIPS.${k}`, v])]
    .find(([, v]) => v === text);
  return hit ? hit[0] : `text:${text}`;
};
const expectKey = (prompt: string, right: string, pick: string, key: string) =>
  assert.equal(keyOf(why(prompt, right, pick)), key, `${prompt} / pick ${pick}`);

/** [prompt, right answer, wrong pick, the reason key it now gets] */
const TABLE: [string, string, string, string][] = [
  // 1. Bigger denominator is not a bigger fraction (same numerator, unit fractions too), picking either way.
  ['Which is bigger, 1/4 or 1/6?', '1/4', '1/6', 'WHY.bigBottom'],
  ['Which part is bigger, 1/4 or 1/6?', '1/4', '1/6', 'WHY.bigBottom'],
  ['Which is smaller: 1/3 or 1/6?', '1/6', '1/3', 'WHY.bigBottom'],
  ['Which is bigger, 2/3 or 2/8?', '2/3', '2/8', 'WHY.bigBottom'],
  ['Which is smaller, 4/6 or 4/8?', '4/8', '4/6', 'WHY.bigBottom'],
  ['Quick review · Unit fraction size: Which part is bigger, 1/4 or 1/6?', '1/4', '1/6', 'WHY.bigBottom'],
  // Same bottom number: the pieces match, so count the pieces.
  ['Which is bigger, 4/6 or 2/6?', '4/6', '2/6', 'WHY.sameSizeCount'],
  ['Which is smaller, 2/6 or 5/6?', '2/6', '5/6', 'WHY.sameSizeCount'],
  // Different top and bottom, and a decimal beside a fraction.
  ['Which is bigger, 5/8 or 1/2?', '5/8', '1/2', 'WHY.sizeAndCount'],
  ['Which is bigger, 0.8 or 5/10?', '0.8', '5/10', 'WHY.sameWay'],
  // "They are equal" and "You can't tell" get the reason that fits these two numbers.
  ['Which is bigger, 1/4 or 1/6?', '1/4', 'They are equal', 'WHY.sameCountSizes'],
  ['Which is bigger, 2/3 or 2/8?', '2/3', 'They match', 'WHY.sameCountSizes'],
  ['Which is bigger, 4/6 or 2/6?', '4/6', 'They are equal', 'WHY.sameSizeCounts'],
  ['Which is smaller, 1/3 or 2/3?', '1/3', 'They match', 'WHY.sameSizeCounts'],
  ['Which is bigger, 5/8 or 1/2?', '5/8', 'They are equal', 'WHY.bothDiffer'],
  ['Which is bigger, 0.8 or 5/10?', '0.8', 'They are equal', 'WHY.sameWay'],
  ['Which is bigger, 1/4 or 1/6?', '1/4', "You can't tell", 'WHY.canTellSize'],
  ['Which is bigger, 4/6 or 2/6?', '4/6', "You can't tell", 'WHY.canTellSize'],
  ['Which is bigger, 0.8 or 5/10?', '0.8', "You can't tell", 'WHY.sameWay'],
  // The top number counts, the bottom number sizes.
  ['Which has bigger parts, 1/6 or 5/6?', 'The parts are the same size', '5/6', 'WHY.topCounts'],
  ['Which has bigger parts, 1/6 or 5/6?', 'The parts are the same size', '1/6', 'WHY.topCounts'],
  // The two are equal (practice-bank questions): look at the size of the parts and how many there are.
  ['Which is bigger, 8/12 or 2/3?', 'They are equal', '8/12', 'WHY.sizeAndCount'],
  ['Which is bigger, 1/2 or 6/12?', 'They are equal', '1/2', 'WHY.sizeAndCount'],
  // 2. The specific slip beats the general counting sentences when the question is not a shading count.
  ['What is 1/3 + 1/6?', '3/6', '3/9', 'WHY.addedBottoms'],
  ['What is 1/2 − 1/3?', '1/6', '1/5', 'WHY.addedBottoms'],
  ['5/6 − 1/3 = ?', '3/6', '3/9', 'WHY.addedBottoms'],
  ['A board is 1/3 meter. Another is 1/6 meter. How long are they together?', '3/6 meter', '3/9 meter', 'WHY.addedBottoms'],
  ['A recipe uses 3/6 cup, then 3/6 cup more. How much in all?', '6/6 cup', '6/12 cup', 'SLIPS.addTops'],
  ['2/6 of a garden is planted. Then 3/6 more is planted. How much is still empty?', '1/6', '1/12', 'WHY.sameBottom'],
  ['Cut every half into 2 equal spaces. What is 1 new space?', '1/4', '1/3', 'SLIPS.recountParts'],
  ['0 to 1 has 6 equal spaces. What is 1 jump?', '1/6', '1/7', 'WHY.ticks'],
  ['1/8 + 1/2 = ?', '5/8', '4/8', 'WHY.oneAmount'],
  ['5/6 − 1/2 = ?', '2/6', '3/6', 'WHY.takenAmount'],
  ['Which of these fractions is less than 1 whole?', '2/3', '3/2', 'WHY.notLess'],
  ['Write 4 × 1/3 as one fraction.', '4/3', '4/7', 'WHY.onlyTop'],
  ['2 loaves are shared fairly by 3 friends. How much does each friend get?', '2/3 loaf', '2/5 loaf', 'WHY.addedForShare'],
  ['2 loaves are shared fairly by 3 friends. How much does each friend get?', '2/3 loaf', '3/2 loaves', 'WHY.shareFlip'],
  ['1 loaf is shared fairly by 4 friends. How much does each friend get?', '1/4 loaf', '4/1 loaves', 'WHY.shareFlip'],
  ['A bag has 12 marbles. 7 are green. What is the chance of picking green?', '7/12', '7/19', 'WHY.countOnce'],
  ['Which is the same as 1/3?', '2/6', '6/2', 'WHY.upsideDown'],
  ['Write 1/4 as a decimal.', '0.25', '1.4', 'WHY.decSideBySide'],
  ['Write 3/10 as a decimal.', '0.3', '3.0', 'WHY.decWhole'],
  ['What is 1/3 of 1/3?', '1/9', '2/6', 'WHY.addedAcross'],
  // ...and where the sentence is about something else, the true specific one is written for it.
  ['Which fraction is one whole?', '3/3', '3/6', 'WHY.allPartsWhole'],
  ['1/4 + ? = 1. What is the missing part?', '3/4', '2/4', 'WHY.notYetWhole'],
  ['1/4 + ? = 1. What is the missing part?', '3/4', '4/4', 'WHY.addedWhole'],
  ['1/4 + ? = 1. What is the missing part?', '3/4', '1/4', 'WHY.sameAgain'],
  ['To find 3/4 − 3/8, the parts must match. What is 3/4 in eighths?', '6/8', '7/8', 'WHY.addedSame'],
  ['To find 3/4 − 3/8, the parts must match. What is 3/4 in eighths?', '6/8', '3/8', 'WHY.keptTop'],
  ['Halves and sixths are different sizes. Rename 1/2 as sixths.', '3/6', '6/3', 'WHY.upsideDown'],
  ['Halves and sixths are different sizes. Rename 1/2 as sixths.', '3/6', '1/6', 'WHY.keptTop'],
  // The shading-count questions keep the counting sentences, which are true there.
  ['A shape has 9 equal parts. 1 is colored. What fraction is colored?', '1/9', '9/1', 'SLIPS.flipped'],
  ['A shape has 9 equal parts. 1 is colored. What fraction is colored?', '1/9', '1/8', 'SLIPS.recountParts'],
  ['A shape has 3 equal parts. 1 is colored. What fraction is colored?', '1/3', '1/4', 'SLIPS.allParts'],
  ['This hexagon is on a classroom poster. What fraction of the hexagon is colored?', '1/6', '2/6', 'SLIPS.recountShaded'],
  // 3. Find the whole: one part is not the whole.
  ["6 stickers are 3/4 of Ana's stickers. How many stickers does Ana have?", '8', '2', 'WHY.onePartOnly'],
  ['Tom read 8 pages. That is 2/3 of his book. How many pages are in the book?', '12', '4', 'WHY.onePartOnly'],
  ['A piece of ribbon is 6 meters long. It is 2/5 of the whole ribbon. How many meters long is the whole ribbon?', '15 meters', '3 meters', 'WHY.onePartOnly'],
  ["6 stickers are 3/4 of Ana's stickers. How many stickers does Ana have?", '8', '24', 'WHY.onePartFirst'],
  // The "just one group" reason stays true for a part of a group.
  ['What is 2/3 of 12?', '8', '4', 'WHY.oneGroup'],
  // A generic "number from the question" gets the real slip where one exists.
  ['What is 1/4 of 12 toy cars?', '3 cars', '4 cars', 'WHY.splitDenominator'],
  ['A fence is 20 meters long. How long is 1/4 of it?', '5 meters', '4 meters', 'WHY.splitDenominator'],
  // 4. Meaning and number-only picks name the slip behind them, not only the hint.
  ['In 2/6, what does the 6 mean?', '6 equal parts in all', '6 parts are shaded', 'WHY.bottomNotShaded'],
  ['In 2/6, what does the 6 mean?', '6 equal parts in all', '6 wholes', 'WHY.notWholes'],
  ['In 3/4, what does the 3 mean?', '3 parts are counted', '3 equal parts in all', 'WHY.topNotAll'],
  ['In 3/4, what does the 3 mean?', '3 parts are counted', '3 parts not counted', 'WHY.topNotLeft'],
  ['In 5/8, how many parts are counted?', '5', '8', 'WHY.askedTop'],
  ['In 5/8, how many parts are counted?', '5', '13', 'WHY.addedBoth'],
  ['This bar has 3 cuts. How many equal parts make the whole?', '4', '3', 'WHY.cutsNotParts'],
  ['This bar has 3 cuts. How many equal parts make the whole?', '4', '5', 'SLIPS.recountParts'],
  ['Count the spaces between the tick marks. How many equal spaces go from 0 to 1?', '6', '7', 'WHY.ticksNotSpaces'],
  ['This line has equal spaces from 0 to 1. What is the denominator?', '8', '9', 'SLIPS.recountParts'],
  ['A line has 8 equal spaces. Where is 3/8?', '3 jumps from 0', '8 jumps from 0', 'WHY.askedTop'],
  ['A line has 8 equal spaces. Where is 3/8?', '3 jumps from 0', '5 jumps from 0', 'WHY.jumpsToOne'],
  ['A line has 8 equal spaces. Where is 3/8?', '3 jumps from 0', '3 jumps back from 1', 'WHY.jumpsForward'],
  ['Half of a cake is 2 equal pieces. How many equal pieces make the whole cake?', '4', '2', 'WHY.halfOnly'],
  ['Is 1/3 more or less than 1/2?', 'Less than 1/2', 'Equal to 1/2', 'WHY.notExactHalf'],
  ['Is 1/3 more or less than 1/2?', 'Less than 1/2', 'More than 1/2', 'WHY.halfOfBottom'],
  ['Is 1/3 more or less than 1/2?', 'Less than 1/2', 'More than 1', 'WHY.otherBenchmark'],
  ['A jug is 4/6 full. Is that more or less than half?', 'More than half', 'Less than half', 'WHY.halfOfBottom'],
  ['A jug is 4/6 full. Is that more or less than half?', 'More than half', 'Exactly half', 'WHY.notExactHalf'],
  ['A jug is 4/6 full. Is that more or less than half?', 'More than half', 'More than one whole', 'WHY.otherBenchmark'],
  ['Is 4/6 a little more or a little less than 1/2?', 'A little more than 1/2', 'A little less than 1/2', 'WHY.halfOfBottom'],
  ['Is 4/6 a little more or a little less than 1/2?', 'A little more than 1/2', 'Much less than 1/2', 'WHY.nearHalfSize'],
  ['Which fraction is exactly one half?', '2/4', '3/4', 'WHY.halfOfBottom'],
  ['Which is less than 1/2?', '1/4', '3/4', 'WHY.halfOfBottom'],
  ['Which is more than 1/2?', '3/4', '1/4', 'WHY.halfOfBottom'],
  ['Quick review · Estimate size: Which is just a little less than 1/2?', '3/8', '7/8', 'WHY.halfOfBottom'],
  ['Is 5/8 nearer 1/2 or 1?', 'Nearer 1/2', 'Nearer 1', 'WHY.farther'],
  ['Is 5/8 nearer 1/2 or 1?', 'Nearer 1/2', 'Exactly 1/2', 'WHY.notExactNear'],
  ['A plant grew 7/8 of a meter. Is that near 0, 1/2 or 1 meter?', '1 meter', '0 meters', 'WHY.farther'],
  ['Which is bigger, 3/8 or 1/2?', '1/2', '3/8', 'WHY.bigNumbers'],
  ['Which covers more: 3/8 or 3/6?', '3/6', '3/8', 'WHY.bigBottom'],
  ['In 4/3 × 6, is the factor 4/3 more or less than 1?', 'More than 1', 'Less than 1', 'WHY.topVsBottom'],
  ['In 6/6 × 7, is the factor 6/6 more or less than 1?', 'Equal to 1', 'More than 1', 'WHY.topVsBottom'],
  ['Is 3/4 × 12 more or less than 12?', 'Less than 12', 'More than 12', 'WHY.scaleCompare'],
  ['Which one is more than 8?', '5/4 × 8', '3/4 × 8', 'WHY.scaleCompare'],
  ['Is 5/4 × 2 1/2 more than 2 1/2?', 'Yes, 5/4 is more than 1', 'No, it is less', 'WHY.scaleCompare'],
  ['Ana says multiplying always makes a number bigger. Is she right?', 'No, 1/2 × 4 is 2', 'Yes, it always gets bigger', 'WHY.tryUnderOne'],
  ['Ana says multiplying always makes a number bigger. Is she right?', 'No, 1/2 × 4 is 2', 'No, it always gets smaller', 'WHY.tryOverOne'],
  ['3 out of 8 equal parts are shaded. What fraction is shaded?', '3/8', '5/8', 'WHY.notShadedCount'],
  ['3 out of 8 equal parts are shaded. What fraction is shaded?', '3/8', '8/8', 'WHY.topNotAll'],
  ['Is this strip cut into 3 equal parts?', 'No, the parts are unequal', 'Yes, there are 3 parts', 'WHY.countNotSize'],
  ['This ribbon is cut into 2 parts. Are the parts the same size?', 'Yes, same-size parts', 'No, there must be 3 parts', 'WHY.countNotSize'],
  ['Which number divides both 6 and 9?', '3', '6', 'WHY.justNumber'],
  // 5. The same slip gets the same reason in every idea of a lesson (multiply a whole number by a fraction).
  ['3 × 1/3 = ?', '3/3', '1/3', 'WHY.justOneGroup'],
  ['What is 3 groups of 2/3?', '6/3', '2/3', 'WHY.justOneGroup'],
  ['What is 2 groups of 3/8?', '6/8', '6/16', 'WHY.onlyTop'],
  // Adding the number of groups to the numerator is the slip in repeated addition, not "you added" (adding copies is right).
  ['What is 2 groups of 3/8?', '6/8', '5/8', 'WHY.groupsToTop'],
  ['Write 4 × 1/3 as one fraction.', '4/3', '5/3', 'WHY.groupsToTop'],
  ['A recipe uses 1/6 cup of flour. You make 2 batches. How much flour do you need?', '2/6', '3/6', 'WHY.groupsToTop'],
  ['Each runner drinks 5/6 liter. 3 runners. How much in all?', '15/6', '8/6', 'WHY.groupsToTop'],
  ['What is 2 groups of 3/8?', '6/8', '3/16', 'WHY.timesBottomOnly'],
  ['A frog jumps 3/8 each time. Where is it after 2 jumps?', '6/8', '6/16', 'WHY.onlyTop'],
  ['A frog jumps 3/8 each time. Where is it after 2 jumps?', '6/8', '3/16', 'WHY.timesBottomOnly'],
  ['Which is the same as 3 × 2/5?', '6 × 1/5', '3 × 1/5', 'WHY.unitCount'],
  ['Which is the same as 3 × 2/5?', '6 × 1/5', '6 × 1/12', 'WHY.sameBottom'],
  // 6. Practice picks that used to get only the hint (rescore 3): the slip behind each one.
  ['Is this square cut into fourths?', 'Yes, same-size parts', 'No, fourths must be squares', 'WHY.shapeNotSize'],
  ['Is this square cut into fourths?', 'Yes, same-size parts', 'Yes, because there are 4 parts', 'WHY.countNotSize'],
  ['This square is cut into 1 small square and 6 triangles. Are all the parts equal in area?', 'No, the small square covers more', 'Yes, they all fill the square', 'WHY.fillNotEqual'],
  ['Are the outcomes on this spinner equally likely?', 'No, one part is bigger', 'Yes, it can land on any part', 'WHY.landNotLikely'],
  ['How many sixths make one whole?', '6', '5', 'WHY.partsInWhole'],
  ['3 friends share a pizza fairly. What fraction does each friend get?', '1/3', '3/3', 'WHY.wholeNotShare'],
  ['A line has 4 equal spaces from 0 to 1. What fraction is 1 space?', '1/4', '4/4', 'WHY.allSpaces'],
  ['A frog makes 3 jumps. Each jump is 1/4 meter. How far did it go?', '3/4 meter', '1/4 meter', 'WHY.oneJump'],
  ['A frog makes 3 jumps. Each jump is 1/4 meter. How far did it go?', '3/4 meter', '3 meters', 'WHY.jumpsNotWholes'],
  ['Which is closer to 1/2: 5/6 or 4/6?', '4/6', '5/6', 'WHY.farther'],
  ['Which is farther from one whole: 1/2 or 1/6?', '1/6', '1/2', 'WHY.nearer'],
  ['How much is missing from 3/4 to make one whole?', '1/4', '3/4', 'WHY.sameAgain'],
  ['Use eighths. Which fraction is 1 part less than half?', '3/8', '5/8', 'WHY.wrongSideHalf'],
  ['Cut every fourth into 2 equal spaces. What is 1 new space?', '1/8', '1/4', 'WHY.beforeCut'],
  ['Each fourth of a bar is cut in half. What fraction of the whole bar is one small part?', '1/8', '1/6', 'WHY.cutAdds'],
  ['How many fourths make 2 wholes?', '8', '4', 'WHY.justOneWhole'],
  ['Each bar is one whole. Which mixed number is shaded?', '1 and 2/3', '2/3', 'WHY.leftWholes'],
  ['Start with 5/8. Take away 2/8. How many eighths are left?', '3', '7', 'WHY.otherOpTake'],
  ['A cat eats 1/4 cup of food, then 2/4 cup more. How much in all?', '3/4 cup', '2/4 cup', 'WHY.oneAmount'],
  // A pick that is the whole story's answer on a first-step question did both steps (3/8 is also Tuesday's amount, but it is
  // what is left to read after both steps).
  ['Mia reads 2/8 of a book on Monday and 3/8 on Tuesday. How much is left to read? First, how much does she read in all?', '5/8', '3/8', 'WHY.bothSteps'],
  ['Mia reads 2/8 of a book on Monday and 3/8 on Tuesday. How much is left to read? First, how much does she read in all?', '5/8', '1/8', 'WHY.otherOpAdd'],
  ['A jug has 4/6 liter. Sam drinks 1/6 liter, then adds 2/6 liter. How much is in the jug now? First, how much is left after Sam drinks?', '3/6 liter', '5/6 liter', 'WHY.bothSteps'],
  ['A jug has 4/6 liter. Sam drinks 1/6 liter, then adds 2/6 liter. How much is in the jug now? First, how much is left after Sam drinks?', '3/6 liter', '7/6 liters', 'WHY.otherOpTake'],
  ['A ribbon is 5/6 meter long. Cut off 1/6 meter, then 2/6 meter. How much is left? First, how long is it after the first cut?', '4/6 meter', '2/6 meter', 'WHY.bothSteps'],
  ['For 1/2 + 1/3, what is 1/2 in sixths?', '3/6', '2/6', 'WHY.otherFraction'],
  ['For 1/2 + 1/3, what is 1/2 in sixths?', '3/6', '5/6', 'WHY.wholeSum'],
  ['A board is 3/4 meter long. How many eighths of a meter is that?', '6/8 meter', '3/8 meter', 'WHY.keptTop'],
  ['Use fourths. Which mixed number is the same as 2 1/2?', '2 2/4', '4 2/4', 'WHY.keepWholes'],
  ['Make both fractions tenths. Then 1/2 + 1/5 = ?', '7/10', '2/10', 'WHY.timesBottoms'],
  ['Fourths and eighths are different sizes. To make them match, which fraction do you rename?', '1/4, as eighths', 'Neither one', 'WHY.mustRename'],
  ['3/4 = ?/12. What was 4 multiplied by to make 12?', '3', '8', 'WHY.addNotTimes'],
  ['Does 2 divide both 3 and 8?', 'No, 2 does not divide 3', 'No, 2 does not divide 8', 'WHY.checkOther'],
  ['This bar shows copies of 1/8. How do you write it with ×?', '5 × 1/8', '8 × 1/5', 'WHY.copiesFirst'],
  ['How many minutes are in 2/3 of an hour?', '40 minutes', '60 minutes', 'WHY.whole'],
  ['How many inches are in 1 1/2 feet?', '18 inches', '12 inches', 'WHY.leftFraction'],
  ['A race takes 1/2 hour. The cool-down takes 5 more minutes. How many minutes in all?', '35 minutes', '6 minutes', 'WHY.changeUnits'],
  ['Ana has 30 stickers. She gives 1/3 of them to Ben. How many stickers does Ana have left?', '20', '10', 'WHY.given'],
  ['A rectangle is 4 units long and 3 units wide. What is its area?', '12 square units', '14 square units', 'WHY.perimeter'],
  ['A square has 4 rows and 5 columns. Shade 3 rows and 2 columns. How many boxes are in the overlap?', '6', '20', 'WHY.wholeGrid'],
  ['2 friends share 1/4 of a cake equally. What fraction of the whole cake does each friend get?', '1/8', '1/4', 'WHY.notSplit'],
  ['2 children share 1/6 of a pan. 1/6 ÷ 2 = ?', '1/12', '2/12', 'WHY.sameAsBefore'],
  ['Pip has 3 pounds of clay. Each bag holds 1/4 pound. Is this sharing or fitting?', 'Fitting', 'Adding', 'WHY.notAddTake'],
  ['How many hundredths is 0.08?', '8', '80', 'WHY.places'],
  ['How many hundredths is 0.9?', '90', '900', 'WHY.tenthHundredths'],
  ['A grid has 100 equal squares. 7 are shaded. What fraction is shaded?', '7/100', '7/10', 'WHY.hundredBottom'],
  ['Mia eats 0.5 of a small pizza. Leo eats 0.4 of a big pizza. Who eats more?', "You can't tell", 'Mia', 'WHY.lookAtWholes'],
  ['Tim says 2 × 3/8 = 6/16. Is that right?', 'No, the parts stay eighths', 'No, 2 × 3 is not 6', 'WHY.topsFine'],
  ['Mo works out 2/8 + 3/8 + 1/8. Step 1: 2/8 + 3/8 = 6/8. Step 2: 6/8 + 1/8 = 7/8. Which is the first wrong step?', 'Step 1', 'Step 2', 'WHY.checkSteps'],
  ['The line plot shows water in 6 beakers: 2/8, 2/8, 5/8, 5/8, 5/8, 8/8 liter. How much more do all the 5/8 beakers hold together than all the 2/8 beakers together?', '1 3/8 liters', '3/8 liter', 'WHY.oneEach'],
  ['6/4 liters of water is shared equally by 3 cups. How much goes in each cup?', '2/4 liter', '6/4 liters', 'WHY.total'],
  ['A strip has 10 equal parts. 9 are colored. What fraction is not colored?', '1/10', '9/10', 'WHY.otherParts'],
  // 7. A sum of unlike parts is not checked by adding numerators; "Solve 1/6 × 24" answered 144 multiplied by the
  // denominator; and a number copied from the question gets the slip it is, where that is known.
  ['Which sum equals 3/5?', '1/5 + 2/5', '1/2 + 2/3', 'WHY.sumOtherSize'],
  ['Which sum of unit fractions equals 3/6?', '1/6 + 1/6 + 1/6', '1/3 + 1/3 + 1/3', 'WHY.sumOtherSize'],
  ['Which sum makes 4/6?', '1/6 + 3/6', '1/6 + 4/6', 'WHY.sumCheck'],
  ['1/6 of 24 buttons are blue. Solve 1/6 × 24 to find how many are blue.', '4', '144', 'WHY.timesBottom'],
  ['What is 2/3 of 18 cards?', '12', '36', 'WHY.timesWhole'],
  ['Fill the blank: 3/4 = 6/?', '8', '6', 'WHY.blankIsBottom'],
  ['Fill the blank: 1/2 = ?/8', '4', '8', 'WHY.blankIsTop'],
  ['Fill the blank: ?/10 = 2/5', '4', '5', 'WHY.blankIsTop'],
  ['Fill the blank: 6/8 = 2/8 + ?/8', '4', '8', 'WHY.blankIsTop'],
  ['How many wholes are 4/2?', '2', '4', 'WHY.partsNotWholes'],
  ['How many wholes are 9/3?', '3', '9', 'WHY.partsNotWholes'],
  ['How many 1/12 cup scoops fill 5/6 cup?', '10', '5', 'WHY.fitNotNumber'],
  ['2/3 ÷ 1/6 = ?', '4', '3', 'WHY.fitNotNumber'],
  ['To find 2/3 of 12 cards, you make 3 equal groups. How many cards are in one group?', '4', '3', 'WHY.groupsNotEach'],
  ['To find 2/3 of 12 cards, you make 3 equal groups. How many cards are in one group?', '4', '12', 'WHY.allNotEach'],
  ['18 buttons are shared into 6 equal groups. How many buttons are in each group?', '3', '6', 'WHY.groupsNotEach'],
  // Which sum makes the amount: too much, too little, exactly one whole, more than one whole.
  ['Which adds up to 4/5?', '1/5 + 3/5', '1/5 + 2/5', 'WHY.sumLess'],
  ['Which adds up to 4/5?', '1/5 + 3/5', '1/5 + 4/5', 'WHY.sumWhole'],
  ['Which adds up to 4/5?', '1/5 + 3/5', '4/5 + 4/5', 'WHY.sumPastWhole'],
  ['Which adds up to 7/10?', '1/10 + 6/10', '1/10 + 7/10', 'WHY.sumMore'],
  // Leveling: a pick worth the biggest cup, written in the answer's own parts.
  ['Three beakers hold 1/4, 1/4, 4/4 liter. Share the total equally. How many liters go in each?', '1/2 liter', '2/2 liter', 'WHY.oneCup'],
  // A fair cut called unfair: the parts only look different.
  ['Is this square cut into equal parts?', 'Yes, same-size parts', 'No, some parts are bigger', 'WHY.onlyLooksBigger'],
  ['Is this pizza cut into sixths?', 'Yes, same-size parts', 'No, some parts are bigger', 'WHY.onlyLooksBigger'],
];

describe('the exact reason for a wrong tap', () => {
  for (const [prompt, right, pick, key] of TABLE) {
    it(`${prompt} -> ${pick}: ${key}`, () => expectKey(prompt, right, pick, key));
  }

  it('says the bottom-number idea in kid words, with no digit and no answer given away', () => {
    assert.match(WHY.bigBottom, /More equal parts make each part smaller/);
    assert.match(WHY.bigBottom, /bigger bottom number is not a bigger fraction/);
    for (const key of ['bigBottom', 'sameSizeCount', 'sameCountSizes', 'sameSizeCounts', 'bothDiffer', 'sizeAndCount', 'canTellSize', 'sameWay',
      'topCounts', 'allPartsWhole', 'notYetWhole', 'onePartOnly', 'addedBottoms'] as const) {
      const sentence = WHY[key];
      assert.ok(sentence, `${key} exists`);
      assert.doesNotMatch(sentence, /\d/, `${key} has a digit`);
      assert.doesNotMatch(sentence, /\b(?:bigger|smaller) (?:one|fraction) is\b|\bthe (?:right|correct) answer\b/i, `${key} names the answer`);
    }
  });

  const GENERIC = new Set<string | null>([null, SLIPS.tooSmall, SLIPS.tooBig, SLIPS.notSame, SLIPS.canTell]);
  const questions = MISSIONS.flatMap((m) => [...m.questions, ...(m.ideaQuestions ?? [])]);
  const wrongChoices = questions.flatMap((q) => q.choices.flatMap((choice, i) => i === q.correctChoice ? [] : [{ q, choice, i }]));
  const reasonOf = ({ q, i }: { q: (typeof questions)[number]; i: number }) => wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i);
  const isWhichBigger = (prompt: string) => {
    const p = prompt.replace(/^Quick review · [^:]+: /, '');
    return /\bwhich\b/i.test(p) && /\b(?:bigger|biggest|smaller|smallest|greater|larger)\b/i.test(p) && !/\border\b/i.test(p);
  };

  it('never falls back to a generic reply on a which-is-bigger or which-is-smaller question', () => {
    const which = wrongChoices.filter(({ q }) => isWhichBigger(q.prompt));
    assert.ok(which.length >= 50, `only ${which.length} wrong choices on which-is-bigger questions`);
    const generic = which.filter((w) => GENERIC.has(reasonOf(w)));
    assert.equal(generic.length, 0, generic.slice(0, 5).map((w) => `${w.q.prompt} / ${w.choice}`).join('; '));
  });

  it('does the same for the "Practice more" which-is-bigger questions, equal pairs included', () => {
    let checked = 0;
    const generic: string[] = [];
    for (const m of MISSIONS) {
      const ids = m.questions.map((q) => q.id);
      for (let seed = 1; seed <= 12; seed++) for (const q of generateQuestions(m.id, ids, seed * 7919 + 5, 12)) {
        if (!isWhichBigger(q.prompt)) continue;
        q.choices.forEach((choice, i) => {
          if (i === q.correctChoice) return;
          checked++;
          if (GENERIC.has(wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i))) generic.push(`${q.prompt} / ${choice}`);
        });
      }
    }
    assert.ok(checked >= 300, `only ${checked} generated wrong choices`);
    assert.deepEqual(generic.slice(0, 5), []);
  });

  it('gives more wrong choices a specific reason than before (63.9 percent had a reason, about 55.8 a specific one)', () => {
    const generic = new Set<string | null>([SLIPS.notSame, SLIPS.canTell, WHY.justNumber, SLIPS.recountShaded, SLIPS.recountParts]);
    const reasons = wrongChoices.map(reasonOf);
    const said = reasons.filter(Boolean).length / reasons.length;
    const specific = reasons.filter((r) => r && !generic.has(r)).length / reasons.length;
    assert.ok(said >= 0.639, `${(said * 100).toFixed(1)}% have a reason`);
    assert.ok(specific >= 0.58, `${(specific * 100).toFixed(1)}% have a specific reason`);
  });

  it('keeps the general counting sentences for shading questions and drops them from the rest', () => {
    // "parts plus shaded" is only true where a child counts shaded and total parts in a picture.
    for (const w of wrongChoices) {
      const reason = reasonOf(w);
      if (reason === SLIPS.allParts) assert.match(w.q.prompt, /shaded|colou?red|equal (?:parts|tiles|pieces)|friends share|loaves/i, `${w.q.id}: ${w.q.prompt} / ${w.choice}`);
    }
  });

  it('names the slip on the meaning, counting, half-and-one and scaling lessons that used to give only the hint', () => {
    const FLOORS: [string, number][] = [['fraction-names', 0.85], ['benchmark-half', 0.85], ['number-line-basics', 0.75], ['bigger-or-smaller', 1], ['multiply-whole-by-fraction', 1]];
    for (const [id, floor] of FLOORS) {
      const m = MISSIONS.find((x) => x.id === id)!;
      const picks = [...m.questions, ...(m.ideaQuestions ?? [])].flatMap((q) => q.choices.flatMap((_, i) => i === q.correctChoice ? [] : [wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i)]));
      const share = picks.filter(Boolean).length / picks.length;
      assert.ok(share >= floor, `${id}: ${(share * 100).toFixed(0)}% of wrong picks have a reason (floor ${floor * 100}%)`);
    }
  });

  it('the new reasons carry no digit, so none can give the answer away', () => {
    for (const key of ['bottomNotShaded', 'notWholes', 'topNotAll', 'topNotLeft', 'askedTop', 'askedBottom', 'addedBoth', 'cutsNotParts', 'ticksNotSpaces', 'jumpsToOne',
      'jumpsForward', 'halfOnly', 'halfOfBottom', 'notExactHalf', 'notExactNear', 'otherBenchmark', 'nearHalfSize', 'topVsBottom', 'bigNumbers', 'tryUnderOne', 'tryOverOne',
      'unitCount', 'notShadedCount', 'countNotSize', 'groupsToTop', 'sumOtherSize', 'timesBottom', 'blankIsTop', 'blankIsBottom', 'partsNotWholes', 'fitNotNumber',
      'groupsNotEach', 'allNotEach'] as const) {
      assert.doesNotMatch(WHY[key], /\d/, `${key} has a digit`);
      assert.doesNotMatch(WHY[key], /\bthe (?:right|correct) answer\b/i, `${key} names the answer`);
    }
  });

  it('names at least 99 percent of all wrong choices (72.4 percent in rescore 3; 99.2 after the practice picks got their slips)', () => {
    const reasons = wrongChoices.map(reasonOf);
    const named = reasons.filter(Boolean).length / reasons.length;
    assert.ok(named >= 0.99, `${(named * 100).toFixed(1)}% of wrong choices have a reason`);
  });

  it('never puts the right answer in a reason, and the new reasons carry no digit', () => {
    const leaks = wrongChoices.flatMap((w) => {
      const reason = reasonOf(w); const right = w.q.choices[w.q.correctChoice].trim().toLowerCase();
      return reason && new RegExp(`(?<![\\w/])${right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w/])`).test(reason.toLowerCase()) ? [`${w.q.id}: ${w.choice} -> ${reason}`] : [];
    });
    assert.deepEqual(leaks.slice(0, 5), []);
    const start = Object.keys(WHY).indexOf('shapeNotSize');
    assert.ok(start > 0, 'the practice-pick reasons are in WHY');
    for (const [key, sentence] of Object.entries(WHY).slice(start)) assert.doesNotMatch(sentence, /\d/, `${key} has a digit`);
  });
});

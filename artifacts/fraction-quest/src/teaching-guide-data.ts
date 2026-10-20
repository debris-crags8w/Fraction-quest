export type UnitVocabulary = { term: string; meaning: string };
export type UnitMisconception = { belief: string; response: string };
export type RubricCriterion = { criterion: string; ready: string; nextStep: string };

export type UnitTeachingGuide = {
  unit: number;
  objective: string;
  warmup: { prompt: string; reveal: string };
  vocabulary: UnitVocabulary[];
  explainFrame: string;
  errorAnalysis: { claim: string; correction: string };
  materials: string[];
  offlineLaunch: string;
  discussionQuestions: string[];
  misconceptions: UnitMisconception[];
  mastery: string[];
  enrichment: string;
  performanceTask: {
    title: string;
    prompt: string;
    evidence: string;
    rubric: RubricCriterion[];
  };
  familyNote: string;
};

export const UNIT_TEACHING_GUIDES: UnitTeachingGuide[] = [
  {
    unit: 1, objective: 'Name a whole, split it into equal shares, and describe one share as a unit fraction.',
    warmup: { prompt: 'Fold or draw a strip into two fair shares. What must be true about the shares?', reveal: 'They cover the same whole and have the same size.' },
    vocabulary: [{ term: 'whole', meaning: 'The complete amount we are talking about.' }, { term: 'equal parts', meaning: 'Parts that have the same size.' }, { term: 'unit fraction', meaning: 'One equal part of a whole, such as 1/4.' }],
    explainFrame: 'I know this is one ___ because the whole is split into ___ equal parts.',
    errorAnalysis: { claim: '“The bar has four parts, so any one part is 1/4.”', correction: 'Check that the four parts are equal and belong to the same whole before naming 1/4.' },
    materials: ['Paper strips', 'Crayons', 'A small collection of same-size objects'],
    offlineLaunch: 'Fold one strip in half, then another strip into four equal parts. Compare one share from each strip.',
    discussionQuestions: ['Where does the whole begin and end?', 'How can you check that the shares are fair?', 'What does the denominator count?'],
    misconceptions: [{ belief: 'Any cut makes equal parts.', response: 'Place the parts on top of one another or compare their lengths.' }, { belief: 'The numerator tells how many parts make the whole.', response: 'Build the whole first; count all equal parts for the denominator.' }],
    mastery: ['Identifies the whole in a picture.', 'Makes equal shares and names one share as 1/n.', 'Explains that the denominator counts all equal parts in one whole.'],
    enrichment: 'Draw two different-looking shapes split into the same number of equal-area shares. Explain why both partitions are fair.',
    performanceTask: { title: 'Make a fair-share gallery', prompt: 'Create three paper-strip models: halves, thirds, and fourths. Shade one share in each and label the whole and one part.', evidence: 'Three labeled, equally partitioned models and one spoken or written explanation.', rubric: [{ criterion: 'Whole and parts', ready: 'The whole is marked and every part is equal.', nextStep: 'Mark the whole, then compare parts for equal size.' }, { criterion: 'Fraction name', ready: 'Each shaded share is labeled 1/n with the right total parts.', nextStep: 'Count all parts for the denominator and shaded parts for the numerator.' }, { criterion: 'Reasoning', ready: 'Explains why equal size matters.', nextStep: 'Place two shares together to test whether they match.' }] },
    familyNote: 'We are learning that a fraction names equal parts of one whole. At home, fold a napkin or paper strip into fair shares and ask, “How do you know these parts are equal?”',
  },
  {
    unit: 2, objective: 'Reason about the size of unit fractions: more equal parts in the same whole make each part smaller, so compare fractions with the same numerator by their part size.',
    warmup: { prompt: 'Two same-size sandwiches: one cut into 2 equal parts, one into 4. Which single part is bigger?', reveal: 'One half is bigger. Cutting the same whole into more equal parts makes each part smaller.' },
    vocabulary: [{ term: 'unit fraction', meaning: 'One equal part of a whole, such as 1/3.' }, { term: 'denominator', meaning: 'How many equal parts make one whole.' }, { term: 'same whole', meaning: 'Wholes that are the same size, so their parts can be compared.' }],
    explainFrame: '___ is bigger because the same whole is cut into fewer equal parts, so each part is bigger.',
    errorAnalysis: { claim: '“1/8 is bigger than 1/3 because 8 is bigger than 3.”', correction: 'The 8 means the whole is cut into 8 equal parts. More parts means each part is smaller, so 1/8 is less than 1/3.' },
    materials: ['Paper strips of the same length', 'Scissors or a ruler', 'Crayons'],
    offlineLaunch: 'Fold two same-size paper strips, one into halves and one into fourths. Lay one part of each side by side and compare.',
    discussionQuestions: ['Are the two wholes the same size?', 'What happens to each part when we cut the whole into more parts?', 'Both fractions count 3 parts. Which parts are bigger?'],
    misconceptions: [{ belief: 'A bigger denominator means a bigger fraction.', response: 'Fold same-size strips and lay one part of each side by side.' }, { belief: 'Fractions can be compared even when the wholes are different sizes.', response: 'Check that both wholes are the same size before comparing parts.' }],
    mastery: ['Explains why 1/3 is bigger than 1/8 using the same whole.', 'Compares fractions with the same numerator, such as 3/4 and 3/8, by part size.', 'Checks that the wholes match before comparing.'],
    enrichment: 'Find two fractions with the same numerator where one is more than 1/2 and the other is less than 1/2. Explain using part size.',
    performanceTask: { title: 'Fraction strip wall', prompt: 'Make same-length strips for halves, thirds, fourths, sixths, and eighths. Order one part of each from biggest to smallest, then do the same with three parts of each.', evidence: 'An ordered strip wall with each part labeled and one sentence explaining the order.', rubric: [{ criterion: 'Same whole', ready: 'All strips start the same length.', nextStep: 'Trace one strip and cut the others to match.' }, { criterion: 'Order', ready: 'Unit fractions run from biggest (1/2) to smallest (1/8).', nextStep: 'Lay two parts side by side and compare their lengths.' }, { criterion: 'Explanation', ready: 'Says that more parts in the same whole makes each part smaller.', nextStep: 'Use “the same whole is cut into more parts” in the sentence.' }] },
    familyNote: 'We are learning that cutting the same whole into more equal parts makes each part smaller. At home, fold two same-size paper strips, one into thirds and one into fourths, and ask, “Which piece is bigger? Why?”',
  },
  {
    unit: 3, objective: 'Use 0, 1/2, and 1 as benchmarks to estimate and compare fraction size.',
    warmup: { prompt: 'Fold a paper strip in half. Is 3/8 of the strip more or less than the fold?', reveal: 'Less. Half of 8 is 4, and 3 is less than 4.' },
    vocabulary: [{ term: 'benchmark', meaning: 'A familiar value used to estimate another value.' }, { term: 'between', meaning: 'Greater than one value and less than another.' }, { term: 'whole', meaning: 'One complete unit, from 0 to 1.' }],
    explainFrame: '___ is near ___ because it is ___ the halfway mark.',
    errorAnalysis: { claim: '“2/6 is more than 1/2 because 2 is more than 1.”', correction: 'Half of 6 is 3, and 2 is less than 3. So 2/6 is less than 1/2.' },
    materials: ['Number-line strip from 0 to 1', 'Fraction cards', 'Sticky notes'],
    offlineLaunch: 'Draw 0, 1/2, and 1 on a strip. Place 1/4 and 3/4 by reasoning from the halfway point.',
    discussionQuestions: ['Is the fraction less than or greater than one-half?', 'How close is it to one whole?', 'Which benchmark helps you decide?'],
    misconceptions: [{ belief: 'A larger denominator always means a larger fraction.', response: 'For unit fractions, compare the size of one part in the same whole.' }, { belief: 'A fraction is just two separate whole numbers.', response: 'Place it between 0 and 1 and compare its distance from benchmarks.' }],
    mastery: ['Places common fractions relative to 0, 1/2, and 1.', 'Uses a benchmark to justify an estimate.', 'Explains why a unit fraction gets smaller as its denominator grows.'],
    enrichment: 'Find two different fractions within 1/10 of one-half. Prove their locations with a sketch.',
    performanceTask: { title: 'Fraction benchmark trail', prompt: 'Make a 0-to-1 trail and place 1/4, 2/3, 3/4, and one fraction of your choice. Add a note for each placement.', evidence: 'A labeled line with equal spacing and a benchmark-based explanation.', rubric: [{ criterion: 'Scale', ready: 'The line has equal spaces and labeled endpoints.', nextStep: 'Mark the whole first, then divide the distance evenly.' }, { criterion: 'Placement', ready: 'Fractions appear in a sensible order and location.', nextStep: 'Compare each fraction to 1/2 before moving it.' }, { criterion: 'Reasoning', ready: 'Notes name the benchmark used.', nextStep: 'Use “less than,” “near,” or “greater than one-half.”' }] },
    familyNote: 'We are using familiar benchmarks to estimate fraction size. On a walk, make a pretend 0-to-1 path and ask where one-quarter, one-half, and three-quarters would land.',
  },
  {
    unit: 4, objective: 'Partition a number line into equal spaces and interpret a fraction as equal jumps from zero.',
    warmup: { prompt: 'A number line from 0 to 1 has 4 equal spaces. What fraction is one jump?', reveal: 'One jump is 1/4 of the whole distance.' },
    vocabulary: [{ term: 'number line', meaning: 'A line that shows numbers in order and at equal distances.' }, { term: 'interval', meaning: 'The space between two neighboring tick marks.' }, { term: 'jump', meaning: 'A move of one equal interval along the line.' }],
    explainFrame: 'Each jump is ___ because the whole from 0 to 1 has ___ equal spaces.',
    errorAnalysis: { claim: '“There are 5 tick marks, so the line is split into fifths.”', correction: 'Count the spaces between the endpoints. Tick marks show boundaries; spaces show parts.' },
    materials: ['Rulers', 'Paper strips', 'Fraction cards'],
    offlineLaunch: 'Draw 0 and 1 at the ends of a strip. Fold it into equal spaces and mark each fold.',
    discussionQuestions: ['How many spaces are between 0 and 1?', 'What does one jump represent?', 'Where will three jumps from 0 land?'],
    misconceptions: [{ belief: 'Count tick marks instead of spaces.', response: 'Trace each interval between the endpoints and count those equal spaces.' }, { belief: 'The line always ends at 1.', response: 'Keep equal jump sizes and continue past 1 when the numerator is larger than the denominator.' }],
    mastery: ['Partitions 0–1 into equal intervals.', 'Labels each jump with a unit fraction.', 'Locates a fraction by counting jumps from 0.'],
    enrichment: 'Place 7/4 on a line. Show the whole-number benchmarks and explain how many jumps are past 1.',
    performanceTask: { title: 'Build a jump map', prompt: 'Create a number line in fourths that reaches 2. Mark and label 3/4, 1, 5/4, and 7/4.', evidence: 'A consistent scale, labels, and a short explanation of one point beyond 1.', rubric: [{ criterion: 'Equal intervals', ready: 'All jumps are the same length.', nextStep: 'Use one folded strip to measure every interval.' }, { criterion: 'Point locations', ready: 'Each fraction is placed by counting jumps from 0.', nextStep: 'Count spaces, not tick marks.' }, { criterion: 'Beyond one', ready: 'Shows 1 as a benchmark and continues the same scale.', nextStep: 'Keep the jump size the same after reaching 1.' }] },
    familyNote: 'We are treating a fraction as a distance. Draw a short line from 0 to 1 and let your child mark equal jumps before naming the points.',
  },
  {
    unit: 5, objective: 'Compare and order fractions by reasoning about equal-size parts and a common whole.',
    warmup: { prompt: 'Which is greater: 2/5 or 4/5? Explain without changing the denominator.', reveal: '4/5 is greater: the parts are the same size, and 4 parts are more than 2.' },
    vocabulary: [{ term: 'compare', meaning: 'Decide whether one amount is less than, equal to, or greater than another.' }, { term: 'numerator', meaning: 'The top number. It counts the parts we are talking about.' }, { term: 'common whole', meaning: 'The same-size whole used to compare two fractions fairly.' }],
    explainFrame: 'The parts are ___ size, so I compare ___ because ___.',
    errorAnalysis: { claim: '“3/8 is greater than 3/4 because eighths are smaller numbers.”', correction: 'With the same numerator, fourths are larger parts than eighths. Compare models of the same whole.' },
    materials: ['Fraction strips', 'Same-size paper rectangles', 'Comparison cards'],
    offlineLaunch: 'Use two equal-length paper strips. Fold one into fourths and one into eighths; compare matching shaded amounts.',
    discussionQuestions: ['Are the wholes the same size?', 'Are the parts the same size?', 'Which model makes the comparison easiest to see?'],
    misconceptions: [{ belief: 'Compare only the numerator or denominator.', response: 'Ask what one part means and whether the wholes match.' }, { belief: 'A picture can compare different-size wholes.', response: 'Resize the wholes so both models start with the same amount.' }],
    mastery: ['Compares like-denominator fractions by counting parts.', 'Uses a model or benchmark for unlike denominators.', 'Orders a set of fractions and explains a comparison.'],
    enrichment: 'Write three different fractions between 1/3 and 2/3. Order them and defend the order with one model.',
    performanceTask: { title: 'Fair-share comparison board', prompt: 'Choose two snack-share fractions for the same-size snack. Draw matching bars, decide which share is larger, and write a fair comparison.', evidence: 'Two equal-whole models, a correct comparison symbol, and a reason.', rubric: [{ criterion: 'Same whole', ready: 'Both bars represent the same-size whole.', nextStep: 'Redraw the bars with matching lengths.' }, { criterion: 'Comparison', ready: 'The symbol matches the model.', nextStep: 'Shade each amount before choosing the symbol.' }, { criterion: 'Reason', ready: 'Explains part size or uses a shared benchmark.', nextStep: 'Compare equal parts or locate both values on one line.' }] },
    familyNote: 'We are comparing fraction sizes, not just comparing digits. Ask, “Are the wholes the same?” before deciding which share is larger.',
  },
  {
    unit: 6, objective: 'Recognize and build equivalent fractions that name the same amount in a whole.',
    warmup: { prompt: 'Fold a strip in half, then fold it again. How many fourths cover the same amount as one half?', reveal: 'Two fourths cover the same length as one half: 1/2 = 2/4.' },
    vocabulary: [{ term: 'equivalent', meaning: 'Different fraction names for the same amount.' }, { term: 'rename', meaning: 'Write the same amount in a different way.' }, { term: 'fraction wall', meaning: 'Aligned strips that help compare equal lengths.' }],
    explainFrame: '___ and ___ are equivalent because both cover the same ___ of the whole.',
    errorAnalysis: { claim: '“Add 2 to the numerator and denominator of 1/3 to get an equivalent fraction.”', correction: 'Use the same-size parts in the model; equivalent fractions scale top and bottom by the same factor.' },
    materials: ['Paper strips', 'Fraction strips or a hand-drawn fraction wall', 'Colored pencils'],
    offlineLaunch: 'Fold two same-length strips into halves and fourths. Line up the edges and trace the equal lengths.',
    discussionQuestions: ['Do the shaded lengths match?', 'How many smaller parts cover one larger part?', 'What changed, and what stayed the same?'],
    misconceptions: [{ belief: 'Change only the numerator or denominator.', response: 'Check that the whole shaded length remains the same in both models.' }, { belief: 'Equivalent means the digits match.', response: 'Align the bars or points and compare their values, not their written forms.' }],
    mastery: ['Builds equivalent fractions with a visual model.', 'Explains how both numerator and denominator change together.', 'Uses an equivalent name to compare or simplify.'],
    enrichment: 'Find three names for 3/4 using denominators below 20. Show each on a fraction wall.',
    performanceTask: { title: 'Design a fraction wall', prompt: 'Draw aligned bars for halves, thirds, fourths, sixths, and eighths. Color matching lengths and label at least four equivalent pairs.', evidence: 'A shared whole, aligned bars, and labeled matching lengths.', rubric: [{ criterion: 'Alignment', ready: 'Every row starts and ends at the same whole.', nextStep: 'Use a ruler to align the endpoints.' }, { criterion: 'Equivalent pairs', ready: 'Each labeled pair has the same shaded length.', nextStep: 'Overlay the strips before naming the pair.' }, { criterion: 'Explanation', ready: 'Describes what stayed the same as the names changed.', nextStep: 'Compare the total shaded amount.' }] },
    familyNote: 'We are learning that equivalent fractions keep the amount the same while changing the name. Fold a paper strip in half and fourths to show 1/2 = 2/4.',
  },
  {
    unit: 7, objective: 'Compose, decompose, add, and subtract fractions using visual models and equal-size units.',
    warmup: { prompt: 'If a whole is split into fifths, how many fifths make one whole?', reveal: 'Five fifths make one whole: 5/5 = 1.' },
    vocabulary: [{ term: 'compose', meaning: 'Put parts together to make a larger amount.' }, { term: 'decompose', meaning: 'Break an amount into smaller parts.' }, { term: 'unit fraction', meaning: 'One equal part, such as one fifth.' }],
    explainFrame: 'I combined ___ and ___ by counting ___-size parts.',
    errorAnalysis: { claim: '“1/5 + 2/5 = 3/10 because I add both numerators and denominators.”', correction: 'Fifths stay the same size; combine the counts of fifths, so the sum is 3/5.' },
    materials: ['Fraction strips', 'Paper plates or circles', 'Recipe cards'],
    offlineLaunch: 'Use fifths strips to combine 1/5 and 2/5. Then split a 4/5 strip into two parts in a different way.',
    discussionQuestions: ['Are the parts the same size?', 'How many of those parts do you have altogether?', 'Can you make a whole by regrouping?'],
    misconceptions: [{ belief: 'Add denominators when the parts already match.', response: 'Keep the unit fraction size fixed and count parts.' }, { belief: 'A result larger than one cannot be a fraction.', response: 'Build another whole from the extra equal parts.' }],
    mastery: ['Adds and subtracts like-denominator fractions with a model.', 'Decomposes a fraction in more than one way.', 'Recognizes when equal parts combine to a whole or more.'],
    enrichment: 'Find two different ways to make 1 using three fraction parts. Draw and label each.',
    performanceTask: { title: 'Create a fraction snack mix', prompt: 'Plan a mix using at least three same-size fraction scoops. Show the total and one way to regroup the scoops into a whole.', evidence: 'A labeled model and an equation that matches the model.', rubric: [{ criterion: 'Model', ready: 'Every scoop is the same fraction unit.', nextStep: 'Choose one scoop size and redraw all parts equally.' }, { criterion: 'Total', ready: 'The combined fraction matches the number of parts.', nextStep: 'Count parts without changing their size.' }, { criterion: 'Regrouping', ready: 'Shows a whole when enough parts collect.', nextStep: 'Group a full set of denominator-many parts.' }] },
    familyNote: 'We are putting same-size fraction parts together and taking them apart. Use measuring scoops in a pretend recipe and count how many equal scoops make one cup.',
  },
  {
    unit: 8, objective: 'Solve fraction and decimal problems with models, estimates, and clear step-by-step reasoning.',
    warmup: { prompt: 'Which is closer to one: 7/8 or 3/8? How can you tell?', reveal: '7/8 is closer because it is one eighth away from one.' },
    vocabulary: [{ term: 'estimate', meaning: 'Find a close value to check whether an answer makes sense.' }, { term: 'decimal', meaning: 'A number written with a dot to show parts of a whole.' }, { term: 'tenths', meaning: 'Ten equal parts of one whole.' }],
    explainFrame: 'My answer makes sense because it is ___ than one and the model shows ___.',
    errorAnalysis: { claim: '“When adding fractions, add the numerators and denominators.”', correction: 'Use the same-size parts first. Rename if needed, then combine the counts.' },
    materials: ['Tenths grids', 'Fraction strips', 'Measuring cups'],
    offlineLaunch: 'Fill a measuring cup to 1/2, then to 1/4. Estimate the combined amount before checking with the marks.',
    discussionQuestions: ['What is a good estimate before calculating?', 'Which parts are being counted?', 'Can you show the answer as a fraction and a decimal?'],
    misconceptions: [{ belief: 'A bigger denominator makes a bigger amount.', response: 'Compare the size of each part in one whole.' }, { belief: 'A decimal digit has the same value in every place.', response: 'Build tenths on a grid and connect each digit to a place.' }],
    mastery: ['Chooses a model or benchmark to solve a problem.', 'Connects tenths fractions to decimal names.', 'Checks an answer with an estimate and explains the steps.'],
    enrichment: 'Write a two-step fraction story with an answer between 1/2 and 1. Show why your answer is reasonable.',
    performanceTask: { title: 'Plan a simple recipe', prompt: 'Combine and adjust fractional ingredient amounts. Show each step with a drawing, estimate the total, then write the result as a fraction or decimal.', evidence: 'A recipe plan, matching model, estimate, and two-step explanation.', rubric: [{ criterion: 'Representation', ready: 'The model matches the ingredient amounts.', nextStep: 'Draw one bar for each amount before combining.' }, { criterion: 'Computation', ready: 'The result uses equal-size units and correct steps.', nextStep: 'Rename to matching parts before combining.' }, { criterion: 'Reasonableness', ready: 'The estimate supports the final amount.', nextStep: 'Compare the answer with 0, 1/2, and 1.' }] },
    familyNote: 'We are using models and estimates to solve fraction stories. While cooking, ask your child whether an amount is closer to zero, one-half, or one whole.',
  },
  {
    unit: 9, objective: 'Rename fractions, use common units to compare them, and connect whole numbers to fraction names.',
    warmup: { prompt: 'How many fourths equal one whole?', reveal: 'Four fourths equal one whole, so 1 = 4/4.' },
    vocabulary: [{ term: 'simplify', meaning: 'Use a smaller numerator and denominator without changing the amount.' }, { term: 'common denominator', meaning: 'A shared number of equal parts used to compare or combine fractions.' }, { term: 'fraction name', meaning: 'A way to describe an amount using equal parts.' }],
    explainFrame: 'I renamed ___ as ___ so both fractions use ___-size parts.',
    errorAnalysis: { claim: '“2/3 is less than 3/5 because 2 is less than 3.”', correction: 'Rename both with a shared denominator or use matching bars before comparing.' },
    materials: ['Fraction strips', 'Multiplication chart', 'Number line'],
    offlineLaunch: 'Use strips to find a shared part size for thirds and sixths; name the matching fractions.',
    discussionQuestions: ['What shared unit helps compare these?', 'How can you rename without changing the amount?', 'How many fraction units make one whole?'],
    misconceptions: [{ belief: 'A larger numerator means a larger fraction in every comparison.', response: 'First make part sizes match or compare the whole models.' }, { belief: 'Simplifying changes the value.', response: 'Show that the shaded length remains fixed while parts are grouped.' }],
    mastery: ['Builds equivalent names and simplifies without changing the value.', 'Compares unlike denominators using a model or common unit.', 'Writes whole numbers as fractions with a matching denominator.'],
    enrichment: 'Find a pair of unlike fractions that differ by less than 1/12. Prove the distance on a line.',
    performanceTask: { title: 'Fraction-name detective', prompt: 'Choose three fraction cards. Give each card two equivalent names, place them on one number line, and order them.', evidence: 'Equivalent forms, an ordered line, and a model-based comparison.', rubric: [{ criterion: 'Renaming', ready: 'Each new name keeps the same value.', nextStep: 'Check the bar length before and after renaming.' }, { criterion: 'Comparison', ready: 'All fractions use a common whole and are ordered correctly.', nextStep: 'Use a shared denominator or benchmark.' }, { criterion: 'Explanation', ready: 'Shows how the model supports the order.', nextStep: 'Point to the same units on the line.' }] },
    familyNote: 'We are making new fraction names for the same amount. Ask your child to prove 2/3 = 4/6 with a drawing or folded strip.',
  },
  {
    unit: 10, objective: 'Represent mixed numbers, compare unlike fractions, and estimate sums and differences.',
    warmup: { prompt: 'A fraction bar has 5/4 shaded. How much is that beyond one whole?', reveal: '5/4 is 1/4 more than one, so it is 1 1/4.' },
    vocabulary: [{ term: 'mixed number', meaning: 'A whole number and a fraction part together.' }, { term: 'unlike denominators', meaning: 'Fractions with different-size equal parts.' }, { term: 'benchmark', meaning: 'A familiar amount, such as one-half or one whole, used to estimate.' }],
    explainFrame: 'I can rename ___ as ___ because the model still shows ___.',
    errorAnalysis: { claim: '“3/2 is less than 1 because 2 is bigger than 3.”', correction: 'Build two halves: 2/2 is one whole, so 3/2 is one whole and one half.' },
    materials: ['Fraction strips', 'Number line to 3', 'Mixed-number cards'],
    offlineLaunch: 'Lay out halves past one whole. Count the full whole first, then name the leftover part.',
    discussionQuestions: ['How many complete wholes are there?', 'What fraction is left over?', 'Will the answer be greater or less than one before calculating?'],
    misconceptions: [{ belief: 'A numerator larger than the denominator is invalid.', response: 'Group denominator-many parts into a whole and count what remains.' }, { belief: 'Add unlike parts directly.', response: 'Rename both amounts using equal-size parts before combining.' }],
    mastery: ['Converts an improper fraction to a mixed number with a model.', 'Compares or orders mixed numbers and fractions.', 'Estimates an operation before finding an exact result.'],
    enrichment: 'Create two different sums of unlike fractions that are both between 1 and 2. Explain how you know.',
    performanceTask: { title: 'Design a mixed-number path', prompt: 'Build a number line from 0 to 3 with halves, fourths, and mixed numbers. Place four cards and compare two of them.', evidence: 'An equal-scale line, correct mixed-number locations, and an estimate.', rubric: [{ criterion: 'Whole groups', ready: 'Full wholes are grouped and leftovers labeled.', nextStep: 'Group denominator-many parts before naming the leftover.' }, { criterion: 'Scale', ready: 'Every interval has the same size.', nextStep: 'Use a single unit fraction to measure each jump.' }, { criterion: 'Estimate', ready: 'Reasoning predicts whether the amount is below or above one.', nextStep: 'Compare with one whole before computing.' }] },
    familyNote: 'We are naming amounts larger than one and estimating fraction operations. Use paper strips to show one whole plus a leftover part.',
  },
  {
    unit: 11, objective: 'Use multiplication and division to find fractions of quantities, scale amounts, and share fairly.',
    warmup: { prompt: 'What is 1/4 of 12 counters? Show equal groups.', reveal: 'Split 12 into 4 equal groups of 3. One group is 3 counters.' },
    vocabulary: [{ term: 'fraction of a quantity', meaning: 'A fraction-sized share of a group of objects or an amount.' }, { term: 'scale', meaning: 'Make an amount larger or smaller by a factor.' }, { term: 'unit fraction', meaning: 'One equal share, such as one fourth.' }],
    explainFrame: 'I split ___ into ___ equal groups. One group is ___, so ___ groups are ___.',
    errorAnalysis: { claim: '“3/4 of 12 means add 3 and 4 to 12.”', correction: 'Split 12 into 4 equal groups, then take 3 of those groups.' },
    materials: ['Counters', 'Measuring cups', 'Recipe cards'],
    offlineLaunch: 'Share 12 counters into 4 equal cups, then select 3 cups and describe the fraction of the total.',
    discussionQuestions: ['Which number tells how many equal groups?', 'How many groups are selected?', 'Should the result be smaller or larger than the starting amount?'],
    misconceptions: [{ belief: 'Multiply or divide every number without considering the context.', response: 'Draw the groups and decide what the fraction means first.' }, { belief: 'A fraction multiplication answer must be larger.', response: 'Compare the factor with one; a fraction less than one scales down.' }],
    mastery: ['Finds a fraction of a collection by equal grouping.', 'Explains scaling up or down with a model.', 'Connects division to fair sharing.'],
    enrichment: 'A recipe for 4 people uses 3/4 cup. Find amounts for 2 and 8 people and explain the scale factor.',
    performanceTask: { title: 'Scale a snack recipe', prompt: 'Choose a simple recipe with at least three fraction amounts. Scale it to twice as many servings and to half as many, then model one ingredient.', evidence: 'A before-and-after recipe, one visual model, and an explanation of scaling.', rubric: [{ criterion: 'Scale factor', ready: 'Every ingredient uses the same scale factor.', nextStep: 'Compare the new serving count with the old one.' }, { criterion: 'Fraction amount', ready: 'Fractions are computed and labeled correctly.', nextStep: 'Build equal groups or use a matching bar.' }, { criterion: 'Reasoning', ready: 'Explains whether the new amount should grow or shrink.', nextStep: 'Compare the scale factor with one.' }] },
    familyNote: 'We are finding a fraction of a set and scaling recipes. Let your child use counters or measuring spoons to show what one-fourth of a collection means.',
  },
  {
    unit: 12, objective: 'Measure fractional lengths, read fraction line plots, and connect measurements to unit conversions.',
    warmup: { prompt: 'A ruler is split into fourths of an inch. What length is 3 jumps from zero?', reveal: 'Three jumps are 3/4 inch.' },
    vocabulary: [{ term: 'unit fraction', meaning: 'One equal measurement interval, such as 1/4 inch.' }, { term: 'line plot', meaning: 'A number line that records how often measurements occur.' }, { term: 'convert', meaning: 'Rename a measurement using a different unit.' }],
    explainFrame: 'The measurement is ___ because the endpoint is ___ equal jumps from zero.',
    errorAnalysis: { claim: '“The strip ends at the fourth tick mark, so it is 4/4 inch.”', correction: 'Zero is the first tick. Count the spaces from zero: 3 spaces of 1/4 inch is 3/4 inch.' },
    materials: ['Ruler marked in halves, fourths, or eighths', 'Paper clips', 'Measuring cups', 'Graph paper'],
    offlineLaunch: 'Measure three small objects to the nearest quarter inch. Record the endpoint and compare the lengths.',
    discussionQuestions: ['Where does the measurement start?', 'How many equal intervals reach the endpoint?', 'What does each X on the line plot represent?'],
    misconceptions: [{ belief: 'The first tick is one whole unit.', response: 'Align the object with zero and count each interval.' }, { belief: 'Each line-plot mark is a different value.', response: 'Stack marks above the same value when measurements repeat.' }],
    mastery: ['Measures from zero using fractional intervals.', 'Builds or reads a line plot with repeated values.', 'Explains a conversion as equivalent units.'],
    enrichment: 'Measure five objects to the nearest eighth inch. Make a line plot and find the difference between the longest and shortest.',
    performanceTask: { title: 'Fraction measurement hunt', prompt: 'Measure five safe household objects with a ruler. Make a line plot and write one comparison or difference using fraction units.', evidence: 'Five labeled measurements, an accurate plot, and a fraction comparison.', rubric: [{ criterion: 'Measurement', ready: 'Each length begins at zero and uses equal intervals.', nextStep: 'Realign the object with the zero mark.' }, { criterion: 'Line plot', ready: 'Each X is above the correct value and repeats are stacked.', nextStep: 'Sort measurements before placing the X marks.' }, { criterion: 'Comparison', ready: 'The written statement matches the plotted data.', nextStep: 'Compare endpoints or count intervals between them.' }] },
    familyNote: 'We are measuring with fractional units and recording data. Let your child measure five objects with a ruler and explain how each line-plot mark represents one object.',
  },
  {
    unit: 13, objective: 'Use equal-area partitions and visual models to reason about fractions in shapes and contexts.',
    warmup: { prompt: 'Two parts have different shapes. Can they still be equal parts of the same whole?', reveal: 'Yes, if they cover the same area and the whole is partitioned fairly.' },
    vocabulary: [{ term: 'area', meaning: 'The amount of flat surface a shape covers.' }, { term: 'partition', meaning: 'A way to divide one whole into parts.' }, { term: 'equal area', meaning: 'Parts cover the same amount of surface, even if their outlines differ.' }],
    explainFrame: 'These are equal parts because each part covers the same ___ of the whole.',
    errorAnalysis: { claim: '“The parts are not equal because their shapes look different.”', correction: 'Compare how much surface each part covers; equal area matters, not matching outlines.' },
    materials: ['Grid paper', 'Square tiles', 'Paper shapes', 'Colored pencils'],
    offlineLaunch: 'Cut a paper square along two different paths. Compare the area of the parts by fitting grid squares or rearranging them.',
    discussionQuestions: ['What counts as the whole shape?', 'How can you compare area when outlines differ?', 'Which model makes the equal shares visible?'],
    misconceptions: [{ belief: 'Equal parts must have identical shapes.', response: 'Compare area by covering, rearranging, or counting equal-size tiles.' }, { belief: 'The shaded parts alone need to be equal.', response: 'Check the size of every part in the partition.' }],
    mastery: ['Identifies the whole and counts equal-area parts.', 'Explains that equal area does not require identical shapes.', 'Uses a grid or rearrangement to justify a fractional area.'],
    enrichment: 'Partition one square into four equal-area parts in two different ways. Prove each part has the same area.',
    performanceTask: { title: 'Create an equal-area mosaic', prompt: 'Design a square mosaic split into eighths using at least two different part shapes. Shade 3/8 and label the whole and a sample part.', evidence: 'A square partition, equal-area check, and a fraction label.', rubric: [{ criterion: 'Equal area', ready: 'Every part covers the same area.', nextStep: 'Count grid squares or rearrange parts to compare.' }, { criterion: 'Fraction model', ready: 'Three of eight equal-area parts are shaded.', nextStep: 'Count all parts first, then count shaded parts.' }, { criterion: 'Explanation', ready: 'Distinguishes area from shape outline.', nextStep: 'Explain how two different outlines can cover the same area.' }] },
    familyNote: 'We are learning to compare the area of parts, even when their shapes look different. Fold or cut a paper square and check whether the parts cover equal amounts.',
  },
  {
    unit: 14, objective: 'Connect fractions to decimals and use place value and estimates in real-world problems.',
    warmup: { prompt: 'If one whole is split into 10 equal parts, what decimal names 7 of those parts?', reveal: 'Seven tenths is 0.7.' },
    vocabulary: [{ term: 'dot', meaning: 'The mark that separates whole numbers from fractional place values.' }, { term: 'tenths', meaning: 'Ten equal parts of one whole.' }, { term: 'hundredths', meaning: 'One hundred equal parts of one whole.' }],
    explainFrame: '___ tenths is ___ because the model has ___ shaded parts out of ___.',
    errorAnalysis: { claim: '“0.4 is greater than 0.35 because 4 is greater than 35.”', correction: 'Rename 0.4 as 0.40. Compare 40 hundredths with 35 hundredths.' },
    materials: ['Tenths and hundredths grids', 'Base-ten blocks', 'Price tags or score cards'],
    offlineLaunch: 'Shade 4 tenths on a grid, then rename it as hundredths by splitting each tenth into ten smaller squares.',
    discussionQuestions: ['What does each digit name?', 'Can you rename both values with the same place value?', 'Is the answer reasonable compared with one whole?'],
    misconceptions: [{ belief: 'More decimal digits always mean a larger value.', response: 'Line up the dots and compare equal place values.' }, { belief: 'Percent is part of the core grade 3–5 fraction standards.', response: 'Treat percent problems as bonus extension; keep core mastery tied to grade 3–5 standards.' }],
    mastery: ['Represents tenths and hundredths with a grid.', 'Compares decimals by matching place values.', 'Checks a fraction-decimal story with an estimate.'],
    enrichment: 'Use four digits to make two decimals as close as possible without being equal. Show their distance on a hundredths grid.',
    performanceTask: { title: 'Plan a pretend school store', prompt: 'Choose three prices or scores written in tenths and hundredths. Compare them, make one total, and explain your estimate with a grid.', evidence: 'Three decimal amounts, a place-value model, and a reasonable comparison or total.', rubric: [{ criterion: 'Place value', ready: 'Digits are aligned by tenths and hundredths.', nextStep: 'Add a zero to write the same number of decimal places.' }, { criterion: 'Model', ready: 'The grid matches the decimal values.', nextStep: 'Shade tenths first, then subdivide into hundredths.' }, { criterion: 'Reasoning', ready: 'Comparison or total is supported by an estimate.', nextStep: 'Compare the values with one whole or a familiar benchmark.' }] },
    familyNote: 'We are connecting fraction models to tenths and hundredths decimals. Use a 10-by-10 grid or pretend prices to compare decimals; percent is an optional bonus topic.',
  },
  {
    unit: 15, objective: 'Solve non-routine fraction problems: find a whole from a part, critique a wrong method, and use bar models for a fraction of what is left.',
    warmup: { prompt: '6 crayons are 1/3 of a box. Draw a bar for the box. How many crayons fill it?', reveal: 'One third is 6, so three thirds is 18.' },
    vocabulary: [{ term: 'whole', meaning: 'All the equal parts together; the amount the fraction is of.' }, { term: 'remainder', meaning: 'The part that is left after some is used or given away.' }, { term: 'critique', meaning: 'Check someone’s method and explain what is right or wrong.' }],
    explainFrame: 'I know ___ is right (or wrong) because the parts are ___ and ___.',
    errorAnalysis: { claim: '“1/2 + 1/3 = 2/5 because I added the tops and the bottoms.”', correction: 'The parts are different sizes. Rename both as sixths: 3/6 + 2/6 = 5/6.' },
    materials: ['Paper strips for bar models', 'Counters or stickers', 'Sticky notes for “Is it right?” cards'],
    offlineLaunch: 'Give 12 counters. Say “these are 3/4 of my pile.” Ask the child to build the whole pile and explain how they found one fourth first.',
    discussionQuestions: ['What is the whole in this story?', 'What is left after the first step?', 'Which rule did the mistake break?'],
    misconceptions: [{ belief: 'A fraction of the rest is a fraction of the whole.', response: 'Draw the bar again for what is left. The second fraction cuts that new bar.' }, { belief: 'If the numbers look right, the method is right.', response: 'Check the part size first. Only same-size parts can be added by counting.' }],
    mastery: ['Finds a whole from a unit or non-unit part with a bar model.', 'Explains why a claimed answer is wrong and gives the right one.', 'Solves a two-step “fraction of the rest” story with a labeled bar model.'],
    enrichment: 'Divide by a fraction: how many 3/8 cup scoops fill 3/4 cup? Rename to eighths and count. Then invent a puzzle where the answer is 5.',
    performanceTask: { title: 'Make a mistake detective card', prompt: 'Write a fraction claim with a common mistake. Trade with a partner, find the mistake, and fix it with a bar model.', evidence: 'A wrong claim, a bar model, and a corrected answer with a reason.', rubric: [{ criterion: 'Model', ready: 'The bar model shows the whole and equal parts.', nextStep: 'Draw one whole bar first. Then cut equal parts.' }, { criterion: 'Critique', ready: 'Names the rule the mistake broke.', nextStep: 'Ask: are the parts the same size?' }, { criterion: 'Answer', ready: 'Gives the right amount with units.', nextStep: 'Check the answer against the model.' }] },
    familyNote: 'We are solving puzzle-style fraction problems. Ask your child to “be the teacher” and check a wrong answer, or to find the whole when they know a part.',
  },
];

export type PacingRow = { unit?: number; label?: string; sessions: number; focus: string };
export type GradePacing = { grade: 3 | 4 | 5; totalSessions: number; minutesPerSession: string; rows: PacingRow[] };

export const GRADE_PACING: GradePacing[] = [
  { grade: 3, totalSessions: 35, minutesPerSession: '20–25 minutes, 4–5 days each week', rows: [
    { unit: 1, sessions: 3, focus: 'Fair shares and fraction names' }, { unit: 2, sessions: 3, focus: 'Size of the parts' },
    { unit: 3, sessions: 4, focus: 'Benchmarks and fraction size' }, { unit: 4, sessions: 4, focus: 'Number-line jumps' },
    { unit: 5, sessions: 4, focus: 'Compare and order' }, { unit: 6, sessions: 4, focus: 'Equivalent fractions with models' },
    { unit: 7, sessions: 3, focus: 'Compose and decompose' }, { unit: 8, sessions: 3, focus: 'Cumulative practice and unit check' },
    { unit: 12, sessions: 3, focus: 'Measure fractional lengths and plot data' }, { unit: 13, sessions: 2, focus: 'Equal-area partitions' },
    { unit: 15, sessions: 2, focus: 'Find the whole from a part' },
  ] },
  { grade: 4, totalSessions: 45, minutesPerSession: '25–30 minutes, 4–5 days each week', rows: [
    { unit: 1, sessions: 2, focus: 'Quick prerequisite review' }, { unit: 2, sessions: 2, focus: 'Review part size' },
    { unit: 3, sessions: 2, focus: 'Benchmarks and estimates' }, { unit: 4, sessions: 2, focus: 'Number-line review' },
    { unit: 5, sessions: 3, focus: 'Compare and order' }, { unit: 6, sessions: 3, focus: 'Equivalent fractions' },
    { unit: 7, sessions: 3, focus: 'Add and subtract like units' }, { unit: 8, sessions: 3, focus: 'Fraction and decimal connections' },
    { unit: 9, sessions: 4, focus: 'Rename, compare, and whole numbers as fractions' }, { unit: 10, sessions: 4, focus: 'Mixed numbers and unlike fractions' },
    { unit: 11, sessions: 5, focus: 'Fraction of a quantity and scaling' }, { unit: 12, sessions: 4, focus: 'Measurement and line plots' },
    { unit: 13, sessions: 2, focus: 'Shape models and equal area' }, { unit: 14, sessions: 3, focus: 'Decimals and cumulative review' },
    { unit: 15, sessions: 3, focus: 'Find the whole and spot the mistake' },
  ] },
  { grade: 5, totalSessions: 45, minutesPerSession: '25–30 minutes, 4–5 days each week', rows: [
    { unit: 1, sessions: 1, focus: 'Fast prerequisite check' }, { unit: 2, sessions: 1, focus: 'Review part size' },
    { unit: 3, sessions: 1, focus: 'Review benchmarks' }, { unit: 4, sessions: 2, focus: 'Number lines beyond one' },
    { unit: 5, sessions: 2, focus: 'Compare and estimate' }, { unit: 6, sessions: 2, focus: 'Equivalent names' },
    { unit: 7, sessions: 2, focus: 'Compose and operate with fractions' }, { unit: 8, sessions: 2, focus: 'Review and fluency' },
    { unit: 9, sessions: 4, focus: 'Rename, compare, and simplify' }, { unit: 10, sessions: 4, focus: 'Mixed numbers and estimates' },
    { unit: 11, sessions: 5, focus: 'Multiply, scale, and divide fairly' }, { unit: 12, sessions: 4, focus: 'Measurement and conversions' },
    { unit: 13, sessions: 4, focus: 'Area and fraction models' }, { unit: 14, sessions: 5, focus: 'Decimals and cumulative review' },
    { unit: 15, sessions: 4, focus: 'Bar models and fraction of the rest' },
    { label: 'Review and benchmark sessions', sessions: 2, focus: 'Interleave earlier standards; reteach from evidence' },
  ] },
];

export function guideForUnit(unit: number): UnitTeachingGuide | undefined {
  return UNIT_TEACHING_GUIDES.find((guide) => guide.unit === unit);
}

export function pacingSessionTotal(plan: GradePacing): number {
  return plan.rows.reduce((total, row) => total + row.sessions, 0);
}

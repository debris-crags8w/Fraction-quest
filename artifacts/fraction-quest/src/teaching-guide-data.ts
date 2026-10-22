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
    unit: 1, objective: 'Name a whole, split it into equal shares, describe one share as a unit fraction, and see that equal shares of a shape have equal areas.',
    warmup: { prompt: 'Fold or draw a strip into two fair shares. What must be true about the shares?', reveal: 'They cover the same whole and have the same size.' },
    vocabulary: [{ term: 'whole', meaning: 'The complete amount we are talking about.' }, { term: 'equal parts', meaning: 'Parts that have the same size.' }, { term: 'unit fraction', meaning: 'One equal part of a whole, such as 1/4.' }, { term: 'equal area', meaning: 'Parts that cover the same amount of surface, even if their shapes differ.' }],
    explainFrame: 'I know this is one ___ because the whole is split into ___ equal parts.',
    errorAnalysis: { claim: '“The bar has four parts, so any one part is 1/4.”', correction: 'Check that the four parts are equal and belong to the same whole before naming 1/4.' },
    materials: ['Paper strips', 'Crayons', 'Grid paper', 'A small collection of same-size objects'],
    offlineLaunch: 'Fold one strip in half, then another strip into four equal parts. Compare one share from each strip.',
    discussionQuestions: ['Where does the whole begin and end?', 'How can you check that the shares are fair?', 'What does the denominator count?'],
    misconceptions: [{ belief: 'Any cut makes equal parts.', response: 'Place the parts on top of one another or compare their lengths.' }, { belief: 'The numerator tells how many parts make the whole.', response: 'Build the whole first; count all equal parts for the denominator.' }, { belief: 'Equal parts must have identical shapes.', response: 'Compare area by covering, rearranging, or counting equal-size tiles.' }],
    mastery: ['Identifies the whole in a picture.', 'Makes equal shares and names one share as 1/n.', 'Explains that the denominator counts all equal parts in one whole.', 'Explains that equal-area parts can have different shapes.'],
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
    unit: 4, objective: 'Partition a number line into equal spaces, read a fraction as equal jumps from zero, and use the same idea to measure with a ruler and record lengths on a line plot.',
    warmup: { prompt: 'A number line from 0 to 1 has 4 equal spaces. What fraction is one jump?', reveal: 'One jump is 1/4 of the whole distance.' },
    vocabulary: [{ term: 'number line', meaning: 'A line that shows numbers in order and at equal distances.' }, { term: 'interval', meaning: 'The space between two neighboring tick marks.' }, { term: 'jump', meaning: 'A move of one equal interval along the line.' }, { term: 'line plot', meaning: 'A number line with an X above the value of each measurement.' }],
    explainFrame: 'Each jump is ___ because the whole from 0 to 1 has ___ equal spaces.',
    errorAnalysis: { claim: '“There are 5 tick marks, so the line is split into fifths.”', correction: 'Count the spaces between the endpoints. Tick marks show boundaries; spaces show parts.' },
    materials: ['Rulers marked in halves and fourths', 'Paper strips', 'Fraction cards', 'Sticky notes for line-plot Xs'],
    offlineLaunch: 'Draw 0 and 1 at the ends of a strip. Fold it into equal spaces and mark each fold.',
    discussionQuestions: ['How many spaces are between 0 and 1?', 'What does one jump represent?', 'Where will three jumps from 0 land?', 'What does each X on the line plot stand for?'],
    misconceptions: [{ belief: 'Count tick marks instead of spaces.', response: 'Trace each interval between the endpoints and count those equal spaces.' }, { belief: 'The line always ends at 1.', response: 'Keep equal jump sizes and continue past 1 when the numerator is larger than the denominator.' }, { belief: 'The first tick on a ruler is one whole unit.', response: 'Line the object up with zero and count each interval.' }, { belief: 'Each line-plot mark is a different value.', response: 'Stack marks above the same value when measurements repeat.' }],
    mastery: ['Partitions 0–1 into equal intervals.', 'Labels each jump with a unit fraction.', 'Locates a fraction by counting jumps from 0.', 'Measures to the nearest quarter inch and records lengths on a line plot.'],
    enrichment: 'Place 7/4 on a line. Show the whole-number benchmarks and explain how many jumps are past 1.',
    performanceTask: { title: 'Build a jump map', prompt: 'Create a number line in fourths that reaches 2. Mark and label 3/4, 1, 5/4, and 7/4.', evidence: 'A consistent scale, labels, and a short explanation of one point beyond 1.', rubric: [{ criterion: 'Equal intervals', ready: 'All jumps are the same length.', nextStep: 'Use one folded strip to measure every interval.' }, { criterion: 'Point locations', ready: 'Each fraction is placed by counting jumps from 0.', nextStep: 'Count spaces, not tick marks.' }, { criterion: 'Beyond one', ready: 'Shows 1 as a benchmark and continues the same scale.', nextStep: 'Keep the jump size the same after reaching 1.' }] },
    familyNote: 'We are treating a fraction as a distance, just like on a ruler. Draw a short line from 0 to 1 and let your child mark equal jumps, or measure a crayon to the nearest quarter inch.',
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
    unit: 6, objective: 'Recognize and build equivalent fractions that name the same amount, on fraction bars and on a number line.',
    warmup: { prompt: 'Fold a strip in half, then fold it again. How many fourths cover the same amount as one half?', reveal: 'Two fourths cover the same length as one half: 1/2 = 2/4.' },
    vocabulary: [{ term: 'equivalent', meaning: 'Different fraction names for the same amount.' }, { term: 'rename', meaning: 'Write the same amount in a different way.' }, { term: 'fraction wall', meaning: 'Aligned strips that help compare equal lengths.' }, { term: 'same point', meaning: 'Equivalent fractions land at the same place on a number line.' }],
    explainFrame: '___ and ___ are equivalent because both cover the same ___ of the whole.',
    errorAnalysis: { claim: '“Add 2 to the numerator and denominator of 1/3 to get an equivalent fraction.”', correction: 'Use the same-size parts in the model; equivalent fractions scale top and bottom by the same factor.' },
    materials: ['Paper strips', 'Fraction strips or a hand-drawn fraction wall', 'Colored pencils'],
    offlineLaunch: 'Fold two same-length strips into halves and fourths. Line up the edges and trace the equal lengths.',
    discussionQuestions: ['Do the shaded lengths match?', 'How many smaller parts cover one larger part?', 'Do both fractions land at the same point on the line?', 'What changed, and what stayed the same?'],
    misconceptions: [{ belief: 'Change only the numerator or denominator.', response: 'Check that the whole shaded length remains the same in both models.' }, { belief: 'Equivalent means the digits match.', response: 'Align the bars or points and compare their values, not their written forms.' }],
    mastery: ['Builds equivalent fractions with a visual model.', 'Shows two equivalent fractions at the same point on a number line.', 'Explains how both numerator and denominator change together.', 'Uses an equivalent name to compare or simplify.'],
    enrichment: 'Find three names for 3/4 using denominators below 20. Show each on a fraction wall.',
    performanceTask: { title: 'Design a fraction wall', prompt: 'Draw aligned bars for halves, thirds, fourths, sixths, and eighths. Color matching lengths and label at least four equivalent pairs.', evidence: 'A shared whole, aligned bars, and labeled matching lengths.', rubric: [{ criterion: 'Alignment', ready: 'Every row starts and ends at the same whole.', nextStep: 'Use a ruler to align the endpoints.' }, { criterion: 'Equivalent pairs', ready: 'Each labeled pair has the same shaded length.', nextStep: 'Overlay the strips before naming the pair.' }, { criterion: 'Explanation', ready: 'Describes what stayed the same as the names changed.', nextStep: 'Compare the total shaded amount.' }] },
    familyNote: 'We are learning that equivalent fractions keep the amount the same while changing the name. Fold a paper strip in half and fourths to show 1/2 = 2/4.',
  },
  {
    unit: 7, objective: 'Compose and decompose fractions, write whole numbers as fractions, and name amounts greater than one as fractions and mixed numbers.',
    warmup: { prompt: 'If a whole is split into fifths, how many fifths make one whole?', reveal: 'Five fifths make one whole: 5/5 = 1.' },
    vocabulary: [{ term: 'compose', meaning: 'Put parts together to make a larger amount.' }, { term: 'decompose', meaning: 'Break an amount into smaller parts.' }, { term: 'improper fraction', meaning: 'A fraction with a numerator as big as or bigger than its denominator, such as 7/4.' }, { term: 'mixed number', meaning: 'A whole number and a fraction together, such as 1 3/4.' }],
    explainFrame: '___ is ___ wholes and ___ left over because ___ parts make one whole.',
    errorAnalysis: { claim: '“6/3 can’t be a whole number because it is a fraction.”', correction: 'Three thirds make one whole, so six thirds make two wholes: 6/3 = 2.' },
    materials: ['Fraction strips', 'Paper plates or circles', 'Number line to 3'],
    offlineLaunch: 'Use fifths strips to build one whole from 5/5. Then lay out 7 fourths, group four of them into a whole, and name what is left.',
    discussionQuestions: ['How many parts make one whole?', 'Can you break this fraction into same-size pieces another way?', 'How many complete wholes are there, and what is left over?'],
    misconceptions: [{ belief: 'A result larger than one cannot be a fraction.', response: 'Build another whole from the extra equal parts.' }, { belief: 'A numerator larger than the denominator is a mistake.', response: 'Group denominator-many parts into a whole and count what remains.' }],
    mastery: ['Decomposes a fraction into a sum of same-size parts in more than one way.', 'Writes a whole number as a fraction, such as 3 = 6/2.', 'Changes between an improper fraction and a mixed number with a model.'],
    enrichment: 'Find two different ways to make 1 using three fraction parts. Then write 2 1/4 as a fraction and as a sum of fourths.',
    performanceTask: { title: 'Build a beyond-one strip', prompt: 'Lay out fourths strips past one whole to show 7/4. Group a whole, name it as a mixed number, and write it as a sum of fourths.', evidence: 'A model, the fraction, the mixed number and a matching sum.', rubric: [{ criterion: 'Model', ready: 'Every part is the same fraction unit.', nextStep: 'Choose one part size and redraw all parts equally.' }, { criterion: 'Wholes', ready: 'Groups denominator-many parts into each whole.', nextStep: 'Count out one full set of parts before naming a whole.' }, { criterion: 'Names', ready: 'The fraction, mixed number and sum all match the model.', nextStep: 'Count the parts again and check each name against the strip.' }] },
    familyNote: 'We are putting same-size fraction parts together, taking them apart, and naming amounts bigger than one. Use measuring scoops and ask, “How many quarter cups make one cup? What about 5 quarter cups?”',
  },
  {
    unit: 8, objective: 'Add and subtract fractions and mixed numbers with like denominators, write tenths and hundredths as decimals, compare and order decimals on hundredths grids, write dimes and pennies as hundredths of a dollar, and multiply a fraction by a whole number.',
    warmup: { prompt: 'What is 2/5 + 2/5? Do the fifths change size?', reveal: 'No. Fifths stay fifths: 2 fifths + 2 fifths = 4/5.' },
    vocabulary: [{ term: 'mixed number', meaning: 'A whole number and a fraction part together, such as 2 1/3.' }, { term: 'decimal point', meaning: 'The dot that separates whole numbers from tenths and hundredths.' }, { term: 'hundredths', meaning: 'One hundred equal parts of one whole. 0.01 is one hundredth.' }, { term: 'like denominators', meaning: 'Fractions with the same-size parts, such as 1/5 and 3/5.' }],
    explainFrame: 'The parts are all ___, so I count the parts and keep the denominator: ___.',
    errorAnalysis: { claim: '“1/5 + 2/5 = 3/10 because I add the numerators and the denominators.”', correction: 'The parts are the same size, so the denominator stays 5. Count the fifths: 1/5 + 2/5 = 3/5.' },
    materials: ['Fraction strips', 'Tenths and hundredths grids', 'Measuring cups'],
    offlineLaunch: 'Fill a measuring cup to 1 1/4 cups, then add 2/4 cup. Count the quarter cups before reading the total. Then shade 3 tenths on a grid and name it 0.3.',
    discussionQuestions: ['Are the parts the same size?', 'Do you need to trade a whole for parts before you take away?', 'Can you show the answer as a fraction and as a decimal?'],
    misconceptions: [{ belief: 'Add the denominators too.', response: 'Keep the part size fixed and count parts.' }, { belief: 'In 2 1/3 − 1 2/3, take the smaller fraction from the bigger one.', response: 'Trade one whole for 3/3 first, so 2 1/3 becomes 1 4/3. Then subtract.' }, { belief: 'A decimal with more digits is always bigger.', response: 'Write both with the same number of places: 0.4 is 0.40, which is more than 0.35.' }],
    mastery: ['Adds and subtracts like fractions and mixed numbers, trading a whole when needed.', 'Writes tenths and hundredths as fractions and decimals, and compares and orders decimals on a hundredths grid.', 'Explains that two decimals can only be compared when they are parts of the same whole.', 'Writes dimes and pennies as hundredths of a dollar (3 dimes = 30/100).', 'Finds a whole number times a fraction by counting equal groups.'],
    enrichment: 'Use a hundredths grid to show that 3/10 + 25/100 = 55/100. Then write the sum as a decimal.',
    performanceTask: { title: 'Plan a simple recipe', prompt: 'Choose ingredient amounts in like fractions and mixed numbers. Add two of them, take one away, and write one tenths amount as a decimal.', evidence: 'A recipe plan, a matching model, and a written sum and difference.', rubric: [{ criterion: 'Representation', ready: 'The model matches the ingredient amounts.', nextStep: 'Draw one bar for each amount before combining.' }, { criterion: 'Computation', ready: 'Keeps the denominator and regroups wholes correctly.', nextStep: 'Count parts without changing their size.' }, { criterion: 'Decimals', ready: 'Writes a tenths amount with the decimal point in the right place.', nextStep: 'Shade the tenths on a grid, then write the digits.' }] },
    familyNote: 'We are adding and taking away same-size fraction parts, including mixed numbers, and writing tenths and hundredths as decimals. While cooking, ask, “We have 1 1/4 cups and add 2/4 cup. How much now?”',
  },
  {
    unit: 9, objective: 'Rename fractions, use common units to compare and order them, make and read line plots in eighths, use fractions in measurement stories, and multiply a fraction by a whole number in recipe and portion stories, saying which whole numbers the answer is between.',
    warmup: { prompt: 'Is 3/4 the same as 6/8? How can you check?', reveal: 'Yes. Split each fourth in two: 3 fourths become 6 eighths.' },
    vocabulary: [{ term: 'simplify', meaning: 'Use a smaller numerator and denominator without changing the amount.' }, { term: 'common denominator', meaning: 'A shared number of equal parts used to compare or combine fractions.' }, { term: 'line plot', meaning: 'A number line with an X for each measurement.' }],
    explainFrame: 'I renamed ___ as ___ so both fractions use ___-size parts.',
    errorAnalysis: { claim: '“2/3 is less than 3/5 because 2 is less than 3.”', correction: 'Rename both with a shared denominator or use matching bars before comparing.' },
    materials: ['Fraction strips', 'Multiplication chart', 'Number line', 'Ruler marked in eighths', 'Measuring cups'],
    offlineLaunch: 'Use strips to find a shared part size for thirds and sixths; name the matching fractions.',
    discussionQuestions: ['What shared unit helps compare these?', 'How can you rename without changing the amount?', 'What does each X on the line plot stand for?'],
    misconceptions: [{ belief: 'A larger numerator means a larger fraction in every comparison.', response: 'First make part sizes match or compare the whole models.' }, { belief: 'Simplifying changes the value.', response: 'Show that the shaded length remains fixed while parts are grouped.' }, { belief: 'A measurement answer does not need a unit.', response: 'Say the unit every time: 5/8 inch, 500 milliliters.' }, { belief: 'Doubling a recipe doubles only some ingredients.', response: 'Every amount gets the same factor; add each amount to itself.' }],
    mastery: ['Builds equivalent names and simplifies without changing the value.', 'Compares and orders unlike fractions using a model or common unit.', 'Reads a fraction line plot and solves a measurement story with units.', 'Multiplies a recipe amount by a whole number of batches.', 'Makes a line plot in eighths and uses it to compare and add lengths.', 'Finds which two whole numbers a fraction-times-whole answer is between.'],
    enrichment: 'Find a pair of unlike fractions that differ by less than 1/12. Prove the distance on a line.',
    performanceTask: { title: 'Fraction-name detective', prompt: 'Choose three fraction cards. Give each card two equivalent names, place them on one number line, and order them.', evidence: 'Equivalent forms, an ordered line, and a model-based comparison.', rubric: [{ criterion: 'Renaming', ready: 'Each new name keeps the same value.', nextStep: 'Check the bar length before and after renaming.' }, { criterion: 'Comparison', ready: 'All fractions use a common whole and are ordered correctly.', nextStep: 'Use a shared denominator or benchmark.' }, { criterion: 'Explanation', ready: 'Shows how the model supports the order.', nextStep: 'Point to the same units on the line.' }] },
    familyNote: 'We are making new fraction names for the same amount. Ask your child to prove 2/3 = 4/6 with a drawing or folded strip.',
  },
  {
    unit: 10, objective: 'Add and subtract fractions and mixed numbers with unlike denominators by renaming them with a common denominator, and estimate with benchmarks to check answers.',
    warmup: { prompt: 'Is 1/2 + 1/3 more or less than 1? How can you tell without adding?', reveal: 'Less. 1/3 is less than 1/2, and two halves make 1, so the sum is less than 1.' },
    vocabulary: [{ term: 'unlike denominators', meaning: 'Fractions with different-size equal parts.' }, { term: 'common denominator', meaning: 'A shared denominator that makes the parts the same size.' }, { term: 'estimate', meaning: 'Find a close value to check whether an answer makes sense.' }],
    explainFrame: 'I renamed ___ and ___ as ___ so the parts match. My estimate says the answer is about ___.',
    errorAnalysis: { claim: '“3/4 − 1/2 = 2/2 because 3 − 1 = 2 and 4 − 2 = 2.”', correction: 'The parts are different sizes. Rename 1/2 as 2/4. Then 3/4 − 2/4 = 1/4.' },
    materials: ['Fraction strips', 'Multiplication chart', 'Number line to 3'],
    offlineLaunch: 'Lay a halves strip and a thirds strip end to end. Find the sixths that match the total length, and name the sum.',
    discussionQuestions: ['Are the parts the same size yet?', 'Which denominator works for both fractions?', 'Before calculating, will the answer be more or less than 1/2, or 1?'],
    misconceptions: [{ belief: 'Add unlike parts directly.', response: 'Rename both amounts using equal-size parts before combining.' }, { belief: 'An answer is fine if the steps look right.', response: 'Compare the answer with an estimate using 0, 1/2 and 1.' }],
    mastery: ['Renames two fractions with a common denominator.', 'Adds and subtracts unlike fractions and mixed numbers, regrouping when needed.', 'Uses benchmarks to decide whether an answer makes sense.'],
    enrichment: 'Create two different sums of unlike fractions that are both between 1 and 2. Explain how you know.',
    performanceTask: { title: 'Plan a picnic trail', prompt: 'A trail has three parts: 1/2 mile, 1/3 mile and 1 1/4 miles. Estimate the total first, then find it exactly with a common denominator.', evidence: 'An estimate, renamed fractions, and an exact total that agrees with the estimate.', rubric: [{ criterion: 'Common denominator', ready: 'Renames each length with the same denominator.', nextStep: 'List multiples of each denominator to find one they share.' }, { criterion: 'Computation', ready: 'Adds the parts and regroups a whole when needed.', nextStep: 'Count the renamed parts and make a whole from denominator-many.' }, { criterion: 'Estimate', ready: 'The estimate and the exact answer agree.', nextStep: 'Compare each length with 0, 1/2 or 1 before adding.' }] },
    familyNote: 'We are adding and taking away fractions with different-size parts. Before working it out, ask your child, “Is 1/2 + 1/4 more or less than one whole? How do you know?”',
  },
  {
    unit: 11, objective: 'Use multiplication and division to find fractions of quantities, multiply fractions on an area grid, and tell whether a factor makes an amount bigger or smaller.',
    warmup: { prompt: 'What is 1/4 of 12 counters? Show equal groups.', reveal: 'Split 12 into 4 equal groups of 3. One group is 3 counters.' },
    vocabulary: [{ term: 'fraction of a quantity', meaning: 'A fraction-sized share of a group of objects or an amount.' }, { term: 'scale', meaning: 'Make an amount larger or smaller by a factor.' }, { term: 'unit fraction', meaning: 'One equal share, such as one fourth.' }, { term: 'overlap', meaning: 'The squares shaded both ways on a grid: the product of the two fractions.' }],
    explainFrame: 'I split ___ into ___ equal groups. One group is ___, so ___ groups are ___.',
    errorAnalysis: { claim: '“3/4 of 12 means add 3 and 4 to 12.”', correction: 'Split 12 into 4 equal groups, then take 3 of those groups.' },
    materials: ['Counters', 'Measuring cups', 'Recipe cards'],
    offlineLaunch: 'Share 12 counters into 4 equal cups, then select 3 cups and describe the fraction of the total.',
    discussionQuestions: ['Which number tells how many equal groups?', 'How many groups are selected?', 'Should the result be smaller or larger than the starting amount?'],
    misconceptions: [{ belief: 'Multiply or divide every number without considering the context.', response: 'Draw the groups and decide what the fraction means first.' }, { belief: 'A fraction multiplication answer must be larger.', response: 'Compare the factor with one; a fraction less than one scales down.' }],
    mastery: ['Finds a fraction of a collection by equal grouping.', 'Multiplies two fractions by counting the overlap of rows and columns on a grid.', 'Tells whether a factor makes an amount bigger, smaller or the same by comparing it with 1.'],
    enrichment: 'A recipe for 4 people uses 3/4 cup. Find amounts for 2 and 8 people and explain the scale factor.',
    performanceTask: { title: 'Scale a snack recipe', prompt: 'Choose a simple recipe with at least three fraction amounts. Scale it to twice as many servings and to half as many, then model one ingredient.', evidence: 'A before-and-after recipe, one visual model, and an explanation of scaling.', rubric: [{ criterion: 'Scale factor', ready: 'Every ingredient uses the same scale factor.', nextStep: 'Compare the new serving count with the old one.' }, { criterion: 'Fraction amount', ready: 'Fractions are computed and labeled correctly.', nextStep: 'Build equal groups or use a matching bar.' }, { criterion: 'Reasoning', ready: 'Explains whether the new amount should grow or shrink.', nextStep: 'Compare the scale factor with one.' }] },
    familyNote: 'We are finding a fraction of a set and scaling recipes. Let your child use counters or measuring spoons to show what one-fourth of a collection means.',
  },
  {
    unit: 12, objective: 'Find fractions of lengths, add measurements, convert units, use line plots to share amounts, add every X on a line plot, convert units in two-step stories, see a fraction as a division, then divide with unit fractions and tell sharing from fitting.',
    warmup: { prompt: '3 friends share 2 pizzas equally. How much does each friend get?', reveal: 'Each friend gets 2/3 of a pizza: 2 ÷ 3 = 2/3.' },
    vocabulary: [{ term: 'convert', meaning: 'Rename a measurement using a different unit.' }, { term: 'line plot', meaning: 'A number line that records how often measurements occur.' }, { term: 'quotient', meaning: 'The answer to a division. 3 ÷ 4 has the quotient 3/4.' }, { term: 'fitting', meaning: 'Division that counts how many pieces of one size fit in an amount.' }],
    explainFrame: 'Each share is ___ because ___ shared by ___ is ___.',
    errorAnalysis: { claim: '“3 ÷ 4 is 4/3 because the bigger number goes on top.”', correction: 'The amount being shared goes on top: 3 ÷ 4 = 3/4. Each friend gets less than one whole.' },
    materials: ['Measuring tape or meter stick', 'Measuring cups', 'Paper strips for sharing', 'Graph paper'],
    offlineLaunch: 'Pour water into three cups: 1/2 cup, 1/4 cup and none. Plot the amounts, then even them out so every cup holds the same.',
    discussionQuestions: ['What is the whole, and what unit is it in?', 'How many smaller units are in one bigger unit?', 'Does each person get more or less than one whole?'],
    misconceptions: [{ belief: 'The bigger number always goes on top of a fraction.', response: 'The amount shared is the numerator; the number of sharers is the denominator.' }, { belief: 'Different units can be added as they are.', response: 'Convert to the same unit first, then add.' }],
    mastery: ['Finds a fraction of a length and adds measurements.', 'Converts a fractional amount to a smaller unit, such as 3/4 hour = 45 minutes.', 'Finds a total or a difference from a line plot by adding the amount for every X.', 'Converts a mixed number of big units to small units before adding or taking away.', 'Explains a fair share as a fraction: a ÷ b = a/b.', 'Tells sharing from fitting, divides with a unit fraction, and checks with ×.'],
    enrichment: 'Measure five objects to the nearest eighth inch. Make a line plot, then find how long each would be if the total were shared equally.',
    performanceTask: { title: 'Share the stage supplies', prompt: 'Share 3 ribbons among 4 helpers, and 2 liters of juice among 5 cups. Write each share as a division and as a fraction.', evidence: 'Two sharing drawings, each with a matching division and fraction.', rubric: [{ criterion: 'Fair shares', ready: 'Every helper or cup gets the same amount.', nextStep: 'Cut each whole into as many parts as there are sharers.' }, { criterion: 'Fraction', ready: 'Writes each share as total ÷ sharers = fraction.', nextStep: 'Put the amount shared on top and the number of sharers below.' }, { criterion: 'Units', ready: 'Each answer names its unit.', nextStep: 'Say “of a ribbon” or “liter” after the fraction.' }] },
    familyNote: 'We are using fractions with measurements and fair shares. Share 3 crackers among 4 people and ask, “How much does each person get? Why is that 3/4?”',
  },
  {
    unit: 13, objective: 'Find areas with fractional and mixed-number side lengths, and describe chance as a fraction.',
    warmup: { prompt: 'A rectangle is 1/2 meter by 1/3 meter. Draw it inside a one-meter square. What fraction of the square does it cover?', reveal: 'Cut the square into halves one way and thirds the other: 6 equal parts. The rectangle is 1 of them, so 1/6 square meter.' },
    vocabulary: [{ term: 'area', meaning: 'The amount of flat surface a shape covers.' }, { term: 'square unit', meaning: 'A square with sides of one unit, used to measure area.' }, { term: 'chance', meaning: 'How likely something is, written as a fraction of all the equally likely outcomes.' }],
    explainFrame: 'The area is ___ because ___ of the ___ equal parts of a unit square are covered.',
    errorAnalysis: { claim: '“A 1 1/2 by 2 rectangle has area 2 1/2 because 1 × 2 = 2 and I keep the 1/2.”', correction: 'Multiply all of each side: 1 1/2 × 2 = 3 square units. Draw it and count the whole and half squares.' },
    materials: ['Grid paper', 'Square tiles', 'A bag of colored counters'],
    offlineLaunch: 'Draw a 1 1/2 by 2 rectangle on grid paper. Count the whole squares and the half squares to find the area.',
    discussionQuestions: ['What is one square unit in this picture?', 'How many small parts make one square unit?', 'How many outcomes are there in all, and how many do we want?'],
    misconceptions: [{ belief: 'Multiply only the whole numbers in a mixed number.', response: 'Split each side into wholes and parts, and add every partial area.' }, { belief: 'More of one color always means a chance over one half.', response: 'Count the ones you want and all of them; compare the fraction with 1/2.' }],
    mastery: ['Finds the area of a rectangle with fractional sides using a grid.', 'Multiplies mixed-number side lengths and explains the partial areas.', 'Names a simple chance as a fraction of all the equally likely outcomes.'],
    enrichment: 'Design a garden 2 1/2 meters by 1 1/2 meters. Split it into four rectangles and find each area.',
    performanceTask: { title: 'Plan a festival garden', prompt: 'Draw a garden bed with mixed-number sides on grid paper. Find its area, then fill a seed bag so the chance of a flower seed is 3/5.', evidence: 'A labeled grid drawing, an area in square units, and a seed bag with its chance written as a fraction.', rubric: [{ criterion: 'Area model', ready: 'The grid shows whole and fractional rows and columns.', nextStep: 'Mark the unit square first, then split it into the fraction parts.' }, { criterion: 'Area', ready: 'The area is correct and labeled in square units.', nextStep: 'Add the partial areas one at a time.' }, { criterion: 'Chance', ready: 'The seed bag matches the chance: flower seeds out of all seeds.', nextStep: 'Count the flower seeds, then count every seed.' }] },
    familyNote: 'We are finding areas when the sides are fractions or mixed numbers. Draw a rectangle on grid paper with your child and count the whole and half squares inside.',
  },
  {
    unit: 14, objective: 'Rename fractions and percents as parts of 100 (a bonus topic), and solve two-step fraction stories by planning each step.',
    warmup: { prompt: 'A 10-by-10 grid has 25 squares shaded. What fraction and what percent is that?', reveal: '25/100, which is 25%. It is also 1/4.' },
    vocabulary: [{ term: 'percent', meaning: 'Parts out of 100. 30% means 30/100.' }, { term: 'hundredths', meaning: 'One hundred equal parts of one whole.' }, { term: 'two-step story', meaning: 'A problem you solve in two steps, using the first answer in the second step.' }],
    explainFrame: 'First I found ___. Then I used it to find ___.',
    errorAnalysis: { claim: '“3/5 is 35% because I put the 3 and the 5 together.”', correction: 'Percent means out of 100. Rename 3/5 as 60/100, so it is 60%.' },
    materials: ['Hundredths grids', 'Score cards', 'Paper strips for bar models'],
    offlineLaunch: 'Shade 3 of the 10 columns on a hundredths grid. Name it as 3/10, as 30/100 and as 30%.',
    discussionQuestions: ['How many hundredths is this fraction?', 'What does the story ask for?', 'What do you need to find first?'],
    misconceptions: [{ belief: 'Percent is part of the core grade 3–5 fraction standards.', response: 'Treat percent problems as bonus extension; keep core mastery tied to grade 3–5 standards.' }, { belief: 'Solve a story with whatever numbers appear first.', response: 'Say what the story asks, then plan both steps before calculating.' }],
    mastery: ['Renames a fraction with a denominator of 2, 4, 5, 10 or 100 as a percent (bonus).', 'Writes a percent as a fraction out of 100 (bonus).', 'Solves a two-step like-denominator story and explains each step.'],
    enrichment: 'Make up a two-step story whose answer is 3/8. Then write a percent puzzle for a partner.',
    performanceTask: { title: 'Plan a pretend school fair', prompt: 'Write two fair games with scores out of 10 and rename them as percents. Then write and solve a two-step story about the fair.', evidence: 'Two scores renamed as percents and a solved two-step story.', rubric: [{ criterion: 'Hundredths', ready: 'Each score is renamed as hundredths before writing the percent.', nextStep: 'Multiply the numerator and denominator to make 100.' }, { criterion: 'Two steps', ready: 'The story uses the first answer in the second step.', nextStep: 'Write the first question, solve it, then use that answer.' }, { criterion: 'Reasoning', ready: 'Explains why the final answer makes sense.', nextStep: 'Compare the answer with one whole or 100%.' }] },
    familyNote: 'We are solving two-step fraction stories, and percent is an optional bonus. Before solving a story together, ask your child, “What do you need to find first?”',
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
    { unit: 1, sessions: 4, focus: 'Fair shares, fraction names and equal-area parts' }, { unit: 2, sessions: 3, focus: 'Size of the parts' },
    { unit: 3, sessions: 4, focus: 'Benchmarks and fraction size' }, { unit: 4, sessions: 6, focus: 'Number-line jumps, rulers and line plots' },
    { unit: 5, sessions: 4, focus: 'Compare and order' }, { unit: 6, sessions: 4, focus: 'Equivalent fractions with models and number lines' },
    { unit: 7, sessions: 4, focus: 'Whole numbers and fractions greater than one' },
    { unit: 15, sessions: 2, focus: 'Find the whole from a part' },
    { label: 'Review and benchmark sessions', sessions: 4, focus: 'Interleave grade 3 standards; reteach from evidence' },
  ] },
  { grade: 4, totalSessions: 45, minutesPerSession: '25–30 minutes, 4–5 days each week', rows: [
    { unit: 1, sessions: 2, focus: 'Quick prerequisite review' }, { unit: 2, sessions: 2, focus: 'Review part size' },
    { unit: 3, sessions: 2, focus: 'Benchmarks and estimates' }, { unit: 4, sessions: 3, focus: 'Number lines, rulers and line plots' },
    { unit: 5, sessions: 2, focus: 'Compare and order' }, { unit: 6, sessions: 3, focus: 'Equivalent fractions' },
    { unit: 7, sessions: 4, focus: 'Compose, decompose and mixed numbers' }, { unit: 8, sessions: 10, focus: 'Like-fraction sums, mixed numbers, decimals on grids and groups of a fraction' },
    { unit: 9, sessions: 8, focus: 'Rename and compare unlike fractions; line plots, measurement and recipe stories' },
    { unit: 14, sessions: 3, focus: 'Two-step fraction stories' },
    { unit: 15, sessions: 3, focus: 'Spot the mistake' },
    { label: 'Review and benchmark sessions', sessions: 3, focus: 'Interleave grade 4 standards; reteach from evidence' },
  ] },
  { grade: 5, totalSessions: 45, minutesPerSession: '25–30 minutes, 4–5 days each week', rows: [
    { unit: 1, sessions: 1, focus: 'Fast prerequisite check' }, { unit: 2, sessions: 1, focus: 'Review part size' },
    { unit: 3, sessions: 1, focus: 'Review benchmarks' }, { unit: 4, sessions: 1, focus: 'Number lines beyond one' },
    { unit: 5, sessions: 1, focus: 'Compare and estimate' }, { unit: 6, sessions: 2, focus: 'Equivalent names' },
    { unit: 7, sessions: 2, focus: 'Mixed numbers and fractions greater than one' }, { unit: 8, sessions: 3, focus: 'Like-fraction fluency and decimals' },
    { unit: 9, sessions: 3, focus: 'Rename, simplify, and compare' }, { unit: 10, sessions: 5, focus: 'Add and subtract unlike fractions, and estimate' },
    { unit: 11, sessions: 5, focus: 'Fractions of groups, multiply on a grid, and scale' }, { unit: 12, sessions: 7, focus: 'Measurement and line plots, fractions as division, then share or fit' },
    { unit: 13, sessions: 4, focus: 'Area with fractional and mixed-number sides' }, { unit: 14, sessions: 3, focus: 'Two-step stories and percent (bonus)' },
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

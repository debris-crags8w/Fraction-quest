/* The ideas of lessons 21–30 (see lesson-ideas.ts): each lesson's ideas in order, each with its Learn pages and 3
   practices. Lesson 1 (ideas/lessons-01.ts) is the model. */
import { example, scenes, wordsToKnow, type LessonIdea } from './helpers';

/** Part names in words, for "as thirds". */
const PART_NAMES = 'halves|thirds|fourths|fifths|sixths|eighths|tenths|twelfths';
/** Keeping the denominator when adding or taking away ("Keep sixths", "still eighths", "The denominator stays 6"). */
const KEEP = { term: 'keeping the denominator', pattern: /\bkeep\b|\bstill\b|\bstays?\b/i };

export const IDEAS: Record<string, LessonIdea[]> = {
  // 21 · Put parts together
  'compose-to-one': [
    {
      title: 'One whole is all of its same-size parts',
      learn: [
        { text: 'Check that the parts are the same size.', scene: scenes('compose-to-one').steps[0]! },
        example('compose-to-one', 'Count the parts to one whole'),
        { text: 'One whole has as many parts as the denominator says.', scene: scenes('compose-to-one').why },
      ],
      practice: [{ question: 'compose-to-one-q1' }, { question: 'compose-to-one-p1' }, { question: 'compose-to-one-p2' }],
    },
    {
      title: 'Add the numerators to put parts together',
      terms: [{ term: 'the + sign, adding and sums', pattern: /\+|\bsums?\b|\badd\b/i }],
      learn: [
        wordsToKnow('compose-to-one', ['+', 'sum', 'cup']),
        example('compose-to-one', '+ means put together'),
        { text: 'Add the numerators: 2 fifths and 3 fifths make 5 fifths.', scene: scenes('compose-to-one').steps[1]! },
      ],
      practice: [{ question: 'compose-to-one-q3' }, { question: 'compose-to-one-p3' }, { question: 'compose-to-one-q4' }],
    },
    {
      title: 'Find the part that fills one whole',
      terms: [{ term: 'the missing part', pattern: /\bmissing\b|\+ \?/i }],
      learn: [
        { text: 'When the numerator equals the denominator, you have one whole.', scene: scenes('compose-to-one').steps[2]! },
        example('compose-to-one', 'Find the missing part'),
      ],
      practice: [{ question: 'compose-to-one-q2' }, { question: 'compose-to-one-p4' }, { question: 'compose-to-one-p5' }],
    },
  ],

  // 22 · Break a fraction apart
  'decompose-fractions': [
    {
      title: 'Split the numerator, keep the denominator',
      learn: [
        { text: 'Keep the denominator: these parts are eighths.', scene: scenes('decompose-fractions').steps[0]! },
        { text: 'Split the numerator into smaller numbers: 5 is 2 and 3.', scene: scenes('decompose-fractions').steps[1]! },
        { text: 'Check that the parts add back to the start.', scene: scenes('decompose-fractions').steps[2]! },
      ],
      practice: [{ question: 'decompose-fractions-p1' }, { question: 'decompose-fractions-p2' }, { question: 'decompose-fractions-p3' }],
    },
    {
      title: 'There is more than one way to break it apart',
      terms: [{ term: 'another way, and unit fractions', pattern: /\banother way\b|\balso\b|\bunit fractions?\b/i }],
      learn: [
        { text: 'The parts stay the same size, so you can group them another way.', scene: scenes('decompose-fractions').why },
        example('decompose-fractions', 'Break it into unit fractions'),
      ],
      practice: [{ question: 'decompose-fractions-q1' }, { question: 'decompose-fractions-p4' }, { question: 'decompose-fractions-q3' }],
    },
    {
      title: 'Find the missing part',
      terms: [{ term: 'a missing number', pattern: /\bmissing\b|\?\/|\+ what\b/i }],
      learn: [example('decompose-fractions', 'Find the missing number')],
      practice: [{ question: 'decompose-fractions-q2' }, { question: 'decompose-fractions-p5' }, { question: 'decompose-fractions-q4' }],
    },
  ],

  // 23 · Wholes as fractions
  'whole-numbers-as-fractions': [
    {
      title: 'One whole is a full set of parts',
      learn: [
        { text: 'The denominator tells how many parts fill one whole.', scene: scenes('whole-numbers-as-fractions').steps[0]! },
        { text: 'Every whole is a full set of parts: 4 fourths fill one whole.', scene: scenes('whole-numbers-as-fractions').why },
      ],
      practice: [{ question: 'whole-numbers-as-fractions-p1' }, { question: 'whole-numbers-as-fractions-p2' }, { question: 'whole-numbers-as-fractions-p3' }],
    },
    {
      title: 'Count a full set of parts for each whole',
      terms: [{ term: 'more than one whole', pattern: /\b([2-9]|two|three|four) wholes\b|\bhow many wholes\b/i }],
      learn: [
        { text: 'Count 3 thirds for each whole.', scene: scenes('whole-numbers-as-fractions').steps[1]! },
        { text: 'Write the total parts on top: 6 thirds.', scene: scenes('whole-numbers-as-fractions').steps[2]! },
      ],
      practice: [{ question: 'whole-numbers-as-fractions-q1' }, { question: 'whole-numbers-as-fractions-q2' }, { question: 'whole-numbers-as-fractions-q3' }],
    },
    {
      title: 'A whole number can be written over 1',
      terms: [{ term: 'whole numbers, and a denominator of 1', pattern: /\bwhole numbers?\b|\b\d+\/1\b|\bdenominator of 1\b/i }],
      learn: [wordsToKnow('whole-numbers-as-fractions', ['whole number']), example('whole-numbers-as-fractions', 'Wholes with a denominator of 1')],
      practice: [{ question: 'whole-numbers-as-fractions-p4' }, { question: 'whole-numbers-as-fractions-p5' }, { question: 'whole-numbers-as-fractions-p6' }],
    },
  ],

  // 24 · More than one whole
  'improper-fractions': [
    {
      title: 'Some fractions have more parts than fit in one whole',
      learn: [
        { text: 'Compare the numerator with the denominator.', scene: scenes('improper-fractions').steps[0]! },
        example('improper-fractions', 'Less than, equal to or more than one whole'),
      ],
      practice: [{ question: 'improper-fractions-q4' }, { question: 'improper-fractions-p1' }, { question: 'improper-fractions-p2' }],
    },
    {
      title: 'Every full set of parts fills one more whole',
      terms: [{ term: 'counting wholes', pattern: /\b([2-9]|two|three) wholes\b|\bbetween \d and \d\b/i }],
      learn: [
        { text: 'Every time you count as many parts as the denominator, you fill one whole.', scene: scenes('improper-fractions').steps[1]! },
        example('improper-fractions', 'Count to 2 wholes'),
      ],
      practice: [{ question: 'improper-fractions-q3' }, { question: 'improper-fractions-p3' }, { question: 'improper-fractions-q2' }],
    },
    {
      title: 'Leftover parts start the next whole',
      terms: [{ term: 'parts past one whole', pattern: /\bpast one whole\b|\bleft over\b|\bnext whole\b/i }],
      learn: [
        { text: 'The leftover parts are the fraction part.', scene: scenes('improper-fractions').steps[2]! },
        { text: 'When there are more parts than fill one whole, the extra parts start the next whole.', scene: scenes('improper-fractions').why },
      ],
      practice: [{ question: 'improper-fractions-q1' }, { question: 'improper-fractions-p4' }, { question: 'improper-fractions-p5' }],
    },
  ],

  // 25 · Two ways to write it
  'mixed-improper': [
    {
      title: 'A mixed number is wholes and a fraction',
      learn: [wordsToKnow('mixed-improper', ['mixed number'])],
      practice: [{ question: 'mixed-improper-p1' }, { question: 'mixed-improper-p2' }, { question: 'mixed-improper-p3' }],
    },
    {
      title: 'Turn the wholes into parts',
      terms: [{ term: 'one fraction in parts', pattern: new RegExp(`\\bas (${PART_NAMES})\\b|\\bone fraction\\b`, 'i') }],
      learn: [
        { text: 'To write 2 1/3 as thirds, count 3 thirds for each whole.', scene: scenes('mixed-improper').steps[0]! },
        { text: 'Add the extra parts.', scene: scenes('mixed-improper').steps[1]! },
        { text: 'Keep the denominator.', scene: scenes('mixed-improper').steps[2]! },
      ],
      practice: [{ question: 'mixed-improper-q1' }, { question: 'mixed-improper-p4' }, { question: 'mixed-improper-q3' }],
    },
    {
      title: 'Turn the parts back into wholes',
      terms: [{ term: 'wholes and a fraction', pattern: /\bwholes and a fraction\b|\bis left\b/i }],
      learn: [
        { text: 'Each whole holds as many parts as the denominator.', scene: scenes('mixed-improper').why },
        example('mixed-improper', 'Turn parts back into wholes'),
      ],
      practice: [{ question: 'mixed-improper-q2' }, { question: 'mixed-improper-p5' }, { question: 'mixed-improper-q4' }],
    },
  ],

  // 26 · Add same-size parts
  'add-like-denominators': [
    {
      title: 'The same denominator means same-size parts',
      learn: [{ text: 'Check that the denominators match.', scene: scenes('add-like-denominators').steps[0]! }],
      practice: [{ question: 'add-like-denominators-p1' }, { question: 'add-like-denominators-p2' }, { question: 'add-like-denominators-p3' }],
    },
    {
      title: 'Add the numerators, keep the denominator',
      terms: [KEEP],
      learn: [
        { text: 'Add the numerators.', scene: scenes('add-like-denominators').steps[1]! },
        { text: 'Keep the denominator.', scene: scenes('add-like-denominators').steps[2]! },
        { text: 'The size of each part does not change.', scene: scenes('add-like-denominators').why },
      ],
      practice: [{ question: 'add-like-denominators-q1' }, { question: 'add-like-denominators-q2' }, { question: 'add-like-denominators-q4' }],
    },
    {
      title: 'Add amounts in a story',
      terms: [{ term: 'story amounts', pattern: /\bin all\b|\bhow (far|long)\b|\bmeters?\b|\bmiles?\b|\bcups?\b/i }],
      learn: [example('add-like-denominators', 'Add in a story')],
      practice: [{ question: 'add-like-denominators-q3' }, { question: 'add-like-denominators-p4' }, { question: 'add-like-denominators-p5' }],
    },
  ],

  // 27 · Take parts away
  'subtract-like-denominators': [
    {
      title: 'Take parts away',
      learn: [
        { text: '− means take away. Check that the denominators match.', scene: scenes('subtract-like-denominators').steps[0]! },
        { text: 'Take the parts away, then count what is left.', scene: scenes('subtract-like-denominators').steps[1]! },
      ],
      practice: [{ question: 'subtract-like-denominators-p1' }, { question: 'subtract-like-denominators-p2' }, { question: 'subtract-like-denominators-p3' }],
    },
    {
      title: 'Subtract the numerators, keep the denominator',
      terms: [KEEP],
      learn: [
        { text: 'Keep the denominator.', scene: scenes('subtract-like-denominators').steps[2]! },
        { text: 'Taking parts away changes how many parts, not how big each part is.', scene: scenes('subtract-like-denominators').why },
      ],
      practice: [{ question: 'subtract-like-denominators-q1' }, { question: 'subtract-like-denominators-q3' }, { question: 'subtract-like-denominators-q4' }],
    },
    {
      title: 'Take away in a story',
      terms: [{ term: 'story amounts', pattern: /\bjug\b|\bjar\b|\bpour\b|\bcut off\b|\bmeters?\b|\beats\b/i }],
      learn: [example('subtract-like-denominators', 'Take away in a story')],
      practice: [{ question: 'subtract-like-denominators-q2' }, { question: 'subtract-like-denominators-p4' }, { question: 'subtract-like-denominators-p5' }],
    },
  ],

  // 28 · Add mixed numbers
  'add-mixed-numbers': [
    {
      title: 'Add the wholes',
      learn: [{ text: 'Add the wholes first.', scene: scenes('add-mixed-numbers').steps[0]! }],
      practice: [{ question: 'add-mixed-numbers-p1' }, { question: 'add-mixed-numbers-p2' }, { question: 'add-mixed-numbers-p3' }],
    },
    {
      title: 'Add the fraction parts',
      terms: [{ term: 'adding the fraction parts', pattern: /\d\/\d+ \+ \d\/\d+|\bfraction parts?\b/i }],
      learn: [
        { text: 'Then add the fraction parts.', scene: scenes('add-mixed-numbers').steps[1]! },
        example('add-mixed-numbers', 'Wholes, then parts'),
      ],
      practice: [{ question: 'add-mixed-numbers-p4' }, { question: 'add-mixed-numbers-p5' }, { question: 'add-mixed-numbers-p6' }],
    },
    {
      title: 'If the parts make a whole, add one more whole',
      terms: [{ term: 'a new whole', pattern: /\bnew whole\b|\bmore whole\b/i }],
      learn: [
        { text: 'If the parts make a whole, add one more whole.', scene: scenes('add-mixed-numbers').steps[2]! },
        example('add-mixed-numbers', 'Parts that make a new whole'),
        { text: 'Wholes go with wholes, and parts go with parts.', scene: scenes('add-mixed-numbers').why },
      ],
      practice: [{ question: 'add-mixed-numbers-q1' }, { question: 'add-mixed-numbers-q2' }, { question: 'add-mixed-numbers-p7' }],
    },
  ],

  // 29 · Subtract mixed numbers
  'subtract-mixed-numbers': [
    {
      title: 'Take away the parts, then the wholes',
      learn: [example('subtract-mixed-numbers', 'Parts, then wholes')],
      practice: [{ question: 'subtract-mixed-numbers-p1' }, { question: 'subtract-mixed-numbers-p2' }, { question: 'subtract-mixed-numbers-p3' }],
    },
    {
      title: 'Check that there are enough parts',
      terms: [{ term: 'enough parts', pattern: /\benough\b/i }],
      learn: [{ text: 'Check that there are enough parts to take away.', scene: scenes('subtract-mixed-numbers').steps[0]! }],
      practice: [{ question: 'subtract-mixed-numbers-p4' }, { question: 'subtract-mixed-numbers-p5' }, { question: 'subtract-mixed-numbers-p6' }],
    },
    {
      title: 'Not enough parts? Trade one whole for parts',
      terms: [{ term: 'trading a whole', pattern: /\btrad(e|es|ed|ing)\b/i }],
      learn: [
        { text: 'If there are not enough parts, trade one whole for parts.', scene: scenes('subtract-mixed-numbers').steps[1]! },
        { text: 'Subtract the parts, then the wholes.', scene: scenes('subtract-mixed-numbers').steps[2]! },
        { text: 'One whole is a full set of parts, so trading never changes the amount.', scene: scenes('subtract-mixed-numbers').why },
      ],
      practice: [{ question: 'subtract-mixed-numbers-q1' }, { question: 'subtract-mixed-numbers-q3' }, { question: 'subtract-mixed-numbers-q4' }],
    },
  ],

  // 30 · Tenths as decimals
  'tenths-decimals': [
    {
      title: 'Ten equal parts are tenths',
      learn: [{ text: 'Find the tenths: count the colored parts of 10.', scene: scenes('tenths-decimals').steps[0]! }],
      practice: [{ question: 'tenths-decimals-p1' }, { question: 'tenths-decimals-p2' }, { question: 'tenths-decimals-p3' }],
    },
    {
      title: 'Write tenths as a decimal',
      terms: [{ term: 'decimals and the decimal point', pattern: /\bdecimals?\b|\d\.\d|\bpoint\b/i }],
      learn: [
        wordsToKnow('tenths-decimals', ['decimal', 'decimal point']),
        { text: 'Less than one whole? Write 0 and the decimal point.', scene: scenes('tenths-decimals').steps[1]! },
        { text: 'Write the tenths right after the point.', scene: scenes('tenths-decimals').steps[2]! },
      ],
      practice: [{ question: 'tenths-decimals-q1' }, { question: 'tenths-decimals-p4' }, { question: 'tenths-decimals-p5' }],
    },
    {
      title: 'Read a decimal as tenths',
      terms: [{ term: 'reading the tenths place', pattern: /\bcounts tenths\b|\bmeans\b|\bfirst place\b/i }],
      learn: [
        wordsToKnow('tenths-decimals', ['digit']),
        example('tenths-decimals', 'Read a decimal as tenths'),
        { text: 'The first place after the decimal point counts tenths.', scene: scenes('tenths-decimals').why },
      ],
      practice: [{ question: 'tenths-decimals-q2' }, { question: 'tenths-decimals-q3' }, { question: 'tenths-decimals-q4' }],
    },
  ],
};

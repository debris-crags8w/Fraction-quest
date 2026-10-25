/* Hand-checked answers for the idea questions of lessons 2–10 that no proof rule covers (see proof-key.ts for
   how entries work). Each answer was worked out by hand from the question and its picture. */
export const KEYS: Record<string, string> = {
  // fraction-names ("Fair parts and fraction names"): lesson 2 when these keys were written, lesson 1 now. The strip is drawn as 3 parts of 100/3 each: 3 equal
  // parts. 3 cuts across a bar make 3 + 1 = 4 parts (the bar is drawn as 4 parts of 25). The pizza is cut into 8 equal
  // slices (circle-eighths), so the denominator is 8. In 4/5 the top number 4 counts the parts taken. 3 of 8 equal
  // parts: 3 on top, 8 below.
  'This strip is cut into equal parts. How many equal parts make the whole?': '3',
  'This bar has 3 cuts. How many equal parts make the whole?': '4',
  'This pizza is cut into equal slices. What is the denominator?': '8',
  'In 4/5, what does the 4 mean?': '4 parts are counted',
  '3 out of 8 equal parts are shaded. What fraction is shaded?': '3/8',
  // Lesson 3 (unit-fractions). 1/4 + 1/4 + 1/4 + 1/4 = 4/4, one whole: 4 parts. 6 sixths make 6/6, one whole.
  // n friends sharing one whole fairly cut it into n equal parts and each gets 1 of them: 1/3, 1/2, 1/6.
  'How many 1/4 parts fill the whole bar?': '4',
  'How many sixths make one whole?': '6',
  '3 friends share a pizza fairly. What fraction does each friend get?': '1/3',
  '2 friends share a bar fairly. What fraction does each friend get?': '1/2',
  '6 friends share a cake fairly. What fraction of the cake does each friend get?': '1/6',
  // Lesson 4 (fraction-of-area). quarter-and-triangles: the small square is 1/4 of the big square, each triangle 1/8, so
  // not all parts are equal. fourths-unequal: rectangles of widths .65/.35 and heights .6/.4 cover .39, .21, .26 and
  // .14 of the square: not equal. fourths-triangles: 4 triangles from the center to each side, each 1/4: equal.
  'This square is cut into 1 small square and 6 triangles. Are all the parts equal in area?': 'No, the small square covers more',
  'This square is cut into 4 parts. Are the parts equal in area?': 'No, some parts cover more space',
  '4 triangles fill this square. Are they equal in area?': 'Yes, each covers the same space',
  // Lesson 5 (unit-size). Same-size bars: 1/3 > 1/8, so 1/3 leaves less of the bar empty and is closer to the whole bar.
  // 1/5 < 1/2, so 1/5 leaves more empty: 4/5 of the bar against 1/2. It is farther from one whole.
  'Which is closer to the whole bar: 1/3 or 1/8?': '1/3',
  'Which is farther from one whole: 1/2 or 1/5?': '1/5',
  // Lesson 7 (benchmark-half). Half of 6 parts is 3. Half of 4 is 2, so 2/4 is one half (1/4, 3/4 and 4/4 are not).
  // Each half of the cake holds 2 equal pieces, so the whole cake has 2 + 2 = 4. Half of 8 is 4, so 1 part less is 3/8.
  'A bar has 6 equal parts. How many parts make one half?': '3',
  'Which fraction is exactly one half?': '2/4',
  'Half of a cake is 2 equal pieces. How many equal pieces make the whole cake?': '4',
  'Use eighths. Which fraction is 1 part less than half?': '3/8',
  // Lesson 8 (benchmarks-zero-one). 1/6 is 1/6 from 0 and 1/3 from 1/2: near 0. 2/6 is 1/3 from 0 and 1/6 from 1/2:
  // near 1/2. 5/8 is 1/8 from 1/2 and 3/8 from 1: nearer 1/2. 5/6 is 1/3 from 1/2 and 1/6 from 1: nearer 1.
  // 4/5 is 1/5 from 1 and 3/10 from 1/2: near 1.
  'A worm is 1/6 of a meter long. Is that near 0, 1/2 or 1 meter?': '0 meters',
  'A ribbon is 2/6 of a meter long. Is that near 0, 1/2 or 1 meter?': '1/2 meter',
  'Is 5/8 nearer 1/2 or 1?': 'Nearer 1/2',
  'Is 5/6 nearer 1/2 or 1?': 'Nearer 1',
  'A snake is 4/5 of a meter long. Is that near 0, 1/2 or 1 meter?': '1 meter',
  // Lesson 9 (fraction-magnitude). 5/8 is 1/8 from 1/2, 3/8 from 1 and 5/8 from 0: closest to 1/2. 4/6 is 1/6 more than
  // 3/6, which is 1/2: a little more than 1/2.
  'A path is 5/8 of a mile. Is that closest to 0, 1/2 or 1 mile?': '1/2 mile',
  'Is 4/6 a little more or a little less than 1/2?': 'A little more than 1/2',
  // Lesson 10 (number-line-basics). The line is cut into 6 equal spaces (7 tick marks). 5 equal spaces: 1 jump is 1/5.
  // Spaces of 1/3 fill 0 to 1 in 3 spaces.
  'Count the spaces between the tick marks. How many equal spaces go from 0 to 1?': '6',
  'A line from 0 to 1 has 5 equal spaces. What fraction is 1 jump?': '1/5',
  'Each space from 0 to 1 is 1/3. How many equal spaces are there?': '3',
};

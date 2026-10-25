/* Hand-checked answers for the idea questions of lessons 11–20 that no proof rule covers (see proof-key.ts for
   how entries work). Each answer was worked out by hand from the question and its picture. */
export const KEYS: Record<string, string> = {
  // Lesson 11 (read the line). The picture is a 0-to-1 line cut into 6 spaces: 7 tick marks, 6 spaces.
  "How many equal spaces are there from 0 to 1?": "6 spaces",
  // 8 equal spaces from 0 to 1, so the denominator is 8.
  "This line has equal spaces from 0 to 1. What is the denominator?": "8",
  // 4 equal spaces make the whole: 1 space is 1 of 4, 1/4.
  "A line has 4 equal spaces from 0 to 1. What fraction is 1 space?": "1/4",
  // The point is at 3 of 5 spaces: 3 hops from 0.
  "How many jumps is it from 0 to the point?": "3 jumps",
  // The point is at 4 of 6 spaces: 4 jumps, so the numerator is 4.
  "Count the jumps from 0 to the point. What is the numerator?": "4",
  // The numerator counts the jumps from 0; the spaces from 0 to 1 are the denominator.
  "Which tells you the numerator?": "The jumps from 0 to the point",
  // Lesson 12 (past one). 3 thirds make 1 whole; 5 − 3 = 2 thirds are left: 1 and 2/3.
  "Each jump is 1/3. 5 jumps land at 5/3. Which is the same as 5/3?": "1 and 2/3",
  // Lesson 14 (line plots), on a line from 0 to 1 marked in fourths. 4 spaces of 1/4 inch reach 1: 4/4 inch = 1 inch.
  "Which length is the same as 1 inch?": "4/4 inch",
  "A ribbon is 4/4 inch long. Which tick shows its length?": "The tick at 1",
  // 3 spaces of 1/4 from 0: 1/4, 2/4, 3/4.
  "A leaf is 3/4 inch long. Which tick shows its length?": "The tick at 3/4",
  // One X per ribbon: 4 ribbons, 4 Xs.
  "Ribbons are 1/4, 2/4, 3/4 and 4/4 inch long. How many Xs go on the line plot?": "4",
  "A ribbon is 2/4 inch long. Where does its X go?": "Above 2/4",
  // Xs go above 1/4, 3/4 and 1 (4/4); of the choices 1/4, 2/4, 3/4 and 1, only 2/4 has none.
  "Leaves are 1/4, 3/4 and 4/4 inch long. Which of these ticks gets no X?": "2/4",
  // Lesson 15 (same denominators). Both denominators are 5 (fifths), so the parts are the same size.
  "Are the parts of 2/5 the same size as the parts of 4/5?": "Yes, both are fifths",
  // Both denominators are 8: eighths.
  "What size are the parts in 3/8 and in 5/8?": "Both are eighths",
  // Both are sixths: same-size parts (5/6 only has more of them).
  "Which has bigger parts, 1/6 or 5/6?": "The parts are the same size",
  // Lesson 17 (equivalent models). 3 thirds × 2 = 6 parts.
  "Cut each third into 2 equal parts. How many parts are there now?": "6",
  // 4 fourths × 2 = 8 equal parts: eighths.
  "Cut each fourth into 2 equal parts. What are the new parts called?": "eighths",
  // 2 eighths join into 1 fourth: 2/8 = 1/4.
  "Join every 2 eighths into 1 fourth. What is 2/8 in fourths?": "1/4",
  // 4 sixths, 2 at a time, make 2 thirds: 4/6 = 2/3.
  "Join every 2 sixths into 1 third. What is 4/6 in thirds?": "2/3",
  // 1/3 = 2/6, 2/4 = 4/8, 3/2 = 6/4 (each part cut into 2).
  "1/3 = ?/6. What number goes in the ? box?": "2",
  "2/4 = ?/8. What number goes in the ? box?": "4",
  "3/2 = ?/4. What number goes in the ? box?": "6",
  // Lesson 18 (line equivalence). 3 spaces × 2 = 6 spaces.
  "Cut every third into 2 equal spaces. How many spaces are from 0 to 1 now?": "6 spaces",
  // 4 × 2 = 8 spaces from 0 to 1: one is 1/8.
  "Cut every fourth into 2 equal spaces. What is 1 new space?": "1/8",
  // 2 × 2 = 4 spaces from 0 to 1: one is 1/4.
  "Cut every half into 2 equal spaces. What is 1 new space?": "1/4",
};

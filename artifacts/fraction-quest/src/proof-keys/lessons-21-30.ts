/* Hand-checked answers for the idea questions of lessons 21–30 that no proof rule covers (see proof-key.ts for
   how entries work). Each answer was worked out by hand from the question and its picture. */
export const KEYS: Record<string, string> = {
  // 21 · Put parts together: one whole is all its parts (8/8, 6/6); 4/4 − 1/4 = 3/4 is missing; the wall is 8/8, 8 − 5 = 3.
  "How many 1/8 parts make one whole?": "8 parts",
  "A bar is cut into 6 equal parts. Which fraction names the whole bar?": "6/6",
  "1/4 + ? = 1. What is the missing part?": "3/4",
  "5/8 of a wall is painted. What part is not painted yet?": "3/8",
  // 22 · Break a fraction apart: 3 + 4 = 7, both tenths; 2 + 3 = 5 (1/6 + 3/6 is 4/6, 2/6 + 4/6 is 6/6, thirds are not sixths); 4 − 1 = 3.
  "Is 3/10 + 4/10 a way to break apart 7/10?": "Yes, 3 + 4 = 7 and both are tenths",
  "1/6 + 4/6 makes 5/6. Which is another way to make 5/6?": "2/6 + 3/6",
  "Fill the blank: 4/5 = 1/5 + ?/5": "3",
  // 23 · Wholes as fractions: 6 sixths fill one whole; 8 of 8 parts is the whole bar; 5 uncut bars are 5/1 (5/5 is only 1).
  "How many sixths make one whole?": "6",
  "8/8 of a bar is shaded. How much of the bar is that?": "The whole bar",
  "Which fraction equals the whole number 5?": "5/1",
  // 24 · More than one whole: 5 > 4, so 5/4 is past 4/4; only 5/6 has fewer parts than 6/6; 6 + 6 = 12 sixths in 2 wholes.
  "Is 5/4 more than one whole?": "Yes, 5 parts, but only 4 fit in one whole",
  "Which is less than one whole?": "5/6",
  "How many sixths make 2 wholes?": "12",
  // 25 · Two ways to write it: 1 full bar of thirds and 2/3 more; 2 and 3/4 has 2 wholes; only 2 and 1/4 has a whole number and a fraction.
  "Each bar is one whole. Which mixed number is shaded?": "1 and 2/3",
  "How many wholes are in 2 and 3/4?": "2",
  "Which is a mixed number?": "2 and 1/4",
  // 26 · Add same-size parts: both are sixths; 5/8 is eighths like 3/8; thirds and fourths differ; 1 + 2 = 3 fourths of a cup.
  "Do 2/6 and 3/6 have the same size parts?": "Yes, both are sixths",
  "Which fraction has the same size parts as 3/8?": "5/8",
  "Can you add 1/3 + 1/4 by counting the parts?": "No, thirds and fourths are different sizes",
  "A cat eats 1/4 cup of food, then 2/4 cup more. How much in all?": "3/4 cup",
  // 27 · Take parts away: 5 − 2 = 3; 6 − 4 = 2; 4 − 1 = 3; 5 − 3 = 2 sixths of the pizza.
  "Start with 5/8. Take away 2/8. How many eighths are left?": "3",
  "Start with 6/10. Take away 4/10. How many tenths are left?": "2",
  "Start with 4/6. Take away 1/6. How many sixths are left?": "3",
  "Mia has 5/6 of a pizza. She eats 3/6. How much is left?": "2/6",
  // 28 · Add mixed numbers, the wholes only: 2 + 1 = 3; 1 + 2 = 3; 3 + 1 = 4.
  "2 1/4 + 1 2/4. Add the wholes. How many wholes is that?": "3",
  "1 1/6 + 2 4/6. Add the wholes. How many wholes is that?": "3",
  "3 1/5 + 1 1/5. Add the wholes. How many wholes is that?": "4",
  // 29 · Subtract mixed numbers, enough parts?: 1/6 < 4/6 (not enough); 5/8 > 2/8 (enough); 2/3 > 1/3 (enough).
  "2 1/6 − 1 4/6. Are there enough sixths to take away 4/6?": "No, there is only 1 sixth",
  "3 5/8 − 1 2/8. Are there enough eighths to take away 2/8?": "Yes, 5 eighths are more than 2 eighths",
  "3 2/3 − 1 1/3. Are there enough thirds to take away 1/3?": "Yes, 2 thirds are more than 1 third",
  // 30 · Tenths as decimals: 3 of 10 parts is 3/10; 10 tenths make one whole; 10 − 9 = 1 part not colored, 1/10; 6 tenths is 0.6.
  "A strip has 10 equal parts. 3 are colored. What fraction is colored?": "3/10",
  "How many tenths make one whole?": "10",
  "A strip has 10 equal parts. 9 are colored. What fraction is not colored?": "1/10",
  "A strip has 10 equal parts. 6 are colored. Write the colored part as a decimal.": "0.6",
};

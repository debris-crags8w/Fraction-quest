---
name: QA audit handoff
description: State of the arithmetic/design/pedagogy QA audit — findings, fixes made, and what is still open.
---

The user asked for an unbiased QA pass ("arithmetic, design, pedagogy; be thorough; iterate").
Fixes were first written against commit c9a121c, then re-applied on top of the user's 51-mission work (7bde269).

**Findings (severity → issue):**
- Critical: number-line builder capped at 12 spaces, so any target with a bigger bottom number (hundredths build/review: 25/100, 8/100) can never be built → the lesson gate can't be passed. Fix: line max = max(12, target denominator).
- High: review ("Show it again") prompts reused worksheet text, giving "Type it. Show your answer two ways." / "Enter the total distance…" for a build task, and reused picture questions ("What fraction is at the dot?") with no picture. Fix: skip picture/symbol/decimal/order items, strip "Type it", end with "Build the answer two ways."; fall back to "Make X two ways."
- High: correct reason was always option 2 (build) / option 3 (transfer) → guessable. Fix: deterministic per-lesson position (arrangeReasons).
- High: degenerate worksheet items ("How many copies of 1/3 make 1/3?", "1/6 + ? = 1/6 → 0/6").
- Medium: misleading worksheet pictures (picture of the wrong fraction in compare questions; 6/10 shown for "1/10 below half").
- Medium: out-of-range denominators (1/11, 1/13, 1/14, 1/15 "15ths", 1/16, ?/30) in worksheets and the generator; "Half of 11 is 5.5" hint.
- Medium: lessons in one family printed identical worksheets (equal-parts=unit-fractions, the three equivalence lessons, improper=mixed, benchmark-half=fraction-magnitude, unit-size=compare-same-numerator).
- Medium: ordering items sometimes shown already in the asked order.
- Low: generator "simpler" help picture was always a 1/2 bar; equation pictures just repeat the question; awkward wording ("Join another 1/5 meter", "garden bed has 6/10 of a meter", "Times the top and bottom").

**Still open / to discuss:** 3-star threshold now counts extra bank questions; challenge walk-throughs not printed; no password reset; COPPA review; grade-4 multiply-fraction-by-whole content; parent view.

**How to apply:** regression tests live in game.test.ts under "quality audit fixes". Patch of the original fixes: see git history of this file's commit.

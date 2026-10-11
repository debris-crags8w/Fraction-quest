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

**Done (commits 9c0e023, e9189bc, 9117712):** all findings above fixed, plus:
- Commit 4d365aa (51 missions) had been built on an older App.tsx and unhooked Unit challenges, paper folding, Practice more/New questions, Print + Check my paper, story walk-throughs, stacked fractions and the sign-out chip, and brought back the long wording. User chose "Restore all": all wired back in, user's new work kept (LearningText read-aloud + vocab, QuickReviewEntry, whole/part bar labels, bar-copy worksheets, FractionEntry, staged checks).
- The 24 later lessons (units 9–14): template hints ("Use the … idea"), a wrong build target (1 1/4 + 2 1/2 → 5/4), rounded percents/decimals, "0 7/10" answers, 0/4 story answers, duplicate questions. Their practice and worksheets now come from one corrected generator (getExtensionWorksheet + problemQuestion).
- Units 9–14 have no Unit challenge: Check my paper / answer key / print menu crashed for them; now guarded.
- Story lines CSS squashed text (.fq-story li span → li > span:first-child).

**Later (799c9fa, ff2a75b):** units 9–14 got Unit challenges and real random-number practice recipes; units 9–14 labeled grade 5. Parent view added (ParentView.tsx + parent-report.ts; minutes/answers per day in fun.activity).

**Games + audit items (8870c40 → latest):** Fraction Race (robot/2-player; wrong answer = stall + back one space so guessing can't win) and a 3-level code challenge (blocks + Python view) on every lesson; new lesson add-tenths-hundredths (unit 8, LATE_ADDED_LESSONS so it doesn't re-lock units 9–14); right answers spread across A/B/C; typed-answer level quiz (progress.placement opens units without marking lessons done); unit 9–14 challenge scores now survive reload.

**Still open / to discuss (parent audit):** parent password reset; privacy/consent page; circle models; tiny stray dotted part-marker beside the printed example bar; 3-star threshold now counts extra bank questions; challenge walk-throughs not printed; no password reset; COPPA review; grade-4 multiply-fraction-by-whole content; parent view.

**How to apply:** regression tests live in game.test.ts under "quality audit fixes". Patch of the original fixes: see git history of this file's commit.

## Equal-parts questioning redesign (after 6c4e6a6)
- User asked: "When talking about equal parts, why should it be shaded?" Shading now appears only when it marks the part being named.
- WorksheetProblem has `task?: BarTask` ({kind:'copy'|'count'|'shade', n}); WorksheetBarCopy shows mode-specific instructions; `barTaskDone` checks count (all parts tapped, numbered 1..d) / shade (exactly n, any position) / copy (exact).
- equal-parts: count parts, "Is this cut into equal parts? yes/no" (form 'word', unequal `sizes` bars), name the shaded part (copy), shade 1 part then name it. unit-fractions: count 1/d pieces, shade one share, name.
- BarSvg takes `sizes` (unequal pieces, neutral aria label). Count/shade rows hide the duplicate Preview picture.
- `paperPrompt(problem, typed?)`: "Tap each part to count it." → "Count each part."; on paper "Type" → "Write".
- Print cut-off fix: print cards (.fq-print-problems > li) are inline-grid, 2 per row (1 per row under 150mm page width) so they never slice across pages; print svgs max-width 100%, figure/fold widths min(…,100%), header wraps, body min-width 0 in print. Checked Letter, A5, 3.5in pages for every print mode.

# Curriculum Audit: Zero-Presupposition & Logical Order

Audit of the full course (85 lessons, 15 units in `LESSON_PLAN`, `artifacts/fraction-quest/src/game.ts`) against one rule: **a student must never be asked to use a concept, term, symbol, or representation until the course has explicitly taught it first.** A new student is assumed to know nothing about fractions — including the words "half"/"thirds", the `a/b` notation, numerator/denominator, and what a number line is. Allowed priors: counting, shapes, everyday sharing/fairness language.

This document lists **issues only**. No code changes are included.

## Summary

- The backbone order (Units 6–15) is sound: after the foundational sequence, concepts are taught before use.
- All violations are concentrated in the **opening (Units 1–5)** and in a few **Unit 11–12 Teach-first intros** that use division before it is taught.
- Total: **11 violations (8 HIGH, 3 MEDIUM)**.

Two root causes:

1. **The global IntroSteps front-load untaught material.** Before Lesson 1 begins, every new user sees demos that name "three fourths," shade `3/4`, and hop on a number line — none of which are explained until Lesson 2 (`fraction-names`) and Unit 4 (`number-line-basics`).
2. **Part names ("halves/thirds/fourths") are never taught by any lesson's Teach-first.** They appear only on the pre-Lesson-1 Words screen (`intro-copy.ts:82`), then are used in questions across Units 1–4.

## Issues

| # | Severity | Location | Exact text | Presupposes | Taught earlier? | Suggested smallest fix |
|---|----------|----------|-----------|-------------|-----------------|------------------------|
| 1 | HIGH | `src/intro-copy.ts:9–24` (IntroSteps, pre-Lesson-1) | "That is three fourths." / "You land on three fourths." | part names, `a/b` notation, number line | never before this point | Defer the number-line Watch/Try to Unit 4 (`number-line-basics`); keep only the bar builder in Lesson 1 |
| 2 | HIGH | `src/game.ts:465` (equal-parts Q1) | "Is this strip cut into thirds?" | part names | only the Words screen, not a lesson | Reword to "3 equal parts?" or teach part names in `equal-parts` Teach-first |
| 3 | HIGH | `src/game.ts:466–468` (equal-parts) | choices `1/3`, `1/4`, `4/1` | `a/b` notation | Lesson 2 (`fraction-names`) | Move these questions into `fraction-names`, or teach notation first |
| 4 | HIGH | systemic — part names | "halves/thirds/fourths/sixths/eighths" across Units 1–4 | part-name vocabulary | only `intro-copy.ts:82`, not a lesson | Add a name rule to `equal-parts` Teach-first: "2 parts are halves, 3 are thirds…" |
| 5 | HIGH | `src/game.ts:594,601` (number-line-basics) | "for thirds?", "Fourths need 4 spaces" | part names | see #4 | Use "a denominator of 3" / "4 spaces" instead of names |
| 6 | MEDIUM | `src/game.ts:625,631` (number-line-beyond-one) | "7/4, or 1 and 3/4" | mixed-number notation | Unit 7 (`mixed-improper`) | Add a mixed-number gloss to this lesson's Teach-first |
| 7 | HIGH | `src/lesson-intros.ts:187` (fraction-of-quantity, U11) | "Divide the number by the denominator." | division | U12 L8 (`fraction-as-division`) — comes after | "Split the number into equal groups using the denominator." |
| 8 | HIGH | `src/lesson-intros.ts:206` (fraction-of-length, U12 L1) | "Find one part: 12 ÷ 4 = 3 meters." | `÷` notation | U12 L8 — 7 lessons later | "Split the length into 4 equal parts. Each part is 3 meters." |
| 9 | HIGH | `src/lesson-intros.ts:218` (fractional-unit-conversions, U12 L5) | "Divide by the denominator to find one part." | division | U12 L8 — 3 lessons later | "Split into equal parts using the denominator. Find one part." |
| 10 | MEDIUM | `src/lesson-intros.ts:212` (line-plot-leveling, U12 L3) | "Divide the total by the number of cups." | division | U12 L8 — 5 lessons later | "Share the total into equal parts, one for each cup." |
| 11 | MEDIUM | `src/intro-copy.ts:17–24` (line Watch/Try pre-Lesson-1) | number-line demo + "land on three fourths" | number line | U4 (`number-line-basics`) | Same fix as #1 (defer the line intro) |

## Confirmed clean

- **Units 6–10 (34 lessons):** no violations. Equivalence, decimals, "simplest form," "common denominator," "mixed number," and fraction multiplication are each taught before use, in correct sequence.
- **Units 11–15:** clean except the four division-notation intros above (#7–#10).
- **Units 1–5:** clean except as listed; notably `compare-same-numerator` correctly teaches `>`/`<` before its questions use them.

## Recommended fix order (no course reordering required)

1. Defer the number-line intro out of the pre-Lesson-1 IntroSteps; show it at `number-line-basics` (fixes #1, #11).
2. Teach part names in `equal-parts`' Teach-first (fixes #2, #4, #5).
3. Reword or relocate `equal-parts`' `a/b`-notation questions (fixes #3).
4. Add a mixed-number gloss to `number-line-beyond-one` (fixes #6).
5. Reword the four division-before-taught intros in Units 11–12 to "split into equal parts" language (fixes #7–#10).

Optional: swap Lesson 1 ↔ Lesson 2 (`fraction-names` before `equal-parts`) so notation precedes its use — not required if fixes #2–#4 are applied.

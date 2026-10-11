---
name: QA audit handoff
description: Current state of Fraction Quest work — how to build/verify, feature map, recent changes, open items, and the next proposed step (Part Finder game).
---

Fraction Quest: fractions app for ages 8–10 (units 1–8 grade 3–4, units 9–14 grade 5). The user wants short kid-friendly
wording, repetition, printables, model-centred learning, and everything pushed to `main`. The latest upstream state includes
the square area model and the Part Finder proposal; local review changes should be merged only after checking current `main`.

## How to work
- pnpm monorepo. App: `artifacts/fraction-quest`. A root `src/` mirror must be kept identical: copy every changed/new file
  from `artifacts/fraction-quest/src/` to `src/` before committing (`diff -rq artifacts/fraction-quest/src src`; only the
  app-only folders components/, hooks/, pages/, main.tsx, lib/utils.ts should differ).
- Typecheck: `pnpm run typecheck`. Tests (82 passing): `cd artifacts/fraction-quest && npm exec --yes --package=tsx@4.19.2 -- tsx --test src/game.test.ts src/account-flow.test.ts`.
- Build: from `artifacts/fraction-quest`, run `PORT=5173 BASE_PATH=/ pnpm run build`. Preview: `PORT=5173 BASE_PATH=/ npx vite preview --config vite.config.ts --port 5173 --strictPort`.
  Stop it with `pkill -f "[v]ite preview"` in its own Bash call (the command text kills its own shell otherwise).
- Browser checks: Playwright via `require('/opt/node22/lib/node_modules/playwright')`, Chromium preinstalled. localStorage keys:
  `fraction-quest-guest`='1', `fraction-quest-progress-v1` (progress JSON), `fraction-quest-fun-v1`. Map lessons open with
  `button-node-<id>` (check `aria-expanded`, click with force: the "now" node animates); then `button-check-paper-<id>`,
  `button-print-menu-<id>` → `button-print-<lesson|practice|generated|blank|answers|challenge|key>`; worksheet rows are
  `row-worksheet-wN`. Tap triangle pieces at their centroid (bounding-box centre can hit a neighbour). PDFs: `page.pdf`, then `pdftoppm`.
- Before pushing: `git fetch origin main` and check `git log HEAD..origin/main`; merge the user's commits and keep their features.
- Commit trailers: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GDdvRh7YMa3ShSaQPV4zPS`.
- Design rules from the user: see [learning design requirements](learning-design-requirements.md) (entered answers as evidence
  gates, model interaction central, no faked completions, bar models with WHOLE/PART labels, LearningText vocab + read-aloud).

## Feature map (where things live)
- 52 lessons (`MISSIONS` in game.ts): units 1–8 have 28 (unit 8 has 6 incl. add-tenths-hundredths), units 9–14 have 4 each.
- Worksheets: `getWorksheet` in learning-content.ts (12 rows per lesson; extension units use `getExtensionWorksheet`).
  Rows can carry `model` (bar/set/line, bar `sizes` for unequal pieces), `task` (bar copy/count/shade), `area`/`areaTask`
  (square model), `form` (decimal/mixed/ordered/symbol/word=yes-no). `paperPrompt()` rewrites Tap/Type for paper.
- Interactive worksheet pieces: WorksheetBarCopy.tsx (`barTaskDone`), AreaModel.tsx (`AreaShade`), LearningLab.tsx `Row`.
- Practice question generator: practice-bank.ts (RECIPES + LATER_RECIPES; `spreadAnswer` keeps A/B/C balanced).
- Printables.tsx: lesson, practice, new practice, worksheet (+ "Color it two ways" on lessons 1–2), answers, unit challenge, key.
  (PrintWorksheet.tsx is not imported anywhere; it's kept only in sync for types.)
- Games: FractionRace.tsx (robot/2-player; wrong answer stalls and moves back, shield on streak), CodeQuest.tsx + code-quest.ts
  (3 block-coding levels per lesson, Python view), CodeSprint.tsx (5-round coding race). Unit challenges: challenges.ts.
- Parent view: ParentView.tsx + parent-report.ts (grown-up gate, minutes/answers per day from lib/fun.ts activity).
- Level quiz: PlacementQuiz.tsx + placement.ts (`progress.placement` opens units without marking lessons done).
- Unlocking: `isMissionUnlocked` / `passedLesson` / `getNextMission` in game.ts. `LATE_ADDED_LESSONS` stops a newly inserted
  unit 1–8 lesson from re-locking units 9–14.

## Recent work (this session, newest first)
- **Pricing decided (on hold, not built):** iOS = free trial with unit 1 free, units 2–14 unlocked by a monthly subscription (StoreKit 2, no third-party SDK, no lifetime option). Details in docs/ios-app.md on branch ios-local-icloud. Wait for the user's go-ahead.
- **iOS app with on-device saving + iCloud (branch `ios-local-icloud`, NOT merged; see docs/ios-app.md).** User chose no
  accounts for now. Capacitor 8.5.2 iOS project (SPM) in artifacts/fraction-quest/ios; ICloudSync.swift plugin
  (NSUbiquitousKeyValueStore) + App.entitlements; src/lib/native.ts restores Preferences → localStorage and merges iCloud
  before render, mirrors every fraction-quest-* write (patched Storage.setItem), pushes to iCloud after merging. Child
  profiles (lib/profiles.ts, Family.tsx; first child id 'main' on every device; tombstones for removed children), merge
  rules (lib/merge.ts), backup/restore in the grown-ups page. iOS never shows sign-in. parseProgress/parseFun split out of
  loadProgress/loadFun. Swift/Xcode NOT compiled here — first step on a Mac. Still needed: icon, native print, parental
  gate on footer links, privacy policy, App Store Connect.
- **Curriculum gap analysis → `docs/curriculum-gap-analysis.md`.** Standards coverage (CCSS 3–5 incl. 3.MD.4, 3.G.2,
  4.MD.2/4, 5.MD.1/2), comparison with Big Ideas MRL / Eureka / Illustrative Math, every recommended change (P0–P2),
  games catalog, brain breaks spec, 5-phase roadmap. Biggest P0 gaps: line plots + rulers, circle/area models, compare
  decimals, whole numbers as fractions, general add-unlike + unlike mixed numbers, scaling, mixed-number ×, unit
  fraction ÷ whole, unit tests/benchmarks reported by standard, exit tickets, explain/error-analysis tasks, parent/teacher
  lesson guide, brain breaks, privacy/consent + password reset. `.gitignore` now blocks env files, keys, credentials,
  DB dumps, logs and test artifacts (attached_assets/ is NOT ignored: vite.config uses it).
- **Redo a finished part.** Map node of a finished lesson → "Redo a part" (opens the lab); the lab shows "Do it again"
  with Redo builds / Redo worksheet → RedoLab (LearningLab.tsx). Data: LearningRecord.redo (RedoAttempt: part, round,
  worksheet, checks, rowRounds, finishedAt) + redoRounds/redosFinished, sanitized by readRedo in game.ts. Kept apart from
  the lesson's own answers: completion, unlocks, stars, misconceptions and parent-report first-try results never change.
  New numbers: getWorksheet(id, variant) — variant 0 = the lesson sheet; variants shift the number tables (intro lessons'
  period-5 list uses shift 1–4), and rows that exceed the lesson's largest denominator or match the original fall back to
  other variants. Redo builds use getReviewCheck targets not already built (redoChecks). "New question" on a correct redo
  row swaps it (rowRounds). Tests: "redo a finished part" in game.test.ts.
- **Merged `review/coding-challenge-progression` into main (359a5c7).** Brought in Part Finder (PartFinder.tsx,
  part-finder.ts; lessons equal-parts/unit-fractions/equivalent-models; best score in fun.partFinderBest), daily practice
  (DailyPractice.tsx, daily-practice.ts, progress.dailyPractice), 6 coding levels + robot hints (getRunHint), and the
  grown-ups voice chooser (LearningVoicePicker in ParentView; fun.preferredLearningVoiceId syncs). Read-aloud =
  LearningText's createLearningSpeechController (waits for voices) + lib/voice.ts helpers (gentle scoring, "three fourths",
  one utterance per sentence, VOICE_RATE 0.88 / VOICE_PITCH 1.1). A saved voice choice always wins.
  Fix after merge: daily practice never picks locked lessons (worked-on lessons first, filler only from unlocked ones;
  a new learner repeats lesson 1 with different fractions via BEGINNER_FRACTIONS); "1 part is shaded" grammar.
  Part Finder teaching notes not yet acted on: "Tile the whole" uses an all-equal square (just counting) and shows the
  answer picture; round 1 duplicates a lesson-2 worksheet task; wrong answers show a generic message although
  partFinderFeedback has better hints.
- **Read-aloud voice (lib/voice.ts).** User found the voice robotic and asked for a gentle woman's voice. `pickVoice` scores
  English voices: warm female names (Ava, Samantha, Allison, Edge Natural Jenny/Aria/Ana, Google US English, Android sfg/tpf…)
  plus natural/neural/enhanced quality; avoids men's and novelty voices. Rate 0.88, pitch 1.1, one utterance per sentence
  (pauses; avoids Chrome's long-utterance cut-off). `spokenText`: "3/4" → "three fourths", "1 2/3" → "1 and two thirds",
  "?/4" → "how many fourths", < = > in words, % → percent. LearningText's Listen button uses `speak`/`stopSpeaking`.
  Actual voice depends on the device; no voice picker yet.
- **a80450c Square model: equal parts can have different shapes.** area-shapes.ts (AREA_CUTS incl. the user's
  quarter-and-triangles square, pieceArea, areaTaskDone — any correct coloring counts, `avoid` forbids pieces). Rows:
  equal-parts w9–w12 (are these fourths? yes/no with mixed shapes and an off-centre cut; triangles per small square),
  unit-fractions w10–w12 (color 1/4 any way; only triangles → 2; shaded triangle is 1/4), equivalent-models w11–w12
  (2/8 = ?/4; color 1/2 → 4 eighths). "Same size, different shapes" card in lessons 1–2 (app + printed lesson).
  Placement skips areaTask rows; review skips area rows.
  Also: `passedLesson` — a lesson completed before its questions were revised (completedAt set) no longer re-locks later
  lessons or pulls Continue back; `staleDraft` clears saved answers that can't fit a revised question.
- **fc6c26c Print cut-off fix.** Print cards are inline-grid (never sliced across pages), 2 per row, 1 per row under 150mm;
  svgs max-width 100%; header wraps; body min-width 0 in print. Checked Letter, A5, 3.5in for every print mode.
- **5eaab65 Equal-parts questioning.** User: "When talking about equal parts, why should it be shaded?" Shading only marks a part
  being named; otherwise kids tap-count parts (numbered), judge equal/unequal bars (yes/no), or shade parts themselves.
- **6c4e6a6 and before:** Code Sprint; race rebalance (guessing can't win); pictures never show the answer; level quiz;
  add-tenths-hundredths lesson; A/B/C balance; Fraction Race + code challenge per lesson; parent view; units 9–14
  challenges and recipes; full QA audit fixes (number-line cap, review prompts, guessable reasons, degenerate items,
  out-of-range denominators, duplicate family worksheets) with regression tests under "quality audit fixes" in game.test.ts.

## Part Finder (proposed and queued)
User asked: "Do you have a lesson showing students how to FIND the parts? Might be a useful game to add early in
introducing equivalent fractions." Answer given: no — kids make parts (fold, split, shade) and judge them, but never find the
equal parts hidden in a messy shape. Proposed **Part Finder** game (game card on equal-parts, unit-fractions,
equivalent-models; stars/best score like the other games), suggested build order rounds 1, 2, 4 first:
1. Group them: uneven pieces (like the 7-piece square); tap pieces into 4 colored groups that are each 1/4 (any valid grouping).
2. How many fit? One piece highlighted; tile copies across the whole and count (→ it is 1/8).
3. Cut it: draw dot-to-dot lines to make equal parts; several correct answers (hardest on touch screens).
4. Same whole, new parts: find fourths, then eighths in the same square → 1/4 = 2/8.
Can reuse area-shapes.ts (pieceArea, AREA_CUTS) and AreaSvg/AreaShade patterns; group validation = each group's area = 1/k.
The user approved the idea. It is queued but not assigned; wait for task assignment before implementing it.

## Still open
- Parent password reset is not applicable yet: there is no parent account. Student account recovery is tracked separately.
  Privacy/consent and COPPA still need a careful data-handling review; the current username/display-name signup diverges
  from the user's chosen educator-report setup: class codes, no student names, progress saved online. Do not claim legal
  compliance based on code review alone.
- Circle models are not implemented; current model kinds are bars, number lines and sets, with square area models added
  for worksheets and print.
- Whole-number times a fraction exists in the Unit 11 grade-5 extension, but not in the grade-4 path.
- Square model is only on worksheets/prints, not in practice questions or Fraction Race.
- The printed lesson sheet for lessons 1–2 is now 2 pages after adding shape-comparison activities. Keep the models
  readable rather than shrinking them without a specific one-page requirement.
- Screen readers hear yes/no bars as “a bar cut into N pieces” (deliberately neutral so the description does not give
  away whether the parts are equal).
- The Part Finder proposal is queued; wait for task assignment before implementing it.

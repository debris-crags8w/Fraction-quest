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
- **Natural voice (Kokoro, option A) + bar labels (main):** src/lib/natural-voice.ts loads kokoro-js lazily (q8, wasm,
  model from huggingface.co, ~90 MB once; ort wasm is bundled into dist). Default voice af_heart; 'off' or another voice
  saved in localStorage 'fraction-quest-natural-voice'; grown-ups' NaturalVoiceSettings in LearningText.tsx.
  createLearningSpeechController takes a NaturalReader: uses it when ready (English), else warmUp() + device voice; falls
  back to the device voice if a natural reading fails. Could NOT test real audio here (huggingface.co blocked by the
  sandbox proxy); needs a listen on a real device. Bar labels: FractionValue.named via nameBars(model, prompt) (exact
  n/d match); ModelView `reveal` after a correct answer; BarSvg `fraction` prop. Daily Practice number line: ticks +
  one landing dot (was a circle mid-space with a stray tick).
- **Models everywhere + whole bracket + grade-4 multiply (main):** user wants a visual on EVERY question/answer and
  shaded compare models (reverted last round's unshaded compare pictures). src/auto-picture.ts (amountsIn/autoPicture +
  story pictures) feeds worksheet `picture` (getWorksheet tag), practice() equation → bars, problemPicture fallback (also
  area rows, ruler → line). Test "every question has a picture". Bars use WholeBracket / SvgWholeBracket (models.tsx)
  labelled "1 whole" instead of WHOLE/PART tags. unit-fraction-multiples + multiply-whole-by-fraction moved to the end of
  unit 8 (LATE_ADDED; isMissionUnlocked now also skips LATE_ADDED inside units 1–8 for learners already in unit 9+).
  Check-in AreaShade/Ruler/LinePlot take `checkIn` (neutral status, ready on any input, correctness reported separately).
  Voice: user asked for a more natural voice; options offered, nothing built yet.
- **Give-away audit + same-numerator coverage (main):** ConceptGames War/NumberLine start unchosen (d=0) and offer every
  split; WAR_ROUNDS/warHint in concept-games.ts. practice-bank: `either()` random naming order, `compareBars()` unshaded
  compare pictures (shaded = simpler help), compare-unlike ~1/4 same-numerator pairs. game.ts `practice()` turns shaded
  multi-bar compare/equivalence pictures into unshaded ones (SHOWS_ANSWER regex). FractionBar `quiet` aria for hideLabels.
  LearningLab validate() live status no longer states target numbers. DailyPractice: items have kind 'choice' (lesson's
  practice-bank question via seed, `dailyChoiceQuestion`) or 'build' (child picks parts 2–12, `dailyBuildCorrect` accepts
  equivalents); old saves load as builds. Assessment: read-only pictures (ReadOnlyPicture/ReadOnlyArea), worksheet bar
  tasks as in the lesson, strips start uncut; onReady(ready, correct) records correctness separately from opening the box.
  compare-same-numerator worksheet uses numerators 2..(small−1) with symbol rows and its own transfer (2/3 vs 2/5).
  docs/curriculum-gap-analysis.md has a status update at the top.
- **Native printing + lesson count on main (iOS conversion itself postponed; user may redo it):** all printing goes through
  `printPage()` (src/lib/print.ts; uses `@capacitor/core` 8.5.2, the only Capacitor package on main). Web = window.print();
  in a Capacitor app it calls the `Printing` plugin, then fires 'afterprint'. The Swift plugin and wiring steps are in
  artifacts/fraction-quest/native/ios/ (no ios/ project on main). `courseCounts(freeUnits)` in game.ts gives lesson/unit
  counts (68 lessons; 65 locked over 13 units with unit 1 free). ios-local-icloud still has its own copies.
- **"1-5 + lesson count + native printing" batch (main unless noted):**
  - Account deletion: DELETE /api/privacy/account (password required; all tables cascade), OpenAPI + codegen, grown-ups
    danger card in FamilyControls (`button-delete-account`). Verified end to end against a temp Postgres.
  - Circle models: area-shapes.ts has circle halves/thirds/fourths/sixths/eighths + `circle-unequal` (wedges()),
    `areaWhole(cut)`, `circleCut(d)`. Used in equal-parts row 8 (unfair pizza; fair on odd redos), unit-fractions row 9
    (one slice), fraction-names row 12 (shaded circle), the area lesson (7 shapes so redo rounds differ). Print tag names
    the whole ("Circle model").
  - Part Finder: round 1 is now "Make 4 fair shares" (mode 'sort': every piece goes in one of 4 colored shares; answer is
    an assignment array), tiling uses the mixed quarter-and-triangles square (4 or 8 copies) and only shows the filled
    picture after the right count; all wrong answers use partFinderFeedback hints.
  - New ModelSpec kind 'area' {cut, shaded}: practice-bank equal-parts / unit-fractions / fraction-of-area questions show
    squares, pizzas, hexagons, grids, so Fraction Race shows them too. Tests check answers from shadedArea/allEqual.
  - Redo mistakes: `checkRedoRow` stores misses in `LearningRecord.redoMisconceptions` (kept apart from first-try
    results); parent report's Worth practicing adds them and shows "(n in redos)". Sanitized in readRedo.
  - Printed lesson page: hid `.fq-model-pair-guide` in print (it was the stray mark under the example bar).
  - Already fixed by the user before this batch: 3-star threshold (countsTowardLessonStars) and challenge walk-throughs in
    the answer key.
  - **ios-local-icloud only (not merged):** Printing plugin (ios/App/App/Printing.swift, pbxproj ids …06/…07, registered
    in AppViewController) + `printPage()` in src/lib/print.ts (fires 'afterprint' after the native sheet); the paywall's
    unit/lesson counts are computed from MISSIONS (49 on the branch, 65 once main's 68 lessons arrive).
- **Merged review/fraction-standard-mastery into main** (user's branch: 68 lessons covering all 36 grade 3–5 standards,
  standard catalog + assessments, teaching guides/pacing, concept games, brain breaks, display options, family privacy/
  classrooms). Fix before merging: the 16 new lessons are in LATE_ADDED_LESSONS (game.ts, now exported) so learners who had
  already started units 9–14 aren't re-locked (a 51-lesson saved learner had 20 finished lessons locked); test in
  game.test.ts "new tenths + hundredths lesson". Root src/ mirror re-synced. Typecheck tip: run `pnpm run typecheck` at the
  repo root (it builds lib/ first); inside the app folder it fails in a fresh checkout. e2e: `CHROMIUM_PATH=/opt/pw-browsers/
  chromium-1194/chrome-linux/chrome CI=1 npx playwright test` in artifacts/fraction-quest. iOS work stays on ios-local-icloud
  (not merged; conflicts with this in App.tsx/ParentView/game.ts/fun.ts; two profile systems to reconcile; paywall says 49
  lessons, should be 65).
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

## Still open
- **Password reset:** waiting on the user's choice: (a) parent email link, (b) printed recovery code, (c) parent/teacher
  resets from their page. Nothing built yet.
- **Privacy policy page:** needs company name, contact email and country/state from the user. PRIVACY_POLICY_URL is ''
  on the iOS branch. COPPA still needs a careful data-handling review; don't claim legal compliance from code review alone.
- Whole-number times a fraction exists in the Unit 11 grade-5 extension, but not in the grade-4 path.
- The printed lesson sheet for lessons 1–2 is 2 pages (shape activities). Keep models readable over a one-page squeeze.
- Screen readers hear yes/no bars as "a bar cut into N pieces" (neutral on purpose so it doesn't give the answer away).
- iOS branch: two profile systems (main's server learner profiles vs the branch's local profiles) need reconciling before
  any merge; the branch conflicts with main in App.tsx, ParentView.tsx, game.ts, lib/fun.ts, package.json and the lockfile.
  The branch's merge.ts/native sanitizers don't know `redoMisconceptions` (new on main) yet; carry it through when merging.

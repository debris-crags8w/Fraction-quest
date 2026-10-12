# Fraction Quest: curriculum gap analysis and roadmap

*Written 2026-10-11 against `main` at aea1ca7. Audience: whoever plans the next round of work (the app owner, a teacher reviewer, or an AI agent picking this up).*

**Goal:** make Fraction Quest work as a **standalone fraction curriculum** for grades 3–5 (ages 8–10): a family or teacher should be able to use it start to finish, without a textbook, and know the child has learned every fraction standard for those grades.

**Bottom line:** the app already has a strong, model-centred core (52 lessons, evidence-gated worksheets, builds, spaced review, printables, a parent report and several games). To stand alone it still needs:
1. **Missing standards:** line plots, measuring with rulers, circle and area models, scaling, multiplying mixed numbers, and dividing a unit fraction by a whole number.
2. **Assessment:** unit and grade-level tests with results reported by standard.
3. **Teaching support:** a teacher/parent lesson guide.
4. **Reasoning and writing tasks:** the kind every published program uses.
5. **Brain breaks:** there are none yet.
6. **More games:** concept games beyond the race and coding.
7. **Basics a children's product must have:** privacy/consent, password reset, accessibility and Spanish support.


## Status update (later on 2026-10-11)

Much of the list below has since been built. Read this first; the sections after it are the original analysis.

**Done since this was written:** 68 lessons covering all 36 grade 3–5 fraction standards (line plots, rulers, area and
circle models, scaling, mixed-number multiplication, unit fraction ÷ whole number, decimal comparison, unit
conversions); unit and grade check-ins reported by standard; teaching guides and pacing; reasoning prompts; brain breaks;
concept games (Fraction War, Equivalence Match, Number Line Target) gathered with Race, Coding and Part Finder in one
Games menu; family privacy controls, classrooms and whole-account deletion; stars from authored questions only; redo
mistakes in the parent report; numerator/denominator wording everywhere.

**Give-away audit (fixed):** games, Daily Practice, check-ins, lesson build checks and practice pictures no longer reveal
the answer (no pre-split bars or lines for "build n/d", no shaded side-by-side bars on compare questions, no live
"use 5 pieces" status, compare choices named in either order, practice pictures announce no fraction to screen readers).
Daily Practice is now a mixed review (lesson questions plus builds where the child chooses the parts). Same numerator /
different denominator comparisons now appear in the lesson (more numerators, `<`/`>` items, own transfer), Fraction War,
the unlike-fractions worksheet and practice, and Race.

**Since then:** every question shows a model (compare questions show both amounts shaded as same-size wholes; questions
with no picture get one from the amounts they name); bars carry a "1 whole" bracket; whole number × fraction (4.NF.4a/b)
ends Unit 8, inside the grade-4 path and the level quiz; check-in coloring, ruler and line-plot items no longer hint or
gate on the right answer.

**Still open:**
- Privacy policy page and a COPPA data-handling review (needs company name, contact email, country/state).
- Spanish (deferred by the owner).
- Natural voice (Kokoro, in the browser) is built; it still needs a listen on a real device.
- The iOS app (kept on the `ios-local-icloud` branch; the owner may redo the conversion).

---

## 1. Where the app is today

### Content: 14 units, 52 lessons
| Unit | Lessons |
|---|---|
| 1 | Equal parts · Read a fraction · Unit fractions |
| 2 | More pieces, smaller pieces · Fractions in a group · More than one group |
| 3 | Less or more than half · Near 0, ½ or 1 · Fractions close together |
| 4 | Fraction number line · Find the marked fraction · Past one |
| 5 | Compare same denominator · Compare same numerator · Order fractions |
| 6 | Equivalent models · Make a matching fraction · Missing number |
| 7 | Compose to 1 · Decompose · Improper fractions · Mixed ↔ improper |
| 8 | Add like · Subtract like · Rename, then add · Tenths · Hundredths · Add tenths + hundredths |
| 9 | Simplest form · Missing number (both) · Compare unlike · Order unlike |
| 10 | Subtract unlike · Add mixed · Subtract mixed · Fraction of a number |
| 11 | Whole × fraction · Fraction × fraction · Fraction of a group · Whole ÷ unit fraction |
| 12 | Fraction of a length · Add lengths · Fair shares · Division is a fraction |
| 13 | Chance as a fraction · Fraction of a shape · Same spot, new name · Recipe fractions |
| 14 | Fractions → percent · Percent → fractions · Fractions → decimals · Two-step stories |

### What each lesson has
- **Intro:** story, worked example and "Let's think it through." Paper folding in 4 lessons; the "Same size, different shapes" card in lessons 1–2.
- **Practice:** about 12 tap questions, with right answers spread evenly across A/B/C.
- **Learning lab:** two staged builds (bar/set + number line, with a reason to pick) and a 12-question typed worksheet. The worksheet is the evidence gate: interactive bar copy/count/shade and the square model.
- **Later review:** a "Show it again" build on a later day, plus quick reviews of due skills.
- **Redo:** worksheet or builds with new numbers. Practice only; never changes completion.
- **Extra practice:** "Practice more" (fixed) and "New questions" (generated); daily practice (5 questions per day from the child's own learning).
- **Printables:** lesson sheet, practice, new practice, worksheet (with "Color it two ways" for lessons 1–2), my answers, unit challenge, and an answer key in the grown-ups area. "Check my paper" lets paper answers count.

### Games and motivation
- **Fraction Race:** against a robot (3 speeds) or 2 players, every lesson. Guessing can't win.
- **Code challenge:** 6 block-coding levels per lesson with Python view and robot hints. **Code Sprint** is a 5-round coding race.
- **Part Finder:** 3 rounds, on 3 lessons.
- **Unit challenges:** 14, with points, step-by-step walk-throughs and a best score.
- **Motivation:** XP, a daily goal ring, streak, stars, confetti, sound, and the mascot.

### Grown-ups and accounts
- **Parent report:** behind a grown-up gate. Minutes per day, first-try rate, builds on their own, "worth practicing," strengths, lesson table, voice chooser, and printable.
- **Level quiz:** places a child up to unit 9.
- **Accounts:** guest mode or account with sync.
- **Read-aloud:** gentle voice, kid wording ("three fourths"), vocabulary tooltips.

### Quality status
- **Tests:** 114 automated tests pass, and the typecheck and build are clean.
- **Earlier audit findings (all fixed):** the number-line cap, review prompts, guessable reasons, degenerate items, out-of-range denominators, duplicate worksheets, and pictures that gave the answer away.
- **Later fixes:** lesson re-lock after content changes, stale answers, print cut-off, the A/B/C bias, the equal-parts shading confusion, and daily practice offering locked lessons.

### Still open from earlier audits
- Parent password reset; privacy and consent page; COPPA review.
- Circle models.
- A small stray dotted part-marker beside the printed example bar.
- The 3-star threshold counts extra bank questions.
- Challenge walk-throughs aren't printed.
- The square model isn't used in practice questions or the race.
- Part Finder teaching notes:
  - "Tile the whole" only counts pieces already drawn.
  - Round 1 repeats a lesson 2 worksheet question.
  - Wrong answers get a generic hint.
- Mistakes made during a redo don't feed "worth practicing."

---

## 2. Standards coverage (Common Core, grades 3–5)

✅ covered · 🟡 partly · ❌ missing

### Grade 3
| Standard | What it asks | Status | Where / gap |
|---|---|---|---|
| 3.NF.1 | Unit fractions; a/b is a parts of size 1/b | ✅ | Units 1–2 |
| 3.NF.2 | Fractions on a number line (0–1 and beyond) | ✅ | Unit 4 |
| 3.NF.3a–b | Equivalent fractions (same size, same point) | ✅ | Unit 6, "Same spot, new name" |
| 3.NF.3c | Whole numbers as fractions (3 = 3/1, 4/4 = 1) | 🟡 | Comes up in examples and the challenge, but **no lesson teaches n/1 or n/n = 1 directly** |
| 3.NF.3d | Compare same numerator / same denominator, with symbols, same whole | ✅ | Unit 5 |
| 3.G.2 | Split shapes into equal areas; each part is 1/b of the area | 🟡 | New square model (lessons 1–2) and "Fraction of a shape." **No rectangles, circles or hexagons**, and no "partition this shape yourself" task |
| 3.MD.4 | Measure lengths to ½ and ¼ inch; show data on a line plot | ❌ | **No ruler and no line plot anywhere** |

### Grade 4
| Standard | What it asks | Status | Where / gap |
|---|---|---|---|
| 4.NF.1 | Equivalence by multiplying top and bottom, with models | ✅ | Unit 6, simplify in unit 9 |
| 4.NF.2 | Compare unlike fractions (common denominator or benchmark) | ✅ | Units 3 and 9 (unit 9 is labelled grade 5 in the app; it's grade 4 in Common Core) |
| 4.NF.3a–b | Add/subtract like denominators; decompose (3/8 = 1/8 + 2/8) | ✅ | Units 7–8 |
| 4.NF.3c | Add/subtract mixed numbers, like denominators | ✅ | Unit 10 (labelled grade 5; it's grade 4) |
| 4.NF.3d | Word problems, like denominators | 🟡 | Story items exist; **no multi-step like-denominator problem sets with visual models** |
| 4.NF.4a–c | Multiply a fraction by a whole number (incl. word problems) | 🟡 | "Groups of a fraction" (one lesson). **Missing: 4.NF.4a (5/4 = 5 × 1/4) as its own idea, and multiplication word problems with line plots or recipes** |
| 4.NF.5 | Tenths as hundredths (3/10 = 30/100); add 3/10 + 4/100 | ✅ | Unit 8 |
| 4.NF.6 | Decimal notation for tenths/hundredths | ✅ | Unit 8 |
| 4.NF.7 | **Compare** decimals to hundredths with symbols | ❌ | No compare-decimals lesson (0.3 vs 0.25 misconception not addressed) |
| 4.MD.2 | Measurement word problems with fractions/decimals (money, time, mass, volume) | 🟡 | Lengths and recipes only; **no money, time, mass or liquid volume** |
| 4.MD.4 | Line plots with ½, ¼, ⅛; add/subtract from the plot | ❌ | Missing |

### Grade 5
| Standard | What it asks | Status | Where / gap |
|---|---|---|---|
| 5.NF.1 | Add/subtract **unlike** denominators incl. mixed numbers | 🟡 | "Rename, then add" (related denominators only) and "Subtract unlike." **No general add-unlike lesson (1/3 + 1/4), no unlike-denominator mixed numbers** |
| 5.NF.2 | Word problems with unlike fractions; estimate with benchmarks to check answers | 🟡 | Two-step stories; **no "is this answer reasonable?" estimation tasks** |
| 5.NF.3 | Fraction as division (a/b = a ÷ b) | ✅ | Unit 12 |
| 5.NF.4a | Fraction × fraction (incl. a/b × q) | ✅ | Unit 11 |
| 5.NF.4b | Area of rectangles with fractional sides (tile with unit squares) | ❌ | "Fraction of a shape" is shading, not side-length area |
| 5.NF.5 | **Multiplication as scaling** (bigger/smaller than the factor without computing) | ❌ | Missing |
| 5.NF.6 | Real-world multiplication incl. **mixed numbers** | ❌ | No mixed-number multiplication |
| 5.NF.7a | **Unit fraction ÷ whole number** (1/3 ÷ 4) | ❌ | Only whole ÷ unit fraction is taught |
| 5.NF.7b–c | Whole ÷ unit fraction; word problems | ✅ / 🟡 | "How many pieces fit?" Few word problems |
| 5.MD.1 | Convert measurement units (incl. fractional results) | ❌ | Missing |
| 5.MD.2 | Line plots with fractions; redistribute ("level the beakers") | ❌ | Missing |

### Beyond grades 3–5 (already in the app)
- Percent (units 13–14) is grade 6 (6.RP.3c), and probability (unit 13) is grade 7 (7.SP).
- That's fine as **enrichment**, but they should be labelled that way so families don't treat them as required.
- The grade labels on units 9–14 should also be fixed: several are grade 4 (see 4.NF.2 and 4.NF.3c above).

---

## 3. Comparison with published programs

Chapter numbers below come from publisher correlation sheets and district guides; they can differ by edition (see Sources).

| Program | Fraction chapters/modules (grades 3–5) |
|---|---|
| **Big Ideas Math: Modeling Real Life** | Gr 3: Ch 10 *Understand Fractions*, Ch 11 *Understand Fraction Equivalence and Comparison* · Gr 4: fraction equivalence and comparison, then *Add and Subtract Fractions*, *Multiply Whole Numbers and Fractions*, *Relate Fractions and Decimals* (about Ch 7–10) · Gr 5: *Add and Subtract Fractions*, *Multiply Fractions*, *Divide Fractions* (about Ch 8–10) |
| **Eureka Math / EM²** | Gr 3 Module 5 *Fractions as Numbers on the Number Line* (about 35 days) · Gr 4 Module 5 *Fraction Equivalence, Ordering, and Operations* (about 40 days) + Module 6 *Decimal Fractions* · Gr 5 Module 3 *Addition and Subtraction of Fractions*, Module 4 *Multiplication and Division of Fractions and Decimal Fractions* |
| **Illustrative Mathematics K–5** | Gr 3 Unit 5 *Fractions as Numbers* · Gr 4 Unit 2 *Fraction Equivalence and Comparison*, Unit 3 *Extending Operations to Fractions* · Gr 5 Unit 2 *Fractions as Quotients and Fraction Multiplication*, Unit 3 *Multiplying and Dividing Fractions*, Unit 6 *More Decimal and Fraction Operations* (unlike denominators) |

### Feature comparison
| Feature in published programs | Big Ideas MRL | Eureka / EM² | IM K–5 | Fraction Quest now | Gap |
|---|---|---|---|---|---|
| Full grade 3–5 fraction standards | ✅ | ✅ | ✅ | 🟡 (see §2) | Add the ❌ standards |
| Lesson structure: launch → explore → practice → apply | "Explore and Grow → Think and Grow → Show and Grow → Apply and Grow" | Fluency → Application → Concept → Debrief | Warm-up → Activities → Synthesis → Cool-down | Intro → Practice → Lab → Worksheet | Add a **warm-up/fluency** start and a **debrief/cool-down** end (exit ticket) |
| Daily fluency / number sense routines | ✅ | ✅ (sprints) | ✅ ("Number Talks," "Which One Doesn't Belong") | 🟡 daily practice | Add short routines (see §4.4) |
| Real-life modelling and performance tasks | ✅ every chapter ("Modeling Real Life," performance task) | ✅ application problems | ✅ | 🟡 stories, recipes | Add a **project/performance task per unit** |
| Reasoning prompts ("You Be the Teacher," "Which One Doesn't Belong," "Logic," error analysis) | ✅ | ✅ | ✅ | 🟡 multiple-choice "why" | Add **error analysis and explain-your-thinking** tasks |
| Manipulatives (fraction strips/tiles, circles, rulers, geoboards) | ✅ | ✅ | ✅ | 🟡 bar, set, line, square, folding | Add **fraction strips/wall, circles, ruler, area grid, measuring cups** |
| Chapter/unit tests, mid-chapter checks, benchmark tests | ✅ | ✅ (mid- and end-of-module) | ✅ (section checkpoints, end-of-unit) | 🟡 unit challenge (6 items, optional) and level quiz | Add **pre-test, mid-unit check, end-of-unit test and grade-level benchmark**, reported by standard |
| Reports by standard and mastery | ✅ | ✅ | ✅ | 🟡 by lesson | Tag every item with a standard and report by standard |
| Intervention / reteach and enrichment | ✅ (Response to Intervention) | ✅ | ✅ | 🟡 hints, redo, unit challenge | Add an automatic **reteach path** and **enrichment** set |
| Vocabulary cards, glossary | ✅ | ✅ | ✅ | 🟡 tooltips | Add a **picture glossary** and vocabulary review |
| Teacher edition (objectives, misconceptions, questions to ask, pacing) | ✅ | ✅ | ✅ | ❌ | Add a **parent/teacher lesson guide** |
| Family letters / homework | ✅ | ✅ (parent tip sheets) | ✅ (family support) | 🟡 parent report tips | Add **family notes per unit** |
| Spanish / multilingual | ✅ | ✅ | ✅ | ❌ | Add Spanish (UI, read-aloud, printables) |
| Games | ✅ (chapter games, game library) | 🟡 | ✅ (centers) | ✅ race, coding, Part Finder | Add **concept games and printable centers** (§5) |
| Movement / brain breaks | — (teacher-led) | — (teacher-led) | — | ❌ | Add brain breaks (§6). An app used alone needs them built in |

---

## 4. All modifications needed (prioritized)

**P0** = needed to call it a standalone grade 3–5 fraction curriculum · **P1** = expected by families and teachers · **P2** = polish and enrichment.

### 4.1 Content: missing standards (P0)
1. **Whole numbers as fractions (3.NF.3c):** a lesson in unit 4 or 6: n/1 = n, n/n = 1, 6/3 = 2 on bars and number lines.
2. **Measure with a ruler and make line plots (3.MD.4, 4.MD.4, 5.MD.2):** a new **Unit "Measure and Plot"** with an interactive ruler marked in ½, ¼ and ⅛ inch and a line-plot builder (tap to stack Xs).
   - Grade 3: measure objects to the nearest ¼ inch.
   - Grade 4: questions from the plot ("difference between longest and shortest").
   - Grade 5: redistribute ("pour so each beaker has the same").
3. **Partition shapes into equal areas (3.G.2):** extend the square model to rectangles, circles and hexagons.
   - Add a **"draw the cuts"** task (Part Finder's planned round 3).
   - Add "Is each part 1/4 of the area?" with tricky partitions.
4. **Compare decimals (4.NF.7):** a lesson in unit 8. 0.3 vs 0.25 on hundredths grids and number lines, with symbols, and the "longer is bigger" misconception named.
5. **Measurement word problems (4.MD.2):** money (quarters = ¼ dollar), time (¼ hour), liquid volume (½ L) and mass. Add as practice recipes and a lesson.
6. **Fraction × whole, deeper (4.NF.4a–c):** add "5/4 = 5 × 1/4" (unit fraction multiples) and word problems with line plots and recipes.
7. **Add/subtract unlike denominators in general (5.NF.1):** an "Add different pieces" lesson (1/3 + 1/4 with area models and common denominators), plus unlike-denominator **mixed numbers**.
8. **Estimate to check (5.NF.2):** "Is 2/5 + 1/2 more or less than 1? Is Sam's answer of 3/7 reasonable?" Benchmark estimation items.
9. **Area with fractional sides (5.NF.4b):** tile a ⅔ × ¾ rectangle with unit-fraction squares; connect to multiplication.
10. **Multiplication as scaling (5.NF.5):** "Without multiplying, is ¾ × 12 more or less than 12?" with a slider model.
11. **Multiply mixed numbers (5.NF.6):** 2½ × 1⅓ with area models and real contexts.
12. **Unit fraction ÷ whole number (5.NF.7a):** 1/3 ÷ 4 with bar models ("share ⅓ of a pan among 4"). Add to unit 11.
13. **Convert measurement units (5.MD.1):** ½ ft = 6 in, ¾ hr = 45 min, fractional results.
14. **Re-label grades and enrichment (P0, small):** fix the grade labels for units 9–14 by standard, and mark percent and probability as "Bonus: grade 6–7."

### 4.2 Models and manipulatives (P0–P1)
1. **Circle (pie) model** in builds, worksheets and printables (P0; open parent-audit item). Include "Why circles are hard to cut fairly into thirds."
2. **Fraction strips / fraction wall:** drag strips to compare and find equivalents (P0, used across units 5–6 and 9).
3. **Ruler** (P0, see 4.1.2) and **liquid measure** (measuring cups) for recipes and volume (P1).
4. **Area grid / rectangle model** for multiplication and for adding unlike fractions (P0, see 4.1.7 and 4.1.9).
5. **Hundredths grid** for decimals (P1; currently a bar of 10).
6. **Square model** in practice questions, the race and the generated sheets, not only worksheets (P1).
7. **Printable manipulative kit:** fraction strips, circles, rulers and a fraction wall to cut out (P1).

### 4.3 Lesson structure and teaching (P0–P1)
1. **Warm-up (1–2 min) at the start of each lesson** (P1): a number talk, "Which One Doesn't Belong" with four fraction pictures, or quick recall of yesterday's idea.
2. **Exit ticket at the end** (P0): 2–3 fresh items, without hints. The result feeds the report (Big Ideas "Show and Grow," IM "cool-down").
3. **Explain your thinking** (P0): short typed or recorded explanations using sentence frames ("I know ___ because ___"), plus picture-based explanations (draw on the model). The parent report can show them to a grown-up.
4. **Error analysis, "You be the teacher"** (P0): "Mia says 1/8 > 1/4 because 8 > 4. Is she right?" At least two per lesson.
5. **Real-life performance task per unit** (P1): for example, plan a pizza party (⅓ cheese, ¼ veggie…), design a garden plot (area), a recipe scaled ×2 or ×½, a measuring hunt at home with a ruler. Include a printable rubric.
6. **Vocabulary:** a picture glossary page and a "word of the unit" review game (P1).
7. **Misconception-targeted reteach** (P0): when the same misconception appears 2 or more times, offer a short reteach card and 3 targeted items before continuing. Misconceptions are already tracked; use them.
8. **Enrichment set per unit** (P2): puzzles beyond the unit challenge (open-middle problems such as "Use digits 1–9 once: □/□ + □/□ closest to 1").
9. **Parent/teacher lesson guide** (P0 for "standalone"): per lesson, give the objective (standard), key vocabulary, materials, a 5-minute offline launch, questions to ask, common misconceptions, and what mastery looks like. Generate it from lesson data and show it in the grown-ups area and as a printable.
10. **Scope, sequence and pacing guide** (P0): a printable year plan (for example, grade 3 ≈ 35 sessions, grade 4 ≈ 45, grade 5 ≈ 45), with suggested minutes per day and review weeks.

### 4.4 Practice, fluency and spaced review (P1)
1. **Prerequisite fluency check:** multiplication facts to 10 × 10 are needed for equivalence and common denominators. Add a short facts warm-up or fluency game, and flag weak facts in the report.
2. **Cumulative review** mixes questions from all earlier units (interleaving), not only the current lesson. Daily practice partly does this; add mixed-unit question sets.
3. **Mastery definition per standard:** for example 80% or more on the exit ticket, the end-of-unit test and a later review. Show "mastered / developing / not yet" per standard.
4. **Mistakes during redos** feed "worth practicing" (an open choice from the redo work).

### 4.5 Assessment (P0)
1. **Unit pre-test** (optional, skips known lessons, like the level quiz but per unit) and an **end-of-unit test** (10–15 items, mixed formats, no hints, printable with key).
2. **Mid-unit check** for units with 4 or more lessons.
3. **Grade-level benchmarks:** beginning, middle and end of year for grades 3, 4 and 5 fraction standards. Extend the level quiz beyond unit 9.
4. **Tag every item with a standard** (lesson, worksheet, challenge and generated items). Use the tags for reports and pre-tests.
5. **Report by standard** in the parent view, with a printable certificate of completion per grade.
6. **Assessment item bank** large enough that retakes see new items. The generator plus the new `getWorksheet(id, variant)` is a good base.

### 4.6 Grown-ups, classroom and safety (P0–P1)
1. **Privacy and consent page and COPPA review** (P0): what is stored, where, for how long; parent consent for accounts; data deletion and export.
2. **Parent password reset / account recovery** (P0).
3. **Multiple children per family** and a **teacher/classroom mode** (P1): class roster, assign units, class report by standard, printable class sets.
4. **Family notes per unit** (P1): a one-page "what we're learning, how to help, a game to play at home."
5. **Screen-time settings** (P1): session length, break reminders (§6), quiet hours.
6. **Offline/PWA mode** (P2): lessons work without a connection; sync later.

### 4.7 Accessibility and language (P0–P1)
1. **Spanish** (P1): UI, lesson text, read-aloud voice and printables. Big Ideas, Eureka and IM all offer it.
2. **Accessible models** (P0):
   - Keyboard and screen-reader paths for every interactive model. The square model and Part Finder have them; check the builds and the race.
   - Never rely on colour alone.
   - Larger touch targets on small phones.
3. **Read-aloud everywhere** (P1): question text in practice, games and worksheets, not only explanations.
4. **Display options** (P2): dyslexia-friendly font, larger text, high contrast, reduced motion (respected already in places).

### 4.8 Engineering and quality (P1)
1. **Content tests per standard:** each new standard gets answer-key and "picture never shows the answer" tests like the existing ones.
2. **End-to-end smoke test in CI** (Playwright) for: new learner → lesson 1 complete → redo → daily practice → print.
3. **Single source for the `src/` mirror:** the root `src/` copy has drifted twice. Generate it with a script or remove it.
4. **Part Finder teaching fixes** (§1 open items) and the printed-marker / 3-star items.

---

## 5. Games: what exists and what to add

**Current:** Fraction Race (every lesson), Code challenge + Code Sprint (every lesson), Part Finder (3 lessons), unit challenges, daily practice.
**Gap:** every game except Part Finder is a quiz or coding wrapper. Published programs and teachers use **concept games** where the game *is* the maths, and **printable centers** for offline play.

| # | Game | Concept (standards) | Format | Priority |
|---|---|---|---|---|
| 1 | **Fraction War / Compare Clash** | Compare fractions (3.NF.3d, 4.NF.2) | Each player flips a fraction card and builds it on a strip; bigger wins. Robot or 2-player, plus a printable card deck | P0 |
| 2 | **Equivalence Memory / Match** | Equivalent fractions, fraction ↔ decimal ↔ percent (3.NF.3, 4.NF.1, 4.NF.6) | Flip pairs: picture ↔ symbol ↔ number-line point | P0 |
| 3 | **Number Line Splat / Target** | Place fractions on a line, estimate (3.NF.2, 5.NF.2) | Tap where 5/8 lands; score by distance. Benchmark rounds | P0 |
| 4 | **Pizza / Bakery Shop** | Compose and decompose, add like/unlike (4.NF.3, 5.NF.1) | Fill orders ("¾ cheese, ¼ veggie") from slices; later unlike slices | P1 |
| 5 | **Make One Whole (Fraction Tetris)** | Compose to 1, unlike denominators | Drop strips to fill a row exactly | P1 |
| 6 | **Recipe Scaler** | Multiply by a whole and by fractions, scaling (4.NF.4, 5.NF.5–6) | Double or halve a recipe; the dish fails if wrong | P1 |
| 7 | **Measure Hunt** | Ruler, line plots (3.MD.4, 4.MD.4) | Measure on-screen objects, build the class line plot; offline "measure 5 things at home" version | P0 (with unit 4.1.2) |
| 8 | **Fraction Bingo / Board Game** | Mixed review | Printable boards and cards for family or classroom | P1 |
| 9 | **Part Finder rounds 2–4** | Area partitions, equivalence (3.G.2, 3.NF.3) | Fix "Tile the whole"; add "Group them into 4 fair shares" and "Draw the cuts"; add to more lessons | P1 |
| 10 | **Escape Room / Quest mode** | Unit review | Story chain of 5 puzzles per unit; unlocks a map decoration | P2 |
| 11 | **Same-device party mode** | Any | 2–4 players take turns on one tablet | P2 |

**Game rules to keep (already true and important):** games never unlock lessons or count as evidence; guessing can't win; every game shows the model, not just numbers.

---

## 6. Brain breaks (new; currently none)

Children aged 8–10 benefit from a short movement or reset break about every **10–15 minutes** of focused work. A standalone app has no teacher to call one, so it needs to offer breaks itself.

**When to offer a break**
- After about 12 minutes of active time (the minute tracker already exists).
- After 3 misses in a row (a calm-down reset).
- At the end of each lesson part.

Breaks are always optional and skippable, and never cost streaks or XP. Parents can set the interval or turn breaks off.

**Kinds of break (30–90 seconds each, with read-aloud and simple animation)**
1. **Fraction body moves:** "Show ½ with your arms… now ¼… jump 3/4 of the way across the room." Maths-flavoured movement.
2. **Freeze dance fractions:** music plays; when it stops, the screen shows a fraction picture. Freeze in a big shape if it's more than ½, small if less.
3. **Stretch and count:** stretch to 8 counts, "each count is 1/8 of the stretch."
4. **Calm breathing:** breathe in for 4 counts, out for 4, with a circle that fills in quarters. Use it after frustration.
5. **Eye break:** look at something far away for 20 seconds (20-20-20 rule).
6. **Silly mascot moment:** the mascot does a quick fraction joke or riddle ("Why did ½ go to the gym? To get its other half!").
7. **Off-screen mini mission:** "Find something at home cut into equal parts" or "Fold a napkin into fourths," with an optional photo-free "I did it" button.

**Grown-up controls:** break interval (off / 10 / 15 / 20 minutes), allowed break types (for example, quiet breaks only in class), and a daily screen-time reminder.

---

## 7. Suggested roadmap

| Phase | Focus | Main items |
|---|---|---|
| **1 · Safe and complete basics** | P0 safety, labels, small content gaps | Privacy/consent + password reset · grade/enrichment labels · whole numbers as fractions · compare decimals · unit fraction ÷ whole · brain breaks v1 · standards tags on all items |
| **2 · Missing standards** | Measurement and grade 5 | Measure and Plot unit (ruler, line plots) · circles + shape partitions · add unlike (general) + unlike mixed numbers · scaling · mixed-number multiplication · fractional-side area · unit conversion · measurement word problems |
| **3 · Assessment and teaching** | Make it a curriculum | Exit tickets · pre-tests, mid-unit checks, end-of-unit tests, benchmarks · report by standard · error-analysis and explain-your-thinking tasks · parent/teacher lesson guide · scope and sequence/pacing printable |
| **4 · Games and engagement** | Concept games | Fraction War · Equivalence Match · Number Line Splat · Measure Hunt · Pizza Shop · Part Finder fixes and new rounds · printable game kit |
| **5 · Reach** | Wider use | Spanish · teacher/classroom mode · multiple children · offline mode · read-aloud everywhere · display options |

---

## Sources
- Big Ideas Math Grade 3 chapter list: ST Math correlation sheet <https://play.stmath.com/raft/resources/help/correlations/2/big_ideas_math_3.pdf> and a district unit guide <https://app.oncoursesystems.com/curriculum/9490/9458641/unit/9465441>
- Big Ideas Math Grade 4 chapter topics: ST Math correlation <https://play.stmath.com/raft/resources/help/correlations/2/big_ideas_math_4.pdf>
- Big Ideas Math Grade 5 chapter topics: ST Math correlation <https://play.stmath.com/raft/resources/help/correlations/2/big_ideas_math_5.pdf>
- Big Ideas Math: Modeling Real Life reviews (structure and alignment): EdReports, Grade 3 <https://edreports.org/reports/detail/big-ideas-math-modeling-real-life-2019/third-grade/gateway-two>, Grade 4 <https://edreports.org/reports/detail/big-ideas-math-modeling-real-life-2019/fourth-grade/gateway-two>, Grade 5 <https://edreports.org/reports/detail/big-ideas-math-modeling-real-life-2019/fifth-grade/gateway-one>
- Big Ideas Learning K–5 program brochure <https://resources.bigideaslearning.com/hubfs/MTH_BIL_BRO_MRL_K-5_2022-01_LR-Single-min.pdf>
- Eureka Math² Grade 3 Module 5 overview (Great Minds) <https://greatminds.org/hubfs/Assets/Eureka%20Math%20Squared/EM2CA%20California%20Edition/2025%20Edition%20Files/topic-by-topic/Grade%203/EM2CA180_25A_TEG3_M5_Module%20Overview.pdf>
- Eureka Math Grade 4 Module 5 parent handbook <https://www.ktufsd.org/cms/lib/NY19000262/Centricity/Domain/28/Eureka%20Math%20Parent%20Handbook%20G4%20M5.pdf>
- Illustrative Mathematics Grade 4 scope and sequence <https://curriculum.illustrativemathematics.org/k5/teachers/grade-4/course-guide/scope-and-sequence.html>
- Illustrative Mathematics unit lists (Kendall Hunt): Grade 4 <https://im.kendallhunt.com/K5/families/grade-4/units.html>, Grade 5 <https://im.kendallhunt.com/K5/teachers/grade-5/units.html>; Grade 3 Unit 5 *Fractions as Numbers* <https://elearningcentral.iowa.gov/course-repository/ilc-3rd-grade-mathematics-unit-5-fractions-numbers>
- Common Core State Standards for Mathematics, grades 3–5, Number and Operations—Fractions (3.NF, 4.NF, 5.NF) and Measurement and Data (3.MD.4, 4.MD.2, 4.MD.4, 5.MD.1–2), and Geometry 3.G.2 <https://www.thecorestandards.org/Math/>

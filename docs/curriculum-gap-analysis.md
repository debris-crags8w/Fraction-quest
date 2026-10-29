# Fraction Quest: curriculum gap analysis and roadmap

*Written 2026-10-11 against `main` at aea1ca7. Numbers and statements in the status block, section 1 and section 2 were refreshed from the code on 2026-10-29 (`main` at 2e44adc3, plus the thoroughness and release fixes of that day); sections 3 to 7 are the original plan, kept as history. Audience: whoever plans the next round of work (the app owner, a teacher reviewer, or an AI agent picking this up).*

**Goal:** make Fraction Quest work as a **standalone fraction curriculum** for grades 3–5 (ages 8–10): a family or teacher should be able to use it start to finish, without a textbook, and know the child has learned every fraction standard for those grades.

**Bottom line (2026-10-29):** the app now stands alone as a grade 3-5 fraction course: 81 lessons in 15 units (77 core and 4 marked "Bonus": chance, percent, percent as fractions, and dividing by a fraction), all 35 catalogued standard tags (3.NF, 4.NF, 5.NF, 3.G.2, 3.MD.4, 4.MD.2, 4.MD.4, 5.MD.1, 5.MD.2) taught by two or more lessons, 48 unit and grade check-ins reported by standard, 15 unit challenges, spaced review, a grown-ups report with skills by standard, teaching guides, brain breaks, concept games, privacy and terms pages, account recovery, and offline use (a service worker saves the whole app). What is still open:
1. **People, not code:** a teacher's check of the grade labels and of the standards that have only one challenge puzzle, listening to the voice on a real phone, and testing offline use with Wi-Fi switched off on a real phone.
2. **Release of the iPhone and Android app:** adaptive icon, splash image, privacy manifest, store listing and product IDs (see `app-shell-speed-offline-review.md`).
3. **Bigger projects:** Spanish, teacher dashboards beyond classroom codes, adaptive difficulty, open-response tasks.

*The original (2026-10-11) list of what was missing, kept for the record:* missing standards, assessment, a teaching guide, reasoning tasks, brain breaks, more games, and the basics a children's product needs. All of these are built except Spanish.


## Status update (later on 2026-10-11)

Much of the list below has since been built. Read this first; the sections after it are the original analysis.

**Done since this was written:** 81 lessons in 15 units (unit 15, Problem solving, added 2026-10-13) covering all 35 catalogued grade 3–5 standard tags (line plots, rulers, area and
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

**Still open (as first written, with today's status):**
- Privacy policy page and a COPPA data-handling review: the privacy notice and terms pages exist (`public/privacy.html`, `public/terms.html`); the legal review still needs the owner's company name, contact email and country or state.
- Spanish (deferred by the owner).
- Natural voice: Kokoro runs on the server, and a pre-made voice pack ships with the app (Listen starts at once; the iPhone and Android app can download the whole pack on Wi-Fi). It still needs a listen on a real device.
- The iPhone and Android app: `artifacts/fraction-quest-ios` (an Expo shell around the web app). Its ID, build numbers and EAS build profiles are set; its icon set, splash image, privacy manifest and store IDs are not (see `app-shell-speed-offline-review.md`).

---

## Competitor review (2026-10-13)

A rival's read of the app against Eureka Math², Illustrative Math, Singapore Math (Dimensions / Math in Focus), enVision,
Beast Academy, RSM, Zearn, DreamBox, Khan Academy and IXL. Standards coverage was already complete; the holes were in
**reasoning depth**, which is what school and accelerated programs sell on.

| Hole a competitor would point to | Who does it well | Fix |
|---|---|---|
| Never goes from a part back to the whole ("3 is 1/4 of the bag; how many in the bag?") | Eureka G3 M5, Singapore, Beast Academy 3 | **Find the whole** lesson (unit and non-unit parts; stickers, ribbon, pages) |
| No Singapore bar-model "fraction of the rest" stories; one challenge puzzle only | Singapore 4–5, Math in Focus, RSM | **Fraction of the rest** lesson (count and fraction answers) |
| No error analysis: children never critique a wrong method | IM ("Is Sam right?"), Eureka, enVision | **Spot the mistake** lesson: yes/no "Is that right?" plus "What is the right answer?" on 8 classic slips |
| Division stops at unit fractions | Beast Academy 5, RSM, AoPS Prealgebra | **Bonus: Divide by a fraction** (same-size pieces, count how many fit) |

Each new lesson has the full lesson set: worked example, practice, generator, two builds, a 12-row worksheet, reasons,
later review, and printables. Unit 15 also has a 6-puzzle unit challenge with walk-throughs, a family teaching guide and
pacing rows.

**Still open after this review** (bigger than one PR):
- Adaptive mastery like DreamBox and IXL: difficulty that moves with each answer, not only spaced review.
- Spanish and other languages: Zearn, Khan and IXL all have them.
- Teacher dashboards with assignment by standard and class reports beyond the current classroom codes.
- Open-response tasks a teacher can grade, and a video or animated "teach me" for each lesson, like Zearn and Khan.

## 1. Where the app is today

### Content: 15 units, 81 lessons
| Unit | Title | Lessons |
|---|---|---|
| 1 | Meet fractions | Fraction names · Equal parts · Unit fractions · Equal-area partitions |
| 2 | Size of the parts | Unit fraction size · Same numerators |
| 3 | Size and benchmarks | Near one half · Near 0, 1/2 or 1 · Estimate size |
| 4 | Fraction number lines | Split the line · Read the line · Past one whole · Read a ruler · Build line plots |
| 5 | Compare and order | Compare like parts · Order fractions |
| 6 | Equivalent fractions | See equivalence · Line equivalence · Make a match · Missing parts |
| 7 | Put fractions together | Make one whole · Break apart · Whole numbers as fractions · Past a whole · Two ways to name it |
| 8 | Operations and decimals | Add fractions · Subtract fractions · Add mixed numbers · Subtract mixed numbers · Fractions and decimals · Hundredths · Three forms · Compare decimal sizes · Decimals on a grid · Tenths + hundredths · Dimes and pennies · Unit fraction copies · Whole × fraction |
| 9 | Rename and compare | Simplest form · Equivalent fractions · Compare unlike parts · Order unlike parts · Plot in eighths · Read line plots · Measurement stories · Recipe fractions · Party portions |
| 10 | Mixed numbers and amounts | Add different names · Add unlike parts · Subtract unlike parts · Mixed number operations · Estimate fraction sums |
| 11 | Multiply and divide | Fractions of sets · Count groups in a set · Fractions of amounts · Fraction × fraction · Multiply on a grid · Groups of objects · Scale an amount · Bigger or smaller |
| 12 | Fractions in measurement | Fractional lengths · Measure together · Reason with line plots · Line plot totals · Fraction unit conversions · Two-step conversions · Fair sharing · Fraction quotient · Divide a unit fraction · Divide by a fraction · Share or fit |
| 13 | Fraction models in context | Bonus probability · Fractional side area · Mixed number multiplication |
| 14 | Fractions and decimals | Bonus percent · Bonus percent as fraction · Fraction stories |
| 15 | Problem solving | Find the whole · Spot the mistake · Fraction of the rest · Bonus fraction ÷ fraction |

(Unit titles are the ones on the learning map; lesson names are the short titles shown on the map. "Bonus" lessons are enrichment beyond grades 3-5 and never gate anything.)

### What each lesson has
- **Learn and practise:** each lesson is a few ideas; an idea has Learn pages (with words to know and a worked example), then three practices. The first lesson has the Watch, Words and Try screens.
- **Learning lab:** staged builds (bar, set, number line, with a reason to pick) and a 12-row typed worksheet. The worksheet is the evidence gate.
- **Later review:** a "Show it again" build on a later day (spaced review at 1, 3 and 7 days), plus quick reviews of due skills.
- **Redo:** worksheet or builds with new numbers. Practice only; never changes completion.
- **Extra practice:** "Practice more" (12 fixed questions) and "New questions" (a fresh set from the lesson's generator each time); daily practice (5 questions per day from the child's own learning).
- **Printables:** lesson sheet, practice, new practice, worksheet, my answers, unit challenge, and an answer key in the grown-ups area. "Check my paper" lets paper answers count.

### Games and motivation
- **Fraction Race**, **Code challenge** and **Code Sprint**, **Part Finder**, and the concept games (Fraction War, Equivalence Match, Number Line Target), all in one Games menu.
- **Unit challenges:** 15 (one per unit), 6 puzzles each, with points, step-by-step walk-throughs and a best score.
- **Check-ins:** unit pre, mid and end forms and grade beginning, middle and end forms for grades 3, 4 and 5 (48 forms), reported by standard.
- **Motivation:** XP, a daily goal ring, streak, stars, confetti, sound, the mascot, a story with films, and brain breaks.

### Grown-ups and accounts
- **Parent report:** behind a grown-up gate. The week at a glance, skills by standard for the child's grade, what to practice with an idea for home, the last 4 weeks, minutes per day, first-try rate, redo mistakes, a summary to share, family settings (breaks, reminders, voice, subscription).
- **Find my level:** 3 questions for each of units 1-12 (36 in all, stopping at the first unit not passed). From the start of a unit's lessons it asks one from each third of the unit, rotating with the seed, so over many quizzes every standard of units 1-12 is asked (63 of the 71 lessons in 40 quizzes; the rest share standards with a lesson that is). The ruler and line plot lessons, which the quiz cannot show, have their own rows in `placement-extras.ts`. Units 13-15 open after unit 12 as usual.
- **Accounts:** guest mode, or an account with sync, a recovery code, classrooms and whole-account deletion. The app also opens a signed-in family's saved account when the server cannot be reached.
- **Offline:** a service worker saves the page and every built file, so the whole app opens and plays with no connection after one visit. The voice pack downloads in the iPhone and Android app on Wi-Fi; in a browser only the clips already heard are kept.
- **Read-aloud:** a gentle voice (kid wording such as "three fourths") and vocabulary cards.

### Quality status
- **Tests:** about 500 unit tests (`src/*.test.ts` and the iOS package), a proof engine that solves every question the app can ask again and agrees with every answer, and Playwright checks: every lesson, the iPhone Safari screen, films, accessibility (axe), offline use and more. CI runs the unit tests, typecheck and build, the all-lessons and iPhone smoke tests, and a separate "Extra browser checks" job.
- **Earlier audit findings:** the lists from the 2026-10-11 audits (number-line cap, review prompts, guessable reasons, degenerate items, pictures that gave the answer away, and others) were fixed; later audits are tracked in their pull requests.

## 2. Standards coverage (Common Core, grades 3–5)

All 35 catalogued standard tags (`standard-catalog.ts`) are covered: each is taught by two or more lessons, each appears in the unit challenges and in the grade check-ins, and the parent report shows them as skills. (3.NF.2 and 3.NF.3 are split into their lettered parts; 5.NF.7 into a, b and c; 4.NF.3 and 4.NF.4 likewise. The 2026-10-11 list marked about a third of these as missing or partial; none is missing now.) The lesson list for each tag below is read from the code.

### Grade 3
| Standard | What it asks | Lessons (unit: lesson) |
|---|---|---|
| 3.NF.1 | Splits a whole into equal parts and names them | 1: Fraction names; 1: Equal parts; 1: Unit fractions |
| 3.NF.2a | Puts a fraction like 1/4 on a number line | 4: Split the line; 4: Read the line |
| 3.NF.2b | Finds fractions like 3/4 and 5/4 on a number line by counting equal jumps | 4: Past one whole; 7: Past a whole |
| 3.NF.3a | Finds fractions that name the same amount | 6: See equivalence; 6: Line equivalence |
| 3.NF.3b | Shows with a picture why two fractions are the same amount | 6: See equivalence; 6: Line equivalence |
| 3.NF.3c | Writes a whole number as a fraction, like 3/1 or 4/4 | 7: Whole numbers as fractions; 7: Past a whole |
| 3.NF.3d | Compares two fractions with the same top or bottom number | 2: Unit fraction size; 2: Same numerators; 3: Near one half; 3: Near 0, 1/2 or 1; 3: Estimate size; 5: Compare like parts; 5: Order fractions |
| 3.G.2 | Splits a shape into equal areas and names each part | 1: Equal parts; 1: Equal-area partitions |
| 3.MD.4 | Measures lengths to the nearest half or fourth inch and shows them on a line plot | 4: Read a ruler; 4: Build line plots |

### Grade 4
| Standard | What it asks | Lessons (unit: lesson) |
|---|---|---|
| 4.NF.1 | Makes equal fractions by multiplying or dividing the top and bottom by the same number | 6: Make a match; 6: Missing parts; 9: Simplest form; 9: Equivalent fractions |
| 4.NF.2 | Compares fractions with different bottom numbers, using 1/2 or equal fractions | 3: Near one half; 3: Near 0, 1/2 or 1; 9: Compare unlike parts; 9: Order unlike parts; 15: Spot the mistake |
| 4.NF.3a | Adds and subtracts fractions with the same bottom number | 8: Add fractions; 8: Subtract fractions; 15: Spot the mistake |
| 4.NF.3b | Breaks a fraction into smaller fractions that add up to it | 7: Make one whole; 7: Break apart; 7: Two ways to name it |
| 4.NF.3c | Adds and subtracts mixed numbers | 7: Two ways to name it; 8: Add mixed numbers; 8: Subtract mixed numbers |
| 4.NF.3d | Solves word problems that add or take away same-size parts | 8: Add fractions; 8: Subtract fractions; 14: Fraction stories |
| 4.NF.4a | Sees 3/4 as three groups of 1/4 | 8: Unit fraction copies; 8: Whole × fraction |
| 4.NF.4b | Multiplies a fraction by a whole number | 8: Whole × fraction; 9: Recipe fractions |
| 4.NF.4c | Solves word problems that multiply a fraction by a whole number | 9: Recipe fractions; 9: Party portions |
| 4.NF.5 | Writes tenths as hundredths to add them | 8: Tenths + hundredths; 8: Dimes and pennies |
| 4.NF.6 | Writes tenths and hundredths as decimals | 8: Fractions and decimals; 8: Hundredths; 8: Three forms |
| 4.NF.7 | Compares decimals to hundredths | 8: Compare decimal sizes; 8: Decimals on a grid |
| 4.MD.2 | Solves measurement word problems with fractions | 9: Measurement stories; 12: Fraction unit conversions |
| 4.MD.4 | Reads a line plot of fraction measurements and answers questions about it | 9: Plot in eighths; 9: Read line plots |

### Grade 5
| Standard | What it asks | Lessons (unit: lesson) |
|---|---|---|
| 5.NF.1 | Adds and subtracts fractions with different bottom numbers | 10: Add different names; 10: Add unlike parts; 10: Subtract unlike parts; 10: Mixed number operations; 12: Measure together |
| 5.NF.2 | Solves fraction word problems and checks if the answer makes sense | 10: Estimate fraction sums; 12: Measure together; 15: Fraction of the rest |
| 5.NF.3 | Sees a fraction as a division, like sharing 3 pizzas among 4 people | 12: Fair sharing; 12: Fraction quotient |
| 5.NF.4a | Multiplies a fraction by a fraction | 11: Fractions of sets; 11: Count groups in a set; 11: Fractions of amounts; 11: Fraction × fraction; 11: Multiply on a grid; 11: Groups of objects; 12: Fractional lengths |
| 5.NF.4b | Finds the area of a rectangle with fraction side lengths | 13: Fractional side area; 13: Mixed number multiplication |
| 5.NF.5 | Knows when multiplying by a fraction makes a number bigger or smaller | 11: Scale an amount; 11: Bigger or smaller |
| 5.NF.6 | Solves word problems that multiply fractions | 13: Mixed number multiplication; 15: Fraction of the rest |
| 5.NF.7a | Shares a unit fraction equally, like 1/2 split among 3 | 12: Divide a unit fraction; 12: Share or fit |
| 5.NF.7b | Finds how many unit fractions fit in a whole number | 12: Divide by a fraction; 12: Share or fit; 15: Find the whole |
| 5.NF.7c | Solves word problems that divide with unit fractions | 12: Divide by a fraction; 12: Share or fit |
| 5.MD.1 | Converts measurement units, including fraction amounts | 12: Fraction unit conversions; 12: Two-step conversions |
| 5.MD.2 | Solves problems with data from a fraction line plot | 12: Reason with line plots; 12: Line plot totals |

Where the tags are thin (for a teacher to check): 17 standards have exactly one unit-challenge puzzle, and some lessons carry a second tag mainly so that a standard has two lessons. Find my level covers the standards of units 1-12; 5.NF.4b and 5.NF.6 are taught only in units 13 and 15, which open after unit 12 whatever the quiz says.

### Beyond grades 3–5 (already in the app)
- Percent (unit 14) is grade 6 (6.RP.3c), and probability (unit 13) is grade 7 (7.SP); dividing by a fraction (unit 15) goes past 5.NF.7.
- They are labelled "Bonus" in the app (lesson titles and unit subtitles), so families don't treat them as required.
- The unit subtitles now name the grades a unit covers (for example unit 9 "Grades 3–5", unit 10 "Grades 4–5").

---

## 3. Comparison with published programs

*Sections 3 to 7 are the original 2026-10-11 plan, kept as history. Most of section 4 (content, models, teaching, assessment, grown-ups, accessibility) and the games and brain breaks of sections 5 and 6 are built; section 1 and the status block at the top say what exists today. Spanish and the Phase 5 items are the main parts not built.*

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

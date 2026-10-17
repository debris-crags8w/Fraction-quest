---
name: Learning design requirements
description: User requirements for fraction interactions and worksheet-based progression.
---

Fraction Quest must emphasize interactions: “this is fractions!” Each topic must include a worksheet with 10–15 problems that students complete by entering answers before unlocking the next level.

**Lesson worksheet rule (user, 2026-10-16):** the lesson worksheet is printed and handed in, so a lesson cannot be marked
complete until every question on it is submitted (answered right in the app or entered from paper with Check my paper).
Only the lesson worksheet is required; the other worksheets (practice sheets, new-numbers sheets, redo) stay optional.
This reverses 828ba0d ("only question 1 required").

**Why:** The user explicitly requested interactive learning and entered-answer worksheets as prerequisites for progression.

**How to apply:** Keep actual model manipulation central to the learning design. Do not replace worksheets with multiple-choice quizzes, optional practice, or static pictures; worksheet completion must be part of the level-unlock rule.

Worked examples belong inside each lesson, above the first question; Part Finder lessons show the example at the top of that same lesson flow before the hands-on rounds.

**Why:** The user chose an embedded example after the standalone tablet screen made the lesson feel disconnected.

**How to apply:** Show the worked model in context before question one without adding a separate “Let me try it” screen; preserve the hands-on-to-worksheet order and all existing progress gates.

Saved completions from before evidence gates are historical progress, not proof of understanding. Keep them visible without treating them as newly demonstrated mastery; hints or corrections can support progress but must not count as independent delayed retention.

**Why:** Preserving stars and completion history should not falsely report that a learner has demonstrated understanding. A student who needs hints should still make forward progress, while retention is checked independently later.

**How to apply:** Keep old history intact, apply the new evidence gate to new unlocks, and separate supported work from independent, delayed confirmation.

Within an unlocked unit, learners may choose among its unfinished missions. The recommended mission can prioritize earlier errors, supported attempts, and incomplete evidence, but it must never open a later unit ahead of the required gates.

**Why:** More choice lets the path respond to demonstrated needs while keeping each new level grounded in completed understanding checks.

**How to apply:** Keep recommendation ranking limited to unfinished missions in the earliest incomplete unit; require every worksheet and model/transfer check before advancing to the next unit.

Fraction bar models should clearly label the whole and identify a representative part. Do not add a redundant fraction symbol beside a bar that already shows the partition. Explanations should emphasize key fraction vocabulary with accessible definitions and optional speech.

**Why:** The user explicitly requested whole/part labels, removal of the right-side fraction hint, highlighted vocabulary tooltips, and audio explanations.

**How to apply:** Carry these conventions across lesson diagrams, interactive builders, tap models, worksheet previews, and printables; keep the parts manipulable wherever the learner is building a model.

Each lesson needs a brief, plain-language explanation of its main idea and why the rule works. For same-numerator comparisons, explain that both fractions count the same number of pieces, while a larger denominator makes more equal pieces, so each piece and the fraction are smaller.

**Why:** The user asked for simple, clear explanations in every lesson and specifically emphasized the relationship between a larger denominator and smaller pieces.

**How to apply:** Keep the explanation visible before practice and consistent in worked examples, hints, retry feedback, and read-aloud text. Do not rely on the picture alone to teach the rule.

Game wrong answers should receive the same supportive, specific feedback as lesson wrong answers.

**Why:** The user asked for wrong answers in games to be treated like wrong answers in lessons.

**How to apply:** Pair a kind opener with an explanation of the likely mistake and a useful next step, consistent with lesson retry feedback.

Solution keys belong in the grown-up area, not student print menus or practice sheets. Keep “My answers” available to students because it contains their own work. Prefer a gentle feminine-sounding speech voice when the device offers one, while keeping explanations matched to the requested language.

**Why:** The user chose adult-only answer-key access and asked for a gentler, smoother female voice.

**How to apply:** Keep answer keys out of student-facing print options and generated sheets; preserve student answer records. Browser voice catalogs differ, so voice selection is best-effort and should fall back to a language-matched system voice.

Coding missions should teach with multiple fraction models and a step-by-step explanation of how loops change the model. Track coding levels separately from fraction lesson mastery, and introduce Python as an optional next layer after block coding.

**Why:** The user asked for more coding examples, a loop walkthrough, separate coding progress that reflects passed challenges, and a gentler Python introduction for young learners.

**How to apply:** Use correct, model-linked examples; name each loop pass while learners step through it; report saved coding levels independently from worksheet, lesson, and star progress.

Coding challenge difficulty should grow by combining the existing blocks into more levels, not by adding new block types.

**Why:** The user chose a longer progression using the current blocks when asked how to make the coding challenges more advanced.

**How to apply:** Increase prediction, debugging, loop use, and transfer between fraction models while keeping the block vocabulary familiar.

In coding challenges, hints are diagnostic support, not evidence of independent success. Count and save progress only when the learner's run satisfies the full level requirements.

**Why:** The user explicitly required robot hints to support retries without awarding success or revealing a complete solution.

**How to apply:** Keep hint rendering separate from level-passing and progress-saving logic; a hint may guide one next step, but only a qualifying run can pass the challenge.

Seasonal themes (Halloween first) dress the app up without touching the math: Numi's costume, a night map with jack-o'-lantern nodes, candy points, a short Numi story line on questions, Frog Hop's moonlit swamp, and costumes earned by finishing lessons during the season.

**Why:** The user wanted fun characters and holiday themes so kids treat lessons as games rather than chores.

**How to apply:** Keep every theme cosmetic (`src/seasons.ts`, `src/season.css`, `:root[data-fq-season]`). Never change questions, answers, models or unlocking; keep cards and models light for readability; story lines must not contain numbers or hints. Grown-ups can turn themes off in Reading and display (`displayPreferences.seasonalThemes`), and high contrast skips the night background.

Story quest: each unit is a chapter where Numi and Hoot help a friend (Chomp, Pip, Tilly, Bolt, Bea). A 3-panel comic opens a lesson the first time it starts, the friend says a short line on questions, the reward shows a thank-you, and finishing a chapter unlocks its character card.

**Why:** The user wanted fun characters that make kids treat lessons as games rather than chores.

**How to apply:** Story is a frame only (`src/story.ts`, `src/story-ui.tsx`): it never changes questions, answers or unlocking, and cards come from lesson progress, not new saved state. Question lines must not contain numbers or hints. The comic always ends with an explicit button. Grown-ups can turn it off in Reading and display (`displayPreferences.storyMode`).

---
name: Full-course lesson smoke tests
description: Non-obvious rules for exercising all lessons through the developer selector without affecting saved learner progress.
---

For course-wide browser tests, use a fresh guest context and the developer lesson selector. Include each lesson's generated practice before its final authored question, complete any hands-on lesson-entry rounds, and verify the practice checkpoint plus unchanged browser storage after exiting the developer test.

**Why:** Developer previews intentionally isolate progress, some lessons require interactive rounds before question one, and generated questions are part of the displayed lesson sequence. Omitting those steps can hide regressions or pollute real learner data.

**How to apply:** Keep exhaustive browser coverage isolated by test context; mirror the displayed question order, handle lesson-entry gates, and compare browser storage before and after each developer lesson.

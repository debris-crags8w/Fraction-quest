---
name: Lesson-copy test resilience
description: Keep instructional-content tests robust when lesson wording changes without changing its mathematical meaning.
---

Tests for lesson explanations should lock the mathematical relationship and accessibility outcome, not one preferred synonym. Accept child-friendly language such as “top number” and “bottom number” alongside “numerator” and “denominator,” and equivalent descriptions of piece size.

**Why:** independently improved lesson copy can be correct while brittle phrase-level assertions fail; fraction markup can also render as separate numerator and denominator text nodes rather than a slash-delimited string.

**How to apply:** assert the key fraction values and relationships, allow semantically equivalent vocabulary, and align browser text checks with the rendered fraction structure and the exact text passed to read-aloud controls.

---
name: break-a-rule
description: Prove that a rule in docs/spec.md is really tested, by breaking the rule in the code on purpose and watching a test fail. Use after implementing a rule, or when a test passes and you are not sure it could ever fail.
argument-hint: '<the rule, in words>'
---

A test that has never failed proves nothing. This procedure checks one
rule from `docs/spec.md`.

Rule to check: $ARGUMENTS

1. Find the single place in the code that implements the rule.
2. Make the smallest edit that breaks it: flip a comparison, change a
   constant, delete a condition. Change one thing only.
3. Run the tests that should notice: `npm test` for domain rules,
   `npm run test:e2e` for rules enforced in SQL or over HTTP.
4. Read the result.
   - A test fails and its name describes the rule: the rule is covered.
   - Nothing fails, or only an unrelated test fails: the rule is not
     covered. Restore the code first, then write or fix the test, then
     repeat from step 2.
5. Restore the code with `git checkout -- <file>` and run `npm run check`.
   The working tree must be clean of the edit.
6. Add a row to the table "Rules broken on purpose" in `docs/ai-notes.md`:
   the rule, the edit, the test that failed. If step 4 found a gap, also
   add a row to "What went wrong".

Never commit the broken version.

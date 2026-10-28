# Review rules (AI review)

These rules are for the advisory AI review of every pull request. `scripts/check.py` already
enforces the mechanical part of each rule and blocks merging when it fails. The AI review covers what
a script cannot judge: meaning. Do not repeat problems that `check.py` would report; if you suspect
one, run `python3 scripts/check.py` and mention its output instead.

The reviewer does **not** judge whether the economics or finance content is correct. All content is
AI-generated and its accuracy cannot be verified by review. These rules are about consistency.

Terms: *source* = the Chinese version (root locale). *Translation* = the English version under
`src/content/docs/en/` and the `en` fields in `course/`.

## R1. Hidden forward references

A lesson must not rely on a concept that is taught later, unless it says so.

- Read the prose of each changed lesson. If it uses a concept (a term, a symbol, a result) that is
  not taught in this lesson or an earlier one according to `course/curriculum.yaml` and
  `course/concepts.yaml`, report it. Typical cases: saying "this is beta" in 0.3, or using a
  regression result before 0.5.
- An explicit forward reference is allowed only through `<Ref>` (which marks it as a later lesson)
  and only with a short sentence saying the learner does not need it yet.
- Check that the `uses` list of the lesson in `curriculum.yaml` is honest: every earlier concept the
  lesson relies on is listed, and nothing is listed that the lesson does not use.

## R2. Translation has the same meaning

`check.py` only proves that the translator saw the newest source. Check the meaning.

- Every sentence, number, condition, unit and formula in the source has an equivalent in the
  translation, and nothing is added. Pay special attention to question text: the conditions of a
  question must be identical in every language.
- The translation uses the canonical term from `course/concepts.yaml` for every concept.
- English text uses plain, standard English without idioms, so that second-language readers can
  follow it.

## R3. Questions are answerable with what has been taught

- Each check question can be answered with the content above it on the page and earlier lessons.
- Each quiz question can be answered with this lesson and earlier lessons.
- Review questions test only earlier lessons.
- Exam questions test only the lessons in the exam's block and earlier blocks.
- Any information a question needs beyond the lessons (data, tax rules, prices) is stated in the
  question itself.

## R4. Question, answer, rubric and common errors agree

For every changed question in `course/keys/`:

- The reference answer answers exactly the question as written (same numbers, same conditions).
- The rubric's point values add up to `points`, and every rubric item can be checked against an answer.
- If a question changed, the answer, rubric, `expected` values and `common_errors` were updated with it.
- `concepts` lists what the question actually tests.

## R5. Downstream impact

When a definition, a notation, a number or a named example changes, find every place that depends
on it: later lessons (`<Ref>` and `[[...]]` to this lesson, concepts with `defined_in` this lesson),
answer keys that reuse the example, and figure captions. Report places that were not updated.

## R6. Notation and units are consistent

- The same quantity uses the same symbol across lessons (for example, $w$ for a portfolio weight,
  $\sigma$ for a standard deviation, $\rho$ for a correlation).
- Units are written the same way (percentages in %, variance in %²).
- A symbol is defined before or where it is first used.

## R7. Figures match the text

- The caption's "Observe" sentence describes something the figure actually shows with its default
  or stated parameters.
- A question that tells the learner to set a slider names a value that the slider can reach.
- Fixed parameters in a widget (for example $\sigma_A = 20\%$) match the caption and the questions.

## R8. Time-sensitive facts

Tax rates, contribution limits, interest rates, fund fees, laws and other facts that change over
time must state the year and the source, and must not be written as permanently true. Report any
such fact without a date.

## R9. Not investment advice

Lesson text and answers must not tell the reader to buy, sell or hold a specific security or fund.
Teaching methods and analyzing examples is fine. Report wording that reads as a personal
recommendation.

## R10. Prompts stay self-contained

For changes to `src/scripts/prompts.ts` or to the data that prompts use:

- Every prompt still states that the content is AI-generated and may be wrong.
- Every prompt still contains all the content needed for the task, so that an assistant that cannot
  open URLs can still do it.
- The grading prompt still asks for the result block in the format that `src/scripts/profile.ts` parses.
- Grading prompts do not include the learner profile, and the learner's answers stay at the end.
- In key files, every fact a question needs from the lesson (example data, figure parameters) is in a
  context item that is tagged for that question or for a concept it tests. Otherwise the grader
  does not receive it.

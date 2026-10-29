# Learn Finance with AI (跟 AI 学金融)

A static course website. Lessons are MDX pages with interactive figures. The site never calls an AI:
for grading and explanations it builds a prompt that the learner copies into their own assistant.
All content is AI-generated; the site says so on every page and in every prompt.

## Layout

| Path | What it is |
| --- | --- |
| `course/curriculum.yaml` | Lesson order, ids, slugs, titles, summaries, `published`, `introduces`, `uses`. Single source of truth for order. |
| `course/concepts.yaml` | Concept registry: where each concept is defined and its canonical term in each language. |
| `course/keys/<id>.yaml` | Questions, reference answers, rubrics, common errors and lesson context for one lesson. Shown to learners only inside grading prompts. Context items are tagged with `concepts` or `questions`, and common errors with `questions`, so that a grading prompt contains only what concerns the questions being graded. |
| `course/verify/<id>.py` | Recomputes every numeric answer in the key file. |
| `course/widgets.yaml` | Slider ranges of interactive figures. |
| `course/translation-lock.json` | Hash of each Chinese source at the time it was last translated. Generated. |
| `src/content/docs/` | Chinese pages (source, root locale). `src/content/docs/en/` holds the English pages. |
| `src/components/` | `Ref`, `Def`, `Figure`, `Check`, `CheckAll`, `Exercises`, `CurriculumList`, `widgets/*`. |
| `src/scripts/` | Browser code: prompt templates, learning progress (localStorage), lesson status, selection "Explain this". |
| `scripts/check.py` | Blocking consistency checks (CI). |
| `.github/review-rules.md` | Rules for the advisory AI review of pull requests. |

## Commands

```bash
npm install
npm run dev          # local preview at http://localhost:4321/learn-finance-with-ai/
npm run build        # production build; fails on bad LaTeX or unknown question/reference ids
npm run check        # python3 scripts/check.py (needs PyYAML)
npm run i18n:lock    # after updating translations, record the Chinese sources as translated
```

Versions are pinned to Astro 5.12 and Starlight 0.34. Astro 7 replaced the Markdown pipeline
(Sätteri instead of remark/rehype), which affects `remark-math`, `rehype-katex` and
`src/plugins/remark-heading-id.mjs`. Upgrade in a separate pull request.

## Publishing a lesson from a lesson plan

The author writes private lesson plans elsewhere. A plan contains notes about one learner, revision
history and answers inline. To publish a finished lesson:

1. Add or update the lesson in `course/curriculum.yaml`: `summary`, `published: true`, `introduces`, `uses`.
2. Add every new concept to `course/concepts.yaml` (`defined_in`, `zh`, `en`, `short`).
3. Write `src/content/docs/lessons/<slug>.mdx` (Chinese) for a general reader:
   - remove everything about a specific learner. A mistake one learner made is not a "key point"
     or a "note" for everyone; keep it only if it is a common misconception, and then put it in
     `common_errors` rather than in the text;
   - the text, figure captions and summary never state the answer to a check question or an
     exercise, and no question only asks the learner to repeat an argument the text already makes.
     When an important result can be derived by the learner, the text sets up the question and
     points to the exercise (`<Ref check="Q1" />`) instead of giving the derivation;
   - leave out the learning goals and the review part of the plan; the page starts with the first section;
   - every `##` heading gets a stable id: `## 分散化 [#diversification]`;
   - mark each concept definition with `<Def id="...">canonical term</Def>`;
   - every reference to a lesson, section, figure, question or concept uses `<Ref ... />`;
   - figures: `<Figure id="6-1" title="..." observe="...">` around a widget component.
4. Move questions, answers, rubrics and common errors into `course/keys/<id>.yaml`. Tag each
   context item with the `concepts` or `questions` it serves (leave both out only for facts every
   question needs), and each common error with its `questions`. Any fact a question needs from the
   lesson (example data, figure parameters) must be in a context item tagged for that question.
   Place `<Check id="..."/>` (question text only) in the right section, `<CheckAll />` after the
   summary and `<Exercises />` at the end.
5. Put every numeric answer in `expected` and recompute it in `course/verify/<id>.py`.
6. Write the English page at `src/content/docs/en/lessons/<slug>.mdx` and every `en` field.
   Use plain, standard English without idioms. Formulas must be identical.
7. Run `npm run i18n:lock`, `npm run check`, `npm run build`.

## Rules that check.py enforces

- Every Chinese page and text field has an English version, and the English version was updated
  after the last change to the Chinese source (translation lock).
- Both language versions have the same heading ids, the same components with the same attributes
  in the same order, and the same formulas.
- No plain-text references such as "（0.4）", "见 4.5", "第 6 段", "question 4". Use `<Ref>` in MDX
  and `[[0.4]]`, `[[0.3#sec]]`, `[[concept:id]]`, `[[check:Q4]]`, `[[fig:6-1]]` in YAML text.
- References point to things that exist. Sections, figures and questions can only be referenced in
  published lessons.
- `uses` concepts come from earlier lessons; questions only test concepts taught so far; `<Def>` ids equal `introduces` and use the canonical term.
- Every check question appears exactly once, in the section named by its `section` field.
- `expected` values match `course/verify/` and appear in every language's answer text.
- Slider values named in questions are reachable; slider attributes match `course/widgets.yaml`.
- No private teaching notes (学员, 教案, 修订记录, briefing) in published content.
- Context items and common errors in key files refer to existing concepts and questions.
- A lesson with check questions contains
  `<CheckAll />` exactly once, and a lesson with
  exercises contains `<Exercises />` exactly once.
- Check questions and exercises have no `points`, and their rubrics do not mention points.
- Chinese text uses Chinese quotation marks and the word 提示词, has no space after full-width
  punctuation, and never ends a bold run with full-width punctuation directly before a character
  (write `**……正负**。` instead of `**……正负。**`, which Markdown does not render as bold).
- Every prompt template includes the AI-generated-content disclaimer in both languages.

## Terms

| 中文 | English | `kind` / component | Scored |
| --- | --- | --- | --- |
| 随堂题 | check question | `check`, `<Check>`, submitted by `<CheckAll>` | no ("ok" / "revise") |
| 练习题 | exercise | `exercise`, `<Exercises>` | no ("ok" / "revise") |
| 测验 | quiz | `quiz`, `<Quiz>` on the page `lessons/e<n>-quiz.mdx` (`E0`, `E1`, ...) | yes (points, total 100) |

## Prompts

- The site stores only learning progress: the latest result ("ok" / "revise") of each submitted
  question, in localStorage. It stores nothing else about the learner (no background, preferences,
  concept status or notes), has no progress page and no review feature, and no prompt contains
  anything about the learner.
- The course outline shows one status per lesson: not started (no question submitted), in progress
  (some submitted), done (all submitted, including questions that need revision).
- Answers are not entered on the site. Check questions are submitted together by
  `<CheckAll />` at the end of the lesson, and exercises by `<Exercises />`. The prompt ends with an
  empty "learner's answers" heading; the learner attaches a photo or types the answers after it.
- Check questions (随堂题) and exercises (练习题) are reviewed without scores: the result marks each
  one "ok" or "revise". Only the quizzes after a group of lessons (测验, `E0`, `E1`, ... in the
  curriculum) are scored: their questions have `points` (total 100), and the scoring prompt asks
  for a score per question with partial credit. A finished quiz shows its total in the outline.
- Each question shows its latest result next to its label ("not answered", "OK", "needs revision").
  There is no progress summary under the submit buttons.
- Learners may submit only some questions. The grader grades only the answered ones and lists only
  those in the result block; other questions keep their earlier result or stay "not answered".
- Buttons copy the prompt directly to the clipboard. The dialog is only a fallback.
- Explanation prompts contain the selected text, its paragraph, its section and the lesson context.
- In Chinese text, write 提示词, not "prompt" (checked).

## Writing a quiz

Quizzes follow the exam rules in the author's curriculum ("阶段考试"):

- Test understanding and use, not definitions or direct use of a formula. About 60–70% of the
  points are medium and 30–40% hard (`level` in the key; never shown on the page).
- Only lessons of the block and earlier; the questions carry no lesson or difficulty labels and no
  hints. The page starts with instructions and a formula sheet.
- Part 1 is true / false with reasons (both verdicts occur; no "uncertain") (`part: judge`); a verdict without a reason gets
  no points. Part 2 holds problems (`part: problem`), mostly chains of calculations at stage 0–3.
- Calculation questions require working; rubrics give partial credit and state the points per part.
- For each question, ask "can it be answered by recalling an example from a lesson?" and rework it
  if so: reverse the calculation, change one assumption, find the error in an analysis, construct a
  counterexample, or estimate an order of magnitude. Adapting an exercise with a new extension is fine.
- Every numeric answer is in `expected` and recomputed in `course/verify/E<n>.py`.
- The site's quizzes are for every learner; do not target one learner's weak points.

## Writing conventions

- Chinese is the source language. Technical terms get the English term in parentheses on first use.
- All formulas use LaTeX. Write currency as "12,000 美元" / "12,000 dollars" rather than with `$`.
- Calculations in percentage points; variance in %².
- Facts that change over time (tax rates, limits, rates) state the year and source.
- Never tell the reader to buy or sell a specific security.
- Chinese typography lives in `src/styles/custom.css` ("Chinese typography"): CJK fonts for
  quotation marks, smaller headings, justified text, math at 1.1em, no text below 14px.
- Numeric table columns are right-aligned (`---:`). Tables are three-line tables (三线表: top rule,
  rule below the header, bottom rule) and only as wide as their content.
- Use one separator per block: whitespace, a background or a border, not two. Figures have no frame
  (whitespace and caption only); question blocks have a background and no border.
- Widgets fit the page width: each draws a wide SVG (`viz-wide`, 640 wide) and a narrow one for
  phones (`viz-narrow`, 360 wide, same font sizes); a container query on the figure shows one.
  Long LaTeX formulas may overflow; the page itself must not scroll sideways.
- Text uses the system font smoothing (not `antialiased`) and body text one step stronger than
  Starlight's default (`--sl-color-text: var(--sl-color-gray-1)`).

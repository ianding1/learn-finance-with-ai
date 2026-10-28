# Learn Finance with AI (跟 AI 学金融)

A static course website. Lessons are MDX pages with interactive figures. The site never calls an AI:
for grading and explanations it builds a prompt that the learner copies into their own assistant.
All content is AI-generated; the site says so on every page and in every prompt.

## Layout

| Path | What it is |
| --- | --- |
| `course/curriculum.yaml` | Lesson order, ids, slugs, titles, summaries, `published`, `introduces`, `uses`. Single source of truth for order. |
| `course/concepts.yaml` | Concept registry: where each concept is defined and its canonical term in each language. |
| `course/keys/<id>.yaml` | Questions, reference answers, rubrics, common errors and lesson context for one lesson. Shown to learners only inside grading prompts. |
| `course/verify/<id>.py` | Recomputes every numeric answer in the key file. |
| `course/widgets.yaml` | Slider ranges of interactive figures. |
| `course/translation-lock.json` | Hash of each Chinese source at the time it was last translated. Generated. |
| `src/content/docs/` | Chinese pages (source, root locale). `src/content/docs/en/` holds the English pages. |
| `src/components/` | `Ref`, `Def`, `Figure`, `Check`, `Quiz`, `CurriculumList`, `ProfilePanel`, `widgets/*`. |
| `src/scripts/` | Browser code: prompt templates, learner profile (localStorage), selection "Explain this". |
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
   - remove everything about a specific learner; turn "the learner got this wrong" notes into
     general explanations or into `common_errors`;
   - every `##` heading gets a stable id: `## 分散化 [#diversification]`;
   - mark each concept definition with `<Def id="...">canonical term</Def>`;
   - every reference to a lesson, section, figure, question or concept uses `<Ref ... />`;
   - figures: `<Figure id="6-1" title="..." observe="...">` around a widget component.
4. Move questions, answers, rubrics and common errors into `course/keys/<id>.yaml`; place
   `<Check id="..."/>` in the right section and `<Quiz />` at the end.
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
- `uses` concepts come from earlier lessons; questions only test concepts taught so far; review
  questions only test earlier lessons; `<Def>` ids equal `introduces` and use the canonical term.
- Every review/check question appears exactly once, in the section named by its `section` field.
- `expected` values match `course/verify/` and appear in every language's answer text.
- Slider values named in questions are reachable; slider attributes match `course/widgets.yaml`.
- No private teaching notes (学员, 教案, 修订记录, briefing) in published content.
- Every prompt template includes the AI-generated-content disclaimer in both languages.

## Writing conventions

- Chinese is the source language. Technical terms get the English term in parentheses on first use.
- All formulas use LaTeX. Write currency as "12,000 美元" / "12,000 dollars" rather than with `$`.
- Calculations in percentage points; variance in %².
- Facts that change over time (tax rates, limits, rates) state the year and source.
- Never tell the reader to buy or sell a specific security.

// Prompt building. The wording of each prompt is in the locale modules (src/i18n/locales/<code>.ts);
// this file adds the language-independent parts. Every prompt must be self-contained: many assistants
// cannot open URLs, so all content needed for the task is written into the prompt itself.

import { LOCALES } from '../i18n/ui';
import type { ExplainInput, GradingInput, PromptParts } from '../i18n/types';

export type { ExplainInput, GradingInput, PromptQuestion } from '../i18n/types';

function parts(resultJson?: object): PromptParts {
	return {
		resultBlock: resultJson ? `<<<LFWAI-RESULT\n${JSON.stringify(resultJson)}\nLFWAI-RESULT>>>` : '',
		bullets: (xs) => xs.map((x) => `- ${x}`).join('\n'),
		fence: (s) => `"""\n${s.trim()}\n"""`,
	};
}

/**
 * Feedback prompt for check questions and exercises, or the scoring prompt for a quiz. It contains
 * nothing about the learner, so that each answer is judged on its own. The prompt ends where the
 * learner's answers begin; the learner may answer only some of the questions.
 */
export function gradingPrompt(i: GradingInput): string {
	const first = i.questions[0];
	const t = LOCALES[i.lang].prompts;
	if (i.questions.length && i.questions.every((q) => q.points != null)) {
		return t.quiz(i, parts({ v: 2, lesson: i.lessonId, items: [{ id: first.id, score: 0, max: first.points }] }));
	}
	// One example item only: listing every question would invite the AI to include all of them.
	return t.feedback(i, parts({ v: 2, lesson: i.lessonId, items: [{ id: first?.id ?? '', status: 'ok' }] }));
}

export function explainPrompt(i: ExplainInput): string {
	return LOCALES[i.lang].prompts.explain(i, parts());
}

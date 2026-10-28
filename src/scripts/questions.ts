// Client behavior for <CheckAll> and <Exercises>: copy the grading prompt, show which questions are
// already graded or reviewed, and save results. Answers are not entered on the site: the learner attaches a
// photo or types the answers after the copied prompt, and may submit only some questions at a time.
import { pageData, ui } from './page-data';
import { copyPrompt, flash } from './dialog';
import { gradingPrompt } from './prompts';
import { applyResult, loadProfile, parseResult } from './profile';

interface Payload {
	lessonId: string;
	lessonTitle: string;
	lessonUrl: string;
	context: string[];
	commonErrors: string[];
	conceptIds: Record<string, string>;
	questions: { id: string; label: string; points?: number; question: string; answer: string; rubric: string[] }[];
}

/** "2/3" for a scored question, "通过" / "需要订正" for an exercise. */
export function resultText(r: { score: number | null; max: number | null; status: 'ok' | 'revise' | null }): string {
	if (r.status) return ui(r.status === 'ok' ? 'statusOk' : 'statusRevise');
	return `${r.score ?? '?'}/${r.max ?? '?'}`;
}

let done = false;

export function initGradeGroups() {
	if (done) return;
	done = true;

	document.querySelectorAll<HTMLElement>('[data-lfwai-group]').forEach((group) => {
		const payload = JSON.parse(group.querySelector('[data-payload]')!.textContent || '{}') as Payload;
		const progress = group.querySelector<HTMLElement>('[data-progress]')!;
		const sep = pageData().lang === 'zh' ? '、' : ', ';
		const scored = payload.questions.every((q) => q.points != null);

		// Latest stored score of each question in this group. Questions without one are "not done yet".
		function renderProgress() {
			const results = loadProfile().results.filter((r) => r.lesson === payload.lessonId);
			const graded: string[] = [];
			const todo: string[] = [];
			for (const q of payload.questions) {
				const r = results.find((x) => x.id === q.id);
				if (r) graded.push(`${q.label} ${resultText(r)}`);
				else todo.push(q.label);
			}
			const parts: string[] = [];
			if (graded.length) parts.push(ui(scored ? 'progressDone' : 'progressReviewed') + graded.join(sep));
			if (graded.length && todo.length) parts.push(ui('progressTodo') + todo.join(sep));
			progress.textContent = parts.join(pageData().lang === 'zh' ? '；' : '; ');
			progress.hidden = parts.length === 0;
		}
		renderProgress();

		const btn = group.querySelector<HTMLElement>('[data-grade]')!;
		btn.addEventListener('click', () => {
			const text = gradingPrompt({
				lang: pageData().lang,
				lessonId: payload.lessonId,
				lessonTitle: payload.lessonTitle,
				lessonUrl: payload.lessonUrl,
				context: payload.context,
				commonErrors: payload.commonErrors,
				conceptIds: payload.conceptIds,
				questions: payload.questions,
			});
			copyPrompt(text, () => flash(btn, ui('copiedGrading')));
		});

		const resultArea = group.querySelector<HTMLTextAreaElement>('[data-result]')!;
		const status = group.querySelector<HTMLElement>('[data-status]')!;
		group.querySelector('[data-save]')!.addEventListener('click', () => {
			const r = parseResult(resultArea.value);
			if (!r) {
				status.textContent = ui('parseFailed');
				status.dataset.state = 'error';
				return;
			}
			// Only the questions in the result are updated; earlier scores of other questions stay.
			applyResult(r, new Set(Object.keys(pageData().concepts)));
			status.textContent = ui('saved');
			status.dataset.state = 'ok';
			resultArea.value = '';
			renderProgress();
		});
	});
}

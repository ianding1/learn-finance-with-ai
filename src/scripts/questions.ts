// Client behavior for <CheckAll> and <Exercises>: copy the grading prompt and save results. Every
// question on the page shows its latest result next to its label. Answers are not entered on the site: the learner attaches a
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

/** Show the latest result of each question on the page: not answered, score, or review status. */
function renderStatuses() {
	const lessonId = pageData().lesson?.id;
	const results = loadProfile().results.filter((r) => r.lesson === lessonId);
	document.querySelectorAll<HTMLElement>('[data-q-status]').forEach((el) => {
		const r = results.find((x) => x.id === el.dataset.qStatus);
		const points = el.parentElement?.querySelector<HTMLElement>('.lfwai-q-points');
		let state = 'none';
		let text = ui('notAnswered');
		if (r?.status) {
			state = r.status;
			text = r.status === 'ok' ? `✓ ${ui('statusOk')}` : ui('statusRevise');
		} else if (r && r.score != null) {
			const max = r.max ?? NaN;
			state = r.score >= max ? 'full' : r.score <= 0 ? 'wrong' : 'partial';
			const mark = state === 'full' ? '✓ ' : state === 'wrong' ? '✗ ' : '';
			text = mark + ui('scoreOf', { s: r.score, m: r.max ?? '?' });
		}
		el.textContent = text;
		el.dataset.state = state;
		el.hidden = false;
		// A graded question shows its score instead of the maximum.
		if (points) points.hidden = state !== 'none';
	});
}

let done = false;

export function initGradeGroups() {
	if (done) return;
	done = true;
	renderStatuses();

	document.querySelectorAll<HTMLElement>('[data-lfwai-group]').forEach((group) => {
		const payload = JSON.parse(group.querySelector('[data-payload]')!.textContent || '{}') as Payload;
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
			renderStatuses();
		});
	});
}

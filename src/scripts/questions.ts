// Client behavior for <CheckAll> and <Exercises>: copy the grading prompt and save results. Every
// question on the page shows its latest result next to its label. Answers are not entered on the site: the learner attaches a
// photo or types the answers after the copied prompt, and may submit only some questions at a time.
import { pageData, ui } from './page-data';
import { copyPrompt, flash } from './dialog';
import { gradingPrompt } from './prompts';
import { applyResult, loadProgress, parseResult, type ResultItem } from './profile';

interface Payload {
	lessonId: string;
	lessonTitle: string;
	lessonUrl: string;
	context: string[];
	commonErrors: string[];
	questions: { id: string; label: string; points?: number; question: string; answer: string; rubric: string[] }[];
}

/** "OK" / "needs revision" for a lesson question, "3/4 points" for a quiz question. */
export function resultText(r: ResultItem): string {
	if (r.score != null) return ui('scoreOf', { s: r.score, m: r.max ?? '?' });
	return ui(r.status === 'ok' ? 'statusOk' : 'statusRevise');
}

/** Show the latest result of each question on the page: not answered, OK / needs revision, or a score. */
function renderStatuses() {
	const lessonId = pageData().lesson?.id;
	const results = loadProgress().results.filter((r) => r.lesson === lessonId);
	document.querySelectorAll<HTMLElement>('[data-q-status]').forEach((el) => {
		const r = results.find((x) => x.id === el.dataset.qStatus);
		let state = 'none';
		let text = ui('notAnswered');
		if (r?.score != null) {
			const max = r.max ?? NaN;
			state = r.score >= max ? 'full' : r.score <= 0 ? 'wrong' : 'partial';
			text = (state === 'full' ? '✓ ' : '') + resultText(r);
		} else if (r?.status) {
			state = r.status;
			text = r.status === 'ok' ? `✓ ${ui('statusOk')}` : ui('statusRevise');
		}
		el.textContent = text;
		el.dataset.state = state;
		el.hidden = false;
		// A scored question shows its score instead of its maximum.
		const points = el.parentElement?.querySelector<HTMLElement>('.lfwai-q-points');
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
			// Only the questions in the result are updated; other questions keep their earlier result.
			applyResult(r);
			status.textContent = ui('saved');
			status.dataset.state = 'ok';
			resultArea.value = '';
			renderStatuses();
		});
	});
}

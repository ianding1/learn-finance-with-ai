// Client behavior for <CheckAll> and <Exercises>: copy the grading prompt and save results. Every
// question on the page shows its latest result next to its label. Answers are not entered on the site: the learner attaches a
// photo or types the answers after the copied prompt, and may submit only some questions at a time.
import { pageData, ui } from './page-data';
import { copyPrompt, flash } from './dialog';
import { gradingPrompt } from './prompts';
import { applyResult, loadProgress, parseResult, type QuestionStatus } from './profile';

interface Payload {
	lessonId: string;
	lessonTitle: string;
	lessonUrl: string;
	context: string[];
	commonErrors: string[];
	questions: { id: string; label: string; question: string; answer: string; rubric: string[] }[];
}

/** "通过" / "需要订正" */
export function resultText(r: { status: QuestionStatus }): string {
	return ui(r.status === 'ok' ? 'statusOk' : 'statusRevise');
}

/** Show the latest result of each question on the page: not answered, OK or needs revision. */
function renderStatuses() {
	const lessonId = pageData().lesson?.id;
	const results = loadProgress().results.filter((r) => r.lesson === lessonId);
	document.querySelectorAll<HTMLElement>('[data-q-status]').forEach((el) => {
		const r = results.find((x) => x.id === el.dataset.qStatus);
		el.textContent = !r ? ui('notAnswered') : r.status === 'ok' ? `✓ ${ui('statusOk')}` : ui('statusRevise');
		el.dataset.state = r ? r.status : 'none';
		el.hidden = false;
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

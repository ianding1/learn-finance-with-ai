// Client behavior for <Check>, <CheckAll> and <Quiz>: keep typed answer drafts, build grading
// prompts, save results. Typed answers are optional: learners who write by hand attach a photo
// after the prompt, and the prompt tells the grader where to find the answers.
import { pageData, ui } from './page-data';
import { showPrompt } from './dialog';
import { gradingPrompt } from './prompts';
import { applyResult, parseResult } from './profile';

interface Payload {
	lessonId: string;
	lessonTitle: string;
	lessonUrl: string;
	context: string[];
	commonErrors: string[];
	conceptIds: Record<string, string>;
	questions: { id: string; label: string; points: number; question: string; answer: string; rubric: string[] }[];
}

const draftKey = (lesson: string, id: string) => `lfwai.draft.${lesson}.${id}`;

function safeGet(k: string) {
	try {
		return localStorage.getItem(k) ?? '';
	} catch {
		return '';
	}
}
function safeSet(k: string, v: string) {
	try {
		localStorage.setItem(k, v);
	} catch {
		/* storage unavailable: drafts are simply not kept */
	}
}

let done = false;

export function initGradeGroups() {
	if (done) return;
	done = true;

	// Answer boxes: one per question on the page. Restore drafts and open boxes that have one.
	const lesson = pageData().lesson?.id ?? '';
	document.querySelectorAll<HTMLTextAreaElement>('[data-answer-for]').forEach((ta) => {
		const key = draftKey(lesson, ta.dataset.answerFor!);
		ta.value = safeGet(key);
		if (ta.value) ta.closest('details')?.setAttribute('open', '');
		ta.addEventListener('input', () => safeSet(key, ta.value));
	});
	const typedAnswer = (id: string) =>
		document.querySelector<HTMLTextAreaElement>(`[data-answer-for="${id}"]`)?.value ?? '';

	document.querySelectorAll<HTMLElement>('[data-lfwai-group]').forEach((group) => {
		const payload = JSON.parse(group.querySelector('[data-payload]')!.textContent || '{}') as Payload;

		group.querySelector('[data-grade]')!.addEventListener('click', () => {
			showPrompt(
				gradingPrompt({
					lang: pageData().lang,
					lessonId: payload.lessonId,
					lessonTitle: payload.lessonTitle,
					lessonUrl: payload.lessonUrl,
					context: payload.context,
					commonErrors: payload.commonErrors,
					conceptIds: payload.conceptIds,
					questions: payload.questions.map((q) => ({ ...q, learnerAnswer: typedAnswer(q.id) })),
				}),
			);
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
			applyResult(r, new Set(Object.keys(pageData().concepts)));
			const total = r.items.reduce((s, i) => s + i.score, 0);
			const max = r.items.reduce((s, i) => s + i.max, 0);
			status.textContent = `${ui('saved')} ${total}/${max}`;
			status.dataset.state = 'ok';
			resultArea.value = '';
		});
	});
}

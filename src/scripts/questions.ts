// Client behavior for <Check> and <Quiz>: keep answer drafts, build grading prompts, save results.
import { pageData, ui } from './page-data';
import { showPrompt } from './dialog';
import { gradingPrompt } from './prompts';
import { applyResult, loadProfile, parseResult, profileSummary } from './profile';

interface Payload {
	lessonId: string;
	lessonTitle: string;
	lessonUrl: string;
	context: string;
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
	document.querySelectorAll<HTMLElement>('[data-lfwai-group]').forEach((group) => {
		const payload = JSON.parse(group.querySelector('[data-payload]')!.textContent || '{}') as Payload;
		const answers = new Map<string, HTMLTextAreaElement>();
		group.querySelectorAll<HTMLTextAreaElement>('[data-answer-for]').forEach((ta) => {
			const id = ta.dataset.answerFor!;
			answers.set(id, ta);
			ta.value = safeGet(draftKey(payload.lessonId, id));
			ta.addEventListener('input', () => safeSet(draftKey(payload.lessonId, id), ta.value));
		});

		group.querySelector('[data-grade]')!.addEventListener('click', () => {
			const data = pageData();
			showPrompt(
				gradingPrompt({
					lang: data.lang,
					lessonId: payload.lessonId,
					lessonTitle: payload.lessonTitle,
					lessonUrl: payload.lessonUrl,
					context: payload.context,
					commonErrors: payload.commonErrors,
					conceptIds: payload.conceptIds,
					profile: profileSummary(loadProfile(), data.concepts, data.lang),
					emptyAnswer: ui('emptyAnswer'),
					questions: payload.questions.map((q) => ({ ...q, learnerAnswer: answers.get(q.id)?.value ?? '' })),
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

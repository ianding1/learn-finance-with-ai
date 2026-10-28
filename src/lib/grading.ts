// Build-time helpers shared by Check.astro and Quiz.astro.
import { t, type Lang } from '../i18n/ui';
import { lesson, lessonKey, concepts, absolute, lessonPath, plainRich, type Question } from './course';

export function questionLabel(q: Question, lang: Lang, n?: number): string {
	if (q.kind === 'review') return t(lang, 'review', { id: q.id });
	if (q.kind === 'check') return t(lang, 'check', { id: q.id });
	return t(lang, 'quizItem', { n: n ?? q.id.replace(/\D/g, '') });
}

/** JSON payload that the client needs to build a grading prompt for a group of questions. */
export function gradingPayload(lessonId: string, qs: Question[], lang: Lang) {
	const l = lesson(lessonId);
	const key = lessonKey(lessonId)!;
	const ids = new Set<string>([...(l.introduces ?? []), ...(l.uses ?? []), ...qs.flatMap((q) => q.concepts)]);
	const all = concepts();
	return {
		lessonId,
		lessonTitle: l.title[lang],
		lessonUrl: absolute(lessonPath(l, lang)),
		context: plainRich(key.context[lang], lang, lessonId),
		commonErrors: key.common_errors[lang].map((e) => plainRich(e, lang, lessonId)),
		conceptIds: Object.fromEntries([...ids].filter((id) => all[id]).map((id) => [id, all[id][lang]])),
		questions: qs.map((q, i) => ({
			id: q.id,
			label: questionLabel(q, lang, i + 1),
			points: q.points,
			question: plainRich(q.question[lang], lang, lessonId),
			answer: plainRich(q.answer[lang], lang, lessonId),
			rubric: q.rubric[lang].map((r) => plainRich(r, lang, lessonId)),
		})),
	};
}

export const toJson = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c');

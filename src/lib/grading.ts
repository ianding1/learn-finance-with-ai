// Build-time helpers shared by Check.astro, CheckAll.astro and Exercises.astro.
import { t, type Lang } from '../i18n/ui';
import {
	lesson,
	lessonKey,
	concepts,
	absolute,
	lessonPath,
	plainRich,
	contextFor,
	errorsFor,
	type Question,
} from './course';

export function questionLabel(q: Question, lang: Lang, n?: number): string {
	if (q.kind === 'check') return t(lang, 'check', { id: q.id });
	return t(lang, 'exerciseItem', { n: n ?? q.id.replace(/\D/g, '') });
}

/**
 * JSON payload that the client needs to build a grading prompt for a group of questions.
 * Only the context, common errors and concept ids that concern these questions are included,
 * so that the grader is not distracted by material about other questions.
 */
export function gradingPayload(lessonId: string, qs: Question[], lang: Lang) {
	const l = lesson(lessonId);
	const key = lessonKey(lessonId)!;
	const all = concepts();
	const ids = [...new Set(qs.flatMap((q) => q.concepts))].filter((id) => all[id]);
	const exerciseNumber = new Map(key.questions.filter((q) => q.kind === 'exercise').map((q, i) => [q.id, i + 1]));
	return {
		lessonId,
		lessonTitle: l.title[lang],
		lessonUrl: absolute(lessonPath(l, lang)),
		context: contextFor(key, qs).map((c) => plainRich(c[lang], lang, lessonId)),
		commonErrors: errorsFor(key, qs).map((e) => plainRich(e[lang], lang, lessonId)),
		conceptIds: Object.fromEntries(ids.map((id) => [id, all[id][lang]])),
		questions: qs.map((q) => ({
			id: q.id,
			label: questionLabel(q, lang, exerciseNumber.get(q.id)),
			// Exercises have no points; the prompt then asks for a review without scores.
			points: q.kind === 'exercise' ? undefined : q.points,
			question: plainRich(q.question[lang], lang, lessonId),
			answer: plainRich(q.answer[lang], lang, lessonId),
			rubric: q.rubric[lang].map((r) => plainRich(r, lang, lessonId)),
		})),
	};
}

export const toJson = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c');

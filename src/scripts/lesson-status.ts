// Status of each lesson in the course outline, from the stored progress:
// not started (no question submitted), in progress (some submitted), done (all submitted,
// including questions that need revision). A finished quiz also shows its total score.
import { ui } from './page-data';
import { loadProgress } from './profile';

export function initLessonStatus() {
	const results = loadProgress().results;
	document.querySelectorAll<HTMLElement>('[data-lesson-status]').forEach((el) => {
		const lesson = el.dataset.lessonStatus!;
		const ids = (el.dataset.questions || '').split(',').filter(Boolean);
		const mine = results.filter((r) => r.lesson === lesson && ids.includes(r.id));
		const state = mine.length === 0 ? 'none' : mine.length < ids.length ? 'progress' : 'done';
		let text = ui(state === 'none' ? 'lessonNotStarted' : state === 'progress' ? 'lessonInProgress' : 'lessonDone');
		const scored = mine.filter((r) => r.score != null);
		if (state === 'done' && scored.length === mine.length && scored.length > 0) {
			const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
			text += ' · ' + ui('scoreOf', { s: sum(scored.map((r) => r.score!)), m: sum(scored.map((r) => r.max ?? 0)) });
		}
		el.textContent = text;
		el.dataset.state = state;
		el.hidden = false;
	});
}

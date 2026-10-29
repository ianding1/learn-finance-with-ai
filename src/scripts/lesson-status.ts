// Status of each lesson in the course outline, from the stored progress:
// not started (no question submitted), in progress (some submitted), done (all submitted,
// including questions that need revision).
import { ui } from './page-data';
import { loadProgress } from './profile';

export function initLessonStatus() {
	const results = loadProgress().results;
	document.querySelectorAll<HTMLElement>('[data-lesson-status]').forEach((el) => {
		const lesson = el.dataset.lessonStatus!;
		const ids = (el.dataset.questions || '').split(',').filter(Boolean);
		const done = new Set(results.filter((r) => r.lesson === lesson).map((r) => r.id));
		const n = ids.filter((id) => done.has(id)).length;
		const state = n === 0 ? 'none' : n < ids.length ? 'progress' : 'done';
		el.textContent = ui(state === 'none' ? 'lessonNotStarted' : state === 'progress' ? 'lessonInProgress' : 'lessonDone');
		el.dataset.state = state;
		el.hidden = false;
	});
}

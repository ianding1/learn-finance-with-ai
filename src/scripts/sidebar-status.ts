// Status of each lesson in the sidebar, from the stored progress: not started (no question
// submitted), in progress (some submitted), done (all submitted, including questions that need
// revision). A finished quiz shows its total score instead of the mark.
import { loadProgress } from './profile';

interface SidebarData {
	labels: { none: string; progress: string; done: string; score: string };
	lessons: { id: string; href: string; questions: string[] }[];
}

function render(data: SidebarData) {
	const results = loadProgress().results;
	const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
	for (const l of data.lessons) {
		const link = document.querySelector<HTMLAnchorElement>(`.sidebar-content a[href="${l.href}"]`);
		if (!link) continue;
		const mine = results.filter((r) => r.lesson === l.id && l.questions.includes(r.id));
		const state = mine.length === 0 ? 'none' : mine.length < l.questions.length ? 'progress' : 'done';
		let mark = link.querySelector<HTMLElement>('.lfwai-mark');
		if (!mark) {
			mark = document.createElement('span');
			mark.className = 'lfwai-mark';
			link.append(mark);
		}
		const scored = mine.filter((r) => r.score != null);
		const score =
			state === 'done' && scored.length === mine.length && scored.length > 0
				? data.labels.score.replace('{s}', String(sum(scored.map((r) => r.score!)))).replace('{m}', String(sum(scored.map((r) => r.max ?? 0))))
				: '';
		mark.dataset.state = score ? 'score' : state;
		mark.textContent = score;
		const label = score ? `${data.labels.done} · ${score}` : data.labels[state];
		mark.title = label;
		mark.setAttribute('role', 'img');
		mark.setAttribute('aria-label', label);
	}
}

export function initSidebarStatus() {
	const el = document.getElementById('lfwai-sidebar-data');
	if (!el) return;
	const data = JSON.parse(el.textContent || '{}') as SidebarData;
	render(data);
	// Results saved on this page update the marks at once; other tabs update through 'storage'.
	window.addEventListener('lfwai:progress', () => render(data));
	window.addEventListener('storage', () => render(data));
}

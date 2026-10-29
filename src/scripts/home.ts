// Home page: once the learner has submitted answers, the start button leads to the first lesson
// (in course order) whose questions are not all submitted.
import { loadProgress } from './profile';

interface HomeData {
	label: string;
	lessons: { id: string; title: string; href: string; questions: string[] }[];
}

export function initHome() {
	const el = document.getElementById('lfwai-home-data');
	const button = document.querySelector<HTMLAnchorElement>('[data-start]');
	if (!el || !button) return;
	const data = JSON.parse(el.textContent || '{}') as HomeData;
	const results = loadProgress().results;
	if (results.length === 0) return;
	const next = data.lessons.find((l) => {
		const done = new Set(results.filter((r) => r.lesson === l.id).map((r) => r.id));
		return l.questions.some((q) => !done.has(q));
	});
	if (!next) return;
	button.href = next.href;
	button.textContent = data.label.replace('{title}', next.title);
}

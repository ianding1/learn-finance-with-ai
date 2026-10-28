// Client behavior for <Review />: pick the concepts to review and copy the review prompt.
import { pageData, ui } from './page-data';
import { copyPrompt, flash } from './dialog';
import { reviewPrompt, type ReviewConcept } from './prompts';
import { aboutMe, loadProfile } from './profile';

interface Data {
	reviewable: Record<string, ReviewConcept>;
	prereqs: string[];
}

/** At most this many concepts go into one review, so the review stays short. */
const MAX = 5;

export function initReview() {
	const root = document.querySelector<HTMLElement>('[data-review]');
	if (!root) return;
	const data = JSON.parse(root.querySelector('[data-review-data]')!.textContent || '{}') as Data;
	const page = pageData();
	const focusEl = root.querySelector<HTMLElement>('[data-review-focus]')!;

	function pick(): { ids: string[]; fromProfile: boolean } {
		const p = loadProfile();
		const weak = Object.entries(p.concepts)
			.filter(([id, c]) => c.status === 'weak' && data.reviewable[id])
			.sort((a, b) => b[1].ts.localeCompare(a[1].ts))
			.map(([id]) => id)
			.slice(0, MAX);
		if (weak.length) return { ids: weak, fromProfile: true };
		return { ids: data.prereqs.filter((id) => data.reviewable[id]).slice(0, MAX), fromProfile: false };
	}

	const { ids, fromProfile } = pick();
	if (fromProfile) {
		focusEl.textContent = ui('reviewFocus') + ids.map((id) => data.reviewable[id].name).join(page.lang === 'zh' ? '、' : ', ');
		focusEl.hidden = false;
	}

	const btn = root.querySelector<HTMLElement>('[data-review-copy]')!;
	btn.addEventListener('click', () => {
		const now = pick();
		const p = loadProfile();
		const text = reviewPrompt({
			lang: page.lang,
			lessonId: page.lesson?.id ?? '',
			lessonTitle: page.lesson?.title ?? page.pageTitle,
			pageUrl: page.pageUrl,
			concepts: now.ids.map((id) => data.reviewable[id]),
			fromProfile: now.fromProfile,
			aboutMe: p.includeInPrompts ? aboutMe(p, page.concepts, page.lang, []) : '',
		});
		copyPrompt(text, () => flash(btn, ui('copiedGrading')));
	});
}

// Client behavior for the learner profile page (ProfilePanel.astro).
import { pageData, ui } from './page-data';
import { showPrompt } from './dialog';
import { sessionPrompt } from './prompts';
import {
	applyResult,
	importProfile,
	loadProfile,
	parseResult,
	profileSummary,
	resetProfile,
	saveProfile,
} from './profile';

export function initProfilePage() {
	const root = document.querySelector<HTMLElement>('[data-profile]');
	if (!root) return;
	const panel: HTMLElement = root;

	const L = JSON.parse(panel.dataset.labels || '{}') as Record<string, string>;
	const data = pageData();
	const names = data.concepts;

	function q<T extends Element>(sel: string): T {
		return panel.querySelector(sel) as T;
	}
	function status(name: string, text: string) {
		q<HTMLElement>(`[data-status="${name}"]`).textContent = text;
	}

	function render() {
		const p = loadProfile();
		q<HTMLTextAreaElement>('[data-field="background"]').value = p.background;
		q<HTMLTextAreaElement>('[data-field="preferences"]').value = p.preferences;

		const box = q<HTMLElement>('[data-results]');
		box.replaceChildren();
		if (!p.results.length) {
			box.textContent = L.none;
		} else {
			const table = document.createElement('table');
			const head = table.createTHead().insertRow();
			for (const h of [L.lesson, L.question, L.score, L.date]) {
				const th = document.createElement('th');
				th.textContent = h;
				head.appendChild(th);
			}
			const body = table.createTBody();
			const sorted = [...p.results].sort((a, b) => b.ts.localeCompare(a.ts));
			for (const r of sorted) {
				const row = body.insertRow();
				for (const v of [r.lesson, r.id, `${r.score}/${r.max}`, r.ts.slice(0, 10)]) {
					row.insertCell().textContent = v;
				}
			}
			box.appendChild(table);
		}

		for (const kind of ['weak', 'mastered']) {
			const list = Object.entries(p.concepts)
				.filter(([, c]) => c.status === kind)
				.map(([id]) => names[id] ?? id);
			const sep = data.lang === 'zh' ? '、' : ', ';
			q<HTMLElement>(`[data-concepts="${kind}"]`).textContent = list.length ? list.join(sep) : L.none;
		}

		const notes = q<HTMLElement>('[data-notes]');
		notes.replaceChildren();
		for (const n of [...p.notes].reverse()) {
			const li = document.createElement('li');
			li.textContent = `${n.lesson}: ${n.text}`;
			notes.appendChild(li);
		}
	}

	q('[data-action="save"]').addEventListener('click', () => {
		const p = loadProfile();
		p.background = q<HTMLTextAreaElement>('[data-field="background"]').value;
		p.preferences = q<HTMLTextAreaElement>('[data-field="preferences"]').value;
		saveProfile(p);
		status('about', L.saved);
	});

	q('[data-action="paste"]').addEventListener('click', () => {
		const area = q<HTMLTextAreaElement>('[data-paste]');
		const r = parseResult(area.value);
		if (!r) {
			status('paste', ui('parseFailed'));
			return;
		}
		applyResult(r, new Set(Object.keys(names)));
		area.value = '';
		status('paste', ui('saved'));
		render();
	});

	q('[data-action="session"]').addEventListener('click', () => {
		showPrompt(sessionPrompt(data.lang, data.site, profileSummary(loadProfile(), names, data.lang)));
	});

	q('[data-action="export"]').addEventListener('click', () => {
		const blob = new Blob([JSON.stringify(loadProfile(), null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `learn-finance-with-ai-profile-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	});

	q<HTMLInputElement>('[data-import]').addEventListener('change', async (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			importProfile(await file.text());
			status('backup', L.imported);
			render();
		} catch {
			status('backup', L.importFailed);
		}
	});

	q('[data-action="reset"]').addEventListener('click', () => {
		if (!confirm(L.confirmReset)) return;
		resetProfile();
		render();
	});

	render();
}

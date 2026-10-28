// Learner profile stored in the browser (localStorage). It never leaves the device unless
// the learner exports it or copies a prompt that contains its summary.

const KEY = 'lfwai.profile.v1';

export interface ResultItem {
	lesson: string;
	id: string;
	score: number;
	max: number;
	ts: string;
}

export interface Profile {
	v: 1;
	background: string;
	preferences: string;
	results: ResultItem[];
	/** concept id -> latest status reported by a grader */
	concepts: Record<string, { status: 'weak' | 'mastered'; ts: string }>;
	notes: { lesson: string; text: string; ts: string }[];
}

export function emptyProfile(): Profile {
	return { v: 1, background: '', preferences: '', results: [], concepts: {}, notes: [] };
}

function normalize(raw: any): Profile {
	const p = emptyProfile();
	if (!raw || typeof raw !== 'object') return p;
	if (typeof raw.background === 'string') p.background = raw.background;
	if (typeof raw.preferences === 'string') p.preferences = raw.preferences;
	if (Array.isArray(raw.results)) {
		p.results = raw.results
			.filter((r: any) => r && typeof r.id === 'string' && typeof r.lesson === 'string')
			.map((r: any) => ({
				lesson: r.lesson,
				id: r.id,
				score: Number(r.score) || 0,
				max: Number(r.max) || 0,
				ts: String(r.ts || ''),
			}));
	}
	if (raw.concepts && typeof raw.concepts === 'object') {
		for (const [id, c] of Object.entries<any>(raw.concepts)) {
			if (c && (c.status === 'weak' || c.status === 'mastered')) p.concepts[id] = { status: c.status, ts: String(c.ts || '') };
		}
	}
	if (Array.isArray(raw.notes)) {
		p.notes = raw.notes
			.filter((n: any) => n && typeof n.text === 'string')
			.map((n: any) => ({ lesson: String(n.lesson || ''), text: n.text, ts: String(n.ts || '') }));
	}
	return p;
}

export function loadProfile(): Profile {
	try {
		const s = localStorage.getItem(KEY);
		return s ? normalize(JSON.parse(s)) : emptyProfile();
	} catch {
		return emptyProfile();
	}
}

export function saveProfile(p: Profile): boolean {
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
		return true;
	} catch {
		return false;
	}
}

export function importProfile(json: string): Profile {
	const p = normalize(JSON.parse(json));
	saveProfile(p);
	return p;
}

export function resetProfile() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		/* storage unavailable */
	}
}

// ---------- Result blocks returned by the grading AI ----------

export interface GradeResult {
	lesson: string;
	items: { id: string; score: number; max: number }[];
	mastered: string[];
	weak: string[];
	note: string;
}

/**
 * Find and parse the result block in an AI reply. Tolerates code fences, smart quotes,
 * missing markers and trailing commas, because different assistants format output differently.
 */
export function parseResult(text: string): GradeResult | null {
	let body = text;
	const m = text.match(/<<<\s*LFWAI-RESULT([\s\S]*?)LFWAI-RESULT\s*>>>/);
	if (m) body = m[1];
	const start = body.indexOf('{');
	const end = body.lastIndexOf('}');
	if (start < 0 || end <= start) return null;
	let json = body
		.slice(start, end + 1)
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/,\s*([}\]])/g, '$1');
	let raw: any;
	try {
		raw = JSON.parse(json);
	} catch {
		return null;
	}
	if (!raw || typeof raw.lesson !== 'string' || !Array.isArray(raw.items)) return null;
	const strList = (x: any) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string') : []);
	return {
		lesson: raw.lesson,
		items: raw.items
			.filter((i: any) => i && typeof i.id === 'string')
			.map((i: any) => ({ id: i.id, score: Number(i.score) || 0, max: Number(i.max) || 0 })),
		mastered: strList(raw.mastered),
		weak: strList(raw.weak),
		note: typeof raw.note === 'string' ? raw.note : '',
	};
}

/** Merge a grading result into the stored profile. Unknown concept ids are ignored. */
export function applyResult(r: GradeResult, knownConcepts: Set<string>): Profile {
	const p = loadProfile();
	const ts = new Date().toISOString();
	for (const item of r.items) {
		p.results = p.results.filter((x) => !(x.lesson === r.lesson && x.id === item.id));
		p.results.push({ lesson: r.lesson, id: item.id, score: item.score, max: item.max, ts });
	}
	for (const id of r.mastered) if (knownConcepts.has(id)) p.concepts[id] = { status: 'mastered', ts };
	for (const id of r.weak) if (knownConcepts.has(id)) p.concepts[id] = { status: 'weak', ts };
	if (r.note.trim()) {
		p.notes.push({ lesson: r.lesson, text: r.note.trim().slice(0, 500), ts });
		p.notes = p.notes.slice(-10);
	}
	saveProfile(p);
	return p;
}

/** Short profile summary placed in every prompt. Kept small on purpose. */
export function profileSummary(p: Profile, conceptNames: Record<string, string>, lang: 'zh' | 'en'): string {
	const zh = lang === 'zh';
	const lines: string[] = [];
	if (p.background.trim()) lines.push((zh ? '背景：' : 'Background: ') + p.background.trim().slice(0, 300));
	if (p.preferences.trim()) lines.push((zh ? '学习偏好：' : 'Learning preferences: ') + p.preferences.trim().slice(0, 300));
	const weak = Object.entries(p.concepts)
		.filter(([, c]) => c.status === 'weak')
		.map(([id]) => conceptNames[id] ?? id);
	if (weak.length) lines.push((zh ? '目前的薄弱概念：' : 'Concepts currently weak: ') + weak.join(zh ? '、' : ', '));
	const recent = [...p.results].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 6);
	if (recent.length)
		lines.push(
			(zh ? '最近的得分：' : 'Recent scores: ') +
				recent.map((r) => `${r.lesson} ${r.id} ${r.score}/${r.max}`).join(zh ? '；' : '; '),
		);
	const note = p.notes[p.notes.length - 1];
	if (note) lines.push((zh ? '上次评卷的备注：' : 'Note from the last grading: ') + note.text.slice(0, 200));
	if (!lines.length) return zh ? '（学习者还没有学习档案。）' : '(The learner has no profile yet.)';
	return lines.join('\n');
}

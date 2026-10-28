// Learner profile stored in the browser (localStorage). It never leaves the device unless
// the learner exports it or copies a prompt that contains its summary.

const KEY = 'lfwai.profile.v1';

/** Latest result of one question. Scored questions have score/max; exercises have status. */
export interface ResultItem {
	lesson: string;
	id: string;
	score: number | null;
	max: number | null;
	status: ExerciseStatus | null;
	ts: string;
}

export type ExerciseStatus = 'ok' | 'revise';

const num = (x: any): number | null => (x == null || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
const statusOf = (x: any): ExerciseStatus | null => (x === 'ok' || x === 'revise' ? x : null);

export interface Profile {
	v: 1;
	background: string;
	preferences: string;
	/** include background, preferences and concepts to practice in explanation prompts */
	includeInPrompts: boolean;
	results: ResultItem[];
	/** concept id -> latest status reported by a grader */
	concepts: Record<string, { status: 'weak' | 'mastered'; ts: string }>;
	notes: { lesson: string; text: string; ts: string }[];
}

export function emptyProfile(): Profile {
	return { v: 1, background: '', preferences: '', includeInPrompts: true, results: [], concepts: {}, notes: [] };
}

function normalize(raw: any): Profile {
	const p = emptyProfile();
	if (!raw || typeof raw !== 'object') return p;
	if (typeof raw.background === 'string') p.background = raw.background;
	if (typeof raw.preferences === 'string') p.preferences = raw.preferences;
	if (typeof raw.includeInPrompts === 'boolean') p.includeInPrompts = raw.includeInPrompts;
	if (Array.isArray(raw.results)) {
		p.results = raw.results
			.filter((r: any) => r && typeof r.id === 'string' && typeof r.lesson === 'string')
			.map((r: any) => ({
				lesson: r.lesson,
				id: r.id,
				score: num(r.score),
				max: num(r.max),
				status: statusOf(r.status),
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
	items: { id: string; score: number | null; max: number | null; status: ExerciseStatus | null }[];
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
			.map((i: any) => ({ id: i.id, score: num(i.score), max: num(i.max), status: statusOf(i.status) }))
			.filter((i: any) => i.score != null || i.status != null),
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
		p.results.push({ lesson: r.lesson, id: item.id, score: item.score, max: item.max, status: item.status, ts });
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

/**
 * "About me" lines for explanation and session prompts: background, preferences and the concepts
 * to practice. Scores and grading notes are never included. When `relevant` is given, only concepts
 * in that list are mentioned. Returns '' when there is nothing to say.
 */
export function aboutMe(
	p: Profile,
	conceptNames: Record<string, string>,
	lang: 'zh' | 'en',
	relevant?: string[],
): string {
	const zh = lang === 'zh';
	const lines: string[] = [];
	if (p.background.trim()) lines.push((zh ? '背景：' : 'Background: ') + p.background.trim().slice(0, 300));
	if (p.preferences.trim()) lines.push((zh ? '学习偏好：' : 'Learning preferences: ') + p.preferences.trim().slice(0, 300));
	const keep = relevant ? new Set(relevant) : null;
	const practice = Object.entries(p.concepts)
		.filter(([id, c]) => c.status === 'weak' && (!keep || keep.has(id)))
		.map(([id]) => conceptNames[id] ?? id);
	if (practice.length)
		lines.push((zh ? '需要多练习的概念：' : 'Concepts I need to practice more: ') + practice.join(zh ? '、' : ', '));
	return lines.join('\n');
}

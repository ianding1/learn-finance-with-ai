// Learning progress stored in the browser (localStorage): the latest result of each question the
// learner has submitted: "ok" / "revise" for lesson questions, a score for quiz questions. Nothing
// else about the learner is stored, and nothing leaves the device.

const KEY = 'lfwai.profile.v1';

export type QuestionStatus = 'ok' | 'revise';

/** Latest result of one question: `status` for lesson questions, `score` and `max` for quiz questions. */
export interface ResultItem {
	lesson: string;
	id: string;
	status?: QuestionStatus;
	score?: number;
	max?: number;
	ts: string;
}

export interface Progress {
	v: 2;
	results: ResultItem[];
}

const statusOf = (x: any): QuestionStatus | null => (x === 'ok' || x === 'revise' ? x : null);
const num = (x: any): number | null => (x == null || x === '' || !Number.isFinite(Number(x)) ? null : Number(x));

export function emptyProgress(): Progress {
	return { v: 2, results: [] };
}

/**
 * Read stored data, including data saved by earlier versions of the site (v1): their scored lesson
 * results become "ok" (full marks) or "revise", and their other fields (background, preferences,
 * concept status, notes) are dropped.
 */
function normalize(raw: any): Progress {
	const p = emptyProgress();
	if (!raw || typeof raw !== 'object' || !Array.isArray(raw.results)) return p;
	const v1 = raw.v !== 2;
	for (const r of raw.results) {
		if (!r || typeof r.id !== 'string' || typeof r.lesson !== 'string') continue;
		const ts = String(r.ts || '');
		const status = statusOf(r.status);
		const score = num(r.score);
		const max = num(r.max);
		if (status) p.results.push({ lesson: r.lesson, id: r.id, status, ts });
		else if (score != null && max != null) {
			if (v1) p.results.push({ lesson: r.lesson, id: r.id, status: score >= max ? 'ok' : 'revise', ts });
			else p.results.push({ lesson: r.lesson, id: r.id, score, max, ts });
		}
	}
	return p;
}

export function loadProgress(): Progress {
	try {
		const s = localStorage.getItem(KEY);
		return s ? normalize(JSON.parse(s)) : emptyProgress();
	} catch {
		return emptyProgress();
	}
}

export function saveProgress(p: Progress): boolean {
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
		window.dispatchEvent(new Event('lfwai:progress'));
		return true;
	} catch {
		return false;
	}
}

export function importProgress(json: string): Progress {
	const p = normalize(JSON.parse(json));
	saveProgress(p);
	return p;
}

export function resetProgress() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		/* storage unavailable */
	}
}

// ---------- Result blocks returned by the AI ----------

export interface GradeResult {
	lesson: string;
	items: { id: string; status?: QuestionStatus; score?: number; max?: number }[];
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
	const json = body
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
	const items: GradeResult['items'] = [];
	for (const i of raw.items) {
		if (!i || typeof i.id !== 'string') continue;
		const status = statusOf(i.status);
		const score = num(i.score);
		const max = num(i.max);
		if (status) items.push({ id: i.id, status });
		else if (score != null && max != null) items.push({ id: i.id, score, max });
	}
	return { lesson: raw.lesson, items };
}

/** Store the results of the questions in a result block. Other questions keep their earlier result. */
export function applyResult(r: GradeResult): Progress {
	const p = loadProgress();
	const ts = new Date().toISOString();
	for (const item of r.items) {
		p.results = p.results.filter((x) => !(x.lesson === r.lesson && x.id === item.id));
		p.results.push({ lesson: r.lesson, ...item, ts });
	}
	saveProgress(p);
	return p;
}

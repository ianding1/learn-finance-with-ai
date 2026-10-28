// Build-time access to the course data in /course. Runs in Node during `astro build`.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import katex from 'katex';
import { t, type Lang } from '../i18n/ui';

const ROOT = process.cwd();
const read = (p: string) => parse(readFileSync(join(ROOT, p), 'utf8'));

export type Bi = { zh: string; en: string };

export interface Lesson {
	id: string;
	slug: string;
	title: Bi;
	summary?: Bi;
	published?: boolean;
	exam?: boolean;
	introduces?: string[];
	uses?: string[];
	order: number;
	stage: { id: string; title: Bi };
}

export interface Concept {
	id: string;
	defined_in: string;
	zh: string;
	en: string;
	short?: Bi;
}

export interface Question {
	id: string;
	kind: 'review' | 'check' | 'quiz';
	section?: string;
	level?: string;
	star?: boolean;
	points: number;
	concepts: string[];
	question: Bi;
	answer: Bi;
	rubric: { zh: string[]; en: string[] };
	widget?: { id: string; set: Record<string, number> };
}

export interface ContextItem extends Bi {
	concepts?: string[];
	questions?: string[];
}

export interface CommonError extends Bi {
	questions: string[];
}

export interface LessonKey {
	lesson: string;
	context: ContextItem[];
	common_errors: CommonError[];
	questions: Question[];
}

/** Context items relevant to a set of questions (see the comment at the top of each key file). */
export function contextFor(key: LessonKey, qs: Question[]): ContextItem[] {
	const ids = new Set(qs.map((q) => q.id));
	const tested = new Set(qs.flatMap((q) => q.concepts));
	return key.context.filter((c) => {
		if (!c.concepts?.length && !c.questions?.length) return true;
		return (c.concepts ?? []).some((x) => tested.has(x)) || (c.questions ?? []).some((x) => ids.has(x));
	});
}

/** Common errors relevant to a set of questions. */
export function errorsFor(key: LessonKey, qs: Question[]): CommonError[] {
	const ids = new Set(qs.map((q) => q.id));
	return key.common_errors.filter((e) => e.questions.some((x) => ids.has(x)));
}

let _lessons: Lesson[] | undefined;
export function lessons(): Lesson[] {
	if (!_lessons) {
		const data = read('course/curriculum.yaml');
		const out: Lesson[] = [];
		for (const stage of data.stages) {
			for (const l of stage.lessons) {
				out.push({ ...l, order: out.length, stage: { id: stage.id, title: stage.title } });
			}
		}
		_lessons = out;
	}
	return _lessons;
}

export function stages(): { id: string; title: Bi; lessons: Lesson[] }[] {
	const data = read('course/curriculum.yaml');
	return data.stages.map((s: any) => ({
		id: s.id,
		title: s.title,
		lessons: lessons().filter((l) => l.stage.id === s.id),
	}));
}

export function lesson(id: string): Lesson {
	const l = lessons().find((x) => x.id === id);
	if (!l) throw new Error(`Unknown lesson id "${id}" (not in course/curriculum.yaml)`);
	return l;
}

let _concepts: Record<string, Concept> | undefined;
export function concepts(): Record<string, Concept> {
	if (!_concepts) {
		const raw = read('course/concepts.yaml');
		_concepts = Object.fromEntries(Object.entries(raw).map(([id, c]: [string, any]) => [id, { id, ...c }]));
	}
	return _concepts!;
}

export function concept(id: string): Concept {
	const c = concepts()[id];
	if (!c) throw new Error(`Unknown concept id "${id}" (not in course/concepts.yaml)`);
	return c;
}

const _keys = new Map<string, LessonKey | null>();
export function lessonKey(id: string): LessonKey | null {
	if (!_keys.has(id)) {
		const p = `course/keys/${id}.yaml`;
		_keys.set(id, existsSync(join(ROOT, p)) ? read(p) : null);
	}
	return _keys.get(id)!;
}

export function question(lessonId: string, qid: string): Question {
	const q = lessonKey(lessonId)?.questions.find((x) => x.id === qid);
	if (!q) throw new Error(`Question "${qid}" not found in course/keys/${lessonId}.yaml`);
	return q;
}

// ---------- URLs ----------

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
const SITE = (import.meta.env.SITE || 'https://ianding1.github.io').replace(/\/$/, '');

export function localePrefix(lang: Lang) {
	return lang === 'en' ? 'en/' : '';
}

export function pagePath(lang: Lang, slug: string, hash?: string) {
	return `${BASE}${localePrefix(lang)}${slug}/${hash ? '#' + hash : ''}`;
}

export function lessonPath(l: Lesson, lang: Lang, hash?: string) {
	return pagePath(lang, `lessons/${l.slug}`, hash);
}

export function absolute(path: string) {
	return SITE + path;
}

// ---------- References ----------

export interface RefTarget {
	lesson?: string;
	sec?: string;
	fig?: string;
	check?: string;
	concept?: string;
}

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Resolve a reference into display text, an optional href and status flags. */
export function resolveRef(target: RefTarget, lang: Lang, current?: string) {
	let text: string;
	let preview = '';
	let targetLesson: Lesson;
	let hash: string | undefined;

	if (target.concept) {
		const c = concept(target.concept);
		text = c[lang];
		preview = c.short?.[lang] ?? '';
		if (c.defined_in === 'prerequisite')
			return { text, href: undefined, forward: false, unpublished: false, preview, lessonId: undefined as string | undefined, isConcept: true };
		targetLesson = lesson(c.defined_in);
		hash = `concept-${c.id}`;
	} else {
		const lessonId = target.lesson ?? current;
		if (!lessonId) throw new Error('Ref needs lesson="..." outside a lesson page');
		targetLesson = lesson(lessonId);
		if (target.fig) {
			text = t(lang, 'figure', { id: target.fig });
			hash = `fig-${target.fig}`;
		} else if (target.check) {
			const q = question(targetLesson.id, target.check);
			text =
				q.kind === 'quiz'
					? `${t(lang, 'quizHeading')} ${t(lang, 'quizItem', { n: q.id.replace(/\D/g, '') })}`
					: t(lang, q.kind === 'review' ? 'review' : 'check', { id: target.check });
			hash = `q-${target.check}`;
		} else {
			text = `${targetLesson.id} ${targetLesson.title[lang]}`;
			preview = targetLesson.summary?.[lang] ?? '';
			hash = target.sec;
		}
		if (target.lesson && target.lesson !== current && (target.fig || target.check)) {
			text = `${t(lang, 'lessonPrefix', { id: targetLesson.id })} ${text}`;
		}
	}

	const currentOrder = current ? lesson(current).order : Infinity;
	const forward = targetLesson.order > currentOrder;
	const unpublished = !targetLesson.published;
	const href = unpublished ? undefined : lessonPath(targetLesson, lang, hash);
	return { text, href, forward, unpublished, preview, lessonId: targetLesson.id as string | undefined, isConcept: !!target.concept };
}

export function refHtml(target: RefTarget, lang: Lang, current?: string): string {
	const r = resolveRef(target, lang, current);
	const notes = [r.preview, r.forward ? t(lang, 'forwardHint') : ''].filter(Boolean).join(' ');
	const cls = ['ref', r.forward ? 'ref-forward' : '', r.unpublished ? 'ref-unpublished' : '']
		.filter(Boolean)
		.join(' ');
	if (!r.href) {
		const status =
			r.isConcept && r.lessonId
				? `${t(lang, 'lessonPrefix', { id: r.lessonId })}${lang === 'en' ? ', ' : '，'}${t(lang, 'unpublished')}`
				: t(lang, 'unpublished');
		const suffix = !r.unpublished ? '' : lang === 'en' ? ` <span class="ref-status">(${status})</span>` : `<span class="ref-status">（${status}）</span>`;
		return `<span class="${cls}"${notes ? ` data-preview="${esc(notes)}"` : ''}>${esc(r.text)}${suffix}</span>`;
	}
	return `<a class="${cls}" href="${esc(r.href)}"${notes ? ` data-preview="${esc(notes)}"` : ''}>${esc(r.text)}</a>`;
}

/** Plain-text form of a reference, used inside prompts. */
export function refPlain(target: RefTarget, lang: Lang, current?: string): string {
	if (target.concept) {
		const c = concept(target.concept);
		return c[lang];
	}
	if ((target.check || target.fig) && (!target.lesson || target.lesson === current)) {
		return resolveRef(target, lang, current).text;
	}
	const l = lesson(target.lesson ?? current!);
	const base = t(lang, 'lessonPlain', { id: l.id, title: l.title[lang] });
	return l.published ? `${base} ${absolute(lessonPath(l, lang, target.sec))}` : base;
}

/**
 * Parse the [[...]] reference syntax used in key files and figure captions:
 * [[0.4]], [[0.3#sec]], [[concept:id]], [[check:Q4]], [[fig:6-1]] (check and fig refer to the current lesson).
 */
export function parseRefToken(token: string): RefTarget {
	if (token.startsWith('concept:')) return { concept: token.slice(8) };
	if (token.startsWith('check:')) return { check: token.slice(6) };
	if (token.startsWith('fig:')) return { fig: token.slice(4) };
	const [l, sec] = token.split('#');
	return { lesson: l, sec };
}

// ---------- Rich text (key files) ----------

// Bold is matched first so that **text with $math$** renders the math inside the bold text.
const TOKEN = /\\\$|\*\*([^*]+)\*\*|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\[\[([^\]]+)\]\]/g;

/** Render key-file text to HTML: math (KaTeX), bold, [[refs]], line breaks. */
export function renderRich(text: string, lang: Lang, current?: string): string {
	let out = '';
	let last = 0;
	for (const m of text.matchAll(TOKEN)) {
		out += esc(text.slice(last, m.index)).replace(/\n/g, '<br>');
		last = m.index! + m[0].length;
		if (m[0] === '\\$') out += '$';
		else if (m[1] !== undefined) out += `<strong>${renderRich(m[1], lang, current)}</strong>`;
		else if (m[2] !== undefined) out += katex.renderToString(m[2], { displayMode: true, throwOnError: true, strict: 'ignore' });
		else if (m[3] !== undefined) out += katex.renderToString(m[3], { throwOnError: true, strict: 'ignore' });
		else if (m[4] !== undefined) out += refHtml(parseRefToken(m[4]), lang, current);
	}
	out += esc(text.slice(last)).replace(/\n/g, '<br>');
	return out;
}

/** Plain-text form for prompts: keeps LaTeX, turns refs into text with URLs, drops ** markers. */
export function plainRich(text: string, lang: Lang, current?: string): string {
	return text
		.replace(/\[\[([^\]]+)\]\]/g, (_, tok) => refPlain(parseRefToken(tok), lang, current))
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\\\$/g, '$');
}

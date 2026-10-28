// Page-level data embedded by MarkdownContent.astro as <script type="application/json" id="lfwai-page">.
import type { Lang } from '../i18n/ui';

export interface PageData {
	lang: Lang;
	ui: Record<string, string>;
	site: string;
	pageTitle: string;
	pageUrl: string;
	lesson: null | {
		id: string;
		title: string;
		url: string;
		context: string;
	};
	/** concept id -> name in the page language */
	concepts: Record<string, string>;
}

let cached: PageData | null = null;

export function pageData(): PageData {
	if (!cached) {
		const el = document.getElementById('lfwai-page');
		cached = JSON.parse(el?.textContent || '{}') as PageData;
	}
	return cached;
}

export function ui(key: string, vars: Record<string, string | number> = {}): string {
	const s = pageData().ui[key] ?? key;
	return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

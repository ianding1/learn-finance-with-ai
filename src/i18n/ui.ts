// Languages, UI strings and prompt templates of the site. Each language is one entry in
// languages.json plus one module in ./locales/<code>.ts; nothing else in the code names a language.
import config from './languages.json';
import type { Lang, Locale, UiKey, UiStrings } from './types';

export type { Lang, Localized, UiKey } from './types';

export interface Language {
	code: Lang;
	/** BCP-47 tag used in <html lang> */
	lang: string;
	label: string;
	title: string;
}

export const LANGUAGES: Language[] = config.languages;
export const DEFAULT_LANG: Lang = config.default;

const modules = import.meta.glob<{ default: Locale }>('./locales/*.ts', { eager: true });
export const LOCALES: Record<Lang, Locale> = Object.fromEntries(
	Object.entries(modules).map(([path, m]) => [path.replace(/^.*\/|\.ts$/g, ''), m.default]),
);
for (const l of LANGUAGES) {
	if (!LOCALES[l.code]) throw new Error(`Language "${l.code}" in languages.json has no src/i18n/locales/${l.code}.ts`);
}

export const UI: Record<Lang, UiStrings> = Object.fromEntries(LANGUAGES.map((l) => [l.code, LOCALES[l.code].ui]));

export function t(lang: Lang, key: UiKey, vars: Record<string, string | number> = {}): string {
	return UI[lang][key].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Map a BCP-47 tag (Starlight's route.lang or a browser language) to a language code. */
export function toLang(tag: string | undefined): Lang {
	const lower = (tag ?? '').toLowerCase();
	const exact = LANGUAGES.find((l) => l.lang.toLowerCase() === lower || l.code === lower);
	if (exact) return exact.code;
	const primary = LANGUAGES.find((l) => l.lang.toLowerCase().split('-')[0] === lower.split('-')[0]);
	return primary ? primary.code : DEFAULT_LANG;
}

// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import remarkHeadingId from './src/plugins/remark-heading-id.mjs';

const REPO = 'https://github.com/ianding1/learn-finance-with-ai';

// Languages: see src/i18n/languages.json. Every language lives in its own folder (no root locale).
const { default: DEFAULT_LANG, languages } = JSON.parse(
	readFileSync(new URL('./src/i18n/languages.json', import.meta.url), 'utf8'),
);
/** Starlight label translations: { 'zh-CN': '...', ... } from a { code: text } map. */
const labels = (byCode) => Object.fromEntries(languages.map((l) => [l.lang, byCode[l.code]]));

// Build the lesson sidebar from course/curriculum.yaml. Only published lessons appear.
const curriculum = parse(readFileSync(new URL('./course/curriculum.yaml', import.meta.url), 'utf8'));
const lessonGroups = curriculum.stages
	.map((stage) => ({
		label: stage.title[DEFAULT_LANG],
		translations: labels(stage.title),
		items: stage.lessons
			.filter((l) => l.published)
			.map((l) => ({ slug: `lessons/${l.slug}` })),
	}))
	.filter((g) => g.items.length > 0);

// Until 2026-10-29 the Simplified Chinese pages had no language prefix, and there were guide pages
// (how to use, course outline). Keep those old URLs working.
const OLD_ZH_LESSONS = curriculum.stages.flatMap((s) => s.lessons.filter((l) => l.published).map((l) => `lessons/${l.slug}`));
const redirects = Object.fromEntries([
	...OLD_ZH_LESSONS.map((p) => [`/${p}`, `/learn-finance-with-ai/zh-cn/${p}/`]),
	...['how-to-use', 'curriculum'].flatMap((g) => [
		[`/guide/${g}`, '/learn-finance-with-ai/zh-cn/'],
		...languages.map((l) => [`/${l.code}/guide/${g}`, `/learn-finance-with-ai/${l.code}/`]),
	]),
]);

export default defineConfig({
	site: 'https://ianding1.github.io',
	base: '/learn-finance-with-ai',
	redirects,
	markdown: {
		remarkPlugins: [remarkMath, remarkHeadingId],
		rehypePlugins: [[rehypeKatex, { throwOnError: true, strict: 'ignore' }]],
	},
	integrations: [
		starlight({
			title: Object.fromEntries(languages.map((l) => [l.lang, l.title])),
			description: 'An economics and finance course written by AI, with AI-graded exercises.',
			defaultLocale: DEFAULT_LANG,
			locales: Object.fromEntries(languages.map((l) => [l.code, { label: l.label, lang: l.lang }])),
			social: [{ icon: 'github', label: 'GitHub', href: REPO }],
			editLink: { baseUrl: `${REPO}/edit/main/` },
			customCss: ['katex/dist/katex.min.css', './src/styles/custom.css'],
			components: {
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				Footer: './src/components/overrides/Footer.astro',
				Pagination: './src/components/overrides/Pagination.astro',
				Sidebar: './src/components/overrides/Sidebar.astro',
				Hero: './src/components/overrides/Hero.astro',
			},
			sidebar: [
				...lessonGroups,
			],
		}),
	],
});

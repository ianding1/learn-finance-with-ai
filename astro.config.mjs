// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import remarkHeadingId from './src/plugins/remark-heading-id.mjs';

const REPO = 'https://github.com/ianding1/learn-finance-with-ai';

// Build the lesson sidebar from course/curriculum.yaml. Only published lessons appear.
const curriculum = parse(readFileSync(new URL('./course/curriculum.yaml', import.meta.url), 'utf8'));
const lessonGroups = curriculum.stages
	.map((stage) => ({
		label: stage.title.zh,
		translations: { en: stage.title.en },
		items: stage.lessons
			.filter((l) => l.published)
			.map((l) => ({ slug: `lessons/${l.slug}` })),
	}))
	.filter((g) => g.items.length > 0);

export default defineConfig({
	site: 'https://ianding1.github.io',
	base: '/learn-finance-with-ai',
	markdown: {
		remarkPlugins: [remarkMath, remarkHeadingId],
		rehypePlugins: [[rehypeKatex, { throwOnError: true, strict: 'ignore' }]],
	},
	integrations: [
		starlight({
			title: { 'zh-CN': '跟 AI 学金融', en: 'Learn Finance with AI' },
			description: 'An economics and finance course written by AI, with AI-graded exercises.',
			defaultLocale: 'root',
			locales: {
				root: { label: '简体中文', lang: 'zh-CN' },
				en: { label: 'English', lang: 'en' },
			},
			social: [{ icon: 'github', label: 'GitHub', href: REPO }],
			editLink: { baseUrl: `${REPO}/edit/main/` },
			customCss: ['katex/dist/katex.min.css', './src/styles/custom.css'],
			components: {
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				Footer: './src/components/overrides/Footer.astro',
			},
			sidebar: [
				{
					label: '开始',
					translations: { en: 'Start here' },
					items: [
						{ slug: 'guide/how-to-use' },
						{ slug: 'guide/curriculum' },
					],
				},
				...lessonGroups,
			],
		}),
	],
});

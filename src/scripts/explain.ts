// "Explain this": when the learner selects text in the lesson, show a floating button that
// builds an explanation prompt containing the selection, its paragraph and its section.
import { pageData, ui } from './page-data';
import { copyPrompt } from './dialog';
import { explainPrompt } from './prompts';
import { aboutMe, loadProfile } from './profile';

const BLOCKS = 'p, li, td, th, blockquote, figcaption, .lfwai-q-text, .katex-display, h2, h3, h4';

/** Text of a node with KaTeX output replaced by its TeX source, so formulas stay readable. */
function textWithTex(root: Node): string {
	const holder = document.createElement('div');
	holder.appendChild(root.cloneNode(true));
	holder.querySelectorAll('.katex').forEach((k) => {
		const tex = k.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
		if (tex == null) return;
		const display = k.parentElement?.classList.contains('katex-display');
		k.replaceWith(document.createTextNode(display ? `$$${tex}$$` : `$${tex}$`));
	});
	holder.querySelectorAll('.ref-status, button, textarea, script').forEach((el) => el.remove());
	return (holder.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function selectionText(range: Range): string {
	const frag = range.cloneContents();
	const div = document.createElement('div');
	div.appendChild(frag);
	return textWithTex(div);
}

function sectionTitle(node: Node): string {
	const headings = Array.from(document.querySelectorAll<HTMLElement>('.sl-markdown-content h2'));
	let title = '';
	for (const h of headings) {
		if (h.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) title = h.textContent?.trim() || '';
	}
	return title;
}

function inContent(node: Node | null): HTMLElement | null {
	const el = node instanceof HTMLElement ? node : node?.parentElement ?? null;
	if (!el) return null;
	if (el.closest('textarea, input, dialog, .lfwai-explain-btn, .lfwai-answer')) return null;
	return el.closest('.sl-markdown-content') ? el : null;
}

export function initExplain() {
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 'lfwai-explain-btn';
	btn.textContent = ui('explain');
	btn.hidden = true;
	document.body.appendChild(btn);

	let saved: Range | null = null;

	const hide = () => {
		btn.hidden = true;
		saved = null;
	};

	const update = () => {
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || sel.rangeCount === 0) return hide();
		const range = sel.getRangeAt(0);
		const text = sel.toString().trim();
		if (text.length < 2 || !inContent(range.startContainer) || !inContent(range.endContainer)) return hide();
		const rect = range.getBoundingClientRect();
		if (!rect.width && !rect.height) return hide();
		saved = range.cloneRange();
		btn.hidden = false;
		const top = window.scrollY + rect.bottom + 8;
		const left = Math.min(
			Math.max(8, window.scrollX + rect.left + rect.width / 2 - btn.offsetWidth / 2),
			window.scrollX + document.documentElement.clientWidth - btn.offsetWidth - 8,
		);
		btn.style.top = `${top}px`;
		btn.style.left = `${left}px`;
	};

	let timer: number | undefined;
	document.addEventListener('selectionchange', () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(update, 250);
	});

	// Keep the selection when the button is pressed.
	btn.addEventListener('mousedown', (e) => e.preventDefault());
	btn.addEventListener('click', () => {
		if (!saved) return;
		const data = pageData();
		const start = inContent(saved.startContainer)!;
		const block = start.closest<HTMLElement>(BLOCKS) ?? start;
		const selection = selectionText(saved);
		const paragraph = textWithTex(block);
		const prompt = explainPrompt({
			lang: data.lang,
			lessonId: data.lesson?.id,
			lessonTitle: data.lesson?.title,
			pageTitle: data.pageTitle,
			pageUrl: data.pageUrl,
			section: sectionTitle(block),
			selection,
			paragraph: paragraph.length > 1500 ? paragraph.slice(0, 1500) + '…' : paragraph,
			context: data.lesson?.context,
			aboutMe: (() => {
				const p = loadProfile();
				// Only concepts of this lesson; nothing at all if the learner turned it off.
				return p.includeInPrompts ? aboutMe(p, data.concepts, data.lang, data.lesson?.concepts ?? []) : '';
			})(),
		});
		copyPrompt(prompt, () => {
			btn.textContent = ui('copiedExplain');
			window.setTimeout(() => {
				window.getSelection()?.removeAllRanges();
				hide();
				btn.textContent = ui('explain');
			}, 1500);
		});
	});
}

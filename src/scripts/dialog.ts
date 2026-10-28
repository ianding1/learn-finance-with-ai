// Shared dialog that shows a generated prompt with a copy button.
// The <dialog id="lfwai-dialog"> element is rendered once per page by MarkdownContent.astro.
import { ui } from './page-data';

export async function copyText(text: string, fallbackEl?: HTMLTextAreaElement): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		if (fallbackEl) {
			fallbackEl.focus();
			fallbackEl.select();
			try {
				return document.execCommand('copy');
			} catch {
				return false;
			}
		}
		return false;
	}
}

let wired = false;

function wire(dialog: HTMLDialogElement) {
	if (wired) return;
	wired = true;
	const area = dialog.querySelector<HTMLTextAreaElement>('textarea')!;
	const copyBtn = dialog.querySelector<HTMLButtonElement>('[data-copy]')!;
	dialog.querySelector<HTMLButtonElement>('[data-close]')!.addEventListener('click', () => dialog.close());
	copyBtn.addEventListener('click', async () => {
		const ok = await copyText(area.value, area);
		if (ok) {
			copyBtn.textContent = ui('copied');
			setTimeout(() => (copyBtn.textContent = ui('copy')), 1500);
		}
	});
	dialog.addEventListener('click', (e) => {
		if (e.target === dialog) dialog.close();
	});
}

export function showPrompt(text: string) {
	const dialog = document.getElementById('lfwai-dialog') as HTMLDialogElement | null;
	if (!dialog) return;
	wire(dialog);
	const area = dialog.querySelector<HTMLTextAreaElement>('textarea')!;
	area.value = text;
	dialog.showModal();
	area.scrollTop = 0;
}

/**
 * Copy a prompt to the clipboard. On success, call `done` (to show short feedback);
 * if the browser does not allow copying, open the dialog so the learner can copy by hand.
 */
export async function copyPrompt(text: string, done: () => void) {
	try {
		await navigator.clipboard.writeText(text);
		done();
	} catch {
		showPrompt(text);
	}
}

/** Temporarily replace a button's label, e.g. with "Copied". */
export function flash(btn: HTMLElement, label: string, ms = 2000) {
	const original = btn.dataset.label ?? btn.textContent ?? '';
	btn.dataset.label = original;
	btn.textContent = label;
	window.setTimeout(() => {
		btn.textContent = original;
	}, ms);
}

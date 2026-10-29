// Client behavior for CoinFlipWealth.astro (lesson 0.4, figure 3-1).
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
}

const SVG = 'http://www.w3.org/2000/svg';
const UP = 1.5;
const DOWN = 0.6;
const START = 100;

function el(name: string, attrs: Record<string, string | number>, text?: string) {
	const e = document.createElementNS(SVG, name);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	if (text != null) e.textContent = text;
	return e;
}

function binom(n: number, k: number) {
	let c = 1;
	for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
	return c;
}

export function initCoinFlip() {
	document.querySelectorAll<HTMLElement>('[data-widget="coin-flip"]').forEach((root) => {
		const nIn = root.querySelector<HTMLInputElement>('[data-param="n"]')!;
		const labels = JSON.parse(root.dataset.labels || '{}') as { mean: string; median: string };
		const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')];
		const money = (v: number) =>
			v.toLocaleString('en-US', { maximumFractionDigits: v < 10 ? 2 : v < 1000 ? 1 : 0, minimumFractionDigits: v < 10 ? 2 : 0 });

		function draw() {
			const n = Number(nIn.value);
			const outcomes = Array.from({ length: n + 1 }, (_, k) => ({
				w: START * UP ** k * DOWN ** (n - k),
				p: binom(n, k) / 2 ** n,
			}));
			const mean = START * ((UP + DOWN) / 2) ** n;
			// Median: the outcome where the cumulative probability (from the lowest wealth) reaches one half.
			let cum = 0;
			let median = outcomes[0].w;
			for (const o of outcomes) {
				cum += o.p;
				if (cum >= 0.5) {
					median = o.w;
					break;
				}
			}
			const loss = outcomes.filter((o) => o.w < START).reduce((s, o) => s + o.p, 0);
			const pMax = Math.max(...outcomes.map((o) => o.p));

			for (const svg of svgs) {
				const g = JSON.parse(svg.dataset.geom!) as Geom;
				const X = (w: number) => g.pad.l + ((Math.log10(w) + 2.5) / 9) * (g.W - g.pad.l - g.pad.r);
				const Y = (p: number) => g.H - g.pad.b - (p / pMax) * (g.H - g.pad.t - g.pad.b) * 0.9;
				const bw = Math.max(3, Math.min(18, ((g.W - g.pad.l - g.pad.r) / 9) * Math.log10(UP / DOWN) * 0.7));
				const box = svg.querySelector('[data-el="bars"]')!;
				box.replaceChildren();
				for (const o of outcomes) {
					box.appendChild(
						el('rect', {
							class: o.w > START ? 'viz-pos' : 'viz-neg',
							x: X(o.w) - bw / 2,
							y: Y(o.p),
							width: bw,
							height: Y(0) - Y(o.p),
						}),
					);
				}
				for (const [v, name, cls, dy] of [
					[mean, labels.mean, 'viz-mean', 0],
					[median, labels.median, 'viz-median', 14],
				] as const) {
					box.appendChild(el('line', { class: cls, x1: X(v), x2: X(v), y1: g.pad.t - 6, y2: g.H - g.pad.b }));
					box.appendChild(el('text', { class: 'viz-small viz-halo', x: X(v) + 4, y: g.pad.t + 4 + dy }, name));
				}
			}

			root.querySelector('[data-out="n"]')!.textContent = String(n);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{mean}', money(mean))
				.replace('{median}', money(median))
				.replace('{loss}', `${(loss * 100).toFixed(1)}%`);
		}

		nIn.addEventListener('input', draw);
		draw();
	});
}

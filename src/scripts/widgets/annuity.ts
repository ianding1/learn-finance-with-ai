// Client behavior for AnnuityTimeline.astro (lesson 0.1): draws one bar pair per year.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
}

const SVG = 'http://www.w3.org/2000/svg';
const C = 100;
const MAX_YEARS = 10;

function el(name: string, attrs: Record<string, string | number>, text?: string) {
	const e = document.createElementNS(SVG, name);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	if (text != null) e.textContent = text;
	return e;
}

export function initAnnuity() {
	document.querySelectorAll<HTMLElement>('[data-widget="annuity"]').forEach((root) => {
		const rIn = root.querySelector<HTMLInputElement>('[data-param="r"]')!;
		const nIn = root.querySelector<HTMLInputElement>('[data-param="n"]')!;
		const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')];
		const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

		function draw() {
			const r = Number(rIn.value);
			const n = Number(nIn.value);
			const pvs = Array.from({ length: n }, (_, i) => C / (1 + r) ** (i + 1));

			for (const svg of svgs) {
				const g = JSON.parse(svg.dataset.geom!) as Geom;
				const plotW = g.W - g.pad.l - g.pad.r;
				const plotH = g.H - g.pad.t - g.pad.b;
				const step = plotW / (MAX_YEARS + 0.5);
				const X = (k: number) => g.pad.l + (k + 0.25) * step;
				const Y = (v: number) => g.pad.t + (1 - v / C) * plotH;
				const bw = Math.min(28, step * 0.6);
				const narrow = g.W < 400;
				const bars = svg.querySelector('[data-el="bars"]')!;
				bars.replaceChildren();
				// Year labels: every year on the wide layout, 0 / 5 / 10 on the narrow one.
				for (let k = 0; k <= MAX_YEARS; k++) {
					if (narrow && k % 5 !== 0) continue;
					bars.appendChild(el('text', { class: 'viz-tick', x: X(k), y: g.H - g.pad.b + 18, 'text-anchor': 'middle' }, String(k)));
				}
				pvs.forEach((pv, i) => {
					const x = X(i + 1) - bw / 2;
					bars.appendChild(el('rect', { class: 'viz-pay', x, y: Y(C), width: bw, height: Y(0) - Y(C) }));
					bars.appendChild(el('rect', { class: 'viz-pv', x, y: Y(pv), width: bw, height: Y(0) - Y(pv) }));
					if (!narrow || n <= 5)
						bars.appendChild(
							el('text', { class: 'viz-small viz-halo', x: X(i + 1), y: Y(pv) - 5, 'text-anchor': 'middle' }, pv.toFixed(n > 6 ? 0 : 1)),
						);
				});
			}

			root.querySelector('[data-out="r"]')!.textContent = `${Math.round(r * 100)}%`;
			root.querySelector('[data-out="n"]')!.textContent = String(n);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{sum}', fmt(C * n))
				.replace('{pv}', fmt(pvs.reduce((s, v) => s + v, 0)))
				.replace('{last}', fmt(pvs[n - 1]));
		}

		rIn.addEventListener('input', draw);
		nIn.addEventListener('input', draw);
		draw();
	});
}

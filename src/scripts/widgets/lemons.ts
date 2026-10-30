// Client behavior for LemonsMarket.astro (lesson 1.9): buyers pay at most q · 10,000 + (1 − q) · 4,000;
// owners of good cars sell only at 8,000 or more.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const GOOD = 10000;
const LEMON = 4000;
const RESERVE = 8000;

export function initLemons() {
	document.querySelectorAll<HTMLElement>('[data-widget="lemons"]').forEach((root) => {
		const qIn = root.querySelector<HTMLInputElement>('[data-param="q"]')!;
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				X: (v: number) => g.pad.l + ((v - g.xr[0]) / (g.xr[1] - g.xr[0])) * (g.W - g.pad.l - g.pad.r),
				Y: (v: number) => g.pad.t + ((g.yr[1] - v) / (g.yr[1] - g.yr[0])) * (g.H - g.pad.t - g.pad.b),
			};
		});

		function draw() {
			const q = Number(qIn.value);
			const wtp = q * GOOD + (1 - q) * LEMON;
			for (const { el, X, Y } of plots) {
				el('vq').setAttribute('x1', X(q).toFixed(1));
				el('vq').setAttribute('x2', X(q).toFixed(1));
				el('vq').setAttribute('y1', Y(0).toFixed(1));
				el('vq').setAttribute('y2', Y(wtp).toFixed(1));
				el('pt').setAttribute('cx', X(q).toFixed(1));
				el('pt').setAttribute('cy', Y(wtp).toFixed(1));
			}
			root.querySelector('[data-out="q"]')!.textContent = q.toFixed(2);
			const verdict = wtp >= RESERVE - 1e-9 ? root.dataset.stay : root.dataset.leave;
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{wtp}', Math.round(wtp).toLocaleString('en-US'))
				.replace('{verdict}', verdict || '');
		}

		qIn.addEventListener('input', draw);
		draw();
	});
}

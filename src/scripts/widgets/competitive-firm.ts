// Client behavior for CompetitiveFirm.astro (lesson 1.5): C(q) = 72 + q³ − 10q² + 40q, price taker.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const cost = (q: number) => 72 + q ** 3 - 10 * q * q + 40 * q;
const atc = (q: number) => cost(q) / q;
const num = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace('-', '−');

export function initCompetitiveFirm() {
	document.querySelectorAll<HTMLElement>('[data-widget="competitive-firm"]').forEach((root) => {
		const pIn = root.querySelector<HTMLInputElement>('[data-param="p"]')!;
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				g,
				X: (v: number) => g.pad.l + ((v - g.xr[0]) / (g.xr[1] - g.xr[0])) * (g.W - g.pad.l - g.pad.r),
				Y: (v: number) => g.pad.t + ((g.yr[1] - v) / (g.yr[1] - g.yr[0])) * (g.H - g.pad.t - g.pad.b),
			};
		});
		const set = (e: SVGElement, a: Record<string, number>) => {
			for (const [k, v] of Object.entries(a)) e.setAttribute(k, v.toFixed(1));
		};

		function draw() {
			const P = Number(pIn.value);
			// Rising branch of MC = P: 3q² − 20q + 40 − P = 0.
			const disc = 400 - 12 * (40 - P);
			const qStar = disc >= 0 ? (20 + Math.sqrt(disc)) / 6 : 0;
			const produce = P >= 15 && qStar > 0;
			const q = produce ? qStar : 0;
			const profit = produce ? P * q - cost(q) : -72;
			for (const { el, g, X, Y } of plots) {
				set(el('price'), { x1: X(g.xr[0]), y1: Y(P), x2: X(g.xr[1]), y2: Y(P) });
				const rect = el('rect');
				if (produce) {
					const a = atc(q);
					set(rect, { x: X(0), y: Y(Math.max(P, a)), width: X(q) - X(0), height: Math.abs(Y(P) - Y(a)) });
					rect.setAttribute('class', profit >= 0 ? 'viz-profit' : 'viz-loss');
					set(el('vq'), { x1: X(q), y1: Y(0), x2: X(q), y2: Y(P) });
					set(el('pt'), { cx: X(q), cy: Y(P) });
					el('pt').removeAttribute('visibility');
				} else {
					set(rect, { x: 0, y: 0, width: 0, height: 0 });
					set(el('vq'), { x1: 0, y1: 0, x2: 0, y2: 0 });
					el('pt').setAttribute('visibility', 'hidden');
				}
			}
			root.querySelector('[data-out="p"]')!.textContent = String(P);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = produce
				? (root.dataset.readout || '').replace('{q}', num(q)).replace('{pi}', num(profit))
				: root.dataset.shut || '';
		}

		pIn.addEventListener('input', draw);
		draw();
	});
}

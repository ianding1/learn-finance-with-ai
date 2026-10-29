// Client behavior for FisherTwoPeriod.astro (lesson 1.3): U = ln c1 + β ln c2, β = 0.95, y1 = 80.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const BETA = 0.95;
const Y1 = 80;
const num = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

export function initFisher() {
	document.querySelectorAll<HTMLElement>('[data-widget="fisher"]').forEach((root) => {
		const rIn = root.querySelector<HTMLInputElement>('[data-param="r"]')!;
		const yIn = root.querySelector<HTMLInputElement>('[data-param="y2"]')!;
		const verbs = JSON.parse(root.dataset.verbs || '["",""]') as [string, string];
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
			const r = Number(rIn.value) / 100;
			const y2 = Number(yIn.value);
			const W = Y1 + y2 / (1 + r); // present value of income
			const c1 = W / (1 + BETA);
			const c2 = BETA * (1 + r) * c1;
			const U = Math.log(c1) + BETA * Math.log(c2);
			for (const { el, g, X, Y } of plots) {
				set(el('budget'), { x1: X(0), y1: Y(W * (1 + r)), x2: X(W), y2: Y(0) });
				let d = '';
				for (let i = 0; i <= 200; i++) {
					const x = 2 + (i / 200) * (g.xr[1] - 2);
					const y = Math.min(Math.exp((U - Math.log(x)) / BETA), g.yr[1] * 2);
					d += `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`;
				}
				el('ic').setAttribute('d', d);
				set(el('h'), { x1: X(0), y1: Y(c2), x2: X(c1), y2: Y(c2) });
				set(el('v'), { x1: X(c1), y1: Y(0), x2: X(c1), y2: Y(c2) });
				set(el('E'), { cx: X(Y1), cy: Y(y2) });
				set(el('opt'), { cx: X(c1), cy: Y(c2) });
			}
			const s = Y1 - c1;
			root.querySelector('[data-out="r"]')!.textContent = String(Math.round(r * 100));
			root.querySelector('[data-out="y2"]')!.textContent = String(y2);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{c1}', num(c1))
				.replace('{c2}', num(c2))
				.replace('{verb}', s >= 0 ? verbs[0] : verbs[1])
				.replace('{s}', num(Math.abs(s)));
		}

		rIn.addEventListener('input', draw);
		yIn.addEventListener('input', draw);
		draw();
	});
}

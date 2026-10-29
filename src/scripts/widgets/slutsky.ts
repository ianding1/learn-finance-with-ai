// Client behavior for SlutskyDecomposition.astro (lesson 1.2): U = xy, M = 40, p_y = 1, original p_x = 2.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const fmt = (v: number) => {
	const s = (Math.round(v * 100) / 100).toString().replace('-', '−');
	return v > 0.001 ? `+${s}` : s;
};
const num = (v: number) => (Math.round(v * 100) / 100).toString();

export function initSlutsky() {
	document.querySelectorAll<HTMLElement>('[data-widget="slutsky"]').forEach((root) => {
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
		const M = 40;
		const x0 = 10;
		const y0 = 20;
		const curve = (X: (v: number) => number, Y: (v: number) => number, g: Geom, u: number) => {
			let d = '';
			for (let i = 0; i <= 200; i++) {
				const x = 0.5 + (i / 200) * (g.xr[1] - 0.5);
				const y = Math.min(u / x, g.yr[1] * 1.5);
				d += `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`;
			}
			return d;
		};
		const set = (e: SVGElement, a: Record<string, number>) => {
			for (const [k, v] of Object.entries(a)) e.setAttribute(k, v.toFixed(1));
		};

		function draw() {
			const p = Number(pIn.value);
			const Mc = p * x0 + y0; // income that makes A just affordable at the new prices
			const xB = Mc / (2 * p);
			const yB = Mc / 2;
			const xC = M / (2 * p);
			const yC = M / 2;
			for (const { el, g, X, Y } of plots) {
				set(el('now'), { x1: X(0), y1: Y(M), x2: X(M / p), y2: Y(0) });
				set(el('comp'), { x1: X(0), y1: Y(Mc), x2: X(Mc / p), y2: Y(0) });
				el('icA').setAttribute('d', curve(X, Y, g, x0 * y0));
				el('icB').setAttribute('d', curve(X, Y, g, xB * yB));
				el('icC').setAttribute('d', curve(X, Y, g, xC * yC));
				set(el('B'), { cx: X(xB), cy: Y(yB) });
				set(el('C'), { cx: X(xC), cy: Y(yC) });
				set(el('Bl'), { x: X(xB) + 10, y: Y(yB) - 10 });
				set(el('Cl'), { x: X(xC) + 10, y: Y(yC) - 10 });
			}
			root.querySelector('[data-out="p"]')!.textContent = String(p);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{a}', num(x0))
				.replace('{b}', num(xB))
				.replace('{c}', num(xC))
				.replace('{se}', fmt(xB - x0))
				.replace('{ie}', fmt(xC - xB))
				.replace('{te}', fmt(xC - x0));
		}

		pIn.addEventListener('input', draw);
		draw();
	});
}

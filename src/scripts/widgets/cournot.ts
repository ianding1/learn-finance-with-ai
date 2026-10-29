// Client behavior for CournotFirms.astro (lesson 1.6): n identical Cournot firms, P = 100 − Q, MC = 20.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const A = 100;
const C = 20;
const num = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

export function initCournot() {
	document.querySelectorAll<HTMLElement>('[data-widget="cournot"]').forEach((root) => {
		const nIn = root.querySelector<HTMLInputElement>('[data-param="n"]')!;
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				X: (v: number) => g.pad.l + ((v - g.xr[0]) / (g.xr[1] - g.xr[0])) * (g.W - g.pad.l - g.pad.r),
				Y: (v: number) => g.pad.t + ((g.yr[1] - v) / (g.yr[1] - g.yr[0])) * (g.H - g.pad.t - g.pad.b),
			};
		});
		const set = (e: SVGElement, a: Record<string, number>) => {
			for (const [k, v] of Object.entries(a)) e.setAttribute(k, v.toFixed(1));
		};

		function draw() {
			const n = Number(nIn.value);
			const q = (A - C) / (n + 1);
			const Q = n * q;
			const P = A - Q;
			const profit = (P - C) * Q;
			for (const { el, X, Y } of plots) {
				set(el('rect'), { x: X(0), y: Y(P), width: X(Q) - X(0), height: Y(C) - Y(P) });
				set(el('vq'), { x1: X(Q), y1: Y(0), x2: X(Q), y2: Y(P) });
				set(el('vp'), { x1: X(0), y1: Y(P), x2: X(Q), y2: Y(P) });
				set(el('pt'), { cx: X(Q), cy: Y(P) });
			}
			root.querySelector('[data-out="n"]')!.textContent = String(n);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{q}', num(q))
				.replace('{Q}', num(Q))
				.replace('{P}', num(P))
				.replace('{pi}', num(profit));
		}

		nIn.addEventListener('input', draw);
		draw();
	});
}

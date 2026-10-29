// Client behavior for RiskPremium.astro (lesson 1.4): 50/50 gamble 100 ± h under CRRA utility with parameter γ.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const crra = (w: number, g: number) => (Math.abs(g - 1) < 1e-9 ? Math.log(w) : w ** (1 - g) / (1 - g));
const inv = (u: number, g: number) => (Math.abs(g - 1) < 1e-9 ? Math.exp(u) : (u * (1 - g)) ** (1 / (1 - g)));
const num = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

export function initRiskPremium() {
	document.querySelectorAll<HTMLElement>('[data-widget="risk-premium"]').forEach((root) => {
		const gIn = root.querySelector<HTMLInputElement>('[data-param="g"]')!;
		const hIn = root.querySelector<HTMLInputElement>('[data-param="h"]')!;
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
			const gam = Number(gIn.value);
			const h = Number(hIn.value);
			const lo = 100 - h;
			const hi = 100 + h;
			const ulo = crra(lo, gam);
			const uhi = crra(hi, gam);
			const scale = (w: number) => (crra(w, gam) - ulo) / (uhi - ulo); // rescaled utility: 0 at lo, 1 at hi
			const ce = inv((ulo + uhi) / 2, gam);
			for (const { el, g, X, Y } of plots) {
				let d = '';
				for (let i = 0; i <= 240; i++) {
					const w = 2 + (i / 240) * (g.xr[1] - 2);
					const v = Math.max(g.yr[0] - 1, Math.min(g.yr[1] + 1, scale(w)));
					d += `${i ? 'L' : 'M'}${X(w).toFixed(1)},${Y(v).toFixed(1)}`;
				}
				el('curve').setAttribute('d', d);
				set(el('chord'), { x1: X(lo), y1: Y(0), x2: X(hi), y2: Y(1) });
				set(el('gap'), { x1: X(ce), y1: Y(0.5), x2: X(100), y2: Y(0.5) });
				set(el('vce'), { x1: X(ce), y1: Y(g.yr[0]), x2: X(ce), y2: Y(0.5) });
				set(el('vev'), { x1: X(100), y1: Y(g.yr[0]), x2: X(100), y2: Y(0.5) });
				set(el('lo'), { cx: X(lo), cy: Y(0) });
				set(el('hi'), { cx: X(hi), cy: Y(1) });
				set(el('ev'), { cx: X(100), cy: Y(0.5) });
				set(el('ce'), { cx: X(ce), cy: Y(0.5) });
			}
			root.querySelector('[data-out="g"]')!.textContent = String(gam);
			root.querySelector('[data-out="h"]')!.textContent = String(h);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{ce}', num(ce))
				.replace('{rp}', num(100 - ce));
		}

		gIn.addEventListener('input', draw);
		hIn.addEventListener('input', draw);
		draw();
	});
}

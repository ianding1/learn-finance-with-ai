// Client behavior for SupplyDemand.astro (lesson 1.1): demand Q = 100 + ΔD − 2P, supply Q = −20 + ΔS + 4P.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	qr: [number, number];
	pr: [number, number];
}

const fmt = (v: number) => (Math.round(v * 100) / 100).toString().replace('-', '−');

export function initSupplyDemand() {
	document.querySelectorAll<HTMLElement>('[data-widget="supply-demand"]').forEach((root) => {
		const dDIn = root.querySelector<HTMLInputElement>('[data-param="dD"]')!;
		const dSIn = root.querySelector<HTMLInputElement>('[data-param="dS"]')!;
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				g,
				X: (q: number) => g.pad.l + ((q - g.qr[0]) / (g.qr[1] - g.qr[0])) * (g.W - g.pad.l - g.pad.r),
				Y: (p: number) => g.pad.t + ((g.pr[1] - p) / (g.pr[1] - g.pr[0])) * (g.H - g.pad.t - g.pad.b),
			};
		});
		const set = (e: SVGElement, a: Record<string, number>) => {
			for (const [k, v] of Object.entries(a)) e.setAttribute(k, v.toFixed(1));
		};

		function draw() {
			const dD = Number(dDIn.value);
			const dS = Number(dSIn.value);
			const P = (120 + dD - dS) / 6;
			const Q = 100 + dD - 2 * P;
			for (const { el, g, X, Y } of plots) {
				// Demand P = (100 + ΔD − Q) / 2, clipped to the plot box.
				const dQ0 = Math.max(0, 100 + dD - 2 * g.pr[1]);
				set(el('demand'), { x1: X(dQ0), y1: Y((100 + dD - dQ0) / 2), x2: X(100 + dD), y2: Y(0) });
				// Supply P = (Q + 20 − ΔS) / 4; it starts on the price axis or, if that price is negative, on the quantity axis.
				const sQ0 = Math.max(0, dS - 20);
				set(el('supply'), { x1: X(sQ0), y1: Y((sQ0 + 20 - dS) / 4), x2: X(g.qr[1]), y2: Y((g.qr[1] + 20 - dS) / 4) });
				set(el('hq'), { x1: X(0), y1: Y(P), x2: X(Q), y2: Y(P) });
				set(el('vq'), { x1: X(Q), y1: Y(0), x2: X(Q), y2: Y(P) });
				set(el('eq'), { cx: X(Q), cy: Y(P) });
			}
			root.querySelector('[data-out="dD"]')!.textContent = fmt(dD);
			root.querySelector('[data-out="dS"]')!.textContent = fmt(dS);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{p}', fmt(P))
				.replace('{q}', fmt(Q));
		}

		dDIn.addEventListener('input', draw);
		dSIn.addEventListener('input', draw);
		draw();
	});
}

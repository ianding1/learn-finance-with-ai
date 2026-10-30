// Client behavior for SurplusTax.astro (lesson 1.8): Qd = 100 − 2P, Qs = −20 + 4P, per-unit tax t on sellers.
// Buyers pay Pb = 20 + 2t/3, sellers receive Ps = 20 − t/3, and Q = 60 − 4t/3.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const num = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

export function initSurplusTax() {
	document.querySelectorAll<HTMLElement>('[data-widget="surplus-tax"]').forEach((root) => {
		const tIn = root.querySelector<HTMLInputElement>('[data-param="t"]');
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				X: (v: number) => g.pad.l + ((v - g.xr[0]) / (g.xr[1] - g.xr[0])) * (g.W - g.pad.l - g.pad.r),
				Y: (v: number) => g.pad.t + ((g.yr[1] - v) / (g.yr[1] - g.yr[0])) * (g.H - g.pad.t - g.pad.b),
			};
		});

		function draw() {
			const t = tIn ? Number(tIn.value) : 0;
			const pb = 20 + (2 * t) / 3;
			const ps = 20 - t / 3;
			const q = 60 - (4 * t) / 3;
			const cs = 0.5 * q * (50 - pb);
			const psur = 0.5 * q * (ps - 5);
			const rev = t * q;
			const dwl = 0.5 * t * (60 - q);
			for (const { el, X, Y } of plots) {
				const pts = (p: [number, number][]) => p.map(([a, b]) => `${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join(' ');
				el('cs').setAttribute('points', pts([[0, 50], [0, pb], [q, pb]]));
				el('ps').setAttribute('points', pts([[0, 5], [0, ps], [q, ps]]));
				el('rev').setAttribute('points', pts([[0, ps], [0, pb], [q, pb], [q, ps]]));
				el('dwl').setAttribute('points', pts([[q, pb], [q, ps], [60, 20]]));
			}
			const out = root.querySelector('[data-out="t"]');
			if (out) out.textContent = String(t);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{pb}', num(pb))
				.replace('{ps}', num(ps))
				.replace('{q}', num(q))
				.replace('{cs}', num(cs))
				.replace('{psur}', num(psur))
				.replace('{rev}', num(rev))
				.replace('{dwl}', num(dwl))
				.replace('{total}', num(cs + psur + rev));
		}

		tIn?.addEventListener('input', draw);
		draw();
	});
}

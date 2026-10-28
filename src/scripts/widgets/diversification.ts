// Client behavior for DiversificationSlider.astro (figure 6-1 of lesson 0.3).
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	yMax: number;
}

export function initDiversification() {
	document.querySelectorAll<HTMLElement>('[data-widget="diversification"]').forEach((root) => {
		// One plot per layout (wide and narrow); each carries its own geometry.
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				X: (w: number) => g.pad.l + w * (g.W - g.pad.l - g.pad.r),
				Y: (s: number) => g.pad.t + (1 - s / g.yMax) * (g.H - g.pad.t - g.pad.b),
			};
		});
		const sa = Number(root.dataset.sigmaA);
		const sb = Number(root.dataset.sigmaB);
		const sd = (w: number, rho: number) =>
			Math.sqrt(Math.max(0, w * w * sa * sa + (1 - w) * (1 - w) * sb * sb + 2 * w * (1 - w) * rho * sa * sb));
		const rhoIn = root.querySelector<HTMLInputElement>('[data-param="rho"]')!;
		const wIn = root.querySelector<HTMLInputElement>('[data-param="w"]')!;
		const f = (v: number, d = 2) => v.toFixed(d);

		function draw() {
			const rho = Number(rhoIn.value);
			const w = Number(wIn.value);
			const p = sd(w, rho);
			const a = w * sa + (1 - w) * sb;
			const denom = sa * sa + sb * sb - 2 * rho * sa * sb;
			const mw = denom > 1e-9 ? Math.min(1, Math.max(0, (sb * sb - rho * sa * sb) / denom)) : 0;
			const ms = sd(mw, rho);

			for (const { el, X, Y } of plots) {
				let d = '';
				for (let i = 0; i <= 200; i++) {
					const x = i / 200;
					d += `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(sd(x, rho)).toFixed(1)}`;
				}
				el('curve').setAttribute('d', d);
				const gap = el('gap');
				gap.setAttribute('x1', String(X(w)));
				gap.setAttribute('x2', String(X(w)));
				gap.setAttribute('y1', String(Y(a)));
				gap.setAttribute('y2', String(Y(p)));
				const cur = el('cur');
				cur.setAttribute('cx', String(X(w)));
				cur.setAttribute('cy', String(Y(p)));
				const min = el('min');
				min.setAttribute('cx', String(X(mw)));
				min.setAttribute('cy', String(Y(ms)));
			}

			root.querySelector('[data-out="rho"]')!.textContent = f(rho);
			root.querySelector('[data-out="w"]')!.textContent = `${Math.round(w * 100)}%`;
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{p}', f(p))
				.replace('{a}', f(a))
				.replace('{g}', f(a - p))
				.replace('{mw}', f(mw * 100, 1))
				.replace('{ms}', f(ms));
		}

		rhoIn.addEventListener('input', draw);
		wIn.addEventListener('input', draw);
		draw();
	});
}

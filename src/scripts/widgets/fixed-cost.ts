// Client behavior for FixedCostProfit.astro (lesson 0.2): profit π(q) = 40q − q² − F.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	qMax: number;
	yMin: number;
	yMax: number;
}

export function initFixedCost() {
	document.querySelectorAll<HTMLElement>('[data-widget="fixed-cost"]').forEach((root) => {
		const FIn = root.querySelector<HTMLInputElement>('[data-param="F"]')!;
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				g,
				X: (q: number) => g.pad.l + (q / g.qMax) * (g.W - g.pad.l - g.pad.r),
				Y: (v: number) => g.pad.t + ((g.yMax - v) / (g.yMax - g.yMin)) * (g.H - g.pad.t - g.pad.b),
			};
		});
		const profit = (q: number, F: number) => 40 * q - q * q - F;

		function draw() {
			const F = Number(FIn.value);
			// The peak, found numerically from the curve so that the figure does not assume the answer.
			let qBest = 0;
			for (let i = 0; i <= 400; i++) {
				const q = (i / 400) * 40;
				if (profit(q, F) > profit(qBest, F)) qBest = q;
			}
			const best = profit(qBest, F);
			for (const { el, g, X, Y } of plots) {
				let d = '';
				for (let i = 0; i <= 200; i++) {
					const q = (i / 200) * g.qMax;
					const v = Math.max(g.yMin, profit(q, F));
					d += `${i ? 'L' : 'M'}${X(q).toFixed(1)},${Y(v).toFixed(1)}`;
				}
				el('curve').setAttribute('d', d);
				const line = el('peakline');
				line.setAttribute('x1', String(X(qBest)));
				line.setAttribute('x2', String(X(qBest)));
				line.setAttribute('y1', String(Y(g.yMax)));
				line.setAttribute('y2', String(Y(g.yMin)));
				const peak = el('peak');
				peak.setAttribute('cx', String(X(qBest)));
				peak.setAttribute('cy', String(Y(best)));
			}
			root.querySelector('[data-out="F"]')!.textContent = String(F);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{q}', String(Math.round(qBest)))
				.replace('{p}', String(Math.round(best)).replace('-', '−'));
		}

		FIn.addEventListener('input', draw);
		draw();
	});
}

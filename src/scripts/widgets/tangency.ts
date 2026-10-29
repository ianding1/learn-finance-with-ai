// Client behavior for BudgetTangency.astro (lesson 0.2): U = xy on the budget line 2x + 4y = 100.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xMax: number;
	yMax: number;
}

const ARROW = 46; // arrow length in px; only the direction matters

export function initTangency() {
	document.querySelectorAll<HTMLElement>('[data-widget="tangency"]').forEach((root) => {
		const xIn = root.querySelector<HTMLInputElement>('[data-param="x"]')!;
		const moves = JSON.parse(root.dataset.move || '[]') as string[];
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				g,
				X: (x: number) => g.pad.l + (x / g.xMax) * (g.W - g.pad.l - g.pad.r),
				Y: (y: number) => g.pad.t + (1 - y / g.yMax) * (g.H - g.pad.t - g.pad.b),
			};
		});
		const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, ''));

		function arrow(line: SVGElement, px: number, py: number, dx: number, dy: number) {
			// Screen coordinates: y grows downward.
			const len = Math.hypot(dx, dy) || 1;
			line.setAttribute('x1', String(px));
			line.setAttribute('y1', String(py));
			line.setAttribute('x2', String(px + (dx / len) * ARROW));
			line.setAttribute('y2', String(py - (dy / len) * ARROW));
		}

		function draw() {
			const x = Number(xIn.value);
			const y = 25 - x / 2;
			const u = x * y;
			const a = y / 2;
			const b = x / 4;
			for (const { el, g, X, Y } of plots) {
				let d = '';
				let first = true;
				for (let i = 0; i <= 200; i++) {
					const xx = 0.5 + (i / 200) * (g.xMax - 0.5);
					const yy = u / xx;
					if (yy > g.yMax) continue;
					d += `${first ? 'M' : 'L'}${X(xx).toFixed(1)},${Y(yy).toFixed(1)}`;
					first = false;
				}
				el('contour').setAttribute('d', d);
				const px = X(x);
				const py = Y(y);
				// Directions in data units, converted to screen units so that the angles are right.
				const sx = (X(1) - X(0));
				const sy = (Y(0) - Y(1));
				arrow(el('gu'), px, py, y * sx, x * sy);
				arrow(el('gg'), px, py, 2 * sx, 4 * sy);
				const pt = el('pt');
				pt.setAttribute('cx', String(px));
				pt.setAttribute('cy', String(py));
			}
			const move = Math.abs(a - b) < 1e-9 ? moves[2] : a > b ? moves[0] : moves[1];
			root.querySelector('[data-out="x"]')!.textContent = fmt(x);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{x}', fmt(x))
				.replace('{y}', fmt(y))
				.replace('{u}', fmt(u))
				.replace('{a}', fmt(a))
				.replace('{b}', fmt(b))
				.replace('{move}', move);
		}

		xIn.addEventListener('input', draw);
		draw();
	});
}

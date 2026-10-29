// Client behavior for RegressionFit.astro (lesson 0.5, figure 2-1).
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
	yr: [number, number];
}

const SVG = 'http://www.w3.org/2000/svg';

export function initRegression() {
	document.querySelectorAll<HTMLElement>('[data-widget="regression"]').forEach((root) => {
		const data = JSON.parse(root.dataset.points || '{}') as { x: number[]; y: number[] };
		const aIn = root.querySelector<HTMLInputElement>('[data-param="a"]')!;
		const bIn = root.querySelector<HTMLInputElement>('[data-param="b"]')!;
		const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')];
		const ssr = (a: number, b: number) => data.x.reduce((s, x, i) => s + (data.y[i] - a - b * x) ** 2, 0);

		// Least-squares line, for the readout.
		const n = data.x.length;
		const mx = data.x.reduce((s, v) => s + v, 0) / n;
		const my = data.y.reduce((s, v) => s + v, 0) / n;
		const bHat =
			data.x.reduce((s, x, i) => s + (x - mx) * (data.y[i] - my), 0) / data.x.reduce((s, x) => s + (x - mx) ** 2, 0);
		const aHat = my - bHat * mx;
		const minSsr = ssr(aHat, bHat);

		function draw() {
			const a = Number(aIn.value);
			const b = Number(bIn.value);
			for (const svg of svgs) {
				const g = JSON.parse(svg.dataset.geom!) as Geom;
				const X = (v: number) => g.pad.l + ((v - g.xr[0]) / (g.xr[1] - g.xr[0])) * (g.W - g.pad.l - g.pad.r);
				const Y = (v: number) => g.pad.t + ((g.yr[1] - v) / (g.yr[1] - g.yr[0])) * (g.H - g.pad.t - g.pad.b);
				const line = svg.querySelector('[data-el="line"]')!;
				line.setAttribute('x1', String(X(g.xr[0])));
				line.setAttribute('y1', String(Y(a + b * g.xr[0])));
				line.setAttribute('x2', String(X(g.xr[1])));
				line.setAttribute('y2', String(Y(a + b * g.xr[1])));
				const box = svg.querySelector('[data-el="resid"]')!;
				box.replaceChildren();
				data.x.forEach((x, i) => {
					const seg = document.createElementNS(SVG, 'line');
					seg.setAttribute('class', 'viz-resid');
					seg.setAttribute('x1', String(X(x)));
					seg.setAttribute('x2', String(X(x)));
					seg.setAttribute('y1', String(Y(data.y[i])));
					seg.setAttribute('y2', String(Y(a + b * x)));
					box.appendChild(seg);
				});
			}
			root.querySelector('[data-out="a"]')!.textContent = a.toFixed(1);
			root.querySelector('[data-out="b"]')!.textContent = b.toFixed(2);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{ssr}', ssr(a, b).toFixed(2))
				.replace('{min}', minSsr.toFixed(2));
		}

		aIn.addEventListener('input', draw);
		bIn.addEventListener('input', draw);
		draw();
	});
}

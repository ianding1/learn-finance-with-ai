// Client behavior for ConfidenceIntervals.astro (lesson 0.4, figure 5-1).
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	lo: number;
	hi: number;
}

const SVG = 'http://www.w3.org/2000/svg';
const MU = 8;
const SIGMA = 16;
const HISTORIES = 100;
const MAX_N = 50;

function el(name: string, attrs: Record<string, string | number>) {
	const e = document.createElementNS(SVG, name);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	return e;
}

/** Small seeded generator, so that the first picture is the same for every reader. */
function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function initConfidenceIntervals() {
	document.querySelectorAll<HTMLElement>('[data-widget="ci-sim"]').forEach((root) => {
		const nIn = root.querySelector<HTMLInputElement>('[data-param="n"]')!;
		const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')];
		let seed = 20261028;
		// HISTORIES × MAX_N standard normal draws; a history with n years uses its first n draws.
		let draws: number[][] = [];

		function sample() {
			const u = rng(seed);
			draws = Array.from({ length: HISTORIES }, () =>
				Array.from({ length: MAX_N }, () => {
					// Box–Muller transform
					const a = Math.max(u(), 1e-12);
					const b = u();
					return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
				}),
			);
		}

		function draw() {
			const n = Number(nIn.value);
			const rows = draws.map((z) => {
				const x = z.slice(0, n).map((v) => MU + SIGMA * v);
				const m = x.reduce((s, v) => s + v, 0) / n;
				const s = Math.sqrt(x.reduce((acc, v) => acc + (v - m) ** 2, 0) / (n - 1));
				const half = (1.96 * s) / Math.sqrt(n);
				return { m, a: m - half, b: m + half, hit: m - half <= MU && MU <= m + half };
			});
			const hits = rows.filter((r) => r.hit).length;
			const meanOfMeans = rows.reduce((s, r) => s + r.m, 0) / HISTORIES;
			const sd = Math.sqrt(rows.reduce((s, r) => s + (r.m - meanOfMeans) ** 2, 0) / (HISTORIES - 1));

			for (const svg of svgs) {
				const g = JSON.parse(svg.dataset.geom!) as Geom;
				const X = (v: number) => g.pad.l + ((Math.min(Math.max(v, g.lo), g.hi) - g.lo) / (g.hi - g.lo)) * (g.W - g.pad.l - g.pad.r);
				const step = (g.H - g.pad.t - g.pad.b) / HISTORIES;
				const box = svg.querySelector('[data-el="rows"]')!;
				box.replaceChildren();
				rows.forEach((r, i) => {
					const y = g.pad.t + (i + 0.5) * step;
					const cls = r.hit ? 'viz-ci-hit' : 'viz-ci-miss';
					box.appendChild(el('line', { class: cls, x1: X(r.a), x2: X(r.b), y1: y, y2: y }));
					box.appendChild(el('circle', { class: `${cls}-dot`, cx: X(r.m), cy: y, r: Math.min(2.2, step * 0.6) }));
				});
			}

			root.querySelector('[data-out="n"]')!.textContent = String(n);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{hit}', String(hits))
				.replace('{sd}', sd.toFixed(2))
				.replace('{se}', (SIGMA / Math.sqrt(n)).toFixed(2));
		}

		root.querySelector('[data-action="redraw"]')!.addEventListener('click', () => {
			seed = (seed * 1103515245 + 12345) >>> 0;
			sample();
			draw();
		});
		nIn.addEventListener('input', draw);
		sample();
		draw();
	});
}

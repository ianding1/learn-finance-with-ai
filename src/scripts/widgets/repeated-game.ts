// Client behavior for RepeatedGame.astro (lesson 1.7): cumulative present value of keeping the high price
// (10 every period) and of cutting the price now (15 now, then 5 every period), for discount factor δ.
interface Geom {
	W: number;
	H: number;
	pad: { l: number; r: number; t: number; b: number };
	xr: [number, number];
}

const KEEP = 10;
const CHEAT = 15;
const PUNISH = 5;
const PERIODS = 30;
const MAXES = [20, 40, 60, 80, 100, 120, 160, 200];
const num = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

export function initRepeatedGame() {
	document.querySelectorAll<HTMLElement>('[data-widget="repeated-game"]').forEach((root) => {
		const dIn = root.querySelector<HTMLInputElement>('[data-param="delta"]')!;
		const plots = [...root.querySelectorAll<SVGSVGElement>('svg[data-geom]')].map((svg) => {
			const g = JSON.parse(svg.dataset.geom!) as Geom;
			return {
				g,
				el: (name: string) => svg.querySelector<SVGElement>(`[data-el="${name}"]`)!,
				X: (v: number) => g.pad.l + ((v - g.xr[0]) / (g.xr[1] - g.xr[0])) * (g.W - g.pad.l - g.pad.r),
			};
		});

		function draw() {
			const d = Number(dIn.value);
			const keep: number[] = [];
			const cheat: number[] = [];
			let k = 0;
			let c = 0;
			for (let t = 0; t <= PERIODS; t++) {
				const f = Math.pow(d, t);
				k += KEEP * f;
				c += (t === 0 ? CHEAT : PUNISH) * f;
				keep.push(k);
				cheat.push(c);
			}
			const top = MAXES.find((m) => m >= Math.max(k, c)) ?? MAXES[MAXES.length - 1];
			for (const { g, el, X } of plots) {
				const Y = (v: number) => g.pad.t + ((top - v) / top) * (g.H - g.pad.t - g.pad.b);
				for (let i = 0; i <= 4; i++) {
					const v = (top * i) / 4;
					el(`yl${i}`).setAttribute('y1', Y(v).toFixed(1));
					el(`yl${i}`).setAttribute('y2', Y(v).toFixed(1));
					el(`yt${i}`).setAttribute('y', (Y(v) + 4).toFixed(1));
					el(`yt${i}`).textContent = String(v);
				}
				el('keep').setAttribute('points', keep.map((v, t) => `${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' '));
				el('cheat').setAttribute('points', cheat.map((v, t) => `${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' '));
			}
			const pvKeep = KEEP / (1 - d);
			const pvCheat = CHEAT + (PUNISH * d) / (1 - d);
			const verdict =
				Math.abs(pvKeep - pvCheat) < 1e-9
					? root.dataset.equal
					: pvKeep > pvCheat
						? root.dataset.keepBetter
						: root.dataset.cheatBetter;
			root.querySelector('[data-out="delta"]')!.textContent = d.toFixed(2);
			root.querySelector<HTMLElement>('[data-el="readout"]')!.textContent = (root.dataset.readout || '')
				.replace('{keep}', num(pvKeep))
				.replace('{cheat}', num(pvCheat))
				.replace('{verdict}', verdict || '');
		}

		dIn.addEventListener('input', draw);
		draw();
	});
}

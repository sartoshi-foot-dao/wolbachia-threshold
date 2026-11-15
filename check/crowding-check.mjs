// Why does crowding inside each breeding container favour Wolbachia in
// https://zidingz.com/wolbachia-tipping-point/ ?
//
//   node crowding-check.mjs
//
// Needs Node 18 or later. Like run-checks.mjs, it reads the simulation code from
// ../app/index.html (or fetches the live page) and uses fixed seeds. About 2,160 runs;
// roughly two minutes on a 12-core laptop.
//
// Each variant changes one rule in the simulation by patching its source, then finds
// where half the runs started near the formula's tipping point take over (no wild arrivals).
// The variants:
//   as published     eggs go to the nearest container; larvae compete inside their container
//   shared crowding  larvae compete for room across the whole map
//   random container a mother lays her whole clutch in a random container on the map
//   random + shared  both of the above
//   scattered eggs   every egg goes to its own random container, so siblings never share one
//   failed eggs take room   eggs killed by the mating failure still crowd the container
// It also reports how much better infected larvae survive than wild ones (first 200 days of
// runs started at the formula's tipping point). That ratio is a rough guide: it is measured
// while the infected share is changing, so it is not exactly 1 even with shared crowding.
import { readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const PAGE_URL = 'https://zidingz.com/experiments/wolbachia-sweep/app/';
async function pageSource() {
  try { return readFileSync(here + '../app/index.html', 'utf8'); }
  catch {
    process.stderr.write(`No ../app/index.html next to this script; fetching ${PAGE_URL}\n`);
    const r = await fetch(PAGE_URL);
    if (!r.ok) throw new Error(`Could not fetch ${PAGE_URL}: HTTP ${r.status}`);
    return r.text();
  }
}

const VARIANTS = {
  'as published': {},
  'shared crowding': { shared: true },
  'random container': { randomLay: true },
  'random + shared': { randomLay: true, shared: true },
  'scattered eggs': { scatter: true },
  'failed eggs take room': { deadSpace: true },
};

function loadEngine(html, v) {
  let src = html.slice(html.indexOf('function mulberry'), html.indexOf('const $=id=>'));
  const patch = (a, b) => { if (!src.includes(a)) throw new Error('Could not patch: ' + a); src = src.replace(a, b); };
  // larval survival bookkeeping: [wild survived, wild larvae, infected survived, infected larvae]
  patch('s.L-=w+v;', 'this.st[0]+=w*sv;this.st[1]+=w;this.st[2]+=v*sv;this.st[3]+=v;s.L-=w+v;');
  patch('this.n=0;this.day=0;', 'this.st=[0,0,0,0];this.n=0;this.day=0;');
  if (v.shared) {
    const a = 'const d=(this.day+1)%this.larvalDays;';
    patch(a, a + 'let LT=0,KT=0;for(const q of this.sites){LT+=q.L;KT+=q.K}');
    patch('sv=1/(1+s.L/s.K)', 'sv=1/(1+LT/KT)');
  }
  const nearest = 'const s=this.sites[this.near[(this.x[i]/25|0)+(this.y[i]/25|0)*this.lw]]';
  if (v.randomLay) patch(nearest, 'const s=this.sites[this.rand()*this.sites.length|0]');
  if (v.scatter) {
    patch(nearest, 'const s=this.sites[this.rand()*this.sites.length|0]');
    patch('s.w[d]+=U;s.i[d]+=I;s.L+=U+I;',
      'for(let k=0;k<U;k++){const q=this.sites[this.rand()*this.sites.length|0];q.w[d]++;q.L++}' +
      'for(let k=0;k<I;k++){const q=this.sites[this.rand()*this.sites.length|0];q.i[d]++;q.L++}');
  }
  if (v.deadSpace) {
    patch('s.w[d]+=U;s.i[d]+=I;s.L+=U+I;', 's.w[d]+=U;s.i[d]+=I;s.L+=U+I+lost;(s.dead||(s.dead=new Int32Array(this.larvalDays)))[d]+=lost;');
    patch('const w=s.w[d],v=s.i[d];', 'if(s.dead&&s.dead[d]){s.L-=s.dead[d];s.dead[d]=0}const w=s.w[d],v=s.i[d];');
  }
  return new Function(src + '\nreturn {Sim, Theory};')();
}

if (!isMainThread) {
  const engines = {};
  for (const j of workerData.jobs) {
    const { Sim } = engines[j.v] || (engines[j.v] = loadEngine(workerData.html, VARIANTS[j.v]));
    const s = new Sim({ seed: j.seed, sf: j.sf, sh: 1, mu: 0.01, immigrants: 0 });
    s.seedShare(j.p0);
    s.st = [0, 0, 0, 0];
    let outcome = 'undecided', st = null;
    for (let d = 0; d < 1500; d++) {
      s.step();
      if (d === 199) st = s.st.slice();
      const pf = s.hist[s.hist.length - 1].pf;
      if (pf > 0.9) { outcome = 'took over'; break; }
      if (pf < 0.005) { outcome = 'died out'; break; }
    }
    parentPort.postMessage({ ...j, outcome, st: st || s.st });
  }
  parentPort.close();
} else {
  const html = await pageSource();
  const { Theory } = loadEngine(html, {});
  const COSTS = [0.1, 0.25, 0.4], OFFSETS = [-0.06, -0.04, -0.02, 0, 0.02, 0.04];
  const jobs = [];
  for (const v of Object.keys(VARIANTS)) for (const sf of COSTS) {
    const thr = Theory.roots(sf, 1, 0.01).thr;
    for (const off of OFFSETS) for (let k = 0; k < 20; k++) jobs.push({ v, sf, off, p0: thr + off, seed: 200 + k });
  }
  const n = Math.max(1, Math.min(cpus().length, jobs.length));
  const buckets = Array.from({ length: n }, () => []);
  jobs.forEach((j, i) => buckets[i % n].push(j));
  const results = [];
  await Promise.all(buckets.map(b => new Promise((ok, fail) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { html, jobs: b } });
    w.on('message', m => results.push(m)); w.on('error', fail); w.on('exit', ok);
  })));

  console.log('Where half the runs take over, in points from the formula; and infected/wild larval survival.');
  console.log('variant'.padEnd(24) + COSTS.map(c => `cost ${c * 100}%`.padEnd(22)).join(''));
  for (const v of Object.keys(VARIANTS)) {
    const cells = COSTS.map(sf => {
      const g = results.filter(r => r.v === v && r.sf === sf);
      const fr = OFFSETS.map(off => g.filter(r => r.off === off && r.outcome === 'took over').length / 20);
      let x = null;
      for (let i = 1; i < OFFSETS.length; i++) if (fr[i - 1] < 0.5 && fr[i] >= 0.5) { x = OFFSETS[i - 1] + (0.5 - fr[i - 1]) / (fr[i] - fr[i - 1]) * (OFFSETS[i] - OFFSETS[i - 1]); break; }
      const S = g.filter(r => r.off === 0).reduce((a, r) => a.map((q, i) => q + r.st[i]), [0, 0, 0, 0]);
      const ratio = (S[2] / S[3]) / (S[0] / S[1]);
      return `${x === null ? '?' : (x > 0 ? '+' : '') + (x * 100).toFixed(1)} pts, x${ratio.toFixed(3)}`.padEnd(22);
    });
    console.log(v.padEnd(24) + cells.join(''));
  }
}

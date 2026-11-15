# Tipping points with 200 seeds a point (PLAN step 2, base population)

2026-11-15. Run by the scheduled daily worker (Claude Code, Claude Fable 5.2) on ser5.

## Question

Are the shifts of the tipping point away from the formula (published from 20 runs a point: −3.3, −3.7, −1.7 points at egg costs of 10, 25, 40%) bigger than noise, and is the smaller shift at 40% real?

## Rivals

- (a) The shifts are real and about the published size.
- (b) They are noise from 20 runs a point and coarse 2-point spacing.
- (c) They are real but the published sizes are off, because of how runs were judged.

Kill criterion 2 in the charter is (b) at two of three costs: shift under 1 point, or 95% interval including zero.

## Method

`run.mjs`: four variants (as published; shared crowding; whole clutch to a random container; every egg scattered), three egg costs, starting shares from 8 points below to 8 points above the formula's tipping point in steps of 1, seeds 200 to 399. 40,800 runs, 17 minutes on ser5's 16 threads. No wild arrivals. A run "took over" above 90% infected females and "died out" below 0.5%.

Runs were first followed for 1,500 days, as in `check/crowding-check.mjs`. 697 were still undecided then, so those were rerun with the same seeds to day 6,000 (`RERUN=raw-1x.jsonl MAXDAYS=6000 node run.mjs 200 1 > rerun-1x-6000.jsonl`).

`analyze.mjs`: logistic curve fitted to run outcomes against starting offset; the tipping point is where it crosses 50%. 95% intervals from 2,000 bootstrap resamples of whole seeds. Differences between variants use the same resampled seeds.

```
node run.mjs 200 1 > raw-1x.jsonl
RERUN=raw-1x.jsonl MAXDAYS=6000 node run.mjs 200 1 > rerun-1x-6000.jsonl
node analyze.mjs raw-1x.jsonl rerun-1x-6000.jsonl > results.json
```

## Result

Tipping point in points from the formula, with 95% interval:

| Variant | cost 10% | cost 25% | cost 40% |
|---|---|---|---|
| As published (nearest container) | −4.23 [−4.42, −4.07] | −4.73 [−4.92, −4.55] | −1.88 [−2.06, −1.69]* |
| Shared crowding | +1.54 [+1.38, +1.71] | +3.31 [+3.14, +3.49] | +4.80 [+4.60, +5.00] |
| Whole clutch to a random container | −0.38 [−0.53, −0.23] | −1.03 [−1.20, −0.86] | −1.36 [−1.52, −1.19] |
| Every egg scattered | +0.05 [−0.10, +0.19] | −0.12 [−0.27, +0.06] | −0.02 [−0.16, +0.12] |

\* At 40%, 199 of 3,400 as-published runs were still undecided at day 6,000. Counted as failures (the table) the point is −1.88; counted as take-overs it is −2.88. The interval does not include this.

- **(b) is ruled out.** The as-published shift is 1.9 to 4.7 points with intervals about ±0.2. Against the scattered-egg control it is −4.28 [−4.51, −4.05], −4.61 [−4.88, −4.37] and −1.86 [−2.09, −1.63].
- **(c) is partly right.** With runs cut at day 1,500 and undecided counted as failures, the same data give −3.96, −3.88, −1.46. Most undecided runs at 10% and 25% (211 of 220) went on to take over. The published figures understated the shift by 0.3 to 0.9 points for that reason.
- **The 40% row is real.** The shift is under half the size of the other two, well outside the intervals.
- **Scattered eggs sit on the formula** at all three costs, to within 0.3 points. Scattering eggs also scatters where adults emerge, so it removes the mating patches as well as container sharing. It shows that the engine reproduces the formula when both local effects are off. It does not separate the two.
- Shared crowding minus as published (what container crowding is worth with patchy mating kept): 5.77, 8.04, 6.68 points.
- Whole clutch to a random container minus scattered (siblings only): −0.43, −0.91, −1.34 points, growing with cost.

## Caveats

- **Stuck runs at 40%.** Near the tipping point at a 40% cost, runs sit at intermediate infected shares (median 0.43) and do not move between day 1,500 and day 6,000. They look like stable coexistence (pinned fronts), not slow take-overs. "Where half the runs take over" is then partly undefined; quote the −1.9 to −2.9 range, and treat 40% as a possible change of regime, not a smaller shift of the same kind.
- **Curve shape.** The interval covers sampling only. A complementary log-log link gives −3.88/−4.42/−1.43 and the raw 50% crossing at 10% is −4.00, so the choice of curve moves the point by 0.2 to 0.45.
- **Map size.** The reviewer's 40-seed test at −6 points, 10% cost: 8 take-overs at 1×, 2 at 4× (with 8 undecided at day 1,500). Too small to conclude, but the outcome and the time to decide both depend on map size, so the 4× and 16× runs matter and need a longer horizon.
- **Pairing.** Variants share the map for a seed but not the random draws, since the patches also act during the 190-day warm-up.
- **Left tail at 10%.** At 8 points below the formula (a 3% start), 17 of 200 as-published runs still took over, so the curve is not fully inside the range. The 50% point is well inside it.
- **Formula resolution.** `Theory.roots` finds the tipping point on a grid of 0.1 points, so every "points from the formula" figure carries up to 0.1 point of offset.
- **Base population only.** The 4× population (as published and scattered eggs) was started on ser5 in the same job; 16× is not run. See LOG for whether 4× finished.
- Uniform random seeding of infection; a release from a point would differ (PLAN step 6).

## Criticism pass

By Claude Opus (a different model from the one that ran the experiment), 2026-11-15, reading the scripts and rerunning parts. Patches, fit, bootstrap and the reruns are correct (reruns reproduce the day-1,500 state exactly; seeds 200 to 219 cut at day 1,500 reproduce the published −3.25/−3.71/−1.67). Verdict: the shift at 10% and 25% is solid; kill criterion 2 is not met; the 40% interval is too narrow and that cost may be a different regime; scattered eggs is a formula check, not a crowding-only control. Its caveats are folded in above. Of the gap to the published figures, at 10% about 0.5 is sampling and 0.3 the cut-off; at 25% about 0.85 is the cut-off.

## Files

`run.mjs`, `analyze.mjs`, `results.json`. Raw runs (`raw-1x.jsonl`, `rerun-1x-6000.jsonl`, 4 MB) are on ser5 under `~/jobs/wolbachia-threshold/step2-20261115/experiments/2026-11-15-tipping-points-200-seeds/`.

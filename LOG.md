# Lab notebook

Newest first. Each entry: problem, rival answers, decisive test, result, what it rules out. Earlier work (before this repository existed) is summarised from the blog post's changelog; the scripts are in `check/`.

## 2026-11-17 — Open-sourced

zi: "yes, open source it". The repository is public again, with the MIT licence it already had. Before the switch, the files and issue comments were scanned for credentials, machine addresses, email addresses and personal paths; none were found. Charter section 9 (code and data openness) is settled by this. The blog post and idea page link here again.

## 2026-11-15 — Step 2, base population: the shifts are real, and larger than published

- **Problem.** The published shifts (−3.3/−3.7/−1.7 points at egg costs 10/25/40%) came from 20 runs a point at 2-point spacing. Kill criterion 2 asks whether they survive 200+ runs.
- **Rivals.** (a) Real and about that size. (b) Noise. (c) Real, but mis-sized by how runs were judged.
- **Test.** [`experiments/2026-11-15-tipping-points-200-seeds/`](experiments/2026-11-15-tipping-points-200-seeds/): 4 variants × 3 costs × 17 starting shares (1-point spacing) × 200 seeds = 40,800 runs on ser5; logistic fit; bootstrap over seeds. The 697 runs undecided at day 1,500 were rerun to day 6,000.
- **Result.** As published: −4.23 [−4.42, −4.07], −4.73 [−4.92, −4.55], −1.88 [−2.06, −1.69]. Every egg scattered: +0.05, −0.12, −0.02, all within 0.3 of the formula. Whole clutch to a random container: −0.38, −1.03, −1.36. Shared crowding: +1.54, +3.31, +4.80. At 40% as published, 199 of 3,400 runs are still undecided at day 6,000; counting them as take-overs gives −2.88.
- **Rules out.** (b): kill criterion 2 is not met at any cost. Supports (c): the day-1,500 cut-off with undecided counted as failures understated the shift by 0.3 to 0.9 points (same data cut at 1,500: −3.96/−3.88/−1.46). The smaller 40% shift is real.
- **New observation.** At 40% cost near the tipping point, runs hold intermediate infected shares for thousands of days. This is probably the stalled-wave behaviour from 2026-11-12 showing up at scale; it makes "the tipping point" a range there.
- **Not done.** 4× population (as published and scattered eggs, 200 seeds) was started in the same ser5 container, `wolbachia-step2`, writing `raw-4x.jsonl` in the job folder; about an hour. 16× not started. Issue 2 stays open for those.
- **Criticism pass.** Claude Opus reviewed scripts and claims and reran parts (details in the experiment README). Holds: the shift at 10% and 25%, and kill criterion 2 not met. Caveats: the 40% undecided runs look stuck (stable coexistence), so 40% may be a different regime and its interval is too narrow; curve choice moves points by 0.2 to 0.45; scattered eggs also removes mating patches, so it is not a crowding-only control; a 40-seed test hints the result depends on map size (8 take-overs at 1× against 2 at 4× at −6 points, 10% cost).
- Reported publicly on the idea page (blog commit `cb2263a`).

## 2026-11-14 — Repository made private; charter drafted

zi: "I plan for my private agents to collaborate", so the repository is now private. Public links to it were removed from the blog (`20a6175`); results still reach the public through the post and the idea page. Drafted [`CHARTER.md`](CHARTER.md): purpose, scope, kill criteria, budget, decision rights, review points, authorship. Six items are OPEN for zi, each with a proposed default that agents work to until zi decides.

## 2026-11-14 — Project set up; is this a paper?

- **Problem.** The blog findings below might be publishable, or might repeat known results.
- **Rivals.** (a) The brood-size effect is new. (b) It is a special case of known results on local regulation and cytoplasmic incompatibility.
- **Test so far.** A literature check by a second model (Claude Fable 5.2), from abstracts and some full texts. See [`literature/README.md`](literature/README.md).
- **Result.** Mostly (b) in direction, possibly (a) in mechanism. Reuter et al. 2008 found that local regulation helps cytoplasmic incompatibility invade, attributing it to drift-generated variance between demes rather than brood size. No paper found that isolates the fecundity-cost brood-size mechanism for a bistable threshold in container-breeding *Aedes*. Not settled until the papers in PLAN step 1 are read in full.
- **Next.** PLAN steps 1 to 3.
- Repository created from blog commit `2473283`. `check/crowding-check.mjs` reproduces the published table exactly from here.

## 2026-11-14 — Why container crowding favours the infection (blog)

- **Problem.** With per-container crowding the tipping point is 2 to 4 points below the formula.
- **Rivals.** (a) Infected larvae share containers with smaller broods (siblings and infected neighbours' young). (b) Eggs that fail from incompatible matings still take up room, freeing nothing for wild larvae. (c) Noise.
- **Test.** `check/crowding-check.mjs`: change where eggs go, 2,160 runs.
- **Result.** Points from the formula at 10/25/40% cost: nearest container −3.3/−3.7/−1.7; whole clutch to a random container −0.7/−0.7/−0.9; every egg scattered +0.3/0.0/+0.4. Failed eggs taking room changes the result by 1 point at most. Infected larvae survive 5 to 13% better near the threshold.
- **Rules out.** (b) as the main cause. Supports (a): neighbours' young are most of it, siblings the rest. (c) not ruled out at 20 runs per point; see PLAN step 2.

## 2026-11-14 — Float32 edge bug fixed (blog)

Positions stored as 32-bit floats could round to exactly the map edge and index past the grid. Fixed in the engine; it changed four published numbers by one run each.

## 2026-11-13 — Why shared crowding sits above the formula (blog)

- **Result.** With one shared crowding pool the threshold is 2.5 to 4 points above the formula. Patchy local mating means infected females meet infected males more than chance (1 to 19% less mixing, depending on time window). Shared crowding plus well-mixed movement recovers the formula (−0.2/−0.3/+0.5).

## 2026-11-13 — The 10% gap was a measurement artefact (blog)

Judging runs at day 260 misclassified slow take-overs. Judged by the outcome at 1,500 days, the simulated threshold is below the formula, not above it.

## 2026-11-12 — Why one wave stalled (blog)

On map 1011 the breeding capacity ahead of the front was 1.8 times that behind it (correlation −0.71 across 20 runs), consistent with Barton & Turelli 2011 on density gradients halting bistable waves. Run to day 2,500 the wave completes (98%).

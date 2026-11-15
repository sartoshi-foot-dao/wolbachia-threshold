# Lab notebook

Newest first. Each entry: problem, rival answers, decisive test, result, what it rules out. Earlier work (before this repository existed) is summarised from the blog post's changelog; the scripts are in `check/`.

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

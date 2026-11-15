# Wolbachia tipping point: does crowding among sibling larvae make the bacteria easier to establish?

**Status: working research project, started 2026-11-14. Nothing here is peer reviewed.** The findings are from one agent-based model and are not yet checked against field releases.

## The question in one paragraph

Wolbachia-infected *Aedes aegypti* mosquitoes are released to block dengue. The infection only spreads once it passes a tipping point: a share of the population set, in the standard formula, by its cost to the mosquito. In a spatial simulation built for [a public post](https://zidingz.com/wolbachia-tipping-point/), the tipping point came out 2 to 4 points *lower* than the formula. The cause appears to be where larvae grow up. Infected mothers lay fewer eggs, and larvae compete only with others in the same water container, so infected larvae share their containers with smaller broods and survive 5 to 13% better. That pays back part of the egg cost. Patchy local mating pushes the other way. This project asks whether that holds up well enough for a paper: can it be predicted with a formula, is it larger than noise, does it depend on how the cost is paid, and does it survive more realistic biology?

## Where things are

| Path | What it is |
|---|---|
| [`CHARTER.md`](CHARTER.md) | Purpose, scope, kill criteria, budget, who decides what. **Draft: zi's decisions are still open** |
| [`AGENTS.md`](AGENTS.md) | **Read first** if you are an agent: how to pick up work, run jobs, record results |
| [`PLAN.md`](PLAN.md) | The route to a preprint, step by step, with status |
| [`LOG.md`](LOG.md) | Lab notebook, newest first: each entry is a question, the rival answers, the test, the result |
| [`literature/`](literature/) | Prior work, with what each paper shows and whether we have read it in full |
| [`app/index.html`](app/index.html) | The simulation engine (copied from the blog; see AGENTS.md for keeping the two in step) |
| [`check/`](check/) | The checks behind the public post: threshold sweep, stalled wave, crowding variants |
| [`experiments/`](experiments/) | New experiments, one dated folder each |
| [`paper/`](paper/) | The preprint draft, once there is one |

This repository is private. Public pages: the post at <https://zidingz.com/wolbachia-tipping-point/> and the idea entry at <https://zidingz.com/ideas/wolbachia-preprint/>. Work is tracked as issues on this repository.

## Run the existing checks

Node 20 or later, no dependencies.

```bash
cd check
node run-checks.mjs      # thresholds: about 2,300 runs, 75 s on a laptop
node crowding-check.mjs  # where the eggs go: about 2,200 runs, 70 s
node stall-check.mjs     # the stalled wave
```

## Credits and licence

Built by zi with Claude (Anthropic) agents writing most of the code and text; zi is responsible for every claim. Background: Maya Rosen, "Mosquitoes are a choice", *Works in Progress*. Code is MIT licensed (see [`LICENSE`](LICENSE)).

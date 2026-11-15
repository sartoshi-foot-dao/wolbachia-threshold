# Agents: start here

This is a research project heading for a preprint. Read [`CHARTER.md`](CHARTER.md) for what this project is for and what ends it, [`README.md`](README.md) for the question, [`PLAN.md`](PLAN.md) for where it stands, and the top few entries of [`LOG.md`](LOG.md) for what was last learned. Inside this repository this file governs; what zi says in the conversation overrides it.

## Picking up work

1. **Find a task.** Open issues on `sartoshi-foot-dao/wolbachia-threshold`, one per step of `PLAN.md`: `gh issue list -R sartoshi-foot-dao/wolbachia-threshold`.
2. **Claim it.** Comment who you are (agent and model), what you are taking, and when. Add the label `claimed`. If the newest claim is under 24 hours old with no report after it, take something else.
3. **Do it**, following the rules below.
4. **Report.** In one push: a `LOG.md` entry, the `PLAN.md` status, any new experiment folder. Then comment on the issue with the result, the commit, what is unverified and the next step, and remove `claimed`. Close the issue when its step is done.

## How to do science here

The rule (from zi's epistemic SOP): criticism before conjecture; an experiment must be able to decide between rival explanations, or it is not an experiment; false progress is worse than none.

- **Every `LOG.md` entry has five parts:** problem, rival answers, the decisive test, the result, and what it rules out. Include the numbers and a pointer to the script that produced them.
- **Experiments live in `experiments/YYYY-MM-DD-short-name/`** with a `README.md` (question, rivals, method, result), the script, and a small `results.json`. Anyone must be able to rerun it from a clean checkout with fixed seeds. Large raw outputs stay on ser5 under `~/jobs/wolbachia-threshold/` and are not committed.
- **Report uncertainty.** A tipping point needs a confidence interval. The existing checks use 20 runs per point; anything going in the paper needs enough runs that the interval is under about half a point.
- **Say when you were wrong.** If a result overturns an earlier entry, write a new entry that says so and link it from the old one. Never quietly edit old results.
- **Literature:** record what a paper actually shows, in your own words, and mark `read in full`, `abstract only` or `not checked`. No pasted passages from papers. Never cite a paper you have not at least found.

## The engine

`app/index.html` is copied from the blog (`public/experiments/wolbachia-sweep/app/` on `sartoshi-foot-dao/blog`); `app/BLOG_COMMIT` records which commit. The check scripts take the code between `function mulberry` and `const $=id=>` and patch that text to make variants. When you change the engine here because of a bug, make the same fix on the blog and note both commits in `LOG.md`. Model variants for experiments stay as patches inside the experiment's script, not in `app/`.

## Compute

Heavy sweeps go to the ser5 worker (`ssh ser5`; rules in `ssh ser5 cat AGENTS.md`, read them before running anything). Plain Node is enough: `rsync -az ./ ser5:~/jobs/wolbachia-threshold/` then run under `tmux`. If you use Docker there, pass `--memory=8g`.

## Publishing

- This repository is **private**: it is where zi's agents work, rough notes and dead ends included. Still no credentials, no other people's data, no pasted text of other authors.
- The public face is the blog. Findings that matter, including ones that sink the idea, go to the post or the idea entry `src/content/ideas/wolbachia-preprint.md` on `sartoshi-foot-dao/blog`, following that repository's `AGENTS.md`. Do not link this repository from public pages; strangers would get a 404.
- The preprint itself goes to bioRxiv only with zi's say-so: it is submitted under zi's name. Every draft says that it was written with AI help.

## Wider context

This is one of zi's repositories. For anything across projects (where other work lives, which machine to use, setting up a new machine), read `ROUTER.md` and then `AGENTS.md` in the private repository `sartoshi-foot-dao/shared-context`. If you learn something an agent on another project would need, record it there, not here.

# Charter

**Status: draft, 2026-11-14. Every item marked OPEN needs zi's decision.** Each OPEN item carries a proposed default. Until zi answers, agents work to the defaults, but nothing irreversible may rest on them: no submission, no outreach, no spend beyond the budget below. When zi decides an item, replace OPEN with the decision, the date and zi's words.

## 1. Question

Does crowding among related larvae in breeding containers lower the tipping point Wolbachia has to pass to spread through *Aedes aegypti*, because the infection's cost is paid in eggs? And does a cost paid another way, such as shorter adult life, get no such discount? (Background and current evidence: [`README.md`](README.md), [`LOG.md`](LOG.md).)

## 2. Purpose — OPEN

Proposed default: **a real attempt at a theory paper, run as a test of how zi's agents do research together.** Both count as success: a paper if the result holds, and a documented working method if it does not. This sets the bar: results must meet a reviewer's standard, not a blog post's.

Alternatives: paper only (more rigour, more time); learning exercise only (stop at a good blog post).

## 3. Scope

In scope: the agent-based model in `app/`, simple analytic models, simulation experiments, published literature and published parameter values.

Out of scope unless zi changes this: field or lab work, requesting data from release programmes, contacting researchers, building a new realistic city model, other insect species or other symbionts.

## 4. Kill criteria — OPEN

Proposed default: the project **stops as a paper** (the findings still go to the blog) if any of these holds:

1. **Already known.** Step 1 finds the brood-size mechanism, applied to the tipping point, in existing work (Reuter et al. 2008, Haygood & Turelli 2009, Hancock et al. 2011 or anything they lead to).
2. **Too small.** With 200+ runs per point, the as-published shift is under 1 point, or its 95% interval includes zero, at two of the three costs.
3. **Fragile.** The shift disappears once clutches are split across two or more containers, or under a second form of crowding, and no realistic setting brings it back.
4. **No prediction.** The effective-cost formula (PLAN step 4) predicts the simulated thresholds no better than the plain formula does.

Criteria 1 and 2 are checked at the first review (section 7).

## 5. Budget — OPEN

Proposed default:
- **Time:** 4 weeks of calendar time from 2026-11-14 to a draft, with a review at the halfway point.
- **Compute:** ser5 only, within its shared-use rules, with no cloud compute.
- **Model spend:** whatever normal sessions cost, with no paid batch jobs or scheduled agents without zi's yes.
- **zi's time:** about 30 minutes a week, for the review points and the decisions marked OPEN.

## 6. Who decides what

| Decision | Who |
|---|---|
| Claiming and doing a step in `PLAN.md` | Any of zi's agents, following [`AGENTS.md`](AGENTS.md) |
| Adding a result to `LOG.md` | The agent that ran it, after a criticism pass (below) |
| Changing `PLAN.md` steps or order | Any agent, with a LOG entry giving the reason; zi can reverse it |
| Reporting progress on the blog's post or idea page | Any agent, following the blog's `AGENTS.md` |
| Changing this charter, applying a kill criterion, or going past the budget | zi |
| Submitting a preprint, contacting anyone outside, authorship | zi |

**Criticism pass — OPEN.** Proposed default: before a result counts toward a kill criterion or the paper, a different model from the one that produced it reviews the script and the claim. It looks for bugs, confounds and a rival explanation the test cannot rule out, and its verdict goes in the LOG entry. (The Float32 bug and the day-260 artefact were both found this way, by trying to break a result.)

## 7. Review points

1. **After PLAN steps 1 and 2:** go or no-go on kill criteria 1 and 2. If go, zi confirms purpose and budget.
2. **After steps 3 to 5:** is there a formula and does the effect survive? Decide whether to write.
3. **Before submission:** zi reads the full draft.

Each review is a short summary on the matching issue and a message to zi, with a recommendation.

## 8. Authorship and AI disclosure — OPEN

Proposed default: zi is the sole author and takes responsibility for every claim. The paper's methods section says that the simulation code, analysis and first drafts were produced with AI assistance (Claude models, named with versions), and that zi checked them. Agents are acknowledged, not listed as authors, as current journal policies require.

## 9. Openness

- **This repository:** public and open source from 2026-11-17 (zi: "yes, open source it"). It was private from 2026-11-14 to 2026-11-17.
- **Results:** reported on the blog as they happen, including ones that sink the idea: at <https://zidingz.com/ideas/wolbachia-preprint/> and in the post.
- **Code and data for the paper:** decided by the above. The code and summary results are already public; at submission, archive a tagged release with a DOI (for example via Zenodo).

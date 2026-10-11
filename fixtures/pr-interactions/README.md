# PR interaction lab — 2026-10-11

**Completed:** [results and limitations](results.md). The observer is disabled,
its arming variable removed, and fixture #74 closed without merging. All runs
finished. Future reproduction requires a new explicit, manually armed session
and a reopened/revalidated manifest fixture.

Julien explicitly requested real comment/PR-text/Actions tests on this bench
before preparing an English maintainer discussion document. This is a narrow,
manually armed exception to the bench's usual manual-trigger-only rule: an
observer receives fixture events only for the duration of this experiment.
It is not a canary, schedule, product workflow or paid agent.

The separate `manifest.json` pins fixture PR #74, its branch and registered
control comments. Never reuse the existing coding/report fixtures for this lab.

## Boundaries

- Only `homeassistant-ai/ha-mcp-workflows-dev`; product remains read-only.
- Event observers and the synthetic consumer use read-only job tokens.
- Manual comment operations mint an existing App token scoped only to this
  bench, with Issues/Pull requests write. No installed App permission expands.
- The optional check-button operation uses this bench's GitHub Actions token,
  without OAuth or the dedicated App's private key.
- Every operation requires a future `PR_INTERACTION_PROBE_UNTIL` timestamp.
- No model, merge, branch deletion, policy bypass or real reviewer request.
- Third-party actions are pinned; no code from the fixture branch is executed.
- Disable the observer and clear its arming variable after collecting evidence.

## Manual operations

Arm a short session with a repository variable, then dispatch
`pr-interaction-probe.yml` with `operation=observe`, `create-control`,
`bot-status` or `create-check`. Register the created comment ID in the manifest
before UI tests. A human-owned control comment can be registered separately.

Each option click may produce an event and lightweight observation run. Only
an explicit unchecked-to-checked command edge from the fixture author starts
the synthetic consumer. It reads the current comment until choices have been
stable for 30 seconds, validates the final modes/sign-off/editor and records
whether one assessment would be reserved. It does not call a model or push code.

Evidence appears in Actions summaries and `event-*` / `stable-input-*`
artifacts. Store the durable observations and run links here before disabling
the workflow; artifacts are retained for 30 days. Keep synthetic PR history.

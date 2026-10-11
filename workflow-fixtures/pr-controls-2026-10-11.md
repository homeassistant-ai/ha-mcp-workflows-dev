# PR interaction fixture — 2026-10-11

Synthetic, non-production data for manually authorized GitHub UI/event tests.

Only the workflow bench is involved. This file does not change Home Assistant,
release behavior, repository permissions or an agent's product workflow.

The test compares task-list edits in a PR description and a control comment,
ordinary comments, the native draft transition, manual workflow dispatch and
an optional check's requested-action button. No model is called.

Keep the PR and its event logs as evidence. Do not merge the fixture.

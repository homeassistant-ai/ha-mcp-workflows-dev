import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repository = "homeassistant-ai/ha-mcp-workflows-dev";
assert.equal(process.env.GITHUB_REPOSITORY, repository);
const canonical = (file) =>
  import(
    pathToFileURL(resolve(`.test-subject/.github/slash-agent/${file}.mjs`))
  );
const { API, collect } = await canonical("github");
const { prepare } = await canonical("main");
const { publish } = await canonical("publish");
const { command } = await canonical("core");
const api = new API(repository);
const manifest = JSON.parse(
  readFileSync("control/fixtures/manifest.json", "utf8"),
);
const fixture = manifest.fixtures.find((f) => f.key === "slash-coding");
assert.equal(fixture?.number, 70);
assert.equal(manifest.repository, repository);
const app = process.env.HA_MCP_APP_SLUG;
const operation = process.argv[2];
const directory = "control/slash-state";
const current = collect(api, fixture.number, app);
assert.equal(current.issue.title, fixture.title);
assert.ok(current.issue.labels.some((l) => l.name === "workflow-fixture"));

if (operation === "prepare") {
  const comments = current.comments.filter(
    (c) =>
      command(c.body) &&
      c.user?.type === "User" &&
      ["maintain", "admin"].includes(current.roles[c.user.login]),
  );
  const latest = comments
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    .at(-1);
  assert.ok(latest, "The fixture requires a maintainer command");
  const plan = prepare(
    api,
    { number: fixture.number, commandId: latest.id, automatic: true },
    app,
  );
  assert.ok(plan, "No pending fixture work");
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/plan.json`, JSON.stringify(plan));
  const { appendFileSync } = await import("node:fs");
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `mode=${plan.decision.mode}\nhead=${plan.snapshot.head}\nmodel=${plan.decision.parsed.model}\n`,
  );
} else if (operation === "verify") {
  const artifact = JSON.parse(readFileSync(`${directory}/result.json`, "utf8"));
  assert.ok(
    artifact.changes.every((f) =>
      /^fixtures\/slash\/[A-Za-z0-9_.-]+$/.test(f.path),
    ),
    "Only slash fixture files may change",
  );
  assert.notEqual(artifact.result.outcome, "blocked", artifact.result.summary);
  console.log(
    JSON.stringify({
      outcome: artifact.result.outcome,
      files: artifact.changes.map((f) => f.path),
      tests: artifact.result.tests,
      responses: artifact.result.responses.length,
    }),
  );
} else if (operation === "publish") {
  assert.equal(process.env.TOKEN_APP_SLUG, app);
  const plan = JSON.parse(readFileSync(`${directory}/plan.json`, "utf8"));
  const artifact =
    plan.decision.mode === "code"
      ? JSON.parse(readFileSync(`${directory}/result.json`, "utf8"))
      : null;
  if (artifact)
    assert.ok(
      artifact.changes.every((f) =>
        /^fixtures\/slash\/[A-Za-z0-9_.-]+$/.test(f.path),
      ),
    );
  const result = publish(api, plan, artifact, app, {
    runId: process.env.GITHUB_RUN_ID,
    workerSucceeded: !!artifact,
  });
  assert.ok(!result.skipped, "Publication unexpectedly skipped stale work");
  console.log(
    JSON.stringify({
      status: result.status,
      pr: result.pr,
      head: result.lastHead,
      rounds: result.rounds,
    }),
  );
} else throw Error("Unknown bench operation");

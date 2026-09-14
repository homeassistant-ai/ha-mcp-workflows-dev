import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const repository = "homeassistant-ai/ha-mcp-workflows-dev";
assert.equal(process.env.GITHUB_REPOSITORY, repository);
const intake = await import(
  pathToFileURL(resolve(".test-subject/.github/issue-intake/intake.mjs"))
);
const manifest = JSON.parse(readFileSync("fixtures/manifest.json", "utf8"));
const fixture = manifest.fixtures.find((f) => f.key === "intake-publication");
assert.equal(manifest.repository, repository);
assert.equal(fixture?.number, 69);
const mode = process.env.PUBLICATION_MODE;
assert.ok(["request", "answered"].includes(mode));
assert.equal(process.env.TOKEN_APP_SLUG, process.env.HA_MCP_APP_SLUG);
const bot = `${process.env.HA_MCP_APP_SLUG}[bot]`;
const api = new intake.GitHub();
const snapshot = await intake.collect(api, repository, fixture.number);
assert.equal(snapshot.issue.title, fixture.title);
assert.ok(snapshot.issue.labels.some((l) => l.name === "workflow-fixture"));
const result = {
  needs_translation: false,
  summary: [
    {
      text: "The fixture reporter says the dashboard call hangs.",
      evidence: [{ source_id: "body", quote: "The dashboard call hangs." }],
    },
  ],
  translation: [],
  agreed_scope: [],
  facts: [],
  missing_fields: ["install_method", "ha_mcp_version"],
  already_requested: [],
};
if (mode === "answered") {
  const reply = snapshot.comments.find(
    (c) =>
      c.user.login === snapshot.issue.user.login &&
      c.body.includes("Fixture answer: HACS integration, ha-mcp 8.4.3."),
  );
  assert.ok(
    reply,
    "Reporter fixture answer must exist before testing the answered stage",
  );
  result.facts = [
    {
      field: "install_method",
      value: "HACS integration",
      evidence: [
        { source_id: `comment-${reply.id}`, quote: "HACS integration" },
      ],
    },
    {
      field: "ha_mcp_version",
      value: "8.4.3",
      evidence: [{ source_id: `comment-${reply.id}`, quote: "ha-mcp 8.4.3" }],
    },
  ];
  result.missing_fields = [];
}
console.log(
  await intake.publish(
    api,
    intake.prepare(snapshot, bot, { force: true }),
    result,
    bot,
  ),
);
const after = await intake.collect(api, repository, fixture.number);
assert.equal(
  after.issue.labels.some((l) => l.name === "needs-info"),
  mode === "request",
);
const owned = intake.ownComment(after, bot);
assert.ok(owned);
assert.equal(
  intake.prepare(after, bot).run,
  false,
  "Completed context should not invoke the model again",
);
let writes = 0;
const request = api.request.bind(api);
api.request = (endpoint, options = {}) => {
  if (options.method && options.method !== "GET") writes += 1;
  return request(endpoint, options);
};
await intake.publish(
  api,
  intake.prepare(after, bot, { force: true }),
  result,
  bot,
);
assert.equal(writes, 0, "Identical rerun must perform zero writes");
console.log(
  `Publication ${mode} verified on bench issue #69; comment ${owned.id}; duplicate run performed zero writes.`,
);

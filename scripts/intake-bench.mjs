import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const [command, scenario] = process.argv.slice(2);
if (process.env.GITHUB_REPOSITORY !== "homeassistant-ai/ha-mcp-workflows-dev")
  throw Error("Run this bench only in ha-mcp-workflows-dev");
if (!["2404", "missing", "answered", "poisoned"].includes(scenario))
  throw Error("Unknown fixture");
const subject = resolve(process.env.INTAKE_SUBJECT || ".test-subject");
const intake = await import(
  pathToFileURL(resolve(subject, ".github/issue-intake/intake.mjs"))
);
const fixture = JSON.parse(
  readFileSync(`fixtures/intake/${scenario}.json`, "utf8"),
);
const prepared = intake.prepare(fixture.snapshot, "ha-mcp[bot]");
assert.equal(prepared.run, true);

if (command === "prepare") {
  mkdirSync(".issue-intake", { recursive: true });
  writeFileSync(".issue-intake/prompt.txt", intake.prompt(prepared.context));
  writeFileSync(".issue-intake/schema.json", JSON.stringify(intake.schema));
  console.log(`Prepared ${scenario} using canonical code. No GitHub writes.`);
} else if (command === "verify") {
  const raw = readFileSync(process.env.OUTPUT_PATH, "utf8");
  assert.ok(Buffer.byteLength(raw) <= 100000, "Fixture output exceeds budget");
  // Keep a rejected response reviewable too. Only synthetic/public fixture
  // text is supplied here; do not reuse this logging policy for private issues.
  const diagnosticPause = randomUUID();
  console.log(`::stop-commands::${diagnosticPause}`);
  try { console.log(raw); } finally { console.log(`::${diagnosticPause}::`); }
  const result = JSON.parse(raw);
  intake.validateResult(result, prepared.context);
  const expected = fixture.expected;
  if (expected.missing_fields)
    assert.deepEqual(
      [...result.missing_fields].sort(),
      [...expected.missing_fields].sort(),
    );
  for (const field of expected.required_missing || [])
    assert.ok(
      result.missing_fields.includes(field),
      `Missing essential question: ${field}`,
    );
  for (const field of expected.known_fields || [])
    assert.ok(
      result.facts.some((f) => f.field === field),
      `Known fact lost: ${field}`,
    );
  assert.equal(result.agreed_scope.length > 0, expected.agreed_scope);
  if (expected.translation)
    assert.ok(result.translation.length > 0, "English translation missing");
  if (expected.approval_source)
    assert.ok(
      result.agreed_scope.some((s) =>
        s.evidence.some((e) => e.source_id === expected.approval_source),
      ),
      "Maintainer approval not cited",
    );
  const scope = result.agreed_scope.map((s) => s.text).join(" ");
  for (const pattern of expected.scope_patterns || [])
    assert.match(scope, new RegExp(pattern, "i"));
  const report = intake.render(result, prepared);
  for (const pattern of expected.forbidden_patterns || [])
    assert.doesNotMatch(report, new RegExp(pattern, "i"));
  // These are semantic fixture checks, not a guarantee of every paraphrase.
  const pause = randomUUID();
  console.log(`::stop-commands::${pause}`);
  try {
    console.log(report);
  } finally {
    console.log(`::${pause}::`);
  }
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Fixture ${scenario}\n\n${report}`,
    );
  console.log(
    `Fixture ${scenario}: source evidence and expected facts passed.`,
  );
} else throw Error("Expected prepare or verify");

# /// script
# requires-python = ">=3.13"
# dependencies = []
# [tool.uv]
# exclude-newer = "7 days"
# ///
"""Restore the curated bench fixtures or validate a structured model report."""

import argparse
import base64
import json
import os
import subprocess
from pathlib import Path

REPOSITORY = "homeassistant-ai/ha-mcp-workflows-dev"
ROOT = Path(__file__).resolve().parents[1]


def gh(*args, payload=None):
    command = ["gh", *args]
    if payload is not None:
        command += ["--input", "-"]
    result = subprocess.run(
        command,
        input=None if payload is None else json.dumps(payload),
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout) if result.stdout.strip() else None


def api(path, method="GET", payload=None):
    return gh("api", f"repos/{REPOSITORY}/{path}", "--method", method, payload=payload)


def expected_body(fixture):
    return (
        fixture["body"].strip()
        + f"\n\n<!-- workflow-fixture:{fixture['key']} -->"
        + "\n\n— Cocobot, AI agent maintaining test fixtures for Julien."
    )


def restore(manifest, apply):
    actual_repo = gh("repo", "view", "--json", "nameWithOwner")["nameWithOwner"]
    if actual_repo != REPOSITORY:
        raise ValueError(f"Refusing fixture operations from {actual_repo}")
    drift = []
    for fixture in manifest["fixtures"]:
        number = fixture["number"]
        item = api(f"issues/{number}")
        if "workflow-fixture" not in {label["name"] for label in item["labels"]}:
            raise ValueError(
                f"#{number} is not a labeled test fixture; refusing changes"
            )
        if bool(item.get("pull_request")) != (fixture["kind"] == "pr"):
            raise ValueError(f"#{number} has the wrong fixture type")
        desired = {
            "title": fixture["title"],
            "body": expected_body(fixture),
            "state": "open",
        }
        if fixture["kind"] == "pr":
            pr = api(f"pulls/{number}")
            if pr["merged"] or pr["head"]["ref"] != fixture["branch"]:
                raise ValueError(
                    f"#{number} was merged or its branch changed; manual recovery required"
                )
            if pr["draft"] != fixture["draft"]:
                drift.append(f"#{number}: draft state")
                if apply:
                    operation = (
                        "convertPullRequestToDraft"
                        if fixture["draft"]
                        else "markPullRequestReadyForReview"
                    )
                    gh(
                        "api",
                        "graphql",
                        "-f",
                        f'query=mutation {{ {operation}(input: {{pullRequestId: "{pr["node_id"]}"}}) {{ pullRequest {{ id }} }} }}',
                    )
            for file in fixture["files"]:
                # Only the synthetic patch files belong to the reset operation.
                path = file["path"]
                if (
                    not path.startswith("workflow-fixtures/")
                    or ".." in Path(path).parts
                ):
                    raise ValueError(f"Refusing non-fixture file: {path}")
                remote = api(f"contents/{path}?ref={fixture['branch']}")
                if base64.b64decode(remote["content"]).decode() != file["content"]:
                    drift.append(f"#{number}: {path}")
                    if apply:
                        api(
                            f"contents/{path}",
                            "PUT",
                            {
                                "branch": fixture["branch"],
                                "sha": remote["sha"],
                                "message": "test: restore synthetic fixture content"
                                + (
                                    f"\n\nCodex-Session: {os.environ['CODEX_THREAD_ID']}"
                                    if os.environ.get("CODEX_THREAD_ID")
                                    else ""
                                ),
                                "content": base64.b64encode(
                                    file["content"].encode()
                                ).decode(),
                            },
                        )
        if any(item[key] != value for key, value in desired.items()):
            drift.append(f"#{number}: title/body/state")
            if apply:
                api(f"issues/{number}", "PATCH", desired)
        labels = {label["name"] for label in item["labels"]}
        if labels != {"workflow-fixture"}:
            drift.append(f"#{number}: labels")
            if apply:
                api(f"issues/{number}/labels", "PUT", {"labels": ["workflow-fixture"]})
    for detail in drift:
        print(f"{'Restored' if apply else 'Drift'}: {detail}")
    if drift and not apply:
        raise ValueError(
            "Fixture drift detected; run sync to restore manifest-owned fields"
        )
    print(f"{len(manifest['fixtures'])} fixture contracts checked")


def verify_report(manifest, path, kind):
    report = json.loads(path.read_text(encoding="utf-8"))
    records = report["items"]
    by_number = {item["number"]: item for item in records}
    expected = [item for item in manifest["fixtures"] if item["kind"] == kind]
    if len(by_number) != len(records) or set(by_number) != {
        f["number"] for f in expected
    }:
        raise ValueError(
            "Report must cover every fixture exactly once, with no invented items"
        )
    for fixture in expected:
        item = by_number[fixture["number"]]
        if not item["findings"].strip():
            raise ValueError("Each fixture needs substantive findings")
        checks = fixture["expected"]
        if "draft" in checks and item["draft"] is not checks["draft"]:
            raise ValueError(f"Incorrect draft state for #{fixture['number']}")
        if "duplicate_of" in checks:
            other = checks["duplicate_of"]
            if (
                other not in item["duplicate_of"]
                and fixture["number"] not in by_number[other]["duplicate_of"]
            ):
                raise ValueError("The deliberate duplicate pair was not detected")
    print(
        f"Validated {len(expected)} {kind} findings, fixture coverage and expected facts"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["check", "sync", "verify-report"])
    parser.add_argument("--report", type=Path)
    parser.add_argument("--kind", choices=["issue", "pr"])
    args = parser.parse_args()
    manifest = json.loads(
        (ROOT / "fixtures/manifest.json").read_text(encoding="utf-8-sig")
    )
    if manifest["repository"] != REPOSITORY:
        raise ValueError("Manifest repository must be the dedicated test bench")
    if args.command == "verify-report":
        if args.report is None or args.kind is None:
            parser.error("verify-report requires --report and --kind")
        verify_report(manifest, args.report, args.kind)
    else:
        if args.kind:
            manifest["fixtures"] = [
                f for f in manifest["fixtures"] if f["kind"] == args.kind
            ]
        restore(manifest, apply=args.command == "sync")


if __name__ == "__main__":
    main()

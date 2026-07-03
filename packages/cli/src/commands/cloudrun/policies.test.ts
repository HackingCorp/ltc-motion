import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rolesForSet, validateIamPolicy } from "./policies.js";

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "hf-cloudrun-policies-test-"));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

const MEMBER = "user:alice@example.com";

function writePolicy(bindings: Array<{ role: string; members: string[] }>): string {
  const path = join(workdir, "iam-policy.json");
  writeFileSync(path, JSON.stringify({ bindings, etag: "x", version: 1 }));
  return path;
}

describe("policies — role sets", () => {
  it("emits sorted, deduped role sets covering the obvious touchpoints", () => {
    for (const set of ["deploy", "render"] as const) {
      const roles = rolesForSet(set);
      expect([...roles].sort()).toEqual([...roles]);
      expect(new Set(roles).size).toBe(roles.length);
    }
    expect(rolesForSet("deploy")).toContain("roles/run.admin");
    expect(rolesForSet("deploy")).toContain("roles/workflows.admin");
    expect(rolesForSet("render")).toContain("roles/workflows.invoker");
    // workflows.viewer carries workflowexecutions.stepEntries.list — the
    // live-progress read getRenderProgress depends on.
    expect(rolesForSet("render")).toContain("roles/workflows.viewer");
    // Render-only callers must NOT need deploy-grade roles.
    expect(rolesForSet("render")).not.toContain("roles/run.admin");
  });
});

describe("policies — validateIamPolicy", () => {
  it("passes when every required role is granted to the member", () => {
    const path = writePolicy(
      rolesForSet("render").map((role) => ({ role, members: [MEMBER, "user:bob@example.com"] })),
    );
    const result = validateIamPolicy(path, MEMBER, "render");
    expect(result.missing).toEqual([]);
    expect(result.granted).toEqual([...rolesForSet("render")]);
  });

  it("reports roles granted to other members as missing", () => {
    const path = writePolicy([
      { role: "roles/workflows.invoker", members: ["user:bob@example.com"] },
      { role: "roles/workflows.viewer", members: [MEMBER] },
      { role: "roles/storage.objectAdmin", members: [MEMBER] },
    ]);
    const result = validateIamPolicy(path, MEMBER, "render");
    expect(result.missing).toEqual(["roles/workflows.invoker"]);
  });

  it("treats roles/owner as covering everything, with a warning", () => {
    const path = writePolicy([{ role: "roles/owner", members: [MEMBER] }]);
    const result = validateIamPolicy(path, MEMBER, "deploy");
    expect(result.missing).toEqual([]);
    expect(result.warnings.some((w) => w.includes("roles/owner"))).toBe(true);
  });

  it("does NOT treat roles/editor as coverage", () => {
    const path = writePolicy([{ role: "roles/editor", members: [MEMBER] }]);
    const result = validateIamPolicy(path, MEMBER, "deploy");
    expect(result.missing).toEqual([...rolesForSet("deploy")]);
    expect(result.warnings.some((w) => w.includes("roles/editor"))).toBe(true);
  });

  it("tolerates malformed bindings and empty policies", () => {
    const path = join(workdir, "weird.json");
    writeFileSync(path, JSON.stringify({ bindings: [{ role: 42 }, { members: "nope" }, null] }));
    const result = validateIamPolicy(path, MEMBER, "render");
    expect(result.missing).toEqual([...rolesForSet("render")]);
  });

  it("throws on unreadable/invalid JSON input", () => {
    const path = join(workdir, "broken.json");
    writeFileSync(path, "{not json");
    expect(() => validateIamPolicy(path, MEMBER, "render")).toThrow();
  });
});

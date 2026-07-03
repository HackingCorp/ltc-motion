/**
 * `hyperframes cloudrun policies user|runtime|validate` — IAM bootstrap.
 *
 * GCP mirror of `hyperframes lambda policies`. AWS grants per-action IAM
 * policies; GCP grants predefined roles, so this command emits **role
 * lists** instead of action lists:
 *
 *   - `user`     → project-level roles the human/CI running
 *                  `hyperframes cloudrun deploy` needs (Terraform +
 *                  Cloud Build + first render).
 *   - `runtime`  → the narrower role set a render-only caller needs
 *                  (`render` / `render-batch` / `progress` without
 *                  deploy rights), plus the two service-account
 *                  bindings the Terraform module creates internally.
 *   - `validate` → diff a `gcloud projects get-iam-policy <project>
 *                  --format=json` dump against a role set for one
 *                  member, printing what's missing.
 */

import { readFileSync } from "node:fs";
import { c } from "../../ui/colors.js";
import { normalizeErrorMessage } from "../../utils/errorMessage.js";

export type PoliciesVerb = "user" | "runtime" | "validate";

export type RoleSetName = "deploy" | "render";

/**
 * Project-level roles the deploying identity needs. Derived from what the
 * Terraform module creates (bucket, service accounts + bindings, Cloud Run
 * service, workflow) plus the image build (`gcloud builds submit`) and the
 * SDK's runtime calls. Sorted for stable output.
 */
const DEPLOY_ROLES: readonly string[] = [
  "roles/artifactregistry.writer",
  "roles/cloudbuild.builds.editor",
  "roles/iam.serviceAccountAdmin",
  "roles/iam.serviceAccountUser",
  "roles/run.admin",
  "roles/serviceusage.serviceUsageConsumer",
  "roles/storage.admin",
  "roles/workflows.admin",
];

/**
 * Roles a render-only caller needs once the stack exists: start executions,
 * poll them (including `workflowexecutions.stepEntries.list` for live chunk
 * progress — part of `roles/workflows.viewer`), and move site tars +
 * outputs through the render bucket.
 */
const RENDER_ROLES: readonly string[] = [
  "roles/storage.objectAdmin",
  "roles/workflows.invoker",
  "roles/workflows.viewer",
];

/** IAM bindings the Terraform module creates for the stack's own service accounts. */
const STACK_INTERNAL_BINDINGS = [
  {
    serviceAccount: "run_sa (Cloud Run render service)",
    role: "roles/storage.objectAdmin",
    scope: "the render bucket only",
  },
  {
    serviceAccount: "workflow_sa (Cloud Workflows executor)",
    role: "roles/run.invoker",
    scope: "the Cloud Run render service only",
  },
] as const;

export function rolesForSet(set: RoleSetName): readonly string[] {
  return set === "deploy" ? DEPLOY_ROLES : RENDER_ROLES;
}

function grantCommands(member: string, roles: readonly string[]): string[] {
  return roles.map(
    (role) =>
      `gcloud projects add-iam-policy-binding $PROJECT_ID --member="${member}" --role="${role}"`,
  );
}

export interface PoliciesArgs {
  verb: PoliciesVerb;
  /** For `validate`: path to a `gcloud projects get-iam-policy --format=json` dump. */
  inputPath?: string;
  /** Member to check (`user:alice@example.com`, `serviceAccount:ci@...`). */
  member?: string;
  /** Which role set to emit/validate. Default `deploy`. */
  roleSet: RoleSetName;
  json: boolean;
}

export async function runPolicies(args: PoliciesArgs): Promise<void> {
  switch (args.verb) {
    case "user":
      return printRoleSet("deploy", args);
    case "runtime":
      return printRuntime(args);
    case "validate":
      return runValidate(args);
  }
}

function printRoleSet(set: RoleSetName, args: PoliciesArgs): void {
  const roles = rolesForSet(set);
  console.log(JSON.stringify({ roleSet: set, roles }, null, 2));
  if (!args.json) {
    const member = args.member ?? "user:YOU@example.com";
    console.error(c.dim("\n# Grant with:"));
    for (const cmd of grantCommands(member, roles)) console.error(c.dim(`#   ${cmd}`));
    console.error(
      c.dim(
        "# Adopters with stricter postures should scope storage roles to the render bucket after the first deploy.",
      ),
    );
  }
}

function printRuntime(args: PoliciesArgs): void {
  console.log(
    JSON.stringify(
      {
        roleSet: "render",
        roles: RENDER_ROLES,
        stackInternalBindings: STACK_INTERNAL_BINDINGS,
      },
      null,
      2,
    ),
  );
  if (!args.json) {
    console.error(
      c.dim(
        "\n# `roles` is what a render-only caller needs; `stackInternalBindings` documents what\n# the Terraform module already grants to the stack's own service accounts.",
      ),
    );
  }
}

// fallow-ignore-next-line complexity
async function runValidate(args: PoliciesArgs): Promise<void> {
  const usage =
    "[cloudrun policies validate] usage: hyperframes cloudrun policies validate <iam-policy.json> --member user:alice@example.com [--role-set deploy|render]";
  if (!args.inputPath || !args.member) {
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: usage }, null, 2));
      process.exitCode = 1;
      return;
    }
    throw new Error(usage);
  }
  let result: ValidateResult;
  try {
    result = validateIamPolicy(args.inputPath, args.member, args.roleSet);
  } catch (err) {
    const msg = normalizeErrorMessage(err);
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
    } else {
      console.error(c.error(`Failed to validate ${args.inputPath}: ${msg}`));
    }
    process.exitCode = 1;
    return;
  }
  reportValidateResult(result, args);
}

function reportValidateResult(result: ValidateResult, args: PoliciesArgs): void {
  if (args.json) {
    console.log(JSON.stringify({ ok: result.missing.length === 0, ...result }, null, 2));
    if (result.missing.length > 0) process.exitCode = 1;
    return;
  }
  for (const warning of result.warnings) console.warn(c.dim(`Warning: ${warning}`));
  if (result.missing.length === 0) {
    console.log(c.success(`Member has all ${result.required.length} required role(s).`));
    return;
  }
  console.log(c.error(`Member is missing ${result.missing.length} required role(s):`));
  for (const role of result.missing) console.log(`  • ${role}`);
  console.log();
  console.log(c.dim("Run `hyperframes cloudrun policies user` to print the full role set."));
  process.exitCode = 1;
}

export interface ValidateResult {
  member: string;
  roleSet: RoleSetName;
  required: string[];
  granted: string[];
  missing: string[];
  /** Non-fatal notes about grants we treated specially (e.g. basic roles). */
  warnings: string[];
}

interface IamBinding {
  role?: unknown;
  members?: unknown;
}

/**
 * Diff a project IAM policy dump against a role set for one member.
 *
 * `roles/owner` counts as covering everything (it does). `roles/editor` is
 * flagged as a warning but NOT treated as coverage: it lacks the IAM-admin
 * permissions the deploy path needs, so treating it as a pass would produce
 * exactly the late `PERMISSION_DENIED` this command exists to prevent.
 */
export function validateIamPolicy(
  policyPath: string,
  member: string,
  roleSet: RoleSetName,
): ValidateResult {
  const raw = readFileSync(policyPath, "utf-8");
  const parsed = JSON.parse(raw) as { bindings?: unknown };
  const bindings: IamBinding[] = Array.isArray(parsed.bindings)
    ? (parsed.bindings as IamBinding[])
    : [];

  const memberRoles = new Set<string>();
  for (const binding of bindings) {
    if (binding == null || typeof binding.role !== "string" || !Array.isArray(binding.members))
      continue;
    if (binding.members.includes(member)) memberRoles.add(binding.role);
  }

  const warnings: string[] = [];
  const ownerGrant = memberRoles.has("roles/owner");
  if (ownerGrant) {
    warnings.push("Member has roles/owner — treated as covering every required role.");
  }
  if (memberRoles.has("roles/editor")) {
    warnings.push(
      "Member has roles/editor — NOT treated as coverage: it lacks the IAM-admin permissions the deploy path needs (service account creation + policy bindings).",
    );
  }

  const required = [...rolesForSet(roleSet)];
  const granted: string[] = [];
  const missing: string[] = [];
  for (const role of required) {
    if (ownerGrant || memberRoles.has(role)) granted.push(role);
    else missing.push(role);
  }
  return { member, roleSet, required, granted, missing, warnings };
}

/**
 * Public-facing types for `./regression-harness-cloudrun-local.ts`.
 *
 * Kept in its own file for the same reason as
 * `regression-harness-lambda-local-types.ts`: the implementation imports
 * `@hyperframes/gcp-cloud-run`, whose types come from `dist/index.d.ts`
 * after its own build runs. Splitting the types out keeps the adapter's
 * module graph out of producer's tsc pass.
 */

import type { RunLambdaLocalInput } from "./regression-harness-lambda-local-types.js";

/**
 * Inputs for {@link runCloudRunLocalRender}. Deliberately the exact same
 * contract as lambda-local — the harness builds one input object and picks
 * the adapter by mode.
 */
export type RunCloudRunLocalInput = RunLambdaLocalInput;

/** Public signature of the dynamically-loaded `runCloudRunLocalRender`. */
export type RunCloudRunLocalRender = (input: RunCloudRunLocalInput) => Promise<void>;

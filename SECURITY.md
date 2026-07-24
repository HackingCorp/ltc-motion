# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Hyperframes, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, open a [GitHub Security Advisory](https://github.com/heygen-com/hyperframes/security/advisories/new) with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x     | Yes       |

## Scope

This policy applies to all packages in the `@hyperframes/*` npm scope and the code in this repository.

---

## Render Security Model

HyperFrames executes **arbitrary user-authored HTML and JavaScript** to produce video. This document defines the security boundary, current defenses, and hardening roadmap.

### The Container Is the Boundary

The canonical deployment model is a **Docker container** (Lambda, Cloud Run, or self-hosted). Within the container:

- Chrome runs with `--no-sandbox --disable-setuid-sandbox` — required because Chrome's own sandbox (`clone(CLONE_NEWUSER)` / `unshare(CLONE_NEWNET)`) is incompatible with Docker's seccomp profile and the `CAP_SYS_ADMIN`-less default. This is the standard pattern across headless Chrome rendering stacks (Puppeteer defaults, Playwright, Remotion).
- User-authored compositions execute with the **full privileges of the render user** inside the container: file system access, child process spawning, outbound network requests. There is no in-process sandbox beyond Chrome's V8 isolate boundaries.
- **The security boundary is the container itself.** Compositions are assumed hostile and must not be rendered outside an ephemeral container (no persistent state, no host access, no lateral network reach).

### Defense in Depth

The following layers reduce the blast radius even when the container is the primary boundary:

| Layer                            | What it does                                                                                                                                                 | Where                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **SSRF guard**                   | Rejects non-HTTPS URLs and private/reserved address blocks (RFC1918, loopback, link-local, AWS IMDS `169.254.x.x`) before outbound fetches                   | `engine/src/utils/urlDownloader.ts:10-63`      |
| **HTTPS-only content downloads** | `assertPublicHttpsUrl()` blocks HTTP URLs at the download layer — compositions cannot request plaintext resources                                            | `engine/src/utils/urlDownloader.ts:47-64`      |
| **Deterministic `Math.random`**  | `Math.random` is replaced with a seeded mulberry32 PRNG injected by the file server — compositions cannot use randomness for data exfiltration side-channels | `core/src/runtime/` (runtime init)             |
| **No `Date.now()`**              | Render-time `Date.now()` usage breaks determinism guarantees; its absence also removes a timing side-channel                                                 | Lint convention enforced at composition linter |
| **Fonts are fail-closed**        | External font requests fail during render — fonts must be bundled or explicitly listed in `hyperframes.json` to be pre-cached during compilation             | `engine/src/services/htmlCompiler.ts`          |
| **Media is pre-cached**          | All `<img>`, `<video>`, `<audio>` sources are resolved and downloaded at compile time, not render time — the browser serves from the local file server       | `engine/src/services/fileServer.ts`            |
| **Ephemeral file server**        | The file server binds to a random high port on loopback only (`127.0.0.1`) — not accessible from outside the container's loopback interface                  | `engine/src/services/fileServer.ts`            |

### What We Don't Do (Yet)

These gaps are tracked as hardening priorities:

#### Network blocking at the browser level

Today, "no network at render time" is a **lint convention**, not enforced. The linter warns about `fetch()` calls in composition scripts (`packages/lint/src/rules/captions.ts:110-117`), but the Chrome process itself can make arbitrary outbound requests.

**Recommendation:** Enforce via CDP `Network.setBlockedURLs` before page load in the frame capture loop. This blocks all outbound URLs at the network layer, with explicit allowlisting for the local file server. The blocked-patterns list should include `*` (block everything) with exceptions for `http://127.0.0.1:*` (the local file server). This transform is straightforward — CDP supports glob patterns for blocked URLs — and provides a hard enforcement layer under the lint convention.

Relevant code path: `packages/engine/src/services/frameCapture.ts` — the CDP session is already established for `Page.captureScreenshot` and `HeadlessExperimental.beginFrame`; adding `Network.enable` + `Network.setBlockedURLs` is ~10 lines.

#### Remove `seccomp=unconfined` from regression CI

The regression workflow runs Docker with `--security-opt seccomp=unconfined` (`.github/workflows/regression.yml:121`). This disables Docker's default seccomp filter entirely — the container sees ~300 syscalls instead of the default ~200.

**Why it's there:** Chrome's `clone(3)` syscall (used by its internal sandbox) is blocked by Docker's default seccomp profile. When `seccomp=unconfined` is removed with `--no-sandbox` Chrome, the regression suite should still pass because Chrome's sandbox is already off — the extra syscalls aren't needed by the render pipeline.

**Recommendation:** Remove the flag and run a full regression shard. If Chrome startup fails, add a targeted seccomp profile that allows only the specific syscalls Chrome needs (`clone`, `unshare`, `personality`, `chroot`) rather than blanket-disabling the filter. The Docker documentation includes a [dedicated Chrome seccomp profile](https://github.com/docker/labs/blob/master/security/seccomp/seccomp-profiles/chrome.json).

#### Hostile composition execution tests

The current security test (`packages/core/scripts/test-hyperframe-runtime-security.ts`) validates only:

- Runtime URL allowlist validation (pure function)
- Preview `postMessage` guard (pure function)

There are **no tests that execute a hostile composition** and assert the render pipeline handles it safely. Specifically missing:

- A composition with `fetch('http://169.254.169.254/...')` — should be blocked by the SSRF guard at download time
- A composition with `fetch('http://localhost:...')` — should be blocked by the HTTPS-only guard
- A composition that spawns a child process via `window.__hf` extension — behavior undefined
- A composition that attempts filesystem writes — should fail (the render user inside the container is the boundary; no guard exists)

**Recommendation:** Add a `test-hostile-compositions.ts` harness that feeds known-hostile compositions through the render pipeline and asserts safe failure modes (error exit, SSRF rejection, network 403). This is not a unit test — it requires the full Chrome+Puppeteer stack and should live alongside the producer regression suite.

### Threat Model Summary

| Threat                                                  | Current mitigation                                                                       | Verdict                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Composition exfiltrates data via outbound HTTP          | Lint convention only; no browser-level enforcement                                       | **Needs hardening** — CDP `Network.setBlockedURLs`                                     |
| Composition reaches internal infrastructure (SSRF)      | `assertPublicHttpsUrl()` blocks private IPs in downloads; no runtime fetch guard         | **Partial** — CDP network blocking closes the gap                                      |
| Composition escapes to host filesystem                  | Container isolation; ephemeral containers with no host mounts                            | **Adequate** — the container is the boundary                                           |
| Composition consumes excessive resources (CPU/RAM/disk) | Container cgroups / Lambda limits; render timeout                                        | **Adequate**                                                                           |
| Composition exploits Chrome vulnerability               | `--no-sandbox` means Chrome's own sandbox can't protect — container is the only boundary | **Acceptable risk** for a rendering pipeline (not a browser for untrusted web content) |
| Composition uses random seed for covert channel         | `Math.random` is replaced with deterministic seeded PRNG                                 | **Adequate**                                                                           |
| Composition reads files from render user's home dir     | No guard beyond container isolation                                                      | **Acceptable** — ephemeral containers have no secrets on disk                          |
| Hostile composition in CI                               | `seccomp=unconfined` increases kernel attack surface                                     | **Fix in progress** — remove `seccomp=unconfined`                                      |

### Docker Security Checklist (Self-Hosted Deployments)

When deploying HyperFrames outside managed cloud (Lambda/Cloud Run):

1. **Run each render in an ephemeral container** — `docker run --rm`, no `--volume` mounts to host directories.
2. **Do not pass host environment variables** containing secrets (`--env-file` is acceptable for non-secret config only).
3. **Use a dedicated seccomp profile** — start from the Docker default profile, add Chrome-specific syscalls if needed (`clone`, `unshare`), do not blanket-set `seccomp=unconfined`.
4. **Drop all Linux capabilities** — `--cap-drop=ALL`. Chrome headless does not require any capabilities when `--no-sandbox` is set.
5. **Set memory and CPU limits** — `--memory=4g --cpus=2` for typical 1080p renders; adjust for 4K.
6. **Network-isolate the container** — `--network none` if all media is pre-bundled; otherwise `--network bridge` (default) with no exposed ports.
7. **Run as non-root** — the Dockerfile already creates a `hyperframes` user; ensure `--user` is not overridden to root.

### Reporting Chain

If you discover that a composition can bypass any of the defenses described above — particularly container escape, SSRF, or host file access — report via GitHub Security Advisory as described at the top of this document. Include the composition source and the render command that reproduces the issue.

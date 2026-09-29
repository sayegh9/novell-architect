# ADR 001: Separate Homebrew application code from book data

Status: Accepted for HEAD preview

## Context

The source checkout previously stored projects and API-key settings below its
own directory. Homebrew replaces installed files during upgrades and treats
its Cellar as package-managed code. Keeping books there risks losing user work
or makes upgrades fail because the installation has been modified.

## Decision

The Homebrew launcher keeps code and built UI in the formula's `libexec` and
stores books under the user's Application Support directory. It passes
explicit project paths to the server and pipeline. The server continues to
use source-tree paths when those environment variables are absent, preserving
the existing development workflow. Project switching persists the last active
book in the data directory. No automatic migration or deletion is performed.

The initial formula is HEAD-only because this repository has no tagged release
artifact or dedicated tap yet. Python dependencies are checksum-pinned from
`uv.lock` as formula resources; the web UI is prebuilt and committed.

## Consequences

Upgrades can replace application code without replacing books or keys. A
source-checkout book needs an explicit, verified copy into the data directory.
Maintainers must refresh formula resources with each lockfile change, test a
clean macOS install, and publish a tagged tap before calling the installation
stable or one-command.

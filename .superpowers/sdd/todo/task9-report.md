# Task 9 review report: isolate settings during project switching

## Verdict

**Needs fixes.** The managed-setting reset meets the A -> B -> root requirement,
but a provider key sourced from project A becomes a process-global key and is
inherited by project B's child process. That violates the required active-project
isolation for child environments and can disclose A's credential to B.

## Strengths

- `rebuild_runtime_settings` rebuilds each managed setting from an explicit
  default overlay and sets the selected project directory on every switch.
- `settings.json` then `.env` precedence is deterministic, and both formats are
  limited to recognized keys.
- The settings API returns presence booleans for provider credentials rather than
  credential values.
- The existing safe project resolver was not changed.
- Focused verification passed: `PYTHONDONTWRITEBYTECODE=1 python -m unittest
  tests.test_project_settings` (2 tests).

## Findings

### P1 — Project A's provider credential leaks into project B

`settings.py:87-90`, `settings.py:99-102`

When the server begins without (for example) `GEMINI_API_KEY`, switching to a
project A whose `.env` defines one adds A's key to the shared process environment
via `setdefault`. Switching to B does not clear or replace it, and
`child_process_environment` copies that process environment wholesale. A child
for B therefore receives A's credential even when B has no credential.

Reproduced with `A/.env` containing `GEMINI_API_KEY=from-a` and an empty B:
after switching A -> B, B's child environment still contained `from-a`.

Keep immutable process-level credentials separate from project configuration, or
build provider-key entries for each child strictly from the active project's
configuration plus a preserved startup credential snapshot. Add a regression test
for A provider key -> B without that key (and, ideally, B with its own key).

## Specification assessment

- Missing managed settings revert to defaults: satisfied.
- A -> B -> root is covered for managed settings: satisfied.
- `settings.json` / `.env` precedence is deterministic: satisfied (`.env` wins).
- Safe project resolution: retained.
- Provider credentials are not returned by the settings endpoint: satisfied.
- Child environments contain active-project state only: **not satisfied** for
  provider credentials, as above.

## Round 1 fix

### Outcome

- Captured provider credentials present before project files are loaded in an
  immutable startup snapshot.
- Rebuilds provider credentials on every switch from that startup snapshot plus
  only the active project's `settings.json` / `.env` overlay.
- Child environments use the same rebuild path, so a credential loaded from A
  cannot be inherited by B or root.
- Settings API coverage confirms provider values remain absent from responses;
  only presence booleans are returned.

### RED evidence

Command:

`python -m unittest tests.test_project_settings -v`

Observed 3 expected failures before the fix:

- B's child environment still contained `GEMINI_API_KEY` from A.
- A could not override the startup provider credential because `setdefault`
  retained the startup value.
- B reported a Gemini key even with no startup or project credential because
  A's key remained in the process environment.

### GREEN evidence

Focused command:

`python -m unittest tests.test_project_settings -v`

Result: 3 tests passed.

Related command:

`python -m unittest tests.test_project_settings tests.test_projects_api tests.test_actions_api -v`

Result: 22 tests passed.

Full offline command:

`python -m unittest discover -s tests -v`

Result: 36 tests passed.

Additional checks:

- `python -m py_compile server.py settings.py tests/test_project_settings.py`
- `git diff --check`

Both exited successfully.

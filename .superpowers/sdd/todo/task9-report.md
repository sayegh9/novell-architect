# Task 9 report: isolate settings during project switching

## Outcome

- Added centralized project-scoped defaults and configuration loading in
  `settings.py`.
- Rebuilds every managed `AUTONOVEL_*` value from defaults plus the active
  project's configuration on each switch.
- Reads both `settings.json` and `.env`; `.env` takes precedence because it is
  the server's primary writable settings store.
- Builds subprocess environments directly from the active project so settings
  from the prior project cannot leak into a child.
- Keeps provider API keys outside the reset set. Existing process credentials
  are preserved, missing credentials can be filled from configuration, and the
  settings API continues to expose booleans only.
- Kept the Phase 4 project resolver and containment behavior unchanged.

## TDD evidence

### RED

Command:

`python -m unittest tests.test_project_settings -v`

Observed 2 intentional failures before implementation:

- `test_child_environment_uses_only_the_active_project_settings`: B's child
  environment contained `a-writer` instead of `b-writer`.
- `test_switching_a_to_b_to_root_rebuilds_managed_settings`: project A's `.env`
  judge setting was ignored (`gemini-3.7-flash` instead of `a-env-judge`).

### GREEN

Focused command:

`python -m unittest tests.test_project_settings -v`

Result: 2 tests passed.

Related command:

`python -m unittest tests.test_project_settings tests.test_projects_api tests.test_actions_api -v`

Result: 21 tests passed.

Full offline command:

`python -m unittest discover -s tests -v`

Result: 35 tests passed.

Additional verification:

- `python -m py_compile server.py settings.py tests/test_project_settings.py`
- `git diff --check`

Both exited successfully.

## Concerns

- Project `.env` intentionally wins over `settings.json` when the same managed
  key exists in both places; this matches the update endpoint's primary store.
- Provider credentials are preserved rather than switched/reset. This avoids
  secret loss and keeps them out of API payloads, while managed project settings
  remain fully isolated.

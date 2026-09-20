# Task 11 report: restrict network and CORS exposure

## TDD evidence

- RED: added `tests/test_server_config.py` first; focused test run failed because
  the new host/origin configuration did not exist and the app still exposed
  wildcard CORS.
- GREEN: implemented `get_server_host`, `get_cors_origins`, explicit CORS
  middleware origins, and `uvicorn` host configuration. Focused tests pass.
- REFACTOR/verification: documented the network boundary and remote-access
  requirements; reviewed the final diff and ran the full offline checks.

## Verification

- `UV_CACHE_DIR=/tmp/autonovel-uv-cache uv run python -m unittest tests.test_server_config` — **7 passed**
- `python -m unittest discover -s tests` — **49 passed**
- `python -m compileall -q *.py tests` — **passed**
- `npm --prefix ui run build -- --outDir /tmp/autonovel-ui-build-task11` — **passed**
- `git diff --check` — **passed**

## Behavior

- Default backend bind host is `127.0.0.1`.
- `AUTONOVEL_HOST` explicitly opts into a different bind address, including LAN
  addresses such as `0.0.0.0`.
- Default CORS allows only local Vite origins (`localhost:5173` and
  `127.0.0.1:5173`); configured origins come from
  `AUTONOVEL_CORS_ORIGINS` and wildcard `*` is rejected.
- Built UI remains same-origin when served by the backend.
- README documents that remote mutation access requires authentication and CSRF
  protection; `run_autonovel.command` did not override the host and required no
  change.

## Commit

The changes are included in the focused commit created for this task (`fix:
restrict studio network exposure`); use `git rev-parse HEAD` for the immutable
SHA after checkout.

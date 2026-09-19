# Phase 2 Report: Chapter Beats Vertical Slice

## Status

Implemented Tasks 3 and 4: the backend now exposes validated GET/POST chapter-beats endpoints, replaces exactly one parsed outline section, writes UTF-8 timestamped backups, and returns the contract used by the Drafting Room. The frontend uses explicit beats request/response types, displays backend validation details, and adopts the server-confirmed beats after save.

## RED evidence

Added `tests/test_beats_api.py` before production changes and ran:

```text
python -m unittest tests.test_beats_api -v
Ran 5 tests
FAILED (failures=8)
```

Expected failures were observed because the routes did not exist: GET returned 404 and POST returned 405. The failures covered the contract response, save/reload, backup, chapter validation, missing outline/section, and invalid replacement content.

## GREEN evidence

Focused implementation run:

```text
python -m unittest tests.test_beats_api -v
Ran 5 tests in 0.036s
OK
```

Fresh final scoped verification:

```text
git diff --check
python -m unittest discover -s tests -v
Ran 13 tests in 0.061s
OK

npm run build --prefix ui
tsc && vite build
1604 modules transformed
build completed successfully in 2.77s
```

Browser smoke test against a temporary project:

- Opened Drafting Room and loaded `## Chapter 1: Before Save` from the API.
- Edited and saved UTF-8 content containing Arabic text.
- Observed the success toast and POST `/api/chapters/1/beats` returning 200.
- Reloaded the page, reopened Drafting Room, and observed the saved content unchanged.
- Neighboring Chapter 2 content remained outside the replacement boundary; the API test additionally asserts its suffix byte-for-byte.

## Files changed

- `server.py`: GET/POST beats routes, validation mapping, UTF-8 backup/write, response contract.
- `outline_utils.py`: nullable lookup and exact parsed-section replacement helper built on the shared parser.
- `tests/test_beats_api.py`: temporary-project API contract and safety tests; restores `server.PROJECT_DIR` in teardown.
- `ui/src/services/api.ts`: explicit request/response interfaces and backend detail propagation.
- `ui/src/components/DraftingRoom.tsx`: server-confirmed save state and typed error handling.

Generated `ui/dist` and Vite cache outputs were removed after verification and are not part of the change.

## Self-review

- Confirmed the replacement boundary uses the shared heading parser and preserves prefix/suffix text outside the selected section.
- Confirmed backup creation occurs only after all chapter, source-section, and replacement validation succeeds.
- Confirmed a failed save does not create a backup or mutate `outline.md`.
- Confirmed backup names include date, time, and microseconds to avoid collisions; the response returns a project-relative recoverable path.
- Confirmed UTF-8 is explicit on every outline and backup read/write added here.
- Confirmed duplicate/wrong/missing chapter headings and empty content are rejected with useful 4xx details.
- Cleaned bold Markdown heading titles to match existing chapter-title behavior.
- Confirmed no Phase 1 or unrelated source files were changed.

## Concerns / known unrelated failures

Repository-root `python -m unittest discover -v` is not clean before/after this slice. It reports three unrelated existing errors:

1. `test_eval` executes a live evaluation during import and exits when no LLM API key is configured.
2. `test_llm_pipeline.TestLLMClient.test_evaluate_json_parsing` exits for the same missing-key path.
3. `test_llm_pipeline.TestScriptImports.test_script_modules_importable` fails importing `gen_revision` because `language_utils` lacks `get_arabic_writer_system_prompt`.

The offline suite under `tests/` and all focused Phase 2 tests pass. No Phase 2 functional concern remains.

## Round 1 review fix: preserve CRLF outside the replaced section

Reviewer feedback identified that `Path.read_text()` used universal-newline conversion, so saving a CRLF outline rewrote untouched sections and the backup with LF line endings.

RED evidence:

```text
python -m unittest tests.test_beats_api.ChapterBeatsApiTests.test_post_preserves_crlf_bytes_outside_replaced_section_and_in_backup -v
FAIL: b'## Chapter 2: Untouched\n- Keep these CRLF bytes.\n'
   != b'## Chapter 2: Untouched\r\n- Keep these CRLF bytes.\r\n'
Ran 1 test in 0.013s — FAILED
```

Fix: outline and backup text files are now opened with UTF-8 and `newline=""` for both reads and writes. This disables universal-newline translation while leaving parsing, validation, replacement boundaries, and response fields unchanged.

GREEN/final evidence:

```text
Focused CRLF regression: Ran 1 test — OK
Complete beats API suite: Ran 6 tests — OK
python -m unittest discover -s tests -v: Ran 14 tests in 0.068s — OK
npm run build --prefix ui: 1604 modules transformed — success in 2.63s
git diff --check -- server.py tests/test_beats_api.py: clean
```

Self-review: the regression compares raw bytes for the untouched Chapter 2 suffix and the timestamped backup. Reintroducing `read_text()` or omitting `newline=""` would fail it. Existing LF behavior and API responses remain covered by the original five tests.

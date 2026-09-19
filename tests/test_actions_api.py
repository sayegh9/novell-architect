import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

import server


class RecordingBackgroundTasks:
    def __init__(self):
        self.calls = []

    def add_task(self, func, *args, **kwargs):
        self.calls.append((func, args, kwargs))


class FakeStdout:
    def __init__(self, lines=()):
        self._lines = iter(lines)

    async def readline(self):
        return next(self._lines, b"")


class FakeProcess:
    def __init__(self, lines=(), returncode=0):
        self.stdout = FakeStdout(lines)
        self.returncode = returncode

    async def wait(self):
        return self.returncode


class ActionApiTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        server.job_state.is_running = False
        server.job_state.current_cmd = ""
        server.job_state.current_process = None
        server.job_state.logs.clear()

    async def test_existing_actions_map_to_literal_argv_without_a_shell(self):
        cases = (
            ("seed", {}, ("seed.py", "--count", "10"), "seed.py --count 10"),
            (
                "seed",
                {"riff": "a city of glass"},
                ("seed.py", "--riff", "a city of glass"),
                'seed.py --riff "a city of glass"',
            ),
            ("gen_world", {}, ("gen_world.py",), "gen_world.py"),
            ("gen_characters", {}, ("gen_characters.py",), "gen_characters.py"),
            ("gen_outline", {}, ("gen_outline.py",), "gen_outline.py"),
            ("gen_outline_part2", {}, ("gen_outline_part2.py",), "gen_outline_part2.py"),
            ("gen_canon", {}, ("gen_canon.py",), "gen_canon.py"),
            ("voice_fingerprint", {}, ("voice_fingerprint.py",), "voice_fingerprint.py"),
            ("draft_chapter", {"chapter": 4}, ("draft_chapter.py", "4"), "draft_chapter.py 4"),
            (
                "evaluate_foundation",
                {},
                ("evaluate.py", "--phase=foundation"),
                "evaluate.py --phase=foundation",
            ),
            (
                "evaluate_chapter",
                {"chapter": 7},
                ("evaluate.py", "--chapter=7"),
                "evaluate.py --chapter=7",
            ),
            ("evaluate_full", {}, ("evaluate.py", "--full"), "evaluate.py --full"),
            (
                "adversarial_edit",
                {"chapter": "all"},
                ("adversarial_edit.py", "all"),
                "adversarial_edit.py all",
            ),
            ("compare_chapters", {}, ("compare_chapters.py",), "compare_chapters.py"),
            ("reader_panel", {}, ("reader_panel.py",), "reader_panel.py"),
            ("review", {}, ("review.py",), "review.py"),
            (
                "run_pipeline",
                {"phase": "drafting", "from_scratch": True, "max_cycles": 3},
                (
                    "run_pipeline.py",
                    "--from-scratch",
                    "--phase",
                    "drafting",
                    "--max-cycles",
                    "3",
                ),
                "run_pipeline.py --from-scratch --phase drafting --max-cycles 3",
            ),
            (
                "reset",
                {"keep_seed": True},
                ("reset_project.py", "--keep-seed"),
                "reset_project.py --keep-seed",
            ),
            ("build_tex", {}, ("typeset/build_tex.py",), "typeset/build_tex.py"),
            ("gen_art_style", {}, ("gen_art.py", "style"), "gen_art.py style"),
            (
                "gen_art_directions",
                {"type": "map"},
                ("gen_art_directions.py", "map"),
                "gen_art_directions.py map",
            ),
            ("gen_art", {"subcommand": "all"}, ("gen_art.py", "all"), "gen_art.py all"),
            ("apply_cuts", {"chapter": 8}, ("apply_cuts.py", "8"), "apply_cuts.py 8"),
            ("gen_brief", {"chapter": 6}, ("gen_brief.py", "--panel", "6"), "gen_brief.py --panel 6"),
            ("gen_revision", {"chapter": 9}, ("gen_revision.py", "9"), "gen_revision.py 9"),
            (
                "gen_audiobook_script",
                {"chapter": 11},
                ("gen_audiobook_script.py", "11"),
                "gen_audiobook_script.py 11",
            ),
        )

        for action, params, expected_argv, expected_display in cases:
            with self.subTest(action=action, params=params):
                server.job_state.is_running = False
                background = RecordingBackgroundTasks()

                response = await server.api_run_action(
                    server.RunActionRequest(action=action, params=params), background
                )

                self.assertEqual(response, {"status": "started", "cmd": expected_display})
                self.assertEqual(
                    background.calls,
                    [(server.run_command_stream, (expected_argv, expected_display), {})],
                )

    async def test_drafting_room_actions_map_to_their_exact_script_arguments(self):
        cases = (
            (
                "rewrite_chapter_beats",
                {"chapter": 3, "mode": "fresh"},
                ("rewrite_chapter_beats.py", "3", "--mode=fresh"),
                "rewrite_chapter_beats.py 3 --mode=fresh",
            ),
            (
                "rewrite_chapter_beats",
                {"chapter": 3, "mode": "revise"},
                ("rewrite_chapter_beats.py", "3", "--mode=revise"),
                "rewrite_chapter_beats.py 3 --mode=revise",
            ),
            (
                "run_drafts",
                {"all": True},
                ("run_drafts.py", "--all"),
                "run_drafts.py --all",
            ),
        )

        for action, params, expected_argv, expected_display in cases:
            with self.subTest(action=action, params=params):
                server.job_state.is_running = False
                background = RecordingBackgroundTasks()

                response = await server.api_run_action(
                    server.RunActionRequest(action=action, params=params), background
                )

                self.assertEqual(response["cmd"], expected_display)
                self.assertEqual(
                    background.calls,
                    [(server.run_command_stream, (expected_argv, expected_display), {})],
                )

    async def test_run_drafts_range_and_overwrite_map_to_separate_argv(self):
        background = RecordingBackgroundTasks()

        response = await server.api_run_action(
            server.RunActionRequest(
                action="run_drafts",
                params={"start": 2, "end": 5, "overwrite": True},
            ),
            background,
        )

        self.assertEqual(
            response,
            {
                "status": "started",
                "cmd": "run_drafts.py --start=2 --end=5 --overwrite",
            },
        )
        self.assertEqual(
            background.calls,
            [
                (
                    server.run_command_stream,
                    (("run_drafts.py", "--start=2", "--end=5", "--overwrite"), response["cmd"]),
                    {},
                )
            ],
        )

    async def test_gen_art_legacy_forms_map_to_typed_argv(self):
        cases = (
            (
                "curate cover --n=6",
                ("gen_art.py", "curate", "cover", "--n=6"),
            ),
            (
                "curate map --n 4",
                ("gen_art.py", "curate", "map", "--n", "4"),
            ),
            ("pick cover 3", ("gen_art.py", "pick", "cover", "3")),
            (
                "vectorize scene_break",
                ("gen_art.py", "vectorize", "scene_break"),
            ),
        )

        for subcommand, expected_argv in cases:
            with self.subTest(subcommand=subcommand):
                server.job_state.is_running = False
                background = RecordingBackgroundTasks()

                response = await server.api_run_action(
                    server.RunActionRequest(
                        action="gen_art", params={"subcommand": subcommand}
                    ),
                    background,
                )

                display = f"gen_art.py {subcommand}"
                self.assertEqual(response, {"status": "started", "cmd": display})
                self.assertEqual(
                    background.calls,
                    [(server.run_command_stream, (expected_argv, display), {})],
                )

    async def test_gen_art_rejects_unrecognized_legacy_forms_without_scheduling(self):
        cases = (
            "style --unexpected",
            "curate poster --n=4",
            "curate cover --n=4;touch",
            "pick ../../cover 1",
            "vectorize ../cover",
        )

        for subcommand in cases:
            with self.subTest(subcommand=subcommand):
                server.job_state.is_running = False
                background = RecordingBackgroundTasks()

                with self.assertRaises(HTTPException) as raised:
                    await server.api_run_action(
                        server.RunActionRequest(
                            action="gen_art", params={"subcommand": subcommand}
                        ),
                        background,
                    )

                self.assertEqual(raised.exception.status_code, 400)
                self.assertIn("subcommand", str(raised.exception.detail))
                self.assertEqual(background.calls, [])

    async def test_unknown_and_invalid_actions_do_not_schedule_a_process(self):
        cases = (
            ("not_registered", {}, "Unknown action"),
            ("rewrite_chapter_beats", {"chapter": 0, "mode": "fresh"}, "chapter"),
            ("rewrite_chapter_beats", {"chapter": 25, "mode": "fresh"}, "chapter"),
            ("rewrite_chapter_beats", {"chapter": 1, "mode": "patch"}, "mode"),
            ("run_drafts", {"all": True, "start": 1, "end": 4}, "all"),
            ("run_drafts", {"start": 5, "end": 4}, "start"),
            ("run_drafts", {"start": 1}, "end"),
            ("run_drafts", {"all": "yes"}, "all"),
            ("run_drafts", {"all": True, "overwrite": "yes"}, "overwrite"),
        )

        for action, params, expected_detail in cases:
            with self.subTest(action=action, params=params):
                background = RecordingBackgroundTasks()

                with self.assertRaises(HTTPException) as raised:
                    await server.api_run_action(
                        server.RunActionRequest(action=action, params=params), background
                    )

                self.assertEqual(raised.exception.status_code, 400)
                self.assertIn(expected_detail, str(raised.exception.detail))
                self.assertEqual(background.calls, [])

    async def test_concurrent_request_is_rejected_without_scheduling(self):
        first_background = RecordingBackgroundTasks()
        first = await server.api_run_action(
            server.RunActionRequest(action="gen_world"), first_background
        )
        second_background = RecordingBackgroundTasks()

        with self.assertRaises(HTTPException) as raised:
            await server.api_run_action(
                server.RunActionRequest(action="gen_canon"), second_background
            )

        self.assertEqual(first, {"status": "started", "cmd": "gen_world.py"})
        self.assertEqual(len(first_background.calls), 1)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail, "A job is already running")
        self.assertEqual(second_background.calls, [])

    async def test_runner_uses_exec_with_absolute_script_and_streams_display_label(self):
        process = FakeProcess((b"first line\n",), returncode=0)
        display = "draft_chapter.py 7"
        expected_script = str(Path(server.__file__).resolve().parent / "draft_chapter.py")

        with (
            patch.object(
                server.asyncio,
                "create_subprocess_exec",
                AsyncMock(return_value=process),
            ) as exec_mock,
            patch.object(
                server.asyncio,
                "create_subprocess_shell",
                AsyncMock(return_value=process),
            ) as shell_mock,
            patch.object(server.manager, "broadcast", AsyncMock()) as broadcast,
        ):
            await server.run_command_stream(("draft_chapter.py", "7"), display)

        shell_mock.assert_not_awaited()
        exec_mock.assert_awaited_once_with(
            sys.executable,
            "-u",
            expected_script,
            "7",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(server.PROJECT_DIR),
            env=unittest.mock.ANY,
        )
        self.assertEqual(server.job_state.current_cmd, display)
        self.assertEqual(server.job_state.logs, ["first line\n"])
        broadcast.assert_any_await({"type": "job_start", "cmd": display})
        broadcast.assert_any_await(
            {"type": "job_end", "returncode": 0, "cmd": display}
        )


if __name__ == "__main__":
    unittest.main()

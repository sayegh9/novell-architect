import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

import server


class ProjectApiTests(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.script_dir = Path(self._temp_dir.name).resolve()
        self.projects_dir = self.script_dir / "projects"
        self.projects_dir.mkdir()

        self.original_script_dir = server.SCRIPT_DIR
        self.original_project_dir = server.PROJECT_DIR
        self.original_log_path = getattr(server, "ORCHESTRATOR_LOG_PATH", None)
        self.original_project_env = os.environ.get("AUTONOVEL_PROJECT_DIR")

        server.SCRIPT_DIR = self.script_dir
        server.PROJECT_DIR = self.script_dir
        server.ORCHESTRATOR_LOG_PATH = self.script_dir / "autonovel-orchestrator.log"

    def tearDown(self):
        server.SCRIPT_DIR = self.original_script_dir
        server.PROJECT_DIR = self.original_project_dir
        if self.original_log_path is None:
            del server.ORCHESTRATOR_LOG_PATH
        else:
            server.ORCHESTRATOR_LOG_PATH = self.original_log_path
        if self.original_project_env is None:
            os.environ.pop("AUTONOVEL_PROJECT_DIR", None)
        else:
            os.environ["AUTONOVEL_PROJECT_DIR"] = self.original_project_env
        self._temp_dir.cleanup()

    def make_project(self, project_id: str) -> Path:
        project = self.projects_dir / project_id
        project.mkdir()
        (project / "state.json").write_text(
            '{"phase": "drafting", "chapters_total": 12}', encoding="utf-8"
        )
        return project

    def assert_http_error(self, call, status_code: int, detail: str) -> None:
        with self.assertRaises(HTTPException) as caught:
            call()
        self.assertEqual(caught.exception.status_code, status_code)
        self.assertEqual(caught.exception.detail, detail)

    def test_delete_rejects_malformed_or_traversal_like_identifiers(self):
        outside = self.script_dir / "outside"
        outside.mkdir()
        invalid_ids = (
            ".",
            "..",
            "nested/project",
            r"nested\project",
            str(outside),
            "../outside",
            "%2e%2e",
            "project%2foutside",
        )

        with patch.object(server.shutil, "rmtree") as remove_tree:
            for project_id in invalid_ids:
                with self.subTest(project_id=project_id):
                    self.assert_http_error(
                        lambda project_id=project_id: server.api_delete_project(project_id),
                        400,
                        "Invalid project ID",
                    )

        remove_tree.assert_not_called()
        self.assertTrue(self.projects_dir.is_dir())
        self.assertTrue(outside.is_dir())

    def test_delete_rejects_root_without_calling_rmtree(self):
        with patch.object(server.shutil, "rmtree") as remove_tree:
            self.assert_http_error(
                lambda: server.api_delete_project("root"),
                400,
                "Cannot delete root project",
            )

        remove_tree.assert_not_called()
        self.assertTrue(self.projects_dir.is_dir())

    def test_delete_rejects_active_project(self):
        active = self.make_project("active-project")
        server.PROJECT_DIR = active.resolve()

        self.assert_http_error(
            lambda: server.api_delete_project("active-project"),
            409,
            "Cannot delete active project",
        )
        self.assertTrue(active.is_dir())
        self.assertEqual(server.PROJECT_DIR, active.resolve())

    def test_delete_rejects_symlink_escape_without_touching_target(self):
        outside = self.script_dir / "outside-project"
        outside.mkdir()
        marker = outside / "keep.txt"
        marker.write_text("safe", encoding="utf-8")
        (self.projects_dir / "escape").symlink_to(outside, target_is_directory=True)

        with patch.object(server.shutil, "rmtree") as remove_tree:
            self.assert_http_error(
                lambda: server.api_delete_project("escape"),
                400,
                "Project path must be an exact directory under projects",
            )

        remove_tree.assert_not_called()
        self.assertEqual(marker.read_text(encoding="utf-8"), "safe")

    def test_project_operations_reject_symlinked_projects_directory(self):
        self.projects_dir.rmdir()
        external_projects = self.script_dir / "external-projects"
        external_projects.mkdir()
        external_project = external_projects / "external-project"
        external_project.mkdir()
        marker = external_project / "keep.txt"
        marker.write_text("safe", encoding="utf-8")
        self.projects_dir.symlink_to(external_projects, target_is_directory=True)

        operations = (
            server.api_list_projects,
            lambda: server.api_delete_project("external-project"),
            lambda: server.api_set_active_project(
                server.SetActiveProjectRequest(id="external-project")
            ),
            lambda: server.api_create_project(
                server.CreateProjectRequest(name="new-project")
            ),
        )

        with patch.object(server.shutil, "rmtree") as remove_tree:
            for operation in operations:
                with self.subTest(operation=operation):
                    self.assert_http_error(
                        operation,
                        400,
                        "Projects directory must not be a symlink",
                    )

        remove_tree.assert_not_called()
        self.assertEqual(marker.read_text(encoding="utf-8"), "safe")
        self.assertFalse((external_projects / "new-project").exists())

    def test_select_rejects_symlink_escape(self):
        outside = self.script_dir / "outside-project"
        outside.mkdir()
        (self.projects_dir / "escape").symlink_to(outside, target_is_directory=True)

        self.assert_http_error(
            lambda: server.api_set_active_project(
                server.SetActiveProjectRequest(id="escape")
            ),
            400,
            "Project path must be an exact directory under projects",
        )
        self.assertEqual(server.PROJECT_DIR, self.script_dir)

    def test_valid_inactive_direct_child_is_deleted_and_parent_is_never_targeted(self):
        project = self.make_project("finished-project")
        observed_targets = []
        real_rmtree = shutil.rmtree

        def guarded_rmtree(target):
            target = Path(target)
            self.assertEqual(target.parent, self.projects_dir)
            self.assertNotEqual(target, self.projects_dir)
            observed_targets.append(target)
            real_rmtree(target)

        with patch.object(server.shutil, "rmtree", side_effect=guarded_rmtree):
            response = server.api_delete_project("finished-project")

        self.assertEqual(response, {"status": "deleted", "id": "finished-project"})
        self.assertEqual(observed_targets, [project])
        self.assertFalse(project.exists())
        self.assertTrue(self.projects_dir.is_dir())

    def test_valid_direct_child_and_root_can_be_selected(self):
        project = self.make_project("next-project")

        selected = server.api_set_active_project(
            server.SetActiveProjectRequest(id="next-project")
        )
        selected_root = server.api_set_active_project(
            server.SetActiveProjectRequest(id="root")
        )

        self.assertEqual(selected["active_project"], str(project))
        self.assertEqual(selected_root["active_project"], str(self.script_dir))
        self.assertEqual(server.PROJECT_DIR, self.script_dir)

    def test_list_includes_directories_but_excludes_symlinks(self):
        project = self.make_project("listed-project")
        outside = self.script_dir / "outside-project"
        outside.mkdir()
        (self.projects_dir / "escape").symlink_to(outside, target_is_directory=True)

        response = server.api_list_projects()

        projects_by_id = {item["id"]: item for item in response["projects"]}
        self.assertEqual(set(projects_by_id), {"root", "listed-project"})
        self.assertEqual(projects_by_id["listed-project"]["path"], str(project))

    def test_create_preserves_valid_names_and_rejects_reserved_root(self):
        created = server.api_create_project(server.CreateProjectRequest(name="New Project"))

        self.assertEqual(created["id"], "New_Project")
        self.assertTrue((self.projects_dir / "New_Project").is_dir())
        self.assert_http_error(
            lambda: server.api_create_project(server.CreateProjectRequest(name="root")),
            400,
            "Invalid project ID",
        )
        self.assertFalse((self.projects_dir / "root").exists())

    def test_create_rejects_path_like_names(self):
        invalid_names = (
            ".",
            "..",
            "nested/project",
            r"nested\project",
            str(self.script_dir / "absolute-project"),
            "../outside",
            "%2e%2e",
        )

        for name in invalid_names:
            with self.subTest(name=name):
                self.assert_http_error(
                    lambda name=name: server.api_create_project(
                        server.CreateProjectRequest(name=name)
                    ),
                    400,
                    "Invalid project name",
                )

        self.assertEqual(list(self.projects_dir.iterdir()), [])


if __name__ == "__main__":
    unittest.main()

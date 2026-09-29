"""Regression checks for the Homebrew launcher and pinned formula resources."""

import os
import re
import sys
import tempfile
import tomllib
import unittest
from pathlib import Path
from unittest.mock import patch

import autonovel_cli


class HomebrewPackagingTests(unittest.TestCase):
    def test_launcher_keeps_project_data_outside_app(self):
        with tempfile.TemporaryDirectory() as temporary:
            data_dir = Path(temporary)
            argv = ["autonovel", "--no-browser", "--data-dir", temporary, "--port", "18997"]
            with patch.object(sys, "argv", argv), patch.dict(os.environ, {}, clear=False):
                with patch("autonovel_cli.subprocess.run"), patch("server.main"):
                    autonovel_cli.main()
                    starter = data_dir / "projects" / "Starter"
                    self.assertEqual(Path(os.environ["AUTONOVEL_PROJECT_DIR"]), starter.resolve())
                    self.assertEqual(Path(os.environ["AUTONOVEL_PROJECTS_DIR"]), starter.parent.resolve())
                    self.assertEqual((starter / ".gitignore").read_text(), ".env\n")
                    self.assertTrue((starter / "seed.txt").exists())

    def test_launcher_restores_selected_book(self):
        with tempfile.TemporaryDirectory() as temporary:
            data_dir = Path(temporary)
            selected = data_dir / "projects" / "Another_Book"
            selected.mkdir(parents=True)
            (data_dir / "active_project").write_text("Another_Book", encoding="utf-8")
            argv = ["autonovel", "--no-browser", "--data-dir", temporary, "--port", "18997"]
            with patch.object(sys, "argv", argv), patch.dict(os.environ, {}, clear=False):
                with patch("autonovel_cli.subprocess.run"), patch("server.main"):
                    autonovel_cli.main()
                    self.assertEqual(Path(os.environ["AUTONOVEL_PROJECT_DIR"]), selected.resolve())

    def test_formula_resources_match_lockfile(self):
        root = Path(__file__).resolve().parents[1]
        packages = {
            package["name"]: package["sdist"]
            for package in tomllib.loads((root / "uv.lock").read_text())["package"]
            if package["name"] != "autonovel"
        }
        formula = (root / "Formula" / "autonovel.rb").read_text()
        resources = {
            name: (url, digest)
            for name, url, digest in re.findall(
                r'resource "([^"]+)" do\s+url "([^"]+)"\s+sha256 "([^"]+)"',
                formula,
            )
        }
        self.assertEqual(set(resources), set(packages))
        for name, (url, digest) in resources.items():
            self.assertEqual(url, packages[name]["url"])
            self.assertEqual(digest, packages[name]["hash"].removeprefix("sha256:"))


if __name__ == "__main__":
    unittest.main()

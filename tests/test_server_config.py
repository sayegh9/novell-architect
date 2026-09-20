import os
import unittest
from unittest.mock import patch

from fastapi.middleware.cors import CORSMiddleware

import server


class ServerConfigurationTests(unittest.TestCase):
    def test_server_binds_to_loopback_by_default(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(server.get_server_host(), "127.0.0.1")

    def test_server_host_can_be_overridden_for_explicit_lan_access(self):
        with patch.dict(os.environ, {"AUTONOVEL_HOST": "192.168.1.20"}, clear=True):
            self.assertEqual(server.get_server_host(), "192.168.1.20")

    def test_default_cors_origins_support_local_vite_variants(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(
                server.get_cors_origins(),
                ["http://localhost:5173", "http://127.0.0.1:5173"],
            )

    def test_cors_origins_can_be_explicitly_configured(self):
        with patch.dict(
            os.environ,
            {"AUTONOVEL_CORS_ORIGINS": "https://studio.example, http://localhost:4173/"},
            clear=True,
        ):
            self.assertEqual(
                server.get_cors_origins(),
                ["https://studio.example", "http://localhost:4173"],
            )

    def test_cors_rejects_wildcard_origin(self):
        with patch.dict(os.environ, {"AUTONOVEL_CORS_ORIGINS": "*"}, clear=True):
            with self.assertRaisesRegex(ValueError, "wildcard"):
                server.get_cors_origins()

    def test_cors_middleware_uses_explicit_origins(self):
        cors_middleware = next(
            middleware
            for middleware in server.app.user_middleware
            if middleware.cls is CORSMiddleware
        )
        self.assertEqual(
            middleware_options := cors_middleware.kwargs["allow_origins"],
            ["http://localhost:5173", "http://127.0.0.1:5173"],
        )
        self.assertNotIn("*", middleware_options)

    def test_main_passes_configured_host_and_port_to_uvicorn(self):
        with patch.dict(
            os.environ,
            {"AUTONOVEL_HOST": "0.0.0.0", "PORT": "9090"},
            clear=True,
        ), patch.object(server.uvicorn, "run") as run:
            server.main()

        run.assert_called_once_with(
            server.app,
            host="0.0.0.0",
            port=9090,
            log_level="info",
        )


if __name__ == "__main__":
    unittest.main()

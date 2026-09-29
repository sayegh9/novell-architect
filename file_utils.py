"""Durable filesystem helpers for server-managed project files."""

import os
import stat
import tempfile
from pathlib import Path
from typing import Optional


def atomic_write_text(
    path: Path,
    content: str,
    *,
    encoding: str = "utf-8",
    newline: Optional[str] = None,
    mode: Optional[int] = None,
) -> None:
    """Replace ``path`` atomically after fully writing a sibling temp file.

    Existing permission bits are copied to the replacement. If writing or
    replacement fails, the original remains in place and the temporary file is
    removed.
    """
    path = Path(path)
    existing_mode = None
    try:
        existing_mode = stat.S_IMODE(path.stat().st_mode)
    except FileNotFoundError:
        pass

    fd, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
    )
    temporary_path = Path(temporary_name)
    try:
        if mode is not None:
            os.chmod(temporary_path, mode)
        elif existing_mode is not None:
            os.chmod(temporary_path, existing_mode)
        with os.fdopen(fd, "w", encoding=encoding, newline=newline) as temporary_file:
            fd = -1
            temporary_file.write(content)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        os.replace(temporary_path, path)
    finally:
        if fd >= 0:
            os.close(fd)
        try:
            temporary_path.unlink()
        except FileNotFoundError:
            pass

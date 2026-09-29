# Homebrew installation and launch

## Current release status

The formula in `Formula/autonovel.rb` is a source-based HEAD preview. It must
reach the public `main` branch before the commands below can install these
changes. There is no stable, tagged Homebrew release yet. Do not advertise a
one-command public install until a tagged release and dedicated tap exist.

```bash
brew tap sayegh9/autonovel https://github.com/sayegh9/novell-architect.git
brew install --HEAD sayegh9/autonovel/autonovel
autonovel
```

Studio opens at `http://127.0.0.1:8080`. Stop it with Ctrl-C in the launching
terminal. To skip browser opening or use a different port:

```bash
autonovel --no-browser --port 8081
```

The formula installs Python and its locked application dependencies into its
own Homebrew prefix, and ships the already-built web UI. It does not need Node
or an API key for installation. In Studio, open Settings, select an LLM
provider, and save your own API key before requesting AI generation.

## Where books and secrets go

On macOS, the default data directory is
`~/Library/Application Support/Autonovel`. Its `projects/Starter` folder is
created on first launch. New Studio books are sibling folders under
`projects/`. Keys saved through Settings are stored in each book's `.env`.
The most recently selected book is restored at next launch. `brew upgrade` and
`brew uninstall` do not intentionally remove this directory.

Use `autonovel --data-dir /path/to/data` or set `AUTONOVEL_DATA_DIR` if you
want books elsewhere. Back up the entire data directory, including hidden
`.env` files, and keep those backups private.

An existing source-checkout book is **not** moved automatically. To migrate,
copy its project folder into the new data directory's `projects/` folder,
excluding `.venv`, `node_modules`, and the application's code. Check the
copied `seed.txt`, foundation documents, chapters, `.env`, and `state.json`
before retiring the original. Never delete the source copy until the imported
book has been opened and verified in Studio.

## Upgrade and rollback

After a newer commit is published to `main`:

```bash
brew update
brew reinstall --HEAD sayegh9/autonovel/autonovel
```

Back up the data directory before upgrading. For rollback, restore the
previous formula revision or source checkout and relaunch with the same data
directory; do not remove the data directory. The formula currently tracks
HEAD, so upgrades are less reproducible than a tagged release.

## Maintainer release checklist

1. Verify the committed `ui/dist` matches the UI source and test the launcher
   with a temporary `--data-dir`.
2. Check that all Python resources in `Formula/autonovel.rb` match `uv.lock`
   (URL and SHA-256), then run `brew audit` and a clean `brew install --HEAD`
   on macOS with network access.
3. Publish the changes to `main` and verify the two-command preview install
   from a clean machine. The formula and tap are not public until this step.
4. For stable distribution, tag a release, replace `head`-only packaging with
   a checksum-pinned source archive, and publish a dedicated
   `sayegh9/homebrew-autonovel` tap. Then document the one-command install:
   `brew install sayegh9/autonovel/autonovel`.

If port 8080 is busy, run `autonovel --port 8081`. If installation cannot
fetch Python resources, retry when Homebrew has network access; the launcher
does not fetch Python code at runtime. If AI actions fail, check the selected
book's provider/key in Settings.

# Distribution & Updates

> **Status: PRIVATE-REPO PHASE (temporary).** Everything under "Now" exists only
> because the repo is private and the testers are collaborators. When the repo
> goes public, work through "When public" and delete this banner.

Packaging follows the Arch Wiki / Arch packaging guidelines, reviewed by
Evertiro (ex-Arch dev, co-maintainer of `zinc-term`), and mirrors the style of
the `zinc-term` / `zinc-term-git` AUR packages.

## Names (decided 2026-11-17)

The AUR name `polaris` is taken by a music streaming server. That package
installs `/usr/bin/polaris` and `/usr/share/polaris`, and `polaris-bin` is
taken by an unrelated Kubernetes tool. To avoid name and file conflicts:

| Thing            | Value                                      |
| ---------------- | ------------------------------------------ |
| Nightly package  | `polaris-fm-git` (tracks `main`)           |
| Stable package   | `polaris-fm` (tagged releases, later)      |
| Binary package   | `polaris-fm-bin` (prebuilt, once public)   |
| Command          | `/usr/bin/polaris-fm`                      |
| App files        | `/usr/lib/polaris-fm/`                     |
| App ID / desktop | `io.github.mvkweb.Polaris` (`.desktop`)    |
| Display name     | Polaris (unchanged in the UI)              |

The variants `provide` `polaris-fm` and `conflict` with each other, never with
`polaris`.

## Channels & branches

- **Nightly = `main`.** Every push to `main` is a new nightly, and testers get it
  on their next update. `pkgver()` comes from `git describe`; until the first
  tag it is `r<count>.g<hash>`.
- **Stable = tags** (`v0.1.0`, …). There are none yet, so `polaris-fm` doesn't
  exist yet.
- **Work in progress** lives on feature branches and lands in `main` only when
  it's ready. `main` is what testers run, so keep it working.

## How we package (the Arch way)

- **System Electron, not bundled.**
  - `depends=('electron44')` from `extra`. The package ships only our built app
    plus `polaris-core`, and `/usr/bin/polaris-fm` is a small launcher that runs
    `electron44` on `/usr/lib/polaris-fm/app`.
  - Electron security updates come from Arch.
  - `node-pty` uses N-API, so it runs on the system Electron without a rebuild.
    No electron-builder is needed.
- **`polaris-core`** is built with `zig` from `extra` (`zig>=0.17`), using
  `-Dcpu=baseline` so a binary built on one machine runs on any x86_64/aarch64.
- **Clean builds:** build in a fresh chroot every time. That catches missing
  `depends`/`makedepends` that happen to be installed on the dev machine. On
  CachyOS, give the chroot **its own package cache** (`-c`): the shared cache
  holds CachyOS builds with the same filenames as Arch's, and those fail Arch's
  signature check.
  ```bash
  # once
  sudo mkdir -p /var/lib/archbuild/polaris-test
  sudo mkdir -p /var/lib/archbuild/polaris-test/pkgcache
  sudo mkarchroot -c /var/lib/archbuild/polaris-test/pkgcache \
    -C /usr/share/devtools/pacman.conf.d/extra.conf \
    -M /usr/share/devtools/makepkg.conf.d/x86_64.conf \
    /var/lib/archbuild/polaris-test/root base-devel
  # every build, from packaging/arch/polaris-fm-git
  sudo makechrootpkg -c -r /var/lib/archbuild/polaris-test
  ```
  To test a branch before it's on `main`, point `source=` at
  `git+file:///path/to/polaris#branch=<branch>` in a scratch copy of the
  PKGBUILD.
- **Lint before every push:**
  ```bash
  shellcheck --shell=bash --exclude=SC2034,SC2154,SC2164 PKGBUILD
  namcap PKGBUILD && namcap polaris-fm-git-*.pkg.tar.zst
  ```
- **Location:** PKGBUILDs live in this repo under `packaging/arch/<pkgname>/`,
  together with the launcher and `.desktop` file.

## Now: private repo, invited testers

- **Access:** testers (and Evertiro) are GitHub collaborators. git reaches the
  private repo with their own login: the `gh` credential helper, or an SSH key
  through `url."git@github.com:".insteadOf`. We don't ship or store any
  tokens. Everything uses the HTTPS URL, so nothing changes when the repo
  goes public.
- **Install, update, remove:** see [TESTING.md](../TESTING.md). Testers clone
  the repo, then run `packaging/arch/install.sh` to install or update.
  - Why a script: makepkg (pacman ≥ 7.1) clones with
    `GIT_CONFIG_GLOBAL=/dev/null`, which hides the tester's GitHub login. The
    script passes their git config via `MAKEPKG_GIT_CONFIG`.
  - Not needed once public: `paru -S polaris-fm-git`. A one-click in-app Update button (running makepkg in
  Polaris's terminal) is still to do.
- **Installed builds vs the repo:** installed builds keep their own profile in
  `~/.config/polaris-fm`, so they run next to `bun run dev` without sharing
  Chromium's locks. They start in `$HOME` (dev still starts in the launch
  folder), keep a single window, and `polaris-fm <path>` opens that path in a
  new tab. See `src/main/launch.ts`.
- **Build stamp:** the PKGBUILD exports `POLARIS_CHANNEL`, `POLARIS_COMMIT` and
  `POLARIS_PKGVER`, which electron-vite bakes into the main bundle. They're
  unset in the repo.
- **No `-bin` package yet:** release assets of a private repo need a token to
  download.
- **In-app update check** (`src/main/updates.ts`, prompts disabled):
  - Checkouts run `git fetch` + `rev-list`.
  - Installed builds compare the baked-in commit with
    `git ls-remote https://github.com/Mvkweb/polaris.git main`.
  - If the check fails, the footer says so; it never claims "up to date".
- **Safety:** the app never writes outside `$HOME` and never needs root.
  Making Polaris the default file manager (`xdg-mime`) will be an opt-in,
  reversible toggle.

## Open items

- [ ] **License:** there is none yet, so the PKGBUILD says
      `LicenseRef-Proprietary` and namcap reports an error until a LICENSE file
      exists. Pick a license (or add an "all rights reserved" file) before
      going public.
- [ ] `polaris-core` lacks PIE/full RELRO (Zig ignores makepkg's LDFLAGS);
      namcap warns about it. It could be set in `core/build.zig`.
- [ ] In-app Update button; an opt-in "default file manager" toggle
      (`xdg-mime`), which should save and restore the previous default.

## When public: TODO

- [ ] Push `polaris-fm-git` to the AUR (Mvkweb + Evertiro as co-maintainers).
      `source=` is already the HTTPS URL.
- [ ] Testers then just run `paru -S polaris-fm-git`; drop the clone steps
      from TESTING.md.
- [ ] First tag `v0.1.0` → `polaris-fm` (stable) from the release tarball,
      with a `sha256sums` checksum.
- [ ] GitHub Actions: on each tag, build a tarball (app + `polaris-core`, no
      Electron) and attach it to the release → `polaris-fm-bin`.
- [ ] Stable channel: check the GitHub Releases API instead of `ls-remote`.
- [ ] AppImage for non-Arch Linux; Windows and macOS builds.
- [ ] Remove the "invite-only" wording from TESTING.md and the About page.

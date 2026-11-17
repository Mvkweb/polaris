# Distribution & Updates

> **Status: PRIVATE-PHASE (temporary).** Everything under "Now" exists only
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
- **License:** GPL-3.0-or-later (`LICENSE`). It's a common SPDX license, so
  the package doesn't install a copy (Arch packaging guideline).
- **In-app update** (installed builds):
  - The footer card's **Update now** opens a Polaris terminal tab and runs
    `PACKAGE_UPDATE_COMMAND` (`src/main/updates.ts`). That keeps a clone in
    `~/.cache/polaris-fm/repo` and runs its `install.sh`; makepkg's output and
    pacman's password prompt show right there.
  - Main watches `/usr/lib/polaris-fm/app`. When pacman swaps the files,
    `pacman -Q` reports a new pkgver, the footer flips to **Restart to
    update**, and **Restart now** relaunches.
  - From a checkout, Update now runs `git pull --ff-only` instead.
- **Install, update, remove:** see [TESTING.md](../TESTING.md). Testers clone
  the repo, then run `packaging/arch/install.sh` to install or update.
  - Why a script: makepkg (pacman ≥ 7.1) clones with
    `GIT_CONFIG_GLOBAL=/dev/null`, which hides the tester's GitHub login. The
    script passes their git config via `MAKEPKG_GIT_CONFIG`.
  - Not needed once public: `paru -S polaris-fm-git`. A one-click in-app Update button (running makepkg in
  Polaris's terminal) is still to do.
- **Installed builds vs the repo:** installed builds keep their own profile in
  `~/.config/polaris-fm`, so they run next to `bun run dev` without sharing
  Chromium's locks. Startup follows Settings → General → Open on launch:
  Last folder restores the active browser folder, Home opens `$HOME`, and
  Launch folder uses the launch working directory. With no saved folder, the
  installed app starts in `$HOME` and dev starts in the launch directory.
  Explicit launch paths take priority; missing/inaccessible folders fall back
  to Home. Each profile remembers one path in `polaris.lastFolder.v1`, with
  no background scans or watchers. Installed builds keep a single window,
  and `polaris-fm <path>` opens that path in a new tab. See `src/main/launch.ts`,
  `src/main/startup.ts` and `src/renderer/src/startup.ts`.
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

- [ ] `polaris-core` lacks PIE/full RELRO (Zig ignores makepkg's LDFLAGS);
      namcap warns about it. It could be set in `core/build.zig`.
- [ ] An opt-in "default file manager" toggle (`xdg-mime`), which should
      save and restore the previous default.

## Going public: runbook for whoever does it (human or agent)

Everything that exists only because the repo is private is tagged
`PRIVATE-PHASE`. Start with `grep -rn PRIVATE-PHASE` and work through this
list:

1. **Make the repo public** on GitHub. `source=` in the PKGBUILD is already
   the HTTPS URL, so the PKGBUILD itself needs no change.
2. **AUR:** in `packaging/arch/polaris-fm-git/`, run
   `makepkg --printsrcinfo > .SRCINFO`, then push PKGBUILD + `.SRCINFO` to
   `ssh://aur@aur.archlinux.org/polaris-fm-git.git`. Add Evertiro as
   co-maintainer, and keep the copy in this repo in sync.
3. **In-app update:** in `src/main/updates.ts`, change
   `PACKAGE_UPDATE_COMMAND` to `paru -S polaris-fm-git` (fall back to `yay`
   if paru is missing). Keep the restart detection as is.
4. **Remove private-only pieces:**
   - `packaging/arch/install.sh` and its `MAKEPKG_GIT_CONFIG` workaround.
   - TESTING.md's "git login" and clone steps: install becomes
     `paru -S polaris-fm-git`.
   - "invite-only" wording in TESTING.md and the About page.
5. **Stable channel:** tag `v0.1.0`, then add
   `packaging/arch/polaris-fm/PKGBUILD` (release tarball + `sha256sums`,
   `provides`/`conflicts` with `polaris-fm-git`).
6. **Delete the PRIVATE-PHASE banner** at the top of this file, and the
   remaining `PRIVATE-PHASE` comments.

## After going public: later

- [ ] GitHub Actions: on each tag, build a tarball (app + `polaris-core`, no
      Electron) and attach it to the release → `polaris-fm-bin`.
- [ ] Stable channel update check: use the GitHub Releases API instead of
      `ls-remote`.
- [ ] AppImage for non-Arch Linux; Windows and macOS builds.

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
- **Clean builds:** `pkgctl build` (devtools) builds in a fresh chroot every
  time, which catches missing `depends`/`makedepends` that happen to be
  installed on the dev machine.
- **Lint before every push:**
  ```bash
  shellcheck --shell=bash --exclude=SC2034,SC2154,SC2164 PKGBUILD
  namcap PKGBUILD && namcap polaris-fm-git-*.pkg.tar.zst
  ```
- **Location:** PKGBUILDs live in this repo under `packaging/arch/<pkgname>/`,
  together with the launcher and `.desktop` file.

## Now: private repo, invited testers

- **Access:** testers (and Evertiro) are GitHub collaborators and authenticate
  with their own SSH key. There are no tokens anywhere.
- **Install:**
  ```bash
  git clone git@github.com:Mvkweb/polaris.git
  cd polaris/packaging/arch/polaris-fm-git && makepkg -si
  ```
  To update, run `git pull && makepkg -si` again, or later use the in-app
  Update button, which runs this in Polaris's terminal.
- **Remove:** `sudo pacman -R polaris-fm-git`. pacman owns every file;
  settings stay in `~/.config/polaris`.
- **No `-bin` package yet:** release assets of a private repo need a token to
  download.
- **In-app update check:** `src/main/updates.ts` runs `git fetch` and
  `rev-list` over the user's SSH (prompts disabled). This works for git
  checkouts. Packaged builds will compare an embedded build commit against
  `git ls-remote`.
- **Safety:** the app never writes outside `$HOME` and never needs root.
  Making Polaris the default file manager (`xdg-mime`) will be an opt-in,
  reversible toggle.

## When public: TODO

- [ ] Push `polaris-fm-git` to the AUR (Mvkweb + Evertiro as co-maintainers)
      and switch `source=` to the HTTPS URL.
- [ ] Testers then just run `paru -S polaris-fm-git`; drop the clone steps
      from TESTING.md.
- [ ] First tag `v0.1.0` → `polaris-fm` (stable) from the release tarball,
      with a `sha256sums` checksum.
- [ ] GitHub Actions: on each tag, build a tarball (app + `polaris-core`, no
      Electron) and attach it to the release → `polaris-fm-bin`.
- [ ] Update check: use the GitHub Releases / tags API over HTTPS instead of
      SSH `git fetch` and `ls-remote`.
- [ ] AppImage for non-Arch Linux; Windows and macOS builds.
- [ ] Remove the "invite-only" wording from TESTING.md and the About page.

# Testing Polaris (invite-only)

Polaris is in a private testing phase. If you can see this repo, you're
invited. Thanks for helping!

Right now this works on **Arch Linux and Arch-based systems** (CachyOS,
EndeavourOS, …). Other systems come later.

## 1. Before you start (once)

- Accept the GitHub collaborator invite.
- Let git reach the private repo with **your own** GitHub login. Pick one:
  - **GitHub CLI** (easiest): `sudo pacman -S github-cli`, then
    `gh auth login` and `gh auth setup-git`.
  - **SSH key** already on GitHub (`ssh -T git@github.com` greets you): tell
    git to use it for GitHub links:
    `git config --global url."git@github.com:".insteadOf "https://github.com/"`
- Check it works: `git ls-remote https://github.com/Mvkweb/polaris.git` should
  print a line, not ask for a password.
- You need `git` and `base-devel`, which Arch-based systems already have.

## 2. Install

```bash
git clone https://github.com/Mvkweb/polaris.git ~/polaris
~/polaris/packaging/arch/install.sh
```

The script builds Polaris on your machine with `makepkg` (a few minutes the
first time), then asks for your password once, so pacman can install it. Don't
run it with sudo.

<details><summary>Without the script</summary>

makepkg ignores your personal git config while cloning, so point it at
yours (that's where your GitHub login lives):

```bash
cd ~/polaris/packaging/arch/polaris-fm-git
MAKEPKG_GIT_CONFIG=~/.gitconfig makepkg -sic
```
</details>

Then start **Polaris** from your app launcher, or run `polaris-fm` in a terminal:

```bash
polaris-fm                 # opens your home folder
polaris-fm ~/Downloads     # opens a folder
polaris-fm ~/notes.md      # opens its folder with the file selected
```

Running it again while it's open adds a tab to the same window.

**Hyprland:** `bind = SUPER, E, exec, polaris-fm`

## 3. Update

Every push to `main` is a new nightly. The bottom-left of the sidebar tells
you when one is out; hover it to see what changed. To update:

```bash
~/polaris/packaging/arch/install.sh
```

## 4. Remove

```bash
sudo pacman -R polaris-fm-git
```

pacman removes every file it installed. Your settings stay in
`~/.config/polaris-fm`; delete that folder too for a fully clean slate.

## What it touches

- **Installs only through pacman:** `/usr/lib/polaris-fm`, `/usr/bin/polaris-fm`,
  a launcher entry and an icon. Nothing else.
- **It doesn't make itself your default file manager.** Your current one keeps
  opening folders.
- **No root, no background services.** It only checks for updates (with your
  own GitHub login) while it's open.

## Reporting problems

Open an issue in this repo. Include what you did, what happened, and the
output of `pacman -Q polaris-fm-git`. If it won't start, add the output of
running `polaris-fm` in a terminal.

Extra Electron flags (for example `--ozone-platform=wayland`) can go one per
line in `~/.config/polaris-fm-flags.conf`.

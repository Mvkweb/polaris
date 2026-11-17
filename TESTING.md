# Testing Polaris (invite-only)

Polaris is in a private testing phase. If you can see this repo, you're
invited. Thanks for helping!

Right now this works on **Arch Linux and Arch-based systems** (CachyOS,
EndeavourOS, …). Other systems come later.

## 1. Before you start (once)

- Accept the GitHub collaborator invite.
- Have an SSH key on your GitHub account. Check with
  `ssh -T git@github.com`: it should greet you by name. If it doesn't, see
  [GitHub's SSH guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).
- You need `git` and `base-devel`, which Arch-based systems already have.

## 2. Install

```bash
git clone git@github.com:Mvkweb/polaris.git ~/polaris
cd ~/polaris/packaging/arch/polaris-fm-git
makepkg -si
```

`makepkg` builds Polaris on your machine (a minute or two) and asks for your
password once, to install it with pacman. You never run `makepkg` as root.

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
cd ~/polaris && git pull
cd packaging/arch/polaris-fm-git && makepkg -si
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
  own SSH key) while it's open.

## Reporting problems

Open an issue in this repo. Include what you did, what happened, and the
output of `pacman -Q polaris-fm-git`. If it won't start, add the output of
running `polaris-fm` in a terminal.

Extra Electron flags (for example `--ozone-platform=wayland`) can go one per
line in `~/.config/polaris-fm-flags.conf`.

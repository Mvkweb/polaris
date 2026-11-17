#!/bin/sh
# Install or update the Polaris nightly (polaris-fm-git).
#
#   ~/polaris/packaging/arch/install.sh            install, or update if newer
#   ~/polaris/packaging/arch/install.sh --force    rebuild even if up to date
#
# Runs as you, never as root. It checks your setup, pulls the latest
# packaging, builds with makepkg and installs with pacman (which asks for your
# password once). Safe to re-run any time. Polaris's "Update now" button runs
# this too.
#
# PRIVATE-PHASE: only needed while the repo is private. Once it's on the AUR,
# testers just use `paru -S polaris-fm-git` (see .docs/distribution.md).
set -eu

PKG=polaris-fm-git
URL=https://github.com/Mvkweb/polaris.git

say() { printf '\033[1;34m==>\033[0m \033[1m%s\033[0m\n' "$*"; }
note() { printf '    %s\n' "$*"; }
fail() {
	printf '\033[1;31m==> %s\033[0m\n' "$1" >&2
	shift
	for line in "$@"; do printf '    %s\n' "$line" >&2; done
	exit 1
}

force=0
for arg in "$@"; do
	case $arg in
	--force) force=1 ;;
	-h | --help)
		sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
		exit 0
		;;
	*) fail "Unknown option: $arg" "Usage: install.sh [--force]" ;;
	esac
done

# ── Setup checks ─────────────────────────────────────────────────────────────
[ "$(id -u)" -ne 0 ] || fail "Don't run this as root or with sudo." \
	"Run it as yourself; pacman asks for your password when it installs."
command -v pacman >/dev/null 2>&1 || fail "This needs an Arch-based system (pacman not found)." \
	"Other systems aren't supported yet."
command -v git >/dev/null 2>&1 || fail "git is missing." "Install it with: sudo pacman -S git"
pacman -T base-devel >/dev/null 2>&1 || fail "base-devel is missing (needed to build packages)." \
	"Install it with: sudo pacman -S --needed base-devel"

# Find your git config. makepkg clones with it switched off, but your GitHub
# login (gh credential helper, or an SSH url.insteadOf rule) lives there.
for cfg in "${XDG_CONFIG_HOME:-$HOME/.config}/git/config" "$HOME/.gitconfig"; do
	if [ -f "$cfg" ]; then
		MAKEPKG_GIT_CONFIG=$cfg
		export MAKEPKG_GIT_CONFIG
	fi
done

say "Checking access to Polaris on GitHub..."
if ! remote=$(GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND='ssh -o BatchMode=yes' \
	git ls-remote "$URL" refs/heads/main 2>/dev/null) || [ -z "$remote" ]; then
	fail "Can't reach the Polaris repo with your GitHub login." \
		"Polaris is private for now; you need the collaborator invite and a git login:" \
		"" \
		"  GitHub CLI:  sudo pacman -S github-cli" \
		"               gh auth login && gh auth setup-git" \
		"  or SSH key:  git config --global url.\"git@github.com:\".insteadOf \"https://github.com/\"" \
		"" \
		"Then check: git ls-remote $URL (it should print a line, not ask anything)."
fi
latest=$(printf '%s' "$remote" | cut -c1-7)

# ── Up to date? ──────────────────────────────────────────────────────────────
installed=$(pacman -Q "$PKG" 2>/dev/null | cut -d' ' -f2 || true)
if [ -n "$installed" ] && [ "$force" -eq 0 ]; then
	case $installed in
	*.g"$latest"-*)
		say "Polaris is already up to date ($installed)."
		note "Use --force to rebuild anyway."
		exit 0
		;;
	esac
	say "Updating Polaris: $installed -> ${latest} (latest on main)"
else
	say "Installing Polaris (latest on main: $latest)"
fi

# ── Build and install ────────────────────────────────────────────────────────
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
if ! GIT_TERMINAL_PROMPT=0 git -C "$repo" pull --ff-only --quiet 2>/dev/null; then
	note "Couldn't update the packaging in $repo (local changes or another branch?)."
	note "Continuing with the packaging you have."
fi

note "Building takes a few minutes the first time. pacman will ask for your password."
cd "$repo/packaging/arch/$PKG"
if ! makepkg -sic --noconfirm; then
	fail "The build failed." \
		"Scroll up for the error, and report it with the output attached:" \
		"https://github.com/Mvkweb/polaris/issues"
fi
# makepkg leaves the built package here; remove it so the next update can't
# reinstall an old file.
rm -f ./"$PKG"-*.pkg.tar.*

say "Done! Polaris $(pacman -Q "$PKG" | cut -d' ' -f2) is installed."
note "Start it from your app launcher, or run: polaris-fm"
note "If Polaris is open, use \"Restart now\" in its sidebar to switch to the new version."

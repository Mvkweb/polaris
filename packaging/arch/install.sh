#!/bin/sh
# Install or update the Polaris nightly (polaris-fm-git) from this clone.
#
# PRIVATE-PHASE: only needed while the repo is private. Once it's on the AUR,
# testers just use `paru -S polaris-fm-git` (see .docs/distribution.md).
#
#   ~/polaris/packaging/arch/install.sh
#
# Pulls the latest packaging, then builds and installs with makepkg as you
# (pacman asks for your password to install). Safe to re-run any time.
set -eu

repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
git -C "$repo" pull --ff-only

# makepkg clones with your personal git config disabled. The repo is private,
# so hand it your config: your GitHub login (gh credential helper) or SSH
# url.insteadOf rule lives there. See TESTING.md.
for cfg in "${XDG_CONFIG_HOME:-$HOME/.config}/git/config" "$HOME/.gitconfig"; do
	if [ -f "$cfg" ]; then
		MAKEPKG_GIT_CONFIG=$cfg
		export MAKEPKG_GIT_CONFIG
	fi
done

cd "$repo/packaging/arch/polaris-fm-git"
exec makepkg -sic "$@"

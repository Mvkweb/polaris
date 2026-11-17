#!/bin/sh
# Polaris launcher: runs the installed app on the system Electron.
#
# Extra Electron/Chromium flags (one per line, # for comments) can go in
# ${XDG_CONFIG_HOME:-~/.config}/polaris-fm-flags.conf, e.g.
#   --ozone-platform=wayland

flags_file="${XDG_CONFIG_HOME:-$HOME/.config}/polaris-fm-flags.conf"
if [ -r "$flags_file" ]; then
	# Word splitting is intended: one flag per line.
	# shellcheck disable=SC2046
	set -- $(grep -v '^[[:space:]]*#' "$flags_file") "$@"
fi

exec @ELECTRON@ /usr/lib/polaris-fm/app "$@"

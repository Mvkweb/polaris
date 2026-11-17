#!/usr/bin/env bun
/**
 * Dev helper: render the Polaris palette from an image or colour, no install needed.
 *
 *   bun run theme ~/Pictures/wall.jpg
 *   bun run theme '#5b6cff'
 *
 * Uses `dithergen` from $DITHERGEN, then PATH, then builds references/dithergen.
 * Writes $POLARIS_THEME when set (explicit single file), otherwise dithergen's
 * own $POLARIS_THEME_DITHERGEN or ~/.config/polaris/dithergen/theme.json.
 * Matugen keeps writing ~/.config/polaris/theme.json, so both can coexist; a
 * running Polaris picks up whichever valid file was modified most recently.
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { dirname, join, resolve } from 'path'

const root = resolve(import.meta.dir, '..')
const arg = process.argv[2]
if (!arg) {
  console.error("usage: bun run theme <image | '#rrggbb'>")
  process.exit(1)
}

const findDithergen = (): string => {
  if (process.env.DITHERGEN) return process.env.DITHERGEN
  const onPath = Bun.which('dithergen')
  if (onPath) return onPath
  const ref = join(root, 'references/dithergen')
  const bin = join(ref, 'zig-out/bin/dithergen')
  if (!existsSync(bin)) {
    if (!existsSync(ref)) {
      console.error(
        'dithergen not found: set $DITHERGEN, install it, or clone it to references/dithergen'
      )
      process.exit(1)
    }
    console.error('building dithergen (one-time)…')
    const b = Bun.spawnSync(['zig', 'build', '-Doptimize=ReleaseFast'], {
      cwd: ref,
      stdio: ['inherit', 'inherit', 'inherit']
    })
    if (b.exitCode !== 0) process.exit(b.exitCode ?? 1)
  }
  return bin
}

const out =
  process.env.POLARIS_THEME ||
  process.env.POLARIS_THEME_DITHERGEN ||
  join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'polaris', 'dithergen', 'theme.json')
mkdirSync(dirname(out), { recursive: true })

// One-off config pointing the shipped template at the output path.
const cfg = join(tmpdir(), `polaris-dithergen-${process.pid}.toml`)
writeFileSync(
  cfg,
  `[config]\nmode = "dark"\nquiet = true\n\n[templates.polaris]\ninput_path = ${JSON.stringify(join(root, 'resources/themes/polaris.json'))}\noutput_path = ${JSON.stringify(out)}\n`
)

const isColor = /^#?[0-9a-f]{6}$/i.test(arg)
const cmd = isColor
  ? [findDithergen(), 'color', arg.startsWith('#') ? arg : `#${arg}`, '--config', cfg]
  : [findDithergen(), 'image', resolve(arg), '--config', cfg]

const t0 = performance.now()
const r = Bun.spawnSync(cmd, { stdio: ['inherit', 'inherit', 'inherit'] })
if (r.exitCode !== 0) process.exit(r.exitCode ?? 1)
console.log(`→ ${out} (${(performance.now() - t0).toFixed(1)} ms)`)

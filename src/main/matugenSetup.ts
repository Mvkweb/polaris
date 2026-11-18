import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'fs/promises'
import { homedir, tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import type { MatugenSetupResult, ThemeSetupStatus } from '../shared/ipcModels'
import { INSTALLED } from './launch'
import { getWallpaperTheme, matugenOutputPath, themeConfigHome } from './theme'

/**
 * Wallpaper sync setup. Polaris reads the palette matugen writes from
 * Polaris's template. Users can add the template themselves, or press
 * "Set it up for me", which edits matugen's config only on that explicit
 * click, and safely:
 *  - never touches an existing Polaris entry or a config it can't extend
 *  - writes a temp copy, lets matugen validate it (`--dry-run`), then swaps
 *    it in atomically, keeping a timestamped backup of the original
 */

const exec = promisify(execFile)

const templatePath = (): string =>
  INSTALLED
    ? '/usr/share/polaris-fm/matugen/polaris.json'
    : join(app.getAppPath(), 'resources', 'themes', 'polaris.json')

const configPath = (): string => join(themeConfigHome(), 'matugen', 'config.toml')

/** `~/…` like a hand-written matugen config (matugen expands it). */
const tilde = (p: string): string =>
  p.startsWith(homedir() + '/') ? '~' + p.slice(homedir().length) : p

const hasMatugen = (): Promise<boolean> =>
  exec('which', ['matugen']).then(
    () => true,
    () => false
  )

const block = (): string =>
  [
    '[templates.polaris]',
    `input_path = '${templatePath()}'`,
    `output_path = '${tilde(matugenOutputPath())}'`
  ].join('\n')

const status = async (): Promise<ThemeSetupStatus> => {
  const config = await readFile(configPath(), 'utf8').catch(() => '')
  const out = matugenOutputPath()
  return {
    found: (await getWallpaperTheme()) !== null,
    outputPath: tilde(out),
    templatePath: templatePath(),
    configPath: tilde(configPath()),
    matugenInstalled: await hasMatugen(),
    matugenConfigured: config.includes(out) || config.includes(tilde(out))
  }
}

/** Does matugen accept this config? (`--dry-run` parses it without writing.) */
const validates = async (file: string): Promise<boolean> =>
  exec('matugen', ['color', 'hex', '#7c5cff', '-c', file, '--dry-run', '-q'], {
    timeout: 15_000
  }).then(
    () => true,
    () => false
  )

const stamp = (): string => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')

const addTemplate = async (): Promise<MatugenSetupResult> => {
  if (!(await hasMatugen())) return { ok: false, error: 'Install matugen first.' }
  // Never point matugen at a template that isn't there.
  const hasTemplate = await readFile(templatePath(), 'utf8').then(
    () => true,
    () => false
  )
  if (!hasTemplate) {
    return {
      ok: false,
      error: `Polaris's template is missing (${templatePath()}). Reinstall Polaris.`
    }
  }
  const file = configPath()
  const existing = await readFile(file, 'utf8').catch((err: NodeJS.ErrnoException) =>
    err.code === 'ENOENT' ? null : Promise.reject(err)
  )
  const current = existing ?? ''
  if (current.includes(matugenOutputPath()) || current.includes(tilde(matugenOutputPath()))) {
    return { ok: true }
  }
  if (/^\s*\[\s*templates\.polaris\s*\]/m.test(current)) {
    return {
      ok: false,
      error:
        'Your matugen config already has a [templates.polaris] entry with other paths. Edit it by hand.'
    }
  }
  if (/^\s*templates\s*=/m.test(current)) {
    return {
      ok: false,
      error: 'Your matugen config uses an inline templates list. Add the lines by hand.'
    }
  }

  const sep = current === '' ? '[config]\n\n' : current.endsWith('\n') ? '\n' : '\n\n'
  const next = `${current}${sep}${block()}\n`
  await mkdir(join(themeConfigHome(), 'matugen'), { recursive: true })
  const tmp = `${file}.polaris-tmp`
  await writeFile(tmp, next, 'utf8')
  if (!(await validates(tmp))) {
    await rm(tmp, { force: true })
    return { ok: false, error: 'matugen rejected the edited config, so nothing was changed.' }
  }
  let backupPath: string | undefined
  if (existing !== null) {
    backupPath = `${file}.bak-polaris-${stamp()}`
    await copyFile(file, backupPath)
  }
  await rename(tmp, file)
  return { ok: true, backupPath: backupPath && tilde(backupPath) }
}

/**
 * Write the palette now from an image the user picks, with a matugen config
 * that holds only Polaris's template, so their other matugen themes are not
 * regenerated.
 */
const generateFromPickedImage = async (event: Electron.IpcMainInvokeEvent): Promise<boolean> => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const options: Electron.OpenDialogOptions = {
    title: 'Pick your wallpaper',
    defaultPath: app.getPath('pictures'),
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }]
  }
  const picked = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (picked.canceled || !picked.filePaths[0]) return false
  const dir = await mkdtemp(join(tmpdir(), 'polaris-matugen-'))
  try {
    const cfg = join(dir, 'config.toml')
    await writeFile(
      cfg,
      `[config]\n\n[templates.polaris]\ninput_path = '${templatePath()}'\noutput_path = '${matugenOutputPath()}'\n`
    )
    await exec(
      'matugen',
      [
        'image',
        picked.filePaths[0],
        '-c',
        cfg,
        // no terminal to ask which colour: take the most vivid one
        '--prefer',
        'saturation',
        '-q'
      ],
      { timeout: 30_000 }
    )
    return true
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export function registerMatugenSetupIpc(): void {
  ipcMain.handle('theme:setup', () => status())
  ipcMain.handle('theme:addMatugenTemplate', () => addTemplate())
  ipcMain.handle('theme:generateFromImage', (event) => generateFromPickedImage(event))
}

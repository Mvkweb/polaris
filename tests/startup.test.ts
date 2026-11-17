import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { resolveStartupLocation } from '../src/main/startup'

describe('startup folder', () => {
  let scratch: string
  let home: string
  let launchDir: string
  let last: string
  let requested: string
  let file: string

  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'polaris-startup-'))
    home = join(scratch, 'home')
    launchDir = join(scratch, 'launch')
    last = join(scratch, 'last')
    requested = join(scratch, 'requested')
    await Promise.all([home, launchDir, last, requested].map((dir) => mkdir(dir)))
    file = join(requested, 'note.txt')
    await writeFile(file, 'Startup fixture')
  })

  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true })
  })

  const context = () => ({ home, launchDir, defaultDir: home, requested: null })

  test('first installed launch uses Home', async () => {
    expect(await resolveStartupLocation(context(), 'last', null)).toEqual({
      dir: home,
      reveal: null
    })
  })

  test('first checkout launch uses its working directory', async () => {
    expect(
      await resolveStartupLocation({ ...context(), defaultDir: launchDir }, 'last', null)
    ).toEqual({ dir: launchDir, reveal: null })
  })

  test('Last folder restores the remembered location', async () => {
    expect(await resolveStartupLocation(context(), 'last', last)).toEqual({
      dir: last,
      reveal: null
    })
  })

  test('Home ignores the remembered location', async () => {
    expect(await resolveStartupLocation(context(), 'home', last)).toEqual({
      dir: home,
      reveal: null
    })
  })

  test('Launch folder uses the working directory', async () => {
    expect(await resolveStartupLocation(context(), 'workspace', last)).toEqual({
      dir: launchDir,
      reveal: null
    })
  })

  test.each(['last', 'home', 'workspace'] as const)(
    'explicit folder overrides %s',
    async (mode) => {
      expect(
        await resolveStartupLocation(
          { ...context(), requested: { dir: requested, reveal: null } },
          mode,
          last
        )
      ).toEqual({ dir: requested, reveal: null })
    }
  )

  test('explicit file preserves its selection', async () => {
    expect(
      await resolveStartupLocation(
        { ...context(), requested: { dir: requested, reveal: file } },
        'home',
        last
      )
    ).toEqual({ dir: requested, reveal: file })
  })

  test('missing remembered folder falls back to Home', async () => {
    expect(await resolveStartupLocation(context(), 'last', join(scratch, 'missing'))).toEqual({
      dir: home,
      reveal: null
    })
  })

  test('a remembered file is not treated as a folder', async () => {
    expect(await resolveStartupLocation(context(), 'last', file)).toEqual({
      dir: home,
      reveal: null
    })
  })

  test('relative profile values cannot redirect startup', async () => {
    expect(await resolveStartupLocation(context(), 'last', '.')).toEqual({
      dir: home,
      reveal: null
    })
  })

  test('directory symlinks remain usable', async () => {
    const link = join(scratch, 'linked-folder')
    await symlink(last, link)
    expect(await resolveStartupLocation(context(), 'last', link)).toEqual({
      dir: link,
      reveal: null
    })
  })

  test('inaccessible folder falls back to Home', async () => {
    const denied = join(scratch, 'denied')
    await mkdir(denied, { mode: 0o000 })
    try {
      expect(await resolveStartupLocation(context(), 'last', denied)).toEqual({
        dir: home,
        reveal: null
      })
    } finally {
      await chmod(denied, 0o700)
    }
  })

  test('a disappeared explicit folder clears its file selection', async () => {
    expect(
      await resolveStartupLocation(
        { ...context(), requested: { dir: join(scratch, 'gone'), reveal: file } },
        'last',
        last
      )
    ).toEqual({ dir: home, reveal: null })
  })
})

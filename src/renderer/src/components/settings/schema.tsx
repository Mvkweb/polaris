import type { JSX } from 'solid-js'
import {
  MONODRIVE_ACCENTS,
  defaultTerminal,
  explorerMode,
  foldersFirst,
  selectedAccentColor,
  setDefaultTerminal,
  setExplorerMode,
  setFoldersFirst,
  setSelectedAccentColor,
  setShowHiddenFiles,
  setUpdateTrack,
  showEditor,
  showHiddenFiles,
  updateTrack,
  wallpaperSync,
  setWallpaperSync,
  closeSettingsModal,
  type SettingsPage
} from '../../store'
import { setTasksPanelOpen, uploadServices } from '../../tasks'
import { prefs, setPref, type Prefs } from './prefs'
import { KeyboardPage } from './pages/KeyboardPage'
import { AboutPanel } from './AboutPanel'
import { IconSetPicker } from './IconSetPicker'
import { NightlyBackdrop } from './NightlyBackdrop'
import type { IconName } from '../ui/AppIcons'


interface TileBase {
  id: string
  title: string
  hint?: string
  /** true when the setting already drives the app; false = saved, feature in progress */
  live?: boolean
  wide?: boolean
  /** decorative layer behind the tile's content */
  backdrop?: () => JSX.Element
}
export type Tile =
  | (TileBase & { kind: 'toggle'; get: () => boolean; set: (v: boolean) => void })
  | (TileBase & {
      kind: 'choice'
      /** tabs (default) for 2–4 short options, grid for longer lists */
      layout?: 'tabs' | 'grid'
      options: () => { value: string; label: string; detail?: string }[]
      get: () => string
      set: (v: string) => void
    })
  | (TileBase & {
      kind: 'slider'
      min: number
      max: number
      step: number
      ticks?: boolean
      get: () => number
      set: (v: number) => void
      format: (v: number) => string
    })
  | (TileBase & {
      kind: 'swatches'
      colors: readonly { hex: string; label: string }[]
      get: () => string
      set: (v: string) => void
      disabled?: () => boolean
    })
  | (TileBase & { kind: 'action'; label: string; run: () => void; tone?: 'danger' })
  | (TileBase & { kind: 'custom'; render: () => JSX.Element })

export interface HeroAction {
  label: string
  run: () => void
}

export interface PageDef {
  id: SettingsPage
  label: string
  icon: IconName
  hero: {
    eyebrow: () => string
    title: string
    blurb: string
    chips: () => string[]
    primary?: () => HeroAction
    secondary?: () => HeroAction
  }
  sections: { title: string; tiles: Tile[] }[]
  /** prefs owned by this page (Restore defaults) */
  prefKeys: (keyof Prefs)[]
}


/** Bind a tile to a persisted pref. Values come from the tile's own options/control. */
const pref = <K extends keyof Prefs>(k: K) => ({
  get: () => prefs[k] as never,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (v: any) => setPref(k, v as Prefs[K])
})
const opts =
  (...pairs: [string, string][]) =>
  () =>
    pairs.map(([value, label]) => ({ value, label }))


export const PAGES: PageDef[] = [
  {
    id: 'General',
    label: 'General',
    icon: 'settings',
    hero: {
      eyebrow: () => 'Polaris',
      title: 'General',
      blurb: 'How Polaris starts, what it opens with, and which tools it hands off to.',
      chips: () => [
        prefs.startupFolder === 'last'
          ? 'Reopens last folder'
          : prefs.startupFolder === 'home'
            ? 'Starts in Home'
            : 'Starts in launch folder',
        defaultTerminal() === 'Terminal' ? 'Built-in terminal' : `Opens ${defaultTerminal()}`,
        `${updateTrack()} channel`
      ]
    },
    sections: [
      {
        title: 'Startup',
        tiles: [
          {
            kind: 'choice',
            id: 'startup',
            title: 'Open on launch',
            hint: 'Last active tab, Home, or the folder Polaris was launched from',
            options: opts(['last', 'Last folder'], ['home', 'Home'], ['workspace', 'Launch folder']),
            ...pref('startupFolder'),
            wide: true
          },
          {
            kind: 'toggle',
            id: 'confirm-trash',
            title: 'Confirm before trash',
            hint: 'Ask before moving items to the trash',
            ...pref('confirmTrash')
          },
          {
            kind: 'choice',
            id: 'updates',
            title: 'Updates',
            hint: 'Release channel',
            backdrop: () => <NightlyBackdrop active={updateTrack() === 'Nightly'} />,
            options: opts(['Stable', 'Stable'], ['Nightly', 'Nightly']),
            get: updateTrack,
            set: (v) => setUpdateTrack(v as 'Stable' | 'Nightly')
          }
        ]
      },
      {
        title: 'Hand-offs',
        tiles: [
          {
            kind: 'choice',
            id: 'terminal',
            title: 'External terminal',
            hint: '“Open in terminal” launches this',
            options: opts(
              ['Terminal', 'Built-in'],
              ['Ghostty', 'Ghostty'],
              ['Kitty', 'Kitty'],
              ['Alacritty', 'Alacritty']
            ),
            get: defaultTerminal,
            set: (v) => setDefaultTerminal(v as 'Terminal'),
            wide: true
          }
        ]
      }
    ],
    prefKeys: ['startupFolder', 'confirmTrash']
  },
  {
    id: 'Appearance',
    label: 'Appearance',
    icon: 'palette',
    hero: {
      eyebrow: () => (wallpaperSync() ? 'Synced with wallpaper' : 'Manual accent'),
      title: 'Appearance',
      blurb: 'Dark by design. Colour comes from your wallpaper, or an accent you pick.',
      chips: () => [
        wallpaperSync() ? 'Wallpaper palette' : 'Custom accent',
        prefs.syntaxFromWallpaper ? 'Syntax follows wallpaper' : 'Classic syntax',
        prefs.uiIcons === 'dinkie' ? 'Dinkie pixel icons' : 'Solar icons'
      ],
      primary: () => ({
        label: wallpaperSync() ? 'Use my accent' : 'Sync with wallpaper',
        run: () => setWallpaperSync(!wallpaperSync())
      })
    },
    sections: [
      {
        title: 'Colour',
        tiles: [
          {
            kind: 'toggle',
            id: 'wallpaper',
            title: 'Sync with wallpaper',
            hint: 'Accent, glows and folders follow matugen/dithergen',
            get: wallpaperSync,
            set: setWallpaperSync,
            live: true
          },
          {
            kind: 'toggle',
            id: 'syntax',
            title: 'Wallpaper syntax',
            hint: 'Code colours orbit the wallpaper hue',
            ...pref('syntaxFromWallpaper')
          },
          {
            kind: 'swatches',
            id: 'accent',
            title: 'Accent',
            hint: 'Used when wallpaper sync is off',
            colors: MONODRIVE_ACCENTS,
            get: selectedAccentColor,
            set: setSelectedAccentColor,
            disabled: wallpaperSync,
            live: true,
            wide: true
          }
        ]
      },
      {
        title: 'Texture & motion',
        tiles: [
          {
            kind: 'custom',
            id: 'ui-icons',
            title: 'Interface icons',
            live: true,
            render: () => <IconSetPicker />,
            wide: true
          },
          {
            kind: 'choice',
            id: 'icons',
            title: 'File icons',
            hint: 'Icon pack for tree, tabs and search',
            options: opts(['pierre', 'Pierre'], ['jetbrains', 'JetBrains']),
            ...pref('iconPack')
          },
          {
            kind: 'toggle',
            id: 'motion',
            title: 'Reduce motion',
            hint: 'Swap slides and morphs for fades',
            ...pref('reduceMotion')
          },
          {
            kind: 'slider',
            id: 'density',
            title: 'Dither density',
            hint: 'How busy backgrounds and loaders look',
            min: 0,
            max: 100,
            step: 1,
            format: (v) => `${v}%`,
            ...pref('ditherDensity'),
            wide: true
          }
        ]
      }
    ],
    prefKeys: ['syntaxFromWallpaper', 'iconPack', 'uiIcons', 'reduceMotion', 'ditherDensity']
  },
  {
    id: 'Editor',
    label: 'Editor',
    icon: 'code',
    hero: {
      eyebrow: () => 'CodeMirror · Zed-style',
      title: 'Editor',
      blurb: 'Type, guides and the little things that make code feel calm.',
      chips: () => [
        `${prefs.fontSize}px`,
        `Tab ${prefs.tabSize}`,
        `Whitespace: ${prefs.whitespace}`,
        prefs.cursorTrail ? 'Cursor trail' : 'Plain cursor'
      ],
      primary: () => ({
        label: 'Open editor',
        run: () => {
          closeSettingsModal()
          showEditor()
        }
      })
    },
    sections: [
      {
        title: 'Text',
        tiles: [
          {
            kind: 'slider',
            id: 'font',
            title: 'Font size',
            min: 10,
            max: 20,
            step: 1,
            ticks: true,
            format: (v) => `${v}px`,
            ...pref('fontSize'),
            wide: true
          },
          {
            kind: 'choice',
            id: 'tab',
            title: 'Tab size',
            options: opts(['2', '2'], ['4', '4']),
            ...pref('tabSize')
          },
          {
            kind: 'toggle',
            id: 'format',
            title: 'Format on save',
            hint: 'Run the project formatter',
            ...pref('formatOnSave')
          }
        ]
      },
      {
        title: 'Guides',
        tiles: [
          {
            kind: 'choice',
            id: 'ws',
            title: 'Show whitespace',
            hint: 'Dots for spaces, arrows for tabs',
            options: opts(
              ['selection', 'Selection'],
              ['boundary', 'Boundary'],
              ['all', 'All'],
              ['none', 'None']
            ),
            ...pref('whitespace'),
            wide: true
          },
          {
            kind: 'toggle',
            id: 'guides',
            title: 'Indent guides',
            hint: 'Active scope lights up',
            ...pref('indentGuides')
          },
          {
            kind: 'toggle',
            id: 'trail',
            title: 'Cursor trail',
            hint: 'Zed-style smear while moving',
            ...pref('cursorTrail')
          }
        ]
      }
    ],
    prefKeys: ['fontSize', 'tabSize', 'formatOnSave', 'whitespace', 'indentGuides', 'cursorTrail']
  },
  {
    id: 'Files',
    label: 'Files',
    icon: 'folder',
    hero: {
      eyebrow: () => (explorerMode() === 'tree' ? 'Tree sidebar' : 'Places sidebar'),
      title: 'Files',
      blurb: 'How folders are listed, sorted and decorated across the browser and tree.',
      chips: () => [
        showHiddenFiles() ? 'Hidden files shown' : 'Hidden files hidden',
        foldersFirst() ? 'Folders first' : 'Mixed order',
        prefs.folderLogos ? 'Project logos' : 'Plain folders',
        prefs.editableFiles === 'polaris' ? 'Text opens in Polaris' : 'Text opens in default app'
      ],
      primary: () => ({
        label: explorerMode() === 'tree' ? 'Show places' : 'Show file tree',
        run: () => setExplorerMode(explorerMode() === 'tree' ? 'places' : 'tree')
      })
    },
    sections: [
      {
        title: 'Listing',
        tiles: [
          {
            kind: 'choice',
            id: 'sidebar',
            title: 'Sidebar',
            hint: 'Places & devices, or the workspace tree',
            options: opts(['places', 'Places'], ['tree', 'Tree']),
            get: explorerMode,
            set: (v) => setExplorerMode(v as 'places' | 'tree'),
            live: true
          },
          {
            kind: 'toggle',
            id: 'hidden',
            title: 'Hidden files',
            hint: 'Show dotfiles and dotfolders',
            get: showHiddenFiles,
            set: setShowHiddenFiles,
            live: true
          },
          {
            kind: 'toggle',
            id: 'folders-first',
            title: 'Folders first',
            hint: 'Group folders above files',
            get: foldersFirst,
            set: setFoldersFirst
          },
          {
            kind: 'toggle',
            id: 'logos',
            title: 'Project logos',
            hint: 'Favicons and logos as folder icons',
            ...pref('folderLogos')
          },
          {
            kind: 'toggle',
            id: 'sizes',
            title: 'Folder sizes',
            hint: 'Compute sizes in the background',
            ...pref('folderSizes')
          },
          {
            kind: 'choice',
            id: 'editable-files',
            title: 'Text & code files',
            hint: 'Double-click target · Open With… sets single types',
            options: opts(['polaris', 'Polaris editor'], ['system', 'Default app']),
            ...pref('editableFiles')
          }
        ]
      }
    ],
    prefKeys: ['folderLogos', 'folderSizes', 'editableFiles', 'fileTypeApps']
  },
  {
    id: 'Media',
    label: 'Media',
    icon: 'media',
    hero: {
      eyebrow: () => 'Viewer · Studio',
      title: 'Media',
      blurb: 'Defaults for the image studio and how videos behave when you open them.',
      chips: () => [
        `Exports ${prefs.defaultExport.toUpperCase()}`,
        `Quality ${prefs.exportQuality}`,
        prefs.autoplayVideo ? 'Autoplay' : 'Click to play'
      ]
    },
    sections: [
      {
        title: 'Studio',
        tiles: [
          {
            kind: 'choice',
            id: 'export',
            title: 'Default format',
            hint: 'Studio opens with this',
            options: opts(['webp', 'WebP'], ['png', 'PNG'], ['jpg', 'JPEG'], ['gif', 'GIF']),
            ...pref('defaultExport'),
            wide: true
          },
          {
            kind: 'slider',
            id: 'quality',
            title: 'Default quality',
            min: 30,
            max: 100,
            step: 1,
            format: (v) => `${v}`,
            ...pref('exportQuality'),
            wide: true
          }
        ]
      },
      {
        title: 'Playback',
        tiles: [
          {
            kind: 'toggle',
            id: 'autoplay',
            title: 'Autoplay video',
            hint: 'Start playing when opened',
            ...pref('autoplayVideo')
          },
          {
            kind: 'toggle',
            id: 'loop',
            title: 'Loop short clips',
            hint: 'Under 30 seconds',
            ...pref('loopShortClips')
          }
        ]
      }
    ],
    prefKeys: ['defaultExport', 'exportQuality', 'autoplayVideo', 'loopShortClips']
  },
  {
    id: 'Uploads',
    label: 'Uploads',
    icon: 'upload',
    hero: {
      eyebrow: () => 'Upload to…',
      title: 'Uploads',
      blurb: 'Anonymous hosts for quick shares. Links land on your clipboard.',
      chips: () => {
        const svc = uploadServices().find((s) => s.id === prefs.defaultUpload)
        return [
          svc ? `${svc.name} · ${svc.retention}` : 'No default host',
          prefs.copyLinkOnUpload ? 'Copies link' : 'Link not copied',
          prefs.keepUploadHistory ? 'History kept' : 'No history'
        ]
      },
      primary: () => ({
        label: 'Open tasks',
        run: () => {
          closeSettingsModal()
          setTasksPanelOpen(true)
        }
      })
    },
    sections: [
      {
        title: 'Defaults',
        tiles: [
          {
            kind: 'choice',
            id: 'host',
            title: 'Default host',
            hint: 'Used by the quick upload shortcut',
            layout: 'grid',
            options: () =>
              uploadServices().map((s) => ({ value: s.id, label: s.name, detail: s.retention })),
            ...pref('defaultUpload'),
            wide: true
          },
          {
            kind: 'toggle',
            id: 'copy',
            title: 'Copy link when done',
            ...pref('copyLinkOnUpload')
          },
          {
            kind: 'toggle',
            id: 'history',
            title: 'Keep history',
            hint: 'Shown in the Tasks drawer',
            ...pref('keepUploadHistory')
          },
          {
            kind: 'action',
            id: 'clear',
            title: 'Upload history',
            hint: 'Removes finished uploads (links keep working)',
            label: 'Clear history',
            run: () => void window.api.clearTasks(),
            tone: 'danger',
            live: true,
            wide: true
          }
        ]
      }
    ],
    prefKeys: ['defaultUpload', 'copyLinkOnUpload', 'keepUploadHistory']
  },
  {
    id: 'Keyboard',
    label: 'Keyboard',
    icon: 'keyboard',
    hero: {
      eyebrow: () => 'Shortcuts',
      title: 'Keyboard',
      blurb: 'Every shortcut in one place. Ctrl+E flips between your files and the editor.',
      chips: () => ['Ctrl+P open', 'Ctrl+E files / editor', 'Space details']
    },
    sections: [
      {
        title: '',
        tiles: [
          { kind: 'custom', id: 'keys', title: '', render: () => <KeyboardPage />, wide: true }
        ]
      }
    ],
    prefKeys: []
  },
  {
    id: 'About',
    label: 'About',
    icon: 'info',
    hero: {
      eyebrow: () => 'Polaris',
      title: 'About',
      blurb: 'A fast, dithered file manager and editor for Linux, built on a Zig core.',
      chips: () => ['Electron', 'SolidJS', 'Zig 0.17']
    },
    sections: [
      {
        title: '',
        tiles: [
          { kind: 'custom', id: 'about', title: '', render: () => <AboutPanel />, wide: true }
        ]
      }
    ],
    prefKeys: []
  }
]

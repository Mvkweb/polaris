import { Component, createEffect, onCleanup, onMount } from 'solid-js'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { updateTerminalProcess, workspaceRoot } from '../../store'
import { isMac, isModKey } from '../../shortcuts'

interface TerminalProps {
  sessionId: string
  visible: boolean
  onExit: () => void
  cwd?: string
}

function cleanTerminalTitle(rawTitle: string): string {
  let t = rawTitle.trim()
  if (!t) return ''

  // Common bash/ssh format: "user@host: ~/path" -> take folder name or "bash"
  if (t.includes('@') && t.includes(':')) {
    const afterColon = t.split(':')[1]?.trim()
    if (afterColon) {
      const parts = afterColon.split('/').filter(Boolean)
      const folder = parts[parts.length - 1]
      return folder || 'bash'
    }
    return 'bash'
  }

  // Common fish format: "command ~/path" or "fish ~/path"
  if (t.includes(' ~/')) {
    t = t.split(' ~/')[0].trim()
  } else if (t.includes(' /')) {
    t = t.split(' /')[0].trim()
  }

  // Title with dash: "bun run dev - ember-ide"
  if (t.includes(' - ')) {
    t = t.split(' - ')[0].trim()
  }
  // Title with parens: "bun (ember-ide)"
  if (t.includes(' (')) {
    t = t.split(' (')[0].trim()
  }

  // If path like "/usr/bin/fish"
  if (t.startsWith('/') || t.startsWith('./')) {
    const parts = t.split('/')
    t = parts[parts.length - 1]
  }

  // If the title is just the current directory name (e.g. "Ember", "ember-ide", "~"):
  // it means the shell is at the idle prompt, so display the shell name
  const root = workspaceRoot()
  const rootName = root ? root.split('/').at(-1) || '' : ''
  if (
    t === '~' ||
    (rootName && t.toLowerCase() === rootName.toLowerCase()) ||
    t.toLowerCase() === 'ember' ||
    t.toLowerCase() === 'ember-ide'
  ) {
    return 'fish'
  }

  // Max 24 chars to keep tab cleanly readable
  return t.slice(0, 24)
}

const MIN_FIT_HEIGHT = 80

const XTERM_THEME = {
  background: '#050505',
  foreground: '#e6edf3',
  cursor: '#e6edf3',
  cursorAccent: '#050505',
  selectionBackground: 'rgba(255, 255, 255, 0.2)',
  black: '#1c1c1c',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e6edf3',
  brightBlack: '#6b7280',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#ffffff'
}

const Terminal: Component<TerminalProps> = (props) => {
  let containerRef: HTMLDivElement | undefined = undefined
  let term: XTerm | undefined = undefined
  let fit: FitAddon | undefined = undefined
  let terminalId: number | undefined = undefined

  let shellStarted = false
  let disposed = false
  let lastCols = 0
  let lastRows = 0

  const startShell = (): void => {
    if (shellStarted || !term) return
    shellStarted = true
    const currentTerm = term

    window.api
      .terminalCreate(props.cwd || workspaceRoot() || undefined, currentTerm.cols, currentTerm.rows)
      .then((id) => {
        if (disposed) {
          window.api.terminalKill(id)
          return
        }
        terminalId = id
        // The panel may have been resized while the shell was starting
        window.api.terminalResize(id, currentTerm.cols, currentTerm.rows)
      })
      .catch((err) => {
        currentTerm.write(`\r\nFailed to start shell: ${String(err)}\r\n`)
      })
  }

  const fitToContainer = (): void => {
    // Only fit when visible and container is at full height; avoid collapsing grid during slide transitions
    if (!props.visible || !term || !fit || !containerRef || containerRef.clientWidth === 0) return
    if (containerRef.clientHeight < MIN_FIT_HEIGHT) return
    fit.fit()

    const sizeChanged = term.cols !== lastCols || term.rows !== lastRows
    lastCols = term.cols
    lastRows = term.rows

    if (terminalId !== undefined) {
      // The panel is height-animated; only notify the shell when the grid actually changed
      if (sizeChanged) window.api.terminalResize(terminalId, term.cols, term.rows)
    } else {
      // Start the shell at the real size so the prompt is not drawn at a stale width
      startShell()
    }
  }

  onMount(() => {
    if (!containerRef) return

    term = new XTerm({
      allowTransparency: true,
      theme: XTERM_THEME,
      fontFamily:
        "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Symbols Nerd Font Mono', 'Symbols Nerd Font', 'Fira Code', 'Cascadia Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.3,
      cursorStyle: 'block',
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000
    })

    // Strictly block background color changes (OSC 11 / 111) so external scripts (e.g. matugen, pywal)
    // cannot change Ember's background surface, while allowing full palette colors (OSC 4 / 10 / 12)
    const blockedOscCodes = [11, 111]
    const oscDisposables = blockedOscCodes.map((code) =>
      term!.parser.registerOscHandler(code, (data) => data !== '?')
    )

    fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef)

    // Let the panel toggle shortcut, word editing, and clipboard keys through
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true
      if (isModKey(e) && e.key === '`') return false

      const isCopy = isMac()
        ? e.metaKey && e.key.toLowerCase() === 'c'
        : e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c'
      if (isCopy && term?.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection())
        return false
      }

      const isPaste = isMac()
        ? e.metaKey && e.key.toLowerCase() === 'v'
        : (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') ||
          (e.ctrlKey && e.key.toLowerCase() === 'v')
      if (isPaste) {
        navigator.clipboard.readText().then((text) => {
          if (text && terminalId !== undefined) {
            window.api.terminalWrite(terminalId, text)
          }
        })
        return false
      }

      // Word-level deletion: Ctrl+Backspace deletes previous word (\x17 / Ctrl+W)
      if ((e.ctrlKey && e.key === 'Backspace') || (isMac() && e.altKey && e.key === 'Backspace')) {
        if (terminalId !== undefined) {
          window.api.terminalWrite(terminalId, '\x17')
        }
        return false
      }

      // Forward word deletion: Ctrl+Delete deletes next word (\x1bd / Alt+D)
      if (
        (e.ctrlKey && (e.key === 'Delete' || e.key === 'Del')) ||
        (isMac() && e.altKey && (e.key === 'Delete' || e.key === 'Del'))
      ) {
        if (terminalId !== undefined) {
          window.api.terminalWrite(terminalId, '\x1bd')
        }
        return false
      }

      return true
    })

    const currentTerm = term
    let inputBuffer = ''
    const dataDisposable = currentTerm.onData((data) => {
      if (terminalId !== undefined) window.api.terminalWrite(terminalId, data)

      // Track entered commands to immediately reflect active/last-ran task on the tab
      if (data.includes('\r') || data.includes('\n')) {
        const cmd = inputBuffer.trim()
        if (cmd) {
          const firstCmd = cmd.split('|')[0].trim().split(';')[0].trim()
          if (firstCmd) {
            updateTerminalProcess(props.sessionId, firstCmd.slice(0, 24))
          }
        }
        inputBuffer = ''
      } else if (data === '\x7f' || data === '\b') {
        inputBuffer = inputBuffer.slice(0, -1)
      } else if (data === '\x15' || data === '\x03') {
        inputBuffer = ''
      } else if (data.length === 1 && data >= ' ') {
        if (inputBuffer.length < 80) inputBuffer += data
      }
    })

    // Listen to shell title changes (OSC 0 / OSC 2) for running processes
    const titleDisposable = currentTerm.onTitleChange((title) => {
      const cleaned = cleanTerminalTitle(title)
      if (cleaned) {
        updateTerminalProcess(props.sessionId, cleaned)
      }
    })

    const unsubscribeData = window.api.onTerminalData((id, data) => {
      if (id === terminalId) currentTerm.write(data)
    })
    const unsubscribeExit = window.api.onTerminalExit((id) => {
      if (id !== terminalId) return
      terminalId = undefined
      props.onExit()
    })

    const observer = new ResizeObserver(() => fitToContainer())
    observer.observe(containerRef)
    requestAnimationFrame(fitToContainer)

    onCleanup(() => {
      disposed = true
      for (const d of oscDisposables) d.dispose()
      observer.disconnect()
      dataDisposable.dispose()
      titleDisposable.dispose()
      unsubscribeData()
      unsubscribeExit()
      if (terminalId !== undefined) window.api.terminalKill(terminalId)
      currentTerm.dispose()
      term = undefined
    })
  })

  // Fit and focus whenever the panel or tab becomes visible
  createEffect(() => {
    if (!props.visible) return
    requestAnimationFrame(() => {
      fitToContainer()
      term?.focus()
    })
  })

  return (
    <div
      ref={(el) => (containerRef = el)}
      class="ember-terminal h-full w-full px-4 pt-2 bg-[#050505]"
    />
  )
}

export default Terminal

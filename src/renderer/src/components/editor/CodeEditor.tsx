import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show
} from 'solid-js'
import { EditorState, Text } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab
} from '@codemirror/commands'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput
} from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap
} from '@codemirror/autocomplete'

import {
  getCachedFileContent,
  setCachedFileContent,
  getInitialDocContent,
  setInitialDocContent,
  markFileDirty,
  saveFile,
  targetEditorLocation,
  setTargetEditorLocation
} from '../../store'
import { ditherSyntaxTheme } from './theme'
import { smoothCursorExtension } from './smoothCursor'
import { detectLanguage } from './languages'

interface CodeEditorProps {
  path: string
  onCursorChange?: (line: number, col: number) => void
}

export const CodeEditor: Component<CodeEditorProps> = (props) => {
  let containerRef: HTMLDivElement | undefined
  let editorView: EditorView | null = null
  let mountedPath: string | null = null
  let cacheTimer: number | undefined
  let initialDoc: Text | null = null

  const [isLoading, setIsLoading] = createSignal(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)

  /** Serializing the document is O(n); do it on a trailing edge, never per keystroke. */
  const scheduleCacheFlush = (filePath: string): void => {
    if (cacheTimer) window.clearTimeout(cacheTimer)
    cacheTimer = window.setTimeout(() => {
      cacheTimer = undefined
      if (editorView) setCachedFileContent(filePath, editorView.state.doc.toString())
    }, 180)
  }

  const flushCache = (): void => {
    if (cacheTimer) {
      window.clearTimeout(cacheTimer)
      cacheTimer = undefined
    }
    if (editorView && mountedPath) {
      setCachedFileContent(mountedPath, editorView.state.doc.toString())
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!editorView || !props.path) return
    const text = editorView.state.doc.toString()
    await saveFile(props.path, text)
  }

  const initEditor = async (filePath: string): Promise<void> => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      let content = getCachedFileContent(filePath)
      if (content === undefined) {
        if (window.api?.readFile) {
          content = await window.api.readFile(filePath)
          setCachedFileContent(filePath, content)
          setInitialDocContent(filePath, content)
        } else {
          content = ''
        }
      }

      if (!containerRef) return

      // Preserve the outgoing document before tearing the view down.
      flushCache()

      // Clean up previous view instance if present
      if (editorView) {
        editorView.destroy()
        editorView = null
      }

      const originalContent = getInitialDocContent(filePath) ?? content
      setInitialDocContent(filePath, originalContent)
      initialDoc = Text.of(originalContent.split('\n'))

      const langInfo = detectLanguage(filePath)

      const saveKeymap = keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            handleSave()
            return true
          }
        }
      ])

      const cursorListener = EditorView.updateListener.of((update) => {
        if ((update.selectionSet || update.docChanged) && props.onCursorChange) {
          const head = update.state.selection.main.head
          const line = update.state.doc.lineAt(head)
          props.onCursorChange(line.number, head - line.from + 1)
        }

        if (update.docChanged) {
          // Compare rope structure instead of materializing the whole file.
          const doc = update.state.doc
          const original = initialDoc
          const dirty = !original || doc.length !== original.length || !doc.eq(original)
          markFileDirty(filePath, dirty)
          scheduleCacheFlush(filePath)
        }
      })

      const state = EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          saveKeymap,
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            indentWithTab
          ]),
          langInfo.extension(),
          ditherSyntaxTheme,
          smoothCursorExtension,
          cursorListener,
          EditorView.domEventHandlers({
            dragstart: (e) => {
              e.preventDefault()
              return true
            }
          }),
          EditorView.contentAttributes.of({
            spellcheck: 'false',
            autocorrect: 'off',
            autocapitalize: 'off',
            translate: 'no',
            draggable: 'false'
          }),
          EditorView.lineWrapping
        ]
      })

      editorView = new EditorView({
        state,
        parent: containerRef
      })
      mountedPath = filePath

      // Check if there is a target location to scroll to (e.g. line jump)
      const targetLoc = targetEditorLocation()
      if (targetLoc && targetLoc.path === filePath) {
        const line = editorView.state.doc.line(
          Math.min(targetLoc.line, editorView.state.doc.lines)
        )
        const pos = Math.min(line.from + ((targetLoc.column || 1) - 1), line.to)
        editorView.dispatch({
          selection: { anchor: pos },
          scrollIntoView: true
        })
        setTargetEditorLocation(null)
      }

      setIsLoading(false)
      editorView.focus()
    } catch (err: any) {
      console.error('Failed to load file into editor:', err)
      setErrorMessage(err?.message || 'Failed to read file')
      setIsLoading(false)
    }
  }

  createEffect(() => {
    const current = props.path
    if (current) {
      initEditor(current)
    }
  })

  // ResizeObserver to ensure CodeMirror measures accurately during layout shifts
  onMount(() => {
    if (!containerRef) return
    const ro = new ResizeObserver(() => {
      if (editorView) {
        editorView.requestMeasure()
      }
    })
    ro.observe(containerRef)

    onCleanup(() => {
      ro.disconnect()
      flushCache()
      if (editorView) {
        editorView.destroy()
        editorView = null
        mountedPath = null
      }
    })
  })

  return (
    <div class="relative w-full h-full flex flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Loading state indicator */}
      <Show when={isLoading()}>
        <div class="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-[2px]">
          <div class="flex items-center gap-2.5 text-xs text-white/50">
            <div class="w-3.5 h-3.5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            <span>Loading file...</span>
          </div>
        </div>
      </Show>

      {/* Error state */}
      <Show when={errorMessage()}>
        {(msg) => (
          <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
            <span class="text-rose-400 font-medium text-sm mb-1">Unable to open file</span>
            <span class="text-white/40 text-xs max-w-md">{msg()}</span>
          </div>
        )}
      </Show>

      {/* Editor mounting container */}
      <div ref={(el) => (containerRef = el)} class="flex-1 w-full h-full overflow-hidden" />
    </div>
  )
}

export default CodeEditor

/**
 * Thin wrapper around CodeMirror 6 (via @uiw/react-codemirror).
 *
 * Why CodeMirror over Monaco: ~10x smaller, no worker plumbing in Vite,
 * good keyboard accessibility (Escape then Tab leaves the editor), and TSX +
 * JSON support out of the box. See docs/DECISIONS.md.
 */
import { useMemo } from 'react'
import CodeMirror, { EditorView, type Extension } from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { linter, lintGutter } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { cn } from '@/lib/utils'

export type EditorLanguage = 'tsx' | 'json' | 'html'

const languageExtensions: Record<EditorLanguage, () => Extension[]> = {
  tsx: () => [javascript({ jsx: true, typescript: true })],
  // jsonParseLinter underlines the exact character where JSON.parse fails.
  json: () => [json(), linter(jsonParseLinter()), lintGutter()],
  html: () => [html()],
}

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language: EditorLanguage
  /** Accessible name announced by screen readers. */
  label: string
  readOnly?: boolean
  className?: string
}

export function CodeEditor({
  value,
  onChange,
  language,
  label,
  readOnly = false,
  className,
}: CodeEditorProps) {
  const extensions = useMemo<Extension[]>(
    () => [
      ...languageExtensions[language](),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': label }),
    ],
    [language, label],
  )

  return (
    <div className={cn('studio-editor bg-editor h-full min-h-0', className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={oneDark}
        readOnly={readOnly}
        editable={!readOnly}
        height="100%"
        indentWithTab
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          autocompletion: false,
          tabSize: 2,
        }}
      />
    </div>
  )
}

'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Vimeo, vimeoEmbedSrc } from './vimeo'

const TLACITKO =
  'rounded-md px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-40'
const TLACITKO_AKTIVNI = 'bg-zinc-900 text-white hover:bg-zinc-700'

export function WysiwygEditor({
  vychozi,
  onChange,
}: {
  vychozi: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, defaultProtocol: 'https' },
      }),
      Vimeo,
    ],
    content: vychozi,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class:
          'prose prose-zinc max-w-none min-h-[260px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) {
    return (
      <div className="mt-1 min-h-[300px] animate-pulse rounded-lg border border-zinc-300 bg-zinc-50" />
    )
  }

  function nastavOdkaz() {
    if (!editor) return
    const soucasny = (editor.getAttributes('link').href as string | undefined) ?? ''
    const url = window.prompt('Adresa odkazu (prázdné = odebrat odkaz):', soucasny)
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  function vlozVimeoVideo() {
    if (!editor) return
    const url = window.prompt('Vložte odkaz na Vimeo video (např. https://vimeo.com/123456789):')
    if (!url) return
    const src = vimeoEmbedSrc(url)
    if (!src) {
      window.alert('Tohle nevypadá jako Vimeo odkaz. Zkopírujte adresu videa z prohlížeče.')
      return
    }
    editor.chain().focus().vlozVimeo(src).run()
  }

  const b = (aktivni: boolean) => `${TLACITKO} ${aktivni ? TLACITKO_AKTIVNI : ''}`

  return (
    <div className="mt-1 rounded-lg border border-zinc-300 focus-within:border-zinc-500">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={b(editor.isActive('bold'))} title="Tučně">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={b(editor.isActive('italic'))} title="Kurzíva">
          <em>I</em>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={b(editor.isActive('underline'))} title="Podtržení">
          <u>U</u>
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={b(editor.isActive('heading', { level: 2 }))} title="Nadpis">
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={b(editor.isActive('heading', { level: 3 }))} title="Podnadpis">
          H3
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={b(editor.isActive('bulletList'))} title="Odrážky">
          • seznam
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={b(editor.isActive('orderedList'))} title="Číslovaný seznam">
          1. seznam
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={b(editor.isActive('blockquote'))} title="Citace">
          ❝
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <button type="button" onClick={nastavOdkaz} className={b(editor.isActive('link'))} title="Odkaz">
          🔗 odkaz
        </button>
        <button type="button" onClick={vlozVimeoVideo} className={TLACITKO} title="Vložit Vimeo video">
          ▶ Vimeo
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={TLACITKO} title="Zpět">
          ↺
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={TLACITKO} title="Vpřed">
          ↻
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

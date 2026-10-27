import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

type Props = { value: string; onChange: (html: string) => void; placeholder?: string; compact?: boolean };

const btn = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30";
const on = "bg-brand/15 text-brand";

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className={`${btn} ${active ? on : ""}`}>
      {children}
    </button>
  );
}
const Sep = () => <span aria-hidden className="mx-1 h-5 w-px bg-line" />;

function Toolbar({ editor }: { editor: Editor }) {
  // Re-render when the selection or formatting changes, so the active buttons stay right.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }), p: e.isActive("paragraph"),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"), link: e.isActive("link"),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }), right: e.isActive({ textAlign: "right" }), justify: e.isActive({ textAlign: "justify" }),
      inTable: e.isActive("table"), canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (https://…). Leave empty to remove.", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) return void c().unsetLink().run();
    c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }
  return (
    <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2/60 p-1.5">
      <Btn label="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}>↶</Btn>
      <Btn label="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}>↷</Btn>
      <Sep />
      <Btn label="Heading" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><b>H1</b></Btn>
      <Btn label="Sub-heading" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><b>H2</b></Btn>
      <Btn label="Normal text" active={s.p} onClick={() => c().setParagraph().run()}>¶</Btn>
      <Sep />
      <Btn label="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><b>B</b></Btn>
      <Btn label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><i>I</i></Btn>
      <Btn label="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><u>U</u></Btn>
      <Btn label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><s>S</s></Btn>
      <Btn label="Link" active={s.link} onClick={setLink}>🔗</Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.ul} onClick={() => c().toggleBulletList().run()}>•≡</Btn>
      <Btn label="Numbered list" active={s.ol} onClick={() => c().toggleOrderedList().run()}>1.≡</Btn>
      <Btn label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}>❝</Btn>
      <Btn label="Divider line" onClick={() => c().setHorizontalRule().run()}>―</Btn>
      <Sep />
      <Btn label="Align left" active={s.left} onClick={() => c().setTextAlign("left").run()}>⇤</Btn>
      <Btn label="Align centre" active={s.center} onClick={() => c().setTextAlign("center").run()}>↔</Btn>
      <Btn label="Align right" active={s.right} onClick={() => c().setTextAlign("right").run()}>⇥</Btn>
      <Btn label="Justify" active={s.justify} onClick={() => c().setTextAlign("justify").run()}>☰</Btn>
      <Sep />
      <Btn label="Insert table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦</Btn>
      {s.inTable && (
        <>
          <Btn label="Add row below" onClick={() => c().addRowAfter().run()}>+row</Btn>
          <Btn label="Add column right" onClick={() => c().addColumnAfter().run()}>+col</Btn>
          <Btn label="Delete row" onClick={() => c().deleteRow().run()}>−row</Btn>
          <Btn label="Delete column" onClick={() => c().deleteColumn().run()}>−col</Btn>
          <Btn label="Header row on or off" onClick={() => c().toggleHeaderRow().run()}>hdr</Btn>
          <Btn label="Merge or split cells" onClick={() => c().mergeOrSplit().run()}>⊞</Btn>
          <Btn label="Delete table" onClick={() => c().deleteTable().run()}>🗑</Btn>
        </>
      )}
      <Sep />
      <Btn label="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}>Tx</Btn>
    </div>
  );
}

/** A word-processor style editor for the proposal: headings, lists, tables, alignment and links. Saves clean HTML. */
export default function RichTextEditor({ value, onChange, placeholder, compact }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: placeholder ?? "Write the proposal here…" }),
    ],
    content: value,
    editorProps: { attributes: { class: `doc-rich ${compact ? "min-h-[7rem] max-h-[22rem]" : "min-h-[16rem] max-h-[34rem]"} overflow-y-auto px-4 py-3 text-sm focus:outline-none`, "aria-label": "Proposal text" } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });
  // The saved text arrives after the editor is on screen (editing an existing document), so put it in
  // when it changes from outside. Typing does not trigger this: then value already equals the content.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);
  if (!editor) return <div className="h-64 animate-pulse rounded-lg border border-line bg-surface" />;
  return (
    <div className="mt-1 overflow-hidden rounded-lg border border-line bg-bg focus-within:border-brand">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

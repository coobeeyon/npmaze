import { useState } from "react";

const SHORTCUTS: { keys: string; desc: string; context?: string }[] = [
  { keys: "Ctrl+Z", desc: "Undo wall edit", context: "Edit mode" },
  { keys: "Ctrl+Shift+Z / Ctrl+Y", desc: "Redo wall edit", context: "Edit mode" },
  { keys: "Scroll wheel", desc: "Zoom in/out" },
  { keys: "Click + drag", desc: "Pan the maze" },
  { keys: "Double-click", desc: "Reset zoom/pan" },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="shortcut-help">
      <button
        className="shortcut-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Keyboard Shortcuts {open ? "\u25B4" : "\u25BE"}
      </button>
      {open && (
        <ul className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="shortcut-item">
              <kbd className="shortcut-kbd">{s.keys}</kbd>
              <span className="shortcut-desc">
                {s.desc}
                {s.context && (
                  <span className="shortcut-context"> ({s.context})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

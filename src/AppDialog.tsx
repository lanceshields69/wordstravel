import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClose: () => void;
  title: string;
  byline?: string;
  initialFocus?: string;
};

export default function AppDialog({ children, onClose, title, byline, initialFocus }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog.open) return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]):not([type=hidden]):not(.suggest-honeypot), textarea:not([disabled])",
        ),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", trapFocus, true);
    document.body.style.overflow = "hidden";
    dialog.showModal();
    (initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : closeRef.current)?.focus();
    const frame = window.requestAnimationFrame(() => {
      dialog.classList.add("is-visible");
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer.current !== null) window.clearTimeout(timer.current);
      dialog.classList.remove("is-visible");
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trapFocus, true);
    };
  }, [initialFocus]);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    dialogRef.current?.classList.remove("is-visible");
    const finishClose = () => {
      dialogRef.current?.close();
      onClose();
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClose();
      return;
    }
    timer.current = window.setTimeout(finishClose, 180);
  };

  return (
    <dialog
      ref={dialogRef}
      className="about-dialog"
      aria-labelledby="app-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) requestClose();
      }}
    >
      <button
        ref={closeRef}
        className="about-dialog-close"
        type="button"
        onClick={requestClose}
        aria-label={`Close ${title}`}
      >
        ×
      </button>
      <h2 id="app-dialog-title">{title}</h2>
      {byline && <p className="about-byline">{byline}</p>}
      <div className="about-story">{children}</div>
    </dialog>
  );
}

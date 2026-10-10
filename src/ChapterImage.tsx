import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  chapterCropStyle,
  chapterImageDateLabel,
  chapterImageUrl,
  type ChapterImageRecord,
} from "./chapterImages";

export default function ChapterImage({ image }: { image: ChapterImageRecord }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [slot, setSlot] = useState({ width: 80, height: 100 });
  const [creditOpen, setCreditOpen] = useState(false);

  useLayoutEffect(() => {
    const element = slotRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width && height) setSlot({ width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (creditOpen && !dialog.open) dialog.showModal();
    if (!creditOpen && dialog.open) dialog.close();
  }, [creditOpen]);

  return (
    <div className="chapter-image-column">
      <div className="journey-card-illustration" ref={slotRef}>
        <img
          src={chapterImageUrl(image)}
          alt={image.alt_text || ""}
          loading="lazy"
          decoding="async"
          style={chapterCropStyle(image, slot.width, slot.height)}
        />
      </div>
      <button
        ref={triggerRef}
        className="image-credit-trigger chapter-image-credit-trigger"
        type="button"
        aria-haspopup="dialog"
        onClick={() => setCreditOpen(true)}
      >
        Image credit
      </button>
      <dialog
        ref={dialogRef}
        className="chapter-credit-dialog"
        aria-labelledby="chapter-credit-title"
        onClose={() => {
          setCreditOpen(false);
          triggerRef.current?.focus();
        }}
      >
        <button
          type="button"
          className="chapter-credit-close"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close image credit"
        >
          ×
        </button>
        <p className="chapter-credit-kicker">Chapter image credit</p>
        <h2 id="chapter-credit-title">{image.image_title || "Image credit"}</h2>
        <p>{image.image_caption}</p>
        <dl>
          <div><dt>Creator</dt><dd>{image.creator}</dd></div>
          <div><dt>Image date</dt><dd>{chapterImageDateLabel(image)}</dd></div>
          <div>
            <dt>Source</dt>
            <dd><a href={image.source_url} target="_blank" rel="noopener noreferrer">View original source ↗</a></dd>
          </div>
          <div>
            <dt>License</dt>
            <dd><a href={image.license_url} target="_blank" rel="noopener noreferrer">{image.license}</a></dd>
          </div>
        </dl>
        <p>{image.context_note}</p>
        <p className="chapter-credit-note">
          Displayed with a CSS portrait crop of the original image. The local source file is unchanged.
          {" "}{image.license_note}
        </p>
        <p className="chapter-credit-note">The image date describes the artwork or photograph, not the date of this word’s journey.</p>
      </dialog>
    </div>
  );
}

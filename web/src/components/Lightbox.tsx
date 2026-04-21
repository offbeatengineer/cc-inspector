import { useEffect } from "react";
import { useUI } from "../stores/ui";
import { X } from "lucide-react";

export function Lightbox() {
  const url = useUI((s) => s.lightboxUrl);
  const close = () => useUI.getState().setLightbox(null);
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url]);
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <img
        src={url}
        alt=""
        className="max-w-[95vw] max-h-[95vh] rounded shadow-xl"
      />
      <button
        onClick={close}
        className="absolute top-4 right-4 text-white/80 hover:text-white"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}

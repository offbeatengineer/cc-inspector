import { useUI } from "../../stores/ui";

export function ImageBlock({ url, mediaType }: { url: string; mediaType?: string }) {
  const setLightbox = useUI((s) => s.setLightbox);
  return (
    <button
      type="button"
      className="block max-w-full"
      onClick={() => setLightbox(url)}
      title="Click to enlarge"
    >
      <img
        src={url}
        alt={mediaType ?? "image"}
        loading="lazy"
        className="max-h-[360px] rounded border border-border bg-surface-2"
      />
    </button>
  );
}

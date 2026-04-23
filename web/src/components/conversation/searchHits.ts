import type { DisplayItem } from "./groupMessages";

// Text sources that get rendered through Markdown (the only component that
// inserts `.search-hit` spans). Tool calls accept `searchQuery` but don't
// currently highlight, so their text is excluded.
export function extractSearchableTexts(item: DisplayItem): string[] {
  const out: string[] = [];
  switch (item.kind) {
    case "user": {
      const blocks = item.message.message?.content ?? [];
      if (blocks.length === 0 && typeof item.message.content === "string") {
        out.push(item.message.content);
        break;
      }
      for (const b of blocks) {
        if (b.type === "text" && b.text) out.push(b.text);
      }
      break;
    }
    case "assistant": {
      const blocks = item.message.message?.content ?? [];
      for (const b of blocks) {
        if (b.type === "text" && b.text) out.push(b.text);
        else if (b.type === "thinking" && b.thinking) out.push(b.thinking);
      }
      break;
    }
    default:
      break;
  }
  return out;
}

export interface HitMap {
  perItem: number[];
  cumulative: number[]; // cumulative[i] = sum of perItem[0..i-1]
  total: number;
}

export function computeHitMap(items: DisplayItem[], query: string): HitMap {
  const perItem = new Array<number>(items.length).fill(0);
  const cumulative = new Array<number>(items.length).fill(0);
  const q = query.trim();
  if (q.length < 2) return { perItem, cumulative, total: 0 };
  const re = new RegExp(escapeRe(q), "gi");
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative[i] = total;
    const texts = extractSearchableTexts(items[i]);
    let n = 0;
    for (const t of texts) {
      re.lastIndex = 0;
      while (re.exec(t)) n++;
    }
    perItem[i] = n;
    total += n;
  }
  return { perItem, cumulative, total };
}

// Map a global hit index (0..total-1) to the item it lives in, and the
// sub-index within that item's matches.
export function locateHit(
  map: HitMap,
  globalIdx: number,
): { itemIndex: number; subIndex: number } | null {
  if (map.total === 0) return null;
  const idx = ((globalIdx % map.total) + map.total) % map.total;
  // Linear scan; item counts are small and hits are bounded.
  for (let i = 0; i < map.perItem.length; i++) {
    const start = map.cumulative[i];
    const count = map.perItem[i];
    if (count > 0 && idx < start + count) {
      return { itemIndex: i, subIndex: idx - start };
    }
  }
  return null;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

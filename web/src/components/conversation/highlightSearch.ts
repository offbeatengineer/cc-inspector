// Decorate text nodes inside `root` that match `needle` with a `.search-hit`
// span. Cheap and best-effort — called on every render of a visible row.
export function highlightNodeTree(root: HTMLElement, needle: string) {
  if (!needle) return;
  const q = needle.trim();
  if (q.length < 2) return;
  const re = new RegExp(escapeRe(q), "gi");

  // Collect text nodes without touching <style>, <script>, or already-highlighted spans.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".search-hit")) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "STYLE" || tag === "SCRIPT") return NodeFilter.FILTER_REJECT;
      return node.nodeValue && re.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const targets: Text[] = [];
  let t = walker.nextNode();
  while (t) {
    targets.push(t as Text);
    t = walker.nextNode();
  }

  for (const node of targets) {
    const value = node.nodeValue!;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value))) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(value.slice(last, m.index)));
      }
      const span = document.createElement("span");
      span.className = "search-hit";
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < value.length) {
      frag.appendChild(document.createTextNode(value.slice(last)));
    }
    node.parentNode?.replaceChild(frag, node);
  }
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

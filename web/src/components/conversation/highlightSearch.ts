// Decorate text nodes inside `root` that match `needle` with a `.search-hit`
// span. Cheap and best-effort — called on every render of a visible row.
export function highlightNodeTree(root: HTMLElement, needle: string) {
  unhighlightNodeTree(root);
  if (!needle) return;
  const q = needle.trim();
  if (q.length < 2) return;
  const test = new RegExp(escapeRe(q), "i");
  const re = new RegExp(escapeRe(q), "gi");

  // Collect text nodes without touching <style>, <script>, or already-highlighted spans.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".search-hit")) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "STYLE" || tag === "SCRIPT") return NodeFilter.FILTER_REJECT;
      return node.nodeValue && test.test(node.nodeValue)
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

// Unwrap any `.search-hit` spans previously inserted by highlightNodeTree,
// leaving the original text behind and merging adjacent text nodes.
export function unhighlightNodeTree(root: HTMLElement) {
  const spans = root.querySelectorAll<HTMLSpanElement>("span.search-hit");
  const parents = new Set<Node>();
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(span.textContent ?? ""), span);
    parents.add(parent);
  });
  parents.forEach((p) => (p as Element).normalize?.());
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

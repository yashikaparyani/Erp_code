'use client';

const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'em', 'i', 'li', 'ol', 'p', 'pre', 'strong', 'span', 'u', 'ul',
]);

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel']);

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function sanitizeRichText(input?: string) {
  if (!input) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(input).replace(/\n/g, '<br />');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const nodes = Array.from(doc.body.querySelectorAll('*'));

  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      node.replaceWith(...Array.from(node.childNodes));
      continue;
    }

    for (const attr of Array.from(node.attributes)) {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim();
      const isSafeLink =
        attrName === 'href'
          ? attrValue.startsWith('/') || attrValue.startsWith('#') || /^https?:\/\//i.test(attrValue)
          : true;

      if (!ALLOWED_ATTRS.has(attrName) || !isSafeLink) {
        node.removeAttribute(attr.name);
      }
    }

    if (tag === 'a') {
      if (!node.getAttribute('href')) {
        node.replaceWith(...Array.from(node.childNodes));
      } else {
        node.setAttribute('rel', 'noreferrer noopener');
        node.setAttribute('target', '_blank');
      }
    }
  }

  return doc.body.innerHTML;
}

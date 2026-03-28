import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'sup', 'sub', 'small',
  'a',
  'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code',
  'iframe',
];

const ALLOWED_ATTR = [
  'id', 'class', 'style',
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height', 'loading',
  'allow', 'allowfullscreen', 'frameborder',
  // data-* and aria-* handled by hooks
];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target', 'rel', 'loading', 'allow', 'allowfullscreen', 'frameborder'],
    ALLOW_DATA_ATTR: true,
    ALLOW_ARIA_ATTR: true,
    ADD_TAGS: ['iframe'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

// Blog-specific sanitizer: strips ALL inline styles and color attrs so dark-mode prose classes work
export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS.filter(t => t !== 'font'), 'span'],
    ALLOWED_ATTR: ['id', 'class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'loading'],
    FORBID_ATTR: ['style', 'color', 'bgcolor', 'face', 'size'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export function sanitizeForSchema(text: string): string {
  // Strip ALL HTML for JSON-LD structured data
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

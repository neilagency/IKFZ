/**
 * HTML content sanitization utilities
 * (WordPress API integration has been removed — all data is now local)
 */

/**
 * Sanitize and clean WordPress-originated HTML content.
 * Strips Elementor/WoodMart wrappers, inline styles, SVG icons,
 * and collapses deeply nested empty div structures.
 */
export function sanitizeWPContent(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // ── Phase 1: Remove non-content blocks ──
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '');
  cleaned = cleaned.replace(/<template[^>]*>[\s\S]*?<\/template>/gi, '');
  cleaned = cleaned.replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '');
  cleaned = cleaned.replace(/<link[^>]*\/?>/gi, '');

  // ── Phase 2: Remove inline SVG icons (Elementor font-icon-svg) ──
  cleaned = cleaned.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');

  // ── Phase 3: Remove ALL data-* attributes in one pass ──
  cleaned = cleaned.replace(/\s+data-[a-z_-]+='[^']*'/gi, '');
  cleaned = cleaned.replace(/\s+data-[a-z_-]+="[^"]*"/gi, '');

  // ── Phase 4: Remove inline styles and misc attributes ──
  cleaned = cleaned.replace(/\s+style="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+fetchpriority="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+decoding="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+srcset="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+sizes="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+aria-hidden="[^"]*"/gi, '');

  // ── Phase 5: Strip Elementor/WoodMart/e-* classes ──
  cleaned = cleaned.replace(/\s+class="(?:[^"]*\b(?:elementor|wd-|e-con|e-flex|e-grid|e-child|e-parent|liner-continer|set-mb|reset-last|woodmart|title-wrapper|wd-negative-gap|wd-section|wd-width|wd-fontsize|wd-title|wd-button|wd-image|wd-btn|btn-scheme|btn-style|btn-size|btn-color|btn-icon-pos|e-font-icon)[^"]*)+"/gi, '');
  cleaned = cleaned.replace(/\b(?:elementor-\S+|wd-\S+|e-con\S*|e-flex|e-grid|e-child|e-parent|liner-continer|set-mb-\S+|reset-last-\S+|woodmart-\S+)\b\s*/g, '');

  // ── Phase 6: Clean remaining empty class/id attrs ──
  cleaned = cleaned.replace(/\s+class="\s*"/g, '');
  cleaned = cleaned.replace(/\s+class=""/g, '');
  cleaned = cleaned.replace(/\s+id=""/g, '');

  // ── Phase 7: Unwrap spans (remove all spans, keep their text) ──
  // Iteratively unwrap nested spans: <span><span>text</span></span> → text
  let prevSpan = '';
  for (let i = 0; i < 5 && cleaned !== prevSpan; i++) {
    prevSpan = cleaned;
    cleaned = cleaned.replace(/<span[^>]*>\s*([\s\S]*?)\s*<\/span>/gi, '$1');
  }

  // ── Phase 8: Remove <br> from inside headings ──
  cleaned = cleaned.replace(/(<h[1-6][^>]*>[\s\S]*?)<br\s*\/?>([\s\S]*?<\/h[1-6]>)/gi, '$1 $2');
  cleaned = cleaned.replace(/(<h[1-6][^>]*>[\s\S]*?)<br\s*\/?>([\s\S]*?<\/h[1-6]>)/gi, '$1 $2');

  // ── Phase 9: Remove first h1 (duplicates hero section title) ──
  cleaned = cleaned.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '');

  // ── Phase 10: Collapse empty/wrapper-only divs (iterate to flatten) ──
  let prev = '';
  for (let i = 0; i < 10 && cleaned !== prev; i++) {
    prev = cleaned;
    cleaned = cleaned.replace(/<div[^>]*>\s*<\/div>/g, '');
    cleaned = cleaned.replace(/<div>\s*(<div[\s\S]*?<\/div>)\s*<\/div>/g, '$1');
  }

  // ── Phase 11: Unwrap divs that only wrap a heading ──
  cleaned = cleaned.replace(/<div>\s*(<h[2-6][^>]*>[\s\S]*?<\/h[2-6]>)\s*<\/div>/g, '$1');

  // ── Phase 12: Mark feature cards (div containing h3 + p) ──
  cleaned = cleaned.replace(/<div>\s*(<h3[^>]*>[\s\S]*?<\/h3>\s*<p[\s\S]*?<\/p>)\s*<\/div>/g,
    '<div class="wp-card">$1</div>');

  // ── Phase 13: Convert text-only divs to styled paragraphs ──
  // Matches divs with text-only content (may include inline elements like <b>, <u>, <strong>)
  cleaned = cleaned.replace(/<div>\s*((?:[^<]|<(?:strong|b|u|em|i|br\s*\/?)(?:\s[^>]*)?>|<\/(?:strong|b|u|em|i)>)+?)\s*<\/div>/g, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (text.length < 3) return '';
    return `<p class="wp-subtitle">${inner.trim()}</p>`;
  });

  // ── Phase 14: Clean up whitespace ──
  cleaned = cleaned.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>');
  cleaned = cleaned.replace(/^\s*<br\s*\/?>\s*/gi, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<strong>\s*<\/strong>/gi, '');
  cleaned = cleaned.replace(/<b>\s*<\/b>/gi, '');

  return cleaned.trim();
}

/**
 * Extract a clean text excerpt from HTML
 */
export function extractExcerpt(html: string, maxLength = 160): string {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

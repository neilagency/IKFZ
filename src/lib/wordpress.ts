/**
 * HTML content sanitization utilities
 * (WordPress API integration has been removed — all data is now local)
 */

/**
 * Sanitize and clean WordPress-originated HTML content
 * Strips Elementor/WoodMart wrappers, inline styles, unnecessary classes
 */
export function sanitizeWPContent(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // Remove <style> blocks (we apply our own design system)
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove <script> blocks (wordcloud, trustindex, etc.)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove Trustindex/review widget markup (all variations)
  cleaned = cleaned.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '');
  cleaned = cleaned.replace(/<template[^>]*>[\s\S]*?<\/template>/gi, '');
  cleaned = cleaned.replace(/<div[^>]*data-src="[^"]*trustindex[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<canvas[^>]*><\/canvas>/gi, '');

  // Remove <link> tags (external CSS)
  cleaned = cleaned.replace(/<link[^>]*\/?>/gi, '');

  // Remove Elementor data attributes
  cleaned = cleaned.replace(/\s*data-elementor[^=]*="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-id="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-element_type="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-e-type="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-widget_type="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-settings='[^']*'/g, '');
  cleaned = cleaned.replace(/\s*data-settings="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-paged="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-atts="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-source="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-speed="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-wrap="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-autoplay="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-scroll_per_page="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*data-[a-z-]*="[^"]*"/g, '');

  // Remove inline styles
  cleaned = cleaned.replace(/\s*style="[^"]*"/g, '');

  // Remove fetchpriority/decoding attrs
  cleaned = cleaned.replace(/\s*fetchpriority="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*decoding="[^"]*"/g, '');

  // Remove Elementor/WoodMart wrapper classes but keep semantic classes
  cleaned = cleaned.replace(/\s*class="[^"]*elementor[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="[^"]*wd-[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="[^"]*e-con[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="[^"]*liner-continer[^"]*"/g, '');

  // Remove empty wrapper divs
  cleaned = cleaned.replace(/<div>\s*<\/div>/g, '');
  cleaned = cleaned.replace(/<div\s*>\s*<\/div>/g, '');

  // Remove srcset/sizes
  cleaned = cleaned.replace(/\s*srcset="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*sizes="[^"]*"/g, '');

  // Clean empty class attrs
  cleaned = cleaned.replace(/\s*class=""/g, '');
  cleaned = cleaned.replace(/\s*class="\s*"/g, '');

  // Collapse whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

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

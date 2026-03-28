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

  // Remove inline styles (Elementor adds tons)
  cleaned = cleaned.replace(/\s*style="[^"]*"/g, '');

  // Remove WordPress/Elementor-specific class names but keep semantic ones
  cleaned = cleaned.replace(/\s*class="[^"]*elementor[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="[^"]*wd-[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="[^"]*e-con[^"]*"/g, '');

  // Remove link/stylesheet tags (WP themes inject CSS)
  cleaned = cleaned.replace(/<link[^>]*\/>/g, '');

  // Remove empty divs
  cleaned = cleaned.replace(/<div>\s*<\/div>/g, '');
  cleaned = cleaned.replace(/<div\s*>\s*<\/div>/g, '');

  // Remove srcset (we'll handle images ourselves)
  cleaned = cleaned.replace(/\s*srcset="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*sizes="[^"]*"/g, '');

  // Clean up remaining empty class attributes
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

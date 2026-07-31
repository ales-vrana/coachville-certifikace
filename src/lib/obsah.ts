import sanitizeHtml from 'sanitize-html'

/**
 * Serverová sanitizace obsahu z WYSIWYG editoru (sekce Jak na to a Podmínky).
 * Whitelist povoluje jen formátovací značky, odkazy a Vimeo přehrávač —
 * skripty a cizí iframy neprojdou, i kdyby je někdo do uloženého HTML podstrčil.
 */
export function prevedNaBezpecneHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's',
      'a', 'ul', 'ol', 'li', 'br', 'blockquote', 'hr', 'div', 'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      div: ['class', 'data-vimeo'],
      iframe: ['src', 'allow', 'allowfullscreen', 'frameborder', 'class'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedIframeHostnames: ['player.vimeo.com'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
    // iframe, kterému whitelist odebral src (cizí doména), zahodíme celý
    exclusiveFilter: (ramec) => ramec.tag === 'iframe' && !ramec.attribs.src,
  })
}

/** Obsah uložený editorem začíná značkou; starší obsah je prostý text. */
export function jeHtmlObsah(text: string): boolean {
  return text.trimStart().startsWith('<')
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Převod staršího prostého textu na odstavce (zpětná kompatibilita). */
export function textNaHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((odstavec) => `<p>${escapeHtml(odstavec.trim()).replaceAll('\n', '<br />')}</p>`)
    .join('')
}

/** Připraví uložený obsah (HTML z editoru i starší prostý text) k zobrazení. */
export function obsahKZobrazeni(ulozene: string): string {
  const html = jeHtmlObsah(ulozene) ? ulozene : textNaHtml(ulozene)
  return prevedNaBezpecneHtml(html)
}

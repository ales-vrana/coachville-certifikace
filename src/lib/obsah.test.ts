import { describe, expect, it } from 'vitest'
import { vimeoEmbedSrc } from '../components/editor/vimeo'
import { obsahKZobrazeni, prevedNaBezpecneHtml, textNaHtml } from './obsah'

describe('sanitizace obsahu editoru', () => {
  it('zachová formátování, odkazy a Vimeo iframe', () => {
    const vstup =
      '<h2>Návod</h2><p><strong>Tučně</strong> a <a href="https://coachville.eu">odkaz</a></p>' +
      '<div class="vimeo-embed" data-vimeo=""><iframe src="https://player.vimeo.com/video/123" allowfullscreen="true"></iframe></div>'
    const vystup = prevedNaBezpecneHtml(vstup)
    expect(vystup).toContain('<h2>Návod</h2>')
    expect(vystup).toContain('<strong>Tučně</strong>')
    expect(vystup).toContain('player.vimeo.com/video/123')
    expect(vystup).toContain('target="_blank"')
    expect(vystup).toContain('rel="noopener noreferrer"')
  })

  it('odstraní skripty a event handlery', () => {
    const vystup = prevedNaBezpecneHtml(
      '<p onclick="alert(1)">text</p><script>alert(2)</script><img src=x onerror=alert(3)>',
    )
    expect(vystup).not.toContain('script')
    expect(vystup).not.toContain('onclick')
    expect(vystup).not.toContain('onerror')
    expect(vystup).toContain('<p>text</p>')
  })

  it('odstraní iframe z cizí domény', () => {
    const vystup = prevedNaBezpecneHtml('<iframe src="https://zly-web.cz/x"></iframe>')
    expect(vystup).not.toContain('zly-web')
    expect(vystup).not.toContain('<iframe')
  })

  it('odstraní javascript: odkazy', () => {
    const vystup = prevedNaBezpecneHtml('<a href="javascript:alert(1)">klik</a>')
    expect(vystup).not.toContain('javascript:')
  })
})

describe('starší prostý text', () => {
  it('převede odstavce a řádky, eskapuje značky', () => {
    const vystup = textNaHtml('První odstavec\nřádek dva\n\nDruhý <b>odstavec</b>')
    expect(vystup).toBe(
      '<p>První odstavec<br />řádek dva</p><p>Druhý &lt;b&gt;odstavec&lt;/b&gt;</p>',
    )
  })

  it('obsahKZobrazeni pozná prostý text i HTML', () => {
    expect(obsahKZobrazeni('Ahoj\n\nSvěte')).toBe('<p>Ahoj</p><p>Světe</p>')
    expect(obsahKZobrazeni('<p>Už <strong>HTML</strong></p>')).toBe(
      '<p>Už <strong>HTML</strong></p>',
    )
  })
})

describe('vimeoEmbedSrc', () => {
  it('rozpozná běžné tvary Vimeo odkazů', () => {
    expect(vimeoEmbedSrc('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
    expect(vimeoEmbedSrc('https://vimeo.com/123456789/abc123def')).toBe(
      'https://player.vimeo.com/video/123456789?h=abc123def',
    )
    expect(vimeoEmbedSrc('https://player.vimeo.com/video/987654321')).toBe(
      'https://player.vimeo.com/video/987654321',
    )
  })

  it('odmítne ne-Vimeo adresy', () => {
    expect(vimeoEmbedSrc('https://youtube.com/watch?v=abc')).toBeNull()
    expect(vimeoEmbedSrc('nesmysl')).toBeNull()
  })
})

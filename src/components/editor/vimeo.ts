import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vimeo: {
      /** Vloží Vimeo přehrávač (src = URL embed přehrávače). */
      vlozVimeo: (src: string) => ReturnType
    }
  }
}

/**
 * Převede běžnou Vimeo adresu na embed URL přehrávače.
 * Podporuje https://vimeo.com/123456789 i odkazy s privátním hashem
 * (https://vimeo.com/123456789/abcdef012) a přímé player.vimeo.com adresy.
 */
export function vimeoEmbedSrc(url: string): string | null {
  const shoda = url
    .trim()
    .match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i)
  if (!shoda) return null
  const [, id, hash] = shoda
  return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`
}

/** Blokový uzel s Vimeo přehrávačem (ukládá se jako responzivní iframe). */
export const Vimeo = Node.create({
  name: 'vimeo',
  group: 'block',
  atom: true,

  addAttributes() {
    return { src: { default: null } }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src*="player.vimeo.com"]',
        getAttrs: (el) => ({ src: (el as HTMLIFrameElement).getAttribute('src') }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'vimeo-embed', 'data-vimeo': '' },
      [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          frameborder: '0',
          allow: 'autoplay; fullscreen; picture-in-picture',
          allowfullscreen: 'true',
        }),
      ],
    ]
  },

  addCommands() {
    return {
      vlozVimeo:
        (src) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { src } }),
    }
  },
})

import { VocabularyNote } from '@main/db/types'
import { escape, escapeRegExp } from 'es-toolkit'

export const poetryHighlight = (
  notes: VocabularyNote[],
  rootEl: HTMLElement = document.getElementById('poetry-detail')!
) => {
  if (!rootEl) return () => {}
  const treeWalker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null)

  const textNodes: Node[] = []
  while (treeWalker.nextNode()) {
    textNodes.push(treeWalker.currentNode)
  }

  textNodes.forEach((textNode) => {
    let content = textNode.nodeValue || ''
    const parent = textNode.parentElement
    if (!parent) return

    notes.forEach((note) => {
      const { word, explanation } = note
      const regex = new RegExp(escapeRegExp(word), 'g')

      content = content.replace(
        regex,
        (match) =>
          `<span class="vocabulary-note hint--bottom-right hint--no-shadow hint--no-arrow"
            aria-label="${escape(explanation)}">
            ${match}
          </span>`
      )
    })

    if (content !== textNode.nodeValue) {
      const temp = document.createElement('span')
      temp.innerHTML = content

      while (temp.firstChild) {
        parent.insertBefore(temp.firstChild, textNode)
      }
      parent.removeChild(textNode)
    }
  })
  return () => clearPoetryHighlights(rootEl)
}

const clearPoetryHighlights = (rootEl: HTMLElement) => {
  if (!rootEl) return
  const highlights = rootEl.querySelectorAll('.vocabulary-note')
  highlights.forEach((highlight) => {
    const parent = highlight.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight)
    }
  })
}

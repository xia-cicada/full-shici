import { VocabularyNote } from '@main/db/types'

export const poetryHighlight = (
  notes: VocabularyNote[],
  rootEl: HTMLElement = document.getElementById('poetry-detail')!
) => {
  const highlight = new Highlight()

  const treeWalker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null)

  notes.forEach((note) => {
    const { word } = note
    let currentNode: Node | null = treeWalker.currentNode

    treeWalker.currentNode = rootEl

    while ((currentNode = treeWalker.nextNode())) {
      const textContent = currentNode.nodeValue || ''
      let startPos = 0

      while (true) {
        const index = textContent.indexOf(word, startPos)
        if (index === -1) break

        const range = new Range()
        range.setStart(currentNode, index)
        range.setEnd(currentNode, index + word.length)

        highlight.add(range)

        startPos = index + word.length
      }
    }
  })

  CSS.highlights.set('poetry-vocabulary-note', highlight)

  return () => {
    CSS.highlights.delete('poetry-vocabulary-note')
  }
}

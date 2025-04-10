import { VocabularyNote } from '@main/poetry/types'
import { escape, escapeRegExp } from 'es-toolkit'
import { computePosition, autoUpdate, offset, shift, flip, inline } from '@floating-ui/dom'

const HIGHLIGHT_CLASS = 'vocabulary-note'
const TOOLTIP_CLASS = 'vocabulary-tooltip'

export const poetryHighlight = (
  notes: VocabularyNote[],
  rootEl: HTMLElement = document.getElementById('poetry-detail')!
) => {
  if (!rootEl) return () => {}

  // 创建工具提示元素
  const tooltip = document.createElement('div')
  tooltip.className = TOOLTIP_CLASS
  Object.assign(tooltip.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    visibility: 'hidden',
    zIndex: '9999',
    maxWidth: '300px',
    padding: '0.5em 1em',
    backgroundColor: '#2c9678',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '1em'
  })
  document.body.appendChild(tooltip)

  let cleanupAutoUpdate: (() => void) | null = null

  // 高亮文本处理
  const treeWalker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT)
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
          `<span class="${HIGHLIGHT_CLASS}" data-explanation="${escape(explanation)}">${match}</span>`
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

  // 事件处理
  const handleMouseEnter = async (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains(HIGHLIGHT_CLASS)) return

    const explanation = target.getAttribute('data-explanation')
    if (!explanation) return

    tooltip.textContent = explanation
    tooltip.style.visibility = 'visible'

    cleanupAutoUpdate = autoUpdate(target, tooltip, async () => {
      const { x, y } = await computePosition(target, tooltip, {
        placement: 'bottom-start',
        middleware: [offset(3), flip(), shift({ padding: 8 }), inline()]
      })

      Object.assign(tooltip.style, {
        left: `${x}px`,
        top: `${y}px`
      })
    })
  }

  const handleMouseLeave = () => {
    tooltip.style.visibility = 'hidden'
    if (cleanupAutoUpdate) {
      cleanupAutoUpdate()
      cleanupAutoUpdate = null
    }
  }

  rootEl.addEventListener('mouseenter', handleMouseEnter, true)
  rootEl.addEventListener('mouseleave', handleMouseLeave, true)

  return () => {
    rootEl.removeEventListener('mouseenter', handleMouseEnter, true)
    rootEl.removeEventListener('mouseleave', handleMouseLeave, true)
    clearPoetryHighlights(rootEl)
    tooltip.remove()
  }
}

const clearPoetryHighlights = (rootEl: HTMLElement) => {
  const highlights = rootEl.querySelectorAll(`.${HIGHLIGHT_CLASS}`)
  highlights.forEach((highlight) => {
    const parent = highlight.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight)
    }
  })
}

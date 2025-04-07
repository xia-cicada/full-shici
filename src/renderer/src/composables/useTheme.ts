import { darkTheme } from 'naive-ui'
import { useDark, useToggle } from '@vueuse/core'

export function useNaiveTheme() {
  const isDark = useDark({
    selector: 'body',
    attribute: 'theme',
    valueDark: 'dark',
    valueLight: 'light'
  })

  const toggleDark = useToggle(isDark)

  // 根据 isDark 返回对应的 Naive UI 主题
  const naiveTheme = computed(() => (isDark.value ? darkTheme : null))

  return {
    isDark,
    toggleDark,
    naiveTheme
  }
}

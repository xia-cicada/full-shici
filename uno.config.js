import {
  defineConfig,
  presetWind3,
  presetIcons,
  transformerVariantGroup,
  transformerDirectives
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle'
      }
    })
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {}
  },
  safelist: getSafeList()
})

/**注意safe list如果是依赖其他文件动态生成的，实际上只有启动的时候生效一次 */
function getSafeList() {
  return ['i-tabler-message-circle', 'i-tabler-users', 'i-tabler-atom-2']
}

import { App } from 'vue'
import naive from 'naive-ui'
export const installNaiveUI = (app: App) => {
  app.use(naive)
}

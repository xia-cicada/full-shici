import './assets/main.scss'
import 'virtual:uno.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { installNaiveUI } from './plugins/naive'

const app = createApp(App)

app.use(createPinia())
app.use(router)
installNaiveUI(app)

app.mount('#app')

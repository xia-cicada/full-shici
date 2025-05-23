import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/views/layout/MainLayout.vue'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'
import Detail from '@/views/Detail.vue'
import ModelConfig from '@/views/ModelConfig.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        component: Home
      },
      {
        path: 'detail',
        name: 'detail',
        component: Detail
      },
      {
        path: 'model-config',
        name: 'model-config',
        component: ModelConfig
      },
      {
        path: 'about',
        name: 'about',
        component: About
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

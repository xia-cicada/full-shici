import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/views/layout/MainLayout.vue'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'

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

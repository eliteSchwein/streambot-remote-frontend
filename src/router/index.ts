import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/Dashboard.vue'
import Login from '@/pages/Login.vue'
import Instances from '@/pages/Instances.vue'
import Instance from '@/pages/Instance.vue'
import Settings from '@/pages/Settings.vue'
import { useAppStore } from '@/stores/app'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/instances', name: 'instances', component: Instances },
    { path: '/instances/:id', name: 'instance', component: Instance },
    { path: '/settings', name: 'settings', component: Settings },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const store = useAppStore()
  if (!store.bootstrapped) await store.bootstrap()
  if (!to.meta.public && !store.authenticated) return { name: 'login' }
  if (to.name === 'login' && store.authenticated) return { name: 'dashboard' }
})

export default router

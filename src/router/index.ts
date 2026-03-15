import { createRouter, createWebHashHistory } from 'vue-router'
import { api } from '@/services/api'
import LoginView from '@/views/LoginView.vue'
import BoardsView from '@/views/BoardsView.vue'
import BoardView from '@/views/BoardView.vue'
import AdminView from '@/views/AdminView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/boards', component: BoardsView, meta: { requiresAuth: true } },
    { path: '/boards/:id', component: BoardView, meta: { requiresAuth: true } },
    { path: '/admin', component: AdminView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/', redirect: '/boards' },
  ],
})

// Set to false to re-enable the login page
const SKIP_LOGIN = true

router.beforeEach(async (to) => {
  if (SKIP_LOGIN && !api.isLoggedIn()) {
    try { await api.login('admin', 'admin') } catch { /* ignore */ }
  }
  if (!SKIP_LOGIN && to.meta.requiresAuth && !api.isLoggedIn()) return '/login'
  if (to.meta.requiresAdmin && !api.isAdmin()) return '/boards'
})

export default router

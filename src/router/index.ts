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

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !api.isLoggedIn()) return '/login'
  if (to.meta.requiresAdmin && !api.isAdmin()) return '/boards'
})

export default router

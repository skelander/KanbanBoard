<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center">
    <div class="bg-white rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
      <div class="h-1.5 bg-blue-600"></div>
      <div class="p-8">
        <div class="mb-8">
          <div class="w-10 h-10 bg-blue-600 rounded-xl mb-4 flex items-center justify-center shrink-0">
            <span class="text-white font-bold text-lg leading-none">K</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p class="text-sm text-slate-500 mt-1">Sign in to your Kanban workspace</p>
        </div>
        <form @submit.prevent="login" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              v-model="username"
              type="text"
              required
              class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <p v-if="error" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</p>
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  try {
    await api.login(username.value, password.value)
    router.push('/boards')
  } catch {
    error.value = 'Invalid username or password'
  } finally {
    loading.value = false
  }
}
</script>

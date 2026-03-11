<template>
  <div class="min-h-screen bg-slate-50">
    <nav class="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <router-link to="/boards" class="text-sm text-slate-500 hover:text-slate-700">← Boards</router-link>
        <span class="text-slate-300">|</span>
        <h1 class="text-base font-semibold text-slate-900">User Management</h1>
      </div>
      <button @click="logout" class="text-sm text-slate-500 hover:text-slate-700">Log out</button>
    </nav>

    <div class="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <!-- Create user form -->
      <div class="bg-white border border-slate-200 rounded-xl p-6">
        <h2 class="font-semibold text-slate-900 mb-5">Create User</h2>
        <form @submit.prevent="createUser" class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              v-model="newUsername"
              placeholder="e.g. jsmith"
              required
              class="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="Min. 4 characters"
              required
              class="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select
              v-model="newRole"
              class="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p v-if="createError" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ createError }}</p>
          <button
            type="submit"
            :disabled="creating"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-40"
          >
            {{ creating ? 'Creating…' : 'Create user' }}
          </button>
        </form>
      </div>

      <!-- User list -->
      <div class="bg-white border border-slate-200 rounded-xl p-6">
        <h2 class="font-semibold text-slate-900 mb-4">Users</h2>
        <p v-if="loadError" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{{ loadError }}</p>
        <ul class="divide-y divide-slate-100">
          <li
            v-for="user in users"
            :key="user.id"
            class="flex items-center justify-between py-3 group"
          >
            <div class="flex items-center gap-3">
              <span class="font-medium text-slate-900">{{ user.username }}</span>
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'"
              >{{ user.role }}</span>
            </div>
            <button
              @click="deleteUser(user)"
              class="text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-sm"
            >✕</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, type User } from '@/services/api'

const router = useRouter()
const users = ref<User[]>([])
const newUsername = ref('')
const newPassword = ref('')
const newRole = ref('user')
const creating = ref(false)
const createError = ref('')
const loadError = ref('')

async function loadUsers() {
  try {
    users.value = await api.getUsers()
  } catch {
    loadError.value = 'Failed to load users'
  }
}

async function createUser() {
  createError.value = ''
  creating.value = true
  try {
    const user = await api.createUser({
      username: newUsername.value,
      password: newPassword.value,
      role: newRole.value,
    })
    users.value.push(user)
    newUsername.value = ''
    newPassword.value = ''
    newRole.value = 'user'
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    try {
      createError.value = JSON.parse(msg)?.error ?? 'Failed to create user'
    } catch {
      createError.value = 'Failed to create user'
    }
  } finally {
    creating.value = false
  }
}

async function deleteUser(user: User) {
  if (!confirm(`Delete user "${user.username}"?`)) return
  try {
    await api.deleteUser(user.id)
    users.value = users.value.filter((u) => u.id !== user.id)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    try {
      alert(JSON.parse(msg)?.error ?? 'Failed to delete user')
    } catch {
      alert('Failed to delete user')
    }
  }
}

function logout() {
  api.logout()
  router.push('/login')
}

onMounted(loadUsers)
</script>

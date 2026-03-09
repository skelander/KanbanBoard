<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <router-link to="/boards" class="text-sm text-gray-500 hover:text-gray-700">← Boards</router-link>
        <h1 class="text-xl font-bold text-gray-800">User Management</h1>
      </div>
      <button @click="logout" class="text-sm text-gray-500 hover:text-gray-700">Log out</button>
    </nav>

    <div class="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <!-- Create user form -->
      <div class="bg-white rounded-xl shadow p-6">
        <h2 class="font-semibold text-gray-800 mb-4">Create User</h2>
        <form @submit.prevent="createUser" class="space-y-3">
          <input
            v-model="newUsername"
            placeholder="Username"
            required
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            v-model="newPassword"
            type="password"
            placeholder="Password"
            required
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            v-model="newRole"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <p v-if="createError" class="text-red-500 text-sm">{{ createError }}</p>
          <button
            type="submit"
            :disabled="creating"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
          >
            {{ creating ? 'Creating…' : 'Create' }}
          </button>
        </form>
      </div>

      <!-- User list -->
      <div class="bg-white rounded-xl shadow p-6">
        <h2 class="font-semibold text-gray-800 mb-4">Users</h2>
        <p v-if="loadError" class="text-red-500 text-sm">{{ loadError }}</p>
        <ul class="divide-y divide-gray-100">
          <li
            v-for="user in users"
            :key="user.id"
            class="flex items-center justify-between py-2"
          >
            <div>
              <span class="font-medium text-gray-800">{{ user.username }}</span>
              <span class="ml-2 text-xs text-gray-400 uppercase">{{ user.role }}</span>
            </div>
            <button
              @click="deleteUser(user)"
              class="text-gray-400 hover:text-red-500 transition text-sm"
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

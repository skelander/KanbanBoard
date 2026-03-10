<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow px-6 py-3 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-800">My Boards</h1>
      <div class="flex items-center gap-4">
        <router-link v-if="isAdmin" to="/admin" class="text-sm text-blue-600 hover:text-blue-800">Admin</router-link>
        <button @click="logout" class="text-sm text-gray-500 hover:text-gray-700">Log out</button>
      </div>
    </nav>

    <div class="max-w-4xl mx-auto py-8 px-4">
      <div v-if="isAdmin" class="flex items-center gap-3 mb-6">
        <input
          v-model="newBoardName"
          @keyup.enter="createBoard"
          placeholder="New board name…"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="createBoard"
          :disabled="!newBoardName.trim()"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          Create
        </button>
      </div>

      <p v-if="error" class="text-red-500 mb-4">{{ error }}</p>

      <div v-if="boards.length === 0 && !loading" class="text-gray-500 text-center py-16">
        No boards yet. Create one above.
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="board in boards"
          :key="board.id"
          class="bg-white rounded-xl shadow p-5 flex justify-between items-start hover:shadow-md transition cursor-pointer"
          @click="$router.push(`/boards/${board.id}`)"
        >
          <div>
            <h2 class="font-semibold text-gray-800">{{ board.name }}</h2>
            <p v-if="board.description" class="text-sm text-gray-500 mt-1">{{ board.description }}</p>
          </div>
          <button
            @click.stop="deleteBoard(board.id)"
            class="text-gray-400 hover:text-red-500 transition text-sm"
          >✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, type Board } from '@/services/api'

const router = useRouter()
const isAdmin = api.isAdmin()
const boards = ref<Board[]>([])
const newBoardName = ref('')
const loading = ref(false)
const error = ref('')

async function loadBoards() {
  loading.value = true
  try {
    boards.value = await api.getBoards()
  } catch (e) {
    error.value = 'Failed to load boards'
  } finally {
    loading.value = false
  }
}

async function createBoard() {
  if (!newBoardName.value.trim()) return
  try {
    const board = await api.createBoard({ name: newBoardName.value.trim() })
    newBoardName.value = ''
    router.push(`/boards/${board.id}`)
  } catch {
    error.value = 'Failed to create board'
  }
}

async function deleteBoard(id: number) {
  if (!confirm('Delete this board?')) return
  try {
    await api.deleteBoard(id)
    boards.value = boards.value.filter((b) => b.id !== id)
  } catch {
    error.value = 'Failed to delete board'
  }
}

function logout() {
  api.logout()
  router.push('/login')
}

onMounted(loadBoards)
</script>

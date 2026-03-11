<template>
  <div class="min-h-screen bg-slate-50">
    <nav class="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
      <h1 class="text-base font-semibold text-slate-900">My Boards</h1>
      <div class="flex items-center gap-4">
        <router-link v-if="isAdmin" to="/admin" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Admin</router-link>
        <button @click="logout" class="text-sm text-slate-500 hover:text-slate-700">Log out</button>
      </div>
    </nav>

    <div class="max-w-4xl mx-auto py-8 px-4">
      <div v-if="isAdmin" class="flex items-center gap-3 mb-8">
        <input
          v-model="newBoardName"
          @keyup.enter="createBoard"
          placeholder="New board name…"
          class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          @click="createBoard"
          :disabled="!newBoardName.trim()"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-40 shrink-0"
        >
          Create board
        </button>
      </div>

      <p v-if="error" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{{ error }}</p>

      <div v-if="boards.length === 0 && !loading" class="text-center py-20">
        <p class="text-slate-400 text-sm">No boards yet. Create one above.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="board in boards"
          :key="board.id"
          class="bg-white border border-slate-200 rounded-xl p-5 flex justify-between items-start hover:shadow-md hover:border-slate-300 transition cursor-pointer group"
          @click="$router.push(`/boards/${board.id}`)"
        >
          <div class="min-w-0">
            <h2 class="font-semibold text-slate-900 truncate">{{ board.name }}</h2>
            <p v-if="board.description" class="text-sm text-slate-500 mt-1 truncate">{{ board.description }}</p>
            <p class="text-xs text-slate-400 mt-2">{{ board.members.length }} member{{ board.members.length !== 1 ? 's' : '' }}</p>
          </div>
          <button
            @click.stop="deleteBoard(board.id)"
            class="text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 ml-3"
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
    await api.createBoard({ name: newBoardName.value.trim() })
    newBoardName.value = ''
    await loadBoards()
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

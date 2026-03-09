<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <nav class="bg-white shadow px-6 py-3 flex items-center gap-4">
      <button @click="$router.push('/boards')" class="text-gray-500 hover:text-gray-700 text-sm">← Boards</button>
      <h1 class="text-xl font-bold text-gray-800 flex-1">{{ board?.name }}</h1>
      <button @click="logout" class="text-sm text-gray-500 hover:text-gray-700">Log out</button>
    </nav>

    <p v-if="error" class="text-red-500 px-6 pt-4">{{ error }}</p>

    <div class="flex gap-4 p-6 overflow-x-auto flex-1 items-start">
      <KanbanColumn
        v-for="col in sortedColumns"
        :key="col.id"
        :column="col"
        @delete="deleteColumn"
        @deleteCard="deleteCard"
        @addCard="addCard"
        @moveCard="moveCard"
      />

      <div class="min-w-56 shrink-0">
        <form @submit.prevent="addColumn" class="flex flex-col gap-2">
          <input
            v-if="addingColumn"
            ref="colInput"
            v-model="newColumnName"
            @blur="cancelAddColumn"
            @keyup.escape="cancelAddColumn"
            placeholder="Column name…"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            v-if="!addingColumn"
            @click="startAddColumn"
            class="bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-xl px-4 py-3 text-sm font-medium text-left transition"
          >
            + Add column
          </button>
          <button
            v-else
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm transition"
          >
            Add column
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, type Board, type Column } from '@/services/api'
import KanbanColumn from '@/components/KanbanColumn.vue'

const route = useRoute()
const router = useRouter()
const boardId = computed(() => Number(route.params.id))

const board = ref<Board | null>(null)
const error = ref('')
const addingColumn = ref(false)
const newColumnName = ref('')
const colInput = ref<HTMLInputElement>()

const sortedColumns = computed<Column[]>(() =>
  board.value ? [...board.value.columns].sort((a, b) => a.position - b.position) : []
)

async function load() {
  try {
    board.value = await api.getBoard(boardId.value)
  } catch {
    error.value = 'Failed to load board'
  }
}

function startAddColumn() {
  addingColumn.value = true
  nextTick(() => colInput.value?.focus())
}

function cancelAddColumn() {
  addingColumn.value = false
  newColumnName.value = ''
}

async function addColumn() {
  if (!newColumnName.value.trim()) return
  try {
    const col = await api.createColumn(boardId.value, { name: newColumnName.value.trim() })
    col.cards = []
    board.value!.columns.push(col)
    cancelAddColumn()
  } catch {
    error.value = 'Failed to add column'
  }
}

async function deleteColumn(columnId: number) {
  if (!confirm('Delete this column and all its cards?')) return
  try {
    await api.deleteColumn(boardId.value, columnId)
    board.value!.columns = board.value!.columns.filter((c) => c.id !== columnId)
  } catch {
    error.value = 'Failed to delete column'
  }
}

async function addCard(columnId: number, title: string) {
  try {
    const card = await api.createCard(boardId.value, columnId, { title })
    const col = board.value!.columns.find((c) => c.id === columnId)
    col?.cards.push(card)
  } catch {
    error.value = 'Failed to add card'
  }
}

async function deleteCard(columnId: number, cardId: number) {
  try {
    await api.deleteCard(boardId.value, columnId, cardId)
    const col = board.value!.columns.find((c) => c.id === columnId)
    if (col) col.cards = col.cards.filter((c) => c.id !== cardId)
  } catch {
    error.value = 'Failed to delete card'
  }
}

async function moveCard(cardId: number, fromColumnId: number, toColumnId: number, position: number) {
  try {
    const card = await api.moveCard(boardId.value, fromColumnId, cardId, toColumnId, position)
    // Reload board to get consistent state
    board.value = await api.getBoard(boardId.value)
  } catch {
    error.value = 'Failed to move card'
  }
}

function logout() {
  api.logout()
  router.push('/login')
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex flex-col">
    <nav class="bg-white border-b border-slate-200 px-5 h-14 flex items-center gap-3">
      <button @click="$router.push('/boards')" class="text-slate-400 hover:text-slate-600 text-sm shrink-0">← Boards</button>
      <span class="text-slate-200 shrink-0">|</span>
      <input
        v-if="editingBoardName"
        ref="boardNameInput"
        v-model="editBoardName"
        @keyup.enter="saveBoardName"
        @keyup.escape="cancelEditBoardName"
        @blur="saveBoardName"
        class="text-base font-semibold text-slate-900 border-b border-slate-400 focus:outline-none bg-transparent flex-1 min-w-0"
      />
      <h1
        v-else
        @click="startEditBoardName"
        class="text-base font-semibold text-slate-900 flex-1 min-w-0 truncate cursor-pointer hover:text-slate-600 transition"
        title="Click to rename"
      >{{ board?.name }}</h1>

      <div class="flex items-center gap-1 ml-auto shrink-0">
        <div class="relative" v-if="isAdmin">
          <button
            @click="membersOpen = !membersOpen"
            class="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >Members <span class="text-slate-400">({{ board?.members.length ?? 0 }})</span></button>
          <div
            v-if="membersOpen"
            class="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-72 z-10"
          >
            <h3 class="font-semibold text-slate-800 text-sm mb-3">Board members</h3>
            <ul class="space-y-1 mb-3">
              <li
                v-for="member in board?.members"
                :key="member.id"
                class="flex items-center justify-between text-sm py-0.5"
              >
                <span class="text-slate-700">{{ member.username }}</span>
                <button
                  v-if="member.id !== board?.ownerId"
                  @click="removeMember(member.id)"
                  class="text-slate-300 hover:text-red-400 transition text-xs"
                >✕</button>
              </li>
            </ul>
            <div class="border-t border-slate-100 pt-3" v-if="nonMembers.length > 0">
              <p class="text-xs text-slate-500 mb-1.5">Add member</p>
              <select
                v-model="selectedUserId"
                class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              >
                <option value="" disabled>Select user…</option>
                <option
                  v-for="user in nonMembers"
                  :key="user.id"
                  :value="user.id"
                >{{ user.username }}</option>
              </select>
              <button
                @click="addMember"
                :disabled="!selectedUserId"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded-lg transition disabled:opacity-40"
              >Add</button>
            </div>
          </div>
        </div>

        <template v-if="isAdmin">
          <span class="text-slate-200">|</span>
          <button
            @click="loadTestData"
            :disabled="loadingTestData"
            class="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-40"
          >{{ loadingTestData ? 'Loading…' : 'Sprint data' }}</button>
          <button
            @click="loadBacklogTestData"
            :disabled="loadingTestData"
            class="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-40"
          >{{ loadingTestData ? '…' : 'Backlog data' }}</button>
        </template>

        <span class="text-slate-200">|</span>
        <button @click="debugOpen = !debugOpen" class="text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 transition" :class="debugOpen ? 'text-amber-600 font-medium' : 'text-slate-500 hover:text-slate-700'">JSON</button>
        <button @click="analysisOpen = !analysisOpen" class="text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 transition" :class="analysisOpen ? 'text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'">Analysis</button>
        <span class="text-slate-200">|</span>
        <button @click="logout" class="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">Log out</button>
      </div>
    </nav>

    <p v-if="error" class="text-red-600 text-sm bg-red-50 border border-red-200 mx-5 mt-4 px-3 py-2 rounded-lg">{{ error }}</p>

    <pre v-if="debugOpen" class="mx-5 mt-4 p-4 bg-slate-900 text-green-400 text-xs rounded-xl overflow-auto max-h-64 shrink-0">{{ JSON.stringify(board, null, 2) }}</pre>

    <div v-if="analysisOpen" class="mx-5 mt-4 p-4 bg-white border border-slate-200 rounded-xl max-h-64 overflow-auto shrink-0">
      <p class="text-sm text-slate-400 italic">Analysis coming soon…</p>
    </div>

    <div class="flex gap-4 p-5 overflow-x-auto flex-1 items-start">
      <KanbanColumn
        v-for="col in sortedColumns"
        :key="col.id"
        :column="col"
        :createCard="(colId, title) => doCreateCard(colId, title)"
        @deleteCard="deleteCard"
        @editCard="editCard"
        @moveCard="moveCard"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, type Board, type Column, type Card, type User } from '@/services/api'
import KanbanColumn from '@/components/KanbanColumn.vue'

const route = useRoute()
const router = useRouter()
const boardId = computed(() => Number(route.params.id))
const isAdmin = api.isAdmin()

const board = ref<Board | null>(null)
const error = ref('')
const membersOpen = ref(false)
const allUsers = ref<User[]>([])
const selectedUserId = ref<number | ''>('')

const loadingTestData = ref(false)
const debugOpen = ref(false)
const analysisOpen = ref(false)
const editingBoardName = ref(false)
const editBoardName = ref('')
const boardNameInput = ref<HTMLInputElement>()

const sortedColumns = computed<Column[]>(() =>
  board.value
    ? [...board.value.columns].sort((a, b) => {
        if (a.isBacklog !== b.isBacklog) return a.isBacklog ? -1 : 1
        return a.position - b.position
      })
    : []
)

const nonMembers = computed<User[]>(() => {
  if (!board.value) return []
  const memberIds = new Set(board.value.members.map((m) => m.id))
  return allUsers.value.filter((u) => !memberIds.has(u.id))
})

async function load() {
  try {
    board.value = await api.getBoard(boardId.value)
    if (isAdmin) allUsers.value = await api.getUsers()
  } catch {
    error.value = 'Failed to load board'
  }
}

function startEditBoardName() {
  editBoardName.value = board.value?.name ?? ''
  editingBoardName.value = true
  nextTick(() => boardNameInput.value?.focus())
}

function cancelEditBoardName() {
  editingBoardName.value = false
}

async function saveBoardName() {
  const name = editBoardName.value.trim()
  if (!name || name === board.value?.name) {
    cancelEditBoardName()
    return
  }
  try {
    await api.updateBoard(boardId.value, { name })
    board.value!.name = name
  } catch {
    error.value = 'Failed to rename board'
  }
  cancelEditBoardName()
}

async function addMember() {
  if (!selectedUserId.value) return
  try {
    await api.addMember(boardId.value, selectedUserId.value)
    const user = allUsers.value.find((u) => u.id === selectedUserId.value)
    if (user) board.value!.members.push(user)
    selectedUserId.value = ''
  } catch {
    error.value = 'Failed to add member'
  }
}

async function removeMember(userId: number) {
  try {
    await api.removeMember(boardId.value, userId)
    board.value!.members = board.value!.members.filter((m) => m.id !== userId)
  } catch {
    error.value = 'Failed to remove member'
  }
}

async function doCreateCard(columnId: number, title: string): Promise<Card> {
  try {
    const card = await api.createCard(boardId.value, columnId, { title })
    const col = board.value?.columns.find((c) => c.id === columnId)
    if (col) col.cards = [...col.cards, card]
    return card
  } catch (e) {
    error.value = `Failed to add card: ${e instanceof Error ? e.message : String(e)}`
    throw e
  }
}

async function editCard(columnId: number, cardId: number, title: string, description: string) {
  try {
    const updated = await api.updateCard(boardId.value, columnId, cardId, { title, description })
    const col = board.value!.columns.find((c) => c.id === columnId)
    if (col) {
      const idx = col.cards.findIndex((c) => c.id === cardId)
      if (idx !== -1) {
        const card = col.cards[idx]!
        card.title = updated.title
        card.description = updated.description
      }
    }
  } catch {
    error.value = 'Failed to update card'
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
    await api.moveCard(boardId.value, fromColumnId, cardId, toColumnId, position)
    board.value = await api.getBoard(boardId.value)
  } catch (e) {
    error.value = `Failed to move card: ${e instanceof Error ? e.message : String(e)}`
    board.value = await api.getBoard(boardId.value)
  }
}

async function loadTestData() {
  if (!confirm('Load a simulated two-week sprint onto this board? This will clear all existing cards.')) return
  loadingTestData.value = true
  try {
    await api.loadTestData(boardId.value)
    board.value = await api.getBoard(boardId.value)
  } catch {
    error.value = 'Failed to load test data'
  } finally {
    loadingTestData.value = false
  }
}

async function loadBacklogTestData() {
  if (!confirm('Load backlog items onto this board? This will clear all existing cards.')) return
  loadingTestData.value = true
  try {
    await api.loadBacklogTestData(boardId.value)
    board.value = await api.getBoard(boardId.value)
  } catch {
    error.value = 'Failed to load backlog data'
  } finally {
    loadingTestData.value = false
  }
}

function logout() {
  api.logout()
  router.push('/login')
}

onMounted(load)
</script>

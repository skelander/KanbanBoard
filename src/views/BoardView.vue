<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <nav class="bg-white shadow px-6 py-3 flex items-center gap-4">
      <button @click="$router.push('/boards')" class="text-gray-500 hover:text-gray-700 text-sm">← Boards</button>
      <input
        v-if="editingBoardName"
        ref="boardNameInput"
        v-model="editBoardName"
        @keyup.enter="saveBoardName"
        @keyup.escape="cancelEditBoardName"
        @blur="saveBoardName"
        class="text-xl font-bold text-gray-800 border-b border-gray-400 focus:outline-none bg-transparent flex-1"
      />
      <h1
        v-else
        @click="startEditBoardName"
        class="text-xl font-bold text-gray-800 flex-1 cursor-pointer hover:text-gray-600"
        title="Click to rename"
      >{{ board?.name }}</h1>
      <div class="relative" v-if="isAdmin">
        <button
          @click="membersOpen = !membersOpen"
          class="text-sm text-gray-500 hover:text-gray-700"
        >Members ({{ board?.members.length ?? 0 }})</button>
        <div
          v-if="membersOpen"
          class="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72 z-10"
        >
          <h3 class="font-semibold text-gray-700 text-sm mb-3">Board members</h3>
          <ul class="space-y-1 mb-3">
            <li
              v-for="member in board?.members"
              :key="member.id"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-gray-800">{{ member.username }}</span>
              <button
                v-if="member.id !== board?.ownerId"
                @click="removeMember(member.id)"
                class="text-gray-400 hover:text-red-500 transition text-xs"
              >✕</button>
            </li>
          </ul>
          <div class="border-t border-gray-100 pt-3" v-if="nonMembers.length > 0">
            <p class="text-xs text-gray-500 mb-1">Add member</p>
            <select
              v-model="selectedUserId"
              class="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
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
              class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded-lg transition disabled:opacity-50"
            >Add</button>
          </div>
        </div>
      </div>
      <button @click="logout" class="text-sm text-gray-500 hover:text-gray-700">Log out</button>
    </nav>

    <p v-if="error" class="text-red-500 px-6 pt-4">{{ error }}</p>

    <div class="flex gap-4 p-6 overflow-x-auto flex-1 items-start">
      <KanbanColumn
        v-for="col in sortedColumns"
        :key="`${col.id}-${col.cards.length}`"
        :column="col"
        @delete="deleteColumn"
        @rename="renameColumn"
        @deleteCard="deleteCard"
        @editCard="editCard"
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
import { api, type Board, type Column, type User } from '@/services/api'
import KanbanColumn from '@/components/KanbanColumn.vue'

const route = useRoute()
const router = useRouter()
const boardId = computed(() => Number(route.params.id))
const isAdmin = api.isAdmin()

const board = ref<Board | null>(null)
const error = ref('')
const addingColumn = ref(false)
const newColumnName = ref('')
const colInput = ref<HTMLInputElement>()
const membersOpen = ref(false)
const allUsers = ref<User[]>([])
const selectedUserId = ref<number | ''>('')

const editingBoardName = ref(false)
const editBoardName = ref('')
const boardNameInput = ref<HTMLInputElement>()

const sortedColumns = computed<Column[]>(() =>
  board.value ? [...board.value.columns].sort((a, b) => a.position - b.position) : []
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

async function renameColumn(columnId: number, name: string) {
  try {
    await api.updateColumn(boardId.value, columnId, { name })
    const col = board.value!.columns.find((c) => c.id === columnId)
    if (col) col.name = name
  } catch {
    error.value = 'Failed to rename column'
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
    await api.createCard(boardId.value, columnId, { title })
    board.value = await api.getBoard(boardId.value)
  } catch {
    error.value = 'Failed to add card'
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

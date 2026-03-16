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

        <span class="text-slate-200">|</span>
        <button @click="debugOpen = !debugOpen" class="text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 transition" :class="debugOpen ? 'text-amber-600 font-medium' : 'text-slate-500 hover:text-slate-700'">JSON</button>
        <button @click="analysisOpen = !analysisOpen" class="text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 transition" :class="analysisOpen ? 'text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'">Analysis</button>

        <template v-if="sprints.length > 0">
          <span class="text-slate-200">|</span>
          <div class="flex items-center gap-1">
            <button
              @click="prevSprint"
              :disabled="currentSprintIdx === 0"
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-default transition text-xs"
            >◀</button>
            <span class="text-xs font-medium w-16 text-center" :class="isHistorical ? 'text-amber-600' : 'text-slate-600'">{{ sprintLabel }}</span>
            <button
              @click="nextSprint"
              :disabled="currentSprintIdx === -1"
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-default transition text-xs"
            >▶</button>
          </div>
        </template>

        <span class="text-slate-200">|</span>
        <button @click="logout" class="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">Log out</button>
      </div>
    </nav>

    <p v-if="error" class="text-red-600 text-sm bg-red-50 border border-red-200 mx-5 mt-4 px-3 py-2 rounded-lg">{{ error }}</p>

    <pre v-if="debugOpen" class="mx-5 mt-4 p-4 bg-slate-900 text-green-400 text-xs rounded-xl overflow-auto max-h-64 shrink-0">{{ JSON.stringify(board, null, 2) }}</pre>

    <div v-if="analysisOpen" class="mx-5 mt-4 bg-white border border-slate-200 rounded-xl shrink-0 flex">
      <div class="flex-1 min-w-0">
        <div class="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-sm font-medium text-slate-700">Work Item Age</h2>
            <p class="text-xs text-slate-400 mt-0.5">Elapsed time since leaving Backlog — blue = in progress, green = done</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              @click="showSle50 = !showSle50"
              class="text-xs px-2 py-1 rounded-md border transition font-medium"
              :class="showSle50 ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-200 text-slate-400'"
            >50% SLE</button>
            <button
              @click="showSle85 = !showSle85"
              class="text-xs px-2 py-1 rounded-md border transition font-medium"
              :class="showSle85 ? 'bg-orange-50 border-orange-300 text-orange-600' : 'bg-white border-slate-200 text-slate-400'"
            >85% SLE</button>
          </div>
          <div v-if="sprints.length > 0" class="flex items-center gap-1 shrink-0">
            <button
              @click="prevSprint"
              :disabled="currentSprintIdx === 0"
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-default transition text-xs"
            >◀</button>
            <span class="text-xs font-medium text-slate-600 w-16 text-center">{{ sprintLabel }}</span>
            <button
              @click="nextSprint"
              :disabled="currentSprintIdx === -1"
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-default transition text-xs"
            >▶</button>
          </div>
        </div>
        <WorkItemAgeChart
          :columns="sortedColumns"
          :selectedCardId="selectedCardId ?? undefined"
          :viewDate="chartViewDate"
          :historicalCycleTimes="isHistorical ? undefined : historicalCycleTimes"
          :showSle50="showSle50"
          :showSle85="showSle85"
          @select="toggleSelectedCard"
        />
      </div>

      <!-- Card detail panel -->
      <div v-if="selectedCard" class="w-72 border-l border-slate-200 shrink-0 flex flex-col">
        <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
          <span class="text-xs font-medium text-slate-700 truncate">
            <span class="text-slate-400 mr-1">#{{ selectedCard.card.id }}</span>{{ selectedCard.card.title }}
          </span>
          <button @click="selectedCardId = null" class="text-slate-300 hover:text-slate-500 transition ml-2 shrink-0">✕</button>
        </div>
        <div class="p-4 flex-1 overflow-y-auto text-xs space-y-4">
          <div>
            <p class="text-slate-400 mb-1">Current column</p>
            <span class="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">{{ selectedCard.column.name }}</span>
          </div>
          <div v-if="selectedCard.card.description">
            <p class="text-slate-400 mb-1">Description</p>
            <p class="text-slate-600 leading-relaxed">{{ selectedCard.card.description }}</p>
          </div>
          <div>
            <p class="text-slate-400 mb-2">Time per column</p>
            <div class="space-y-1.5">
              <div
                v-for="h in selectedCard.card.stateHistory"
                :key="h.columnName + h.enteredAt"
                class="flex items-center justify-between"
              >
                <span :class="!h.exitedAt ? 'text-slate-800 font-medium' : 'text-slate-500'">{{ h.columnName }}</span>
                <span :class="!h.exitedAt ? 'text-blue-600 font-semibold tabular-nums' : 'text-slate-400 tabular-nums'">
                  {{ historyDays(h) }}d
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-4 p-5 overflow-x-auto flex-1 items-start">
      <KanbanColumn
        v-for="col in boardColumns"
        :key="col.id"
        :column="col"
        :createCard="(colId, title) => doCreateCard(colId, title)"
        :isHistorical="isHistorical"
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
import { api, type Board, type Column, type Card, type User, type CardStateHistory } from '@/services/api'
import KanbanColumn from '@/components/KanbanColumn.vue'
import WorkItemAgeChart from '@/components/WorkItemAgeChart.vue'

const route = useRoute()
const router = useRouter()
const boardId = computed(() => Number(route.params.id))
const isAdmin = api.isAdmin()

const board = ref<Board | null>(null)
const error = ref('')
const membersOpen = ref(false)
const allUsers = ref<User[]>([])
const selectedUserId = ref<number | ''>('')

const debugOpen = ref(false)
const analysisOpen = ref(false)
const showSle50 = ref(true)
const showSle85 = ref(true)
const selectedCardId = ref<number | null>(null)
const currentSprintIdx = ref(-1) // -1 = Current (now)
const editingBoardName = ref(false)
const editBoardName = ref('')
const boardNameInput = ref<HTMLInputElement>()

const selectedCard = computed(() => {
  if (!selectedCardId.value || !board.value) return null
  for (const col of board.value.columns) {
    const card = col.cards.find((c) => c.id === selectedCardId.value)
    if (card) return { card, column: col }
  }
  return null
})

const SPRINT_MS = 14 * 86400000

const sprints = computed(() => {
  if (!board.value) return []
  const backlogCol = board.value.columns.find((c) => c.isBacklog)
  if (!backlogCol) return []

  let earliest = Date.now()
  for (const col of board.value.columns) {
    for (const card of col.cards) {
      const be = card.stateHistory.find((s) => s.columnName === backlogCol.name)
      if (be?.exitedAt) {
        const t = new Date(be.exitedAt).getTime()
        if (t < earliest) earliest = t
      }
    }
  }

  const now = Date.now()
  const result: { label: string; endTime: number }[] = []
  let sprintEnd = earliest + SPRINT_MS
  let i = 1
  while (sprintEnd < now) {
    result.push({ label: `Sprint ${i}`, endTime: sprintEnd })
    sprintEnd += SPRINT_MS
    i++
  }
  return result
})

const chartViewDate = computed(() =>
  currentSprintIdx.value === -1 || currentSprintIdx.value >= sprints.value.length
    ? Date.now()
    : sprints.value[currentSprintIdx.value]!.endTime,
)

const sprintLabel = computed(() =>
  currentSprintIdx.value === -1 ? 'Current' : (sprints.value[currentSprintIdx.value]?.label ?? 'Current'),
)

function prevSprint() {
  if (currentSprintIdx.value === -1) currentSprintIdx.value = sprints.value.length - 1
  else if (currentSprintIdx.value > 0) currentSprintIdx.value--
  selectedCardId.value = null
}

function nextSprint() {
  if (currentSprintIdx.value < sprints.value.length - 1) currentSprintIdx.value++
  else currentSprintIdx.value = -1
  selectedCardId.value = null
}

function toggleSelectedCard(cardId: number) {
  selectedCardId.value = selectedCardId.value === cardId ? null : cardId
}

function historyDays(h: CardStateHistory): number {
  const entered = new Date(h.enteredAt).getTime()
  const exited = h.exitedAt ? new Date(h.exitedAt).getTime() : Date.now()
  return Math.round(((exited - entered) / 86400000) * 10) / 10
}

const sortedColumns = computed<Column[]>(() =>
  board.value
    ? [...board.value.columns].sort((a, b) => {
        if (a.isBacklog !== b.isBacklog) return a.isBacklog ? -1 : 1
        return a.position - b.position
      })
    : []
)

const isHistorical = computed(() => currentSprintIdx.value !== -1)

// Start of the viewed sprint: end of the previous sprint (or 0 for sprint 1 / no history)
const viewedSprintStart = computed(() => {
  if (currentSprintIdx.value === -1)
    return sprints.value.at(-1)?.endTime ?? 0
  return currentSprintIdx.value > 0 ? sprints.value[currentSprintIdx.value - 1]!.endTime : 0
})

const doneColName = computed(
  () => sortedColumns.value.filter((c) => !c.isBacklog).at(-1)?.name ?? null,
)

const todoColName = computed(
  () => sortedColumns.value.filter((c) => !c.isBacklog).at(0)?.name ?? null,
)

const boardColumns = computed<Column[]>(() => {
  const t = chartViewDate.value
  const sprintStart = viewedSprintStart.value
  const doneName = doneColName.value
  const allCards = sortedColumns.value.flatMap((c) => c.cards)

  if (!isHistorical.value) {
    // Current view: show live positions but filter Done to current sprint only
    return sortedColumns.value.map((col) => {
      if (col.name !== doneName) return col
      return {
        ...col,
        cards: col.cards.filter((card) => {
          const entry = card.stateHistory.find((s) => s.columnName === doneName)
          return entry ? new Date(entry.enteredAt).getTime() >= sprintStart : false
        }),
      }
    })
  }

  // Historical view: reconstruct board at time t, Done only shows cards completed in this sprint
  const colMap = new Map<string, Card[]>()
  for (const card of allCards) {
    const entry = card.stateHistory.find((s) => {
      const entered = new Date(s.enteredAt).getTime()
      const exited = s.exitedAt ? new Date(s.exitedAt).getTime() : Infinity
      return entered <= t && exited > t
    })
    if (!entry) continue
    if (entry.columnName === doneName && new Date(entry.enteredAt).getTime() < sprintStart) continue
    if (entry.columnName === todoColName.value) continue // not worked on this sprint
    if (!colMap.has(entry.columnName)) colMap.set(entry.columnName, [])
    colMap.get(entry.columnName)!.push(card)
  }
  return sortedColumns.value.map((col) => ({ ...col, cards: colMap.get(col.name) ?? [] }))
})

// Cycle times (days) of cards completed in sprints before the current viewed sprint.
// Used for 85% SLE — based on historical throughput, not the current sprint.
const historicalCycleTimes = computed<number[]>(() => {
  if (!board.value) return []
  const backlogCol = board.value.columns.find((c) => c.isBacklog)
  if (!backlogCol || !doneColName.value) return []
  const cutoff = viewedSprintStart.value // only cards completed before this sprint started
  const times: number[] = []
  for (const col of board.value.columns) {
    for (const card of col.cards) {
      const backlogEntry = card.stateHistory.find((s) => s.columnName === backlogCol.name)
      if (!backlogEntry?.exitedAt) continue
      const startTime = new Date(backlogEntry.exitedAt).getTime()
      const doneEntry = card.stateHistory.find((s) => s.columnName === doneColName.value)
      if (!doneEntry) continue
      const doneTime = new Date(doneEntry.enteredAt).getTime()
      if (doneTime >= cutoff) continue
      const days = (doneTime - startTime) / 86400000
      if (days > 0) times.push(days)
    }
  }
  return times
})

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

function logout() {
  api.logout()
  router.push('/login')
}

onMounted(load)
</script>

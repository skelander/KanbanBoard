<template>
  <div class="bg-gray-200 rounded-xl p-3 flex flex-col gap-2 min-w-64 max-w-64 shrink-0">
    <div class="flex items-center justify-between px-1">
      <h3 class="font-semibold text-gray-700 text-sm truncate">{{ column.name }}</h3>
      <div class="flex items-center gap-2 shrink-0 ml-1">
        <span v-if="column.wipLimit" class="text-xs font-medium" :class="atWipLimit ? 'text-red-500' : 'text-gray-500'">
          {{ localCards.length }}/{{ column.wipLimit }}
        </span>
        <button
          v-if="!column.isBacklog"
          @click="$emit('delete', column.id)"
          class="text-gray-400 hover:text-red-500 transition text-xs"
        >✕</button>
      </div>
    </div>

    <VueDraggable
      v-model="localCards"
      :animation="150"
      group="cards"
      class="flex flex-col gap-2 min-h-8"
      @add="onAdd"
      @update="onUpdate"
    >
      <KanbanCard
        v-for="card in localCards"
        :key="card.id"
        :card="card"
        @delete="$emit('deleteCard', column.id, $event)"
        @update="(id, title, desc) => $emit('editCard', column.id, id, title, desc)"
      />
    </VueDraggable>

    <form @submit.prevent="submitAdd" class="mt-1">
      <input
        v-if="adding"
        ref="addInput"
        v-model="newCardTitle"
        @blur="onBlurAdd"
        @keyup.escape="cancelAdd"
        placeholder="Card title…"
        class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
      <p v-else-if="atWipLimit" class="text-xs text-red-400 px-1 py-1">WIP limit reached</p>
      <button
        v-else
        @click="startAdd"
        class="w-full text-left text-sm text-gray-500 hover:text-gray-700 px-1 py-1 rounded hover:bg-gray-300 transition"
      >
        + Add card
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import KanbanCard from './KanbanCard.vue'
import type { Column, Card } from '@/services/api'

const props = defineProps<{
  column: Column
  createCard: (columnId: number, title: string) => Promise<Card>
}>()

const emit = defineEmits<{
  delete: [columnId: number]
  deleteCard: [columnId: number, cardId: number]
  editCard: [columnId: number, cardId: number, title: string, description: string]
  moveCard: [cardId: number, fromColumnId: number, toColumnId: number, position: number]
}>()

const adding = ref(false)
const newCardTitle = ref('')
const addInput = ref<HTMLInputElement>()

const localCards = ref<Card[]>([...props.column.cards].sort((a, b) => a.position - b.position))
const atWipLimit = computed(() => !!props.column.wipLimit && localCards.value.length >= props.column.wipLimit)

watch(
  () => props.column.cards,
  (cards) => {
    localCards.value = [...cards].sort((a, b) => a.position - b.position)
  },
)

function startAdd() {
  adding.value = true
  nextTick(() => addInput.value?.focus())
}

function cancelAdd() {
  adding.value = false
  newCardTitle.value = ''
}

async function submitAdd() {
  const title = newCardTitle.value.trim()
  if (!title) return
  newCardTitle.value = ''
  adding.value = false
  try {
    await props.createCard(props.column.id, title)
  } catch {
    // parent handles error display
  }
}

function onBlurAdd() {
  if (newCardTitle.value.trim()) {
    submitAdd()
  } else {
    cancelAdd()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onAdd(event: any) {
  const position: number = event.newDraggableIndex
  const card = localCards.value[position]
  if (!card) return
  emit('moveCard', card.id, card.columnId, props.column.id, position)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onUpdate(event: any) {
  const position: number = event.newDraggableIndex
  const card = localCards.value[position]
  if (!card) return
  emit('moveCard', card.id, props.column.id, props.column.id, position)
}
</script>

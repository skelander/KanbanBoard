<template>
  <div class="bg-gray-200 rounded-xl p-3 flex flex-col gap-2 min-w-64 max-w-64 shrink-0">
    <div class="flex items-center justify-between px-1">
      <h3 class="font-semibold text-gray-700 text-sm">{{ column.name }}</h3>
      <div class="flex items-center gap-2">
        <span v-if="column.wipLimit" class="text-xs text-gray-500">
          {{ column.cards.length }}/{{ column.wipLimit }}
        </span>
        <button
          @click="$emit('delete', column.id)"
          class="text-gray-400 hover:text-red-500 transition text-xs"
        >✕</button>
      </div>
    </div>

    <VueDraggable
      v-model="localCards"
      :animation="150"
      group="cards"
      item-key="id"
      class="flex flex-col gap-2 min-h-8"
      @change="onChange"
    >
      <template #item="{ element }">
        <KanbanCard
          :card="element"
          @delete="$emit('deleteCard', column.id, $event)"
        />
      </template>
    </VueDraggable>

    <form @submit.prevent="addCard" class="mt-1">
      <input
        v-if="adding"
        ref="addInput"
        v-model="newCardTitle"
        @blur="cancelAdd"
        @keyup.escape="cancelAdd"
        placeholder="Card title…"
        class="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
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
import { ref, watch, nextTick } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import KanbanCard from './KanbanCard.vue'
import type { Column, Card } from '@/services/api'

const props = defineProps<{ column: Column }>()
const emit = defineEmits<{
  delete: [columnId: number]
  deleteCard: [columnId: number, cardId: number]
  addCard: [columnId: number, title: string]
  moveCard: [cardId: number, fromColumnId: number, toColumnId: number, position: number]
}>()

const adding = ref(false)
const newCardTitle = ref('')
const addInput = ref<HTMLInputElement>()

const localCards = ref<Card[]>([...props.column.cards].sort((a, b) => a.position - b.position))

watch(
  () => props.column.cards,
  (cards) => {
    localCards.value = [...cards].sort((a, b) => a.position - b.position)
  },
  { deep: true },
)

function startAdd() {
  adding.value = true
  nextTick(() => addInput.value?.focus())
}

function cancelAdd() {
  adding.value = false
  newCardTitle.value = ''
}

function addCard() {
  if (!newCardTitle.value.trim()) return
  emit('addCard', props.column.id, newCardTitle.value.trim())
  newCardTitle.value = ''
  adding.value = false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onChange(event: any) {
  if (event.added) {
    const card = event.added.element as Card
    const position: number = event.added.newIndex
    emit('moveCard', card.id, card.columnId, props.column.id, position)
  } else if (event.moved) {
    const card = event.moved.element as Card
    const position: number = event.moved.newIndex
    emit('moveCard', card.id, props.column.id, props.column.id, position)
  }
}
</script>

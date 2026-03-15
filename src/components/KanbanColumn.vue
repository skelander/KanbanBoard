<template>
  <div class="bg-slate-200/70 rounded-xl p-3 flex flex-col gap-2 flex-1 min-w-40">
    <div class="flex items-center justify-between px-1 py-0.5">
      <h3 class="font-semibold text-slate-700 text-sm truncate">{{ column.name }}</h3>
      <span v-if="column.wipLimit" class="text-xs font-semibold shrink-0 ml-2 tabular-nums" :class="atWipLimit ? 'text-red-500' : 'text-slate-400'">
        {{ localCards.length }}/{{ column.wipLimit }}
      </span>
    </div>

    <VueDraggable
      v-model="localCards"
      :animation="150"
      group="cards"
      class="flex flex-col gap-2 min-h-10"
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

    <form @submit.prevent="submitAdd" class="mt-0.5">
      <input
        v-if="adding"
        ref="addInput"
        v-model="newCardTitle"
        @blur="onBlurAdd"
        @keyup.escape="cancelAdd"
        placeholder="Card title…"
        class="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
      />
      <p v-else-if="atWipLimit" class="text-xs text-red-400 px-2 py-1.5">WIP limit reached</p>
      <button
        v-else
        @click="startAdd"
        class="w-full text-left text-sm text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-300/50 transition"
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

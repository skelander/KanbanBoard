<template>
  <div v-if="!editing"
    @click="startEdit"
    class="bg-white rounded-lg shadow-sm p-3.5 cursor-pointer border border-transparent hover:border-blue-300 hover:shadow-md transition group"
  >
    <div class="flex justify-between items-start gap-2">
      <p class="text-sm text-slate-800 font-medium leading-snug">{{ card.title }}</p>
      <button
        @click.stop="$emit('delete', card.id)"
        class="text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 text-xs leading-none mt-0.5"
      >✕</button>
    </div>
    <p v-if="card.description" class="text-xs text-slate-500 mt-1.5 leading-relaxed">{{ card.description }}</p>
    <div class="flex justify-end mt-2">
      <span
        v-if="workItemAge !== null"
        class="text-xs px-1.5 py-0.5 rounded font-medium"
        :class="workItemAge >= 6 ? 'bg-red-100 text-red-600' : workItemAge >= 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'"
        :title="`Card age: ${workItemAge} day${workItemAge !== 1 ? 's' : ''}`"
      >{{ workItemAge === 0 ? 'today' : `${workItemAge}d` }}</span>
    </div>
  </div>

  <div v-else class="bg-white rounded-lg shadow-md p-3.5 border border-blue-400" @click.stop>
    <input
      ref="titleInput"
      v-model="editTitle"
      @keyup.enter="saveEdit"
      @keyup.escape="cancelEdit"
      maxlength="100"
      class="w-full text-sm font-medium text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <p class="text-right text-xs mt-1 mb-2" :class="editTitle.length >= 100 ? 'text-red-500' : 'text-slate-400'">{{ editTitle.length }}/100</p>
    <textarea
      v-model="editDescription"
      @keyup.escape="cancelEdit"
      placeholder="Description (optional)…"
      rows="2"
      maxlength="500"
      class="w-full text-xs text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
    />
    <p class="text-right text-xs mt-1 mb-3" :class="editDescription.length >= 500 ? 'text-red-500' : 'text-slate-400'">{{ editDescription.length }}/500</p>
    <div class="flex gap-2">
      <button @click="saveEdit" class="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition font-medium">Save</button>
      <button @click="cancelEdit" class="text-xs text-slate-500 hover:text-slate-700 transition px-2 py-1.5">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { Card } from '@/services/api'

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{
  delete: [id: number]
  update: [id: number, title: string, description: string]
}>()

// Days since the card left the backlog (first StateHistory exitedAt).
// Returns 0 while the card is still in the backlog.
const workItemAge = computed<number | null>(() => {
  const first = props.card.stateHistory[0]
  if (!first) return null
  if (!first.exitedAt) return 0
  return Math.floor((Date.now() - new Date(first.exitedAt).getTime()) / 86_400_000)
})

const editing = ref(false)
const editTitle = ref('')
const editDescription = ref('')
const titleInput = ref<HTMLInputElement>()

function startEdit() {
  editTitle.value = props.card.title
  editDescription.value = props.card.description ?? ''
  editing.value = true
  nextTick(() => titleInput.value?.focus())
}

function cancelEdit() {
  editing.value = false
}

function saveEdit() {
  if (!editTitle.value.trim()) return
  emit('update', props.card.id, editTitle.value.trim(), editDescription.value.trim())
  editing.value = false
}
</script>

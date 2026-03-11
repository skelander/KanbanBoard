<template>
  <div v-if="!editing"
    @click="startEdit"
    class="bg-white rounded-lg shadow-sm p-3 cursor-pointer border border-transparent hover:border-blue-300 transition group"
  >
    <div class="flex justify-between items-start gap-2">
      <p class="text-sm text-gray-800 font-medium leading-snug">{{ card.title }}</p>
      <button
        @click.stop="$emit('delete', card.id)"
        class="text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 text-xs"
      >✕</button>
    </div>
    <p v-if="card.description" class="text-xs text-gray-500 mt-1">{{ card.description }}</p>
  </div>

  <div v-else class="bg-white rounded-lg shadow-sm p-3 border border-blue-400" @click.stop>
    <input
      ref="titleInput"
      v-model="editTitle"
      @keyup.enter="saveEdit"
      @keyup.escape="cancelEdit"
      class="w-full text-sm font-medium text-gray-800 border border-gray-300 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <textarea
      v-model="editDescription"
      @keyup.escape="cancelEdit"
      placeholder="Description (optional)…"
      rows="2"
      maxlength="200"
      class="w-full text-xs text-gray-600 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
    <p class="text-right text-xs mb-2" :class="editDescription.length >= 200 ? 'text-red-500' : 'text-gray-400'">{{ editDescription.length }}/200</p>
    <div class="flex gap-2">
      <button @click="saveEdit" class="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 transition">Save</button>
      <button @click="cancelEdit" class="text-xs text-gray-500 hover:text-gray-700 transition">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { Card } from '@/services/api'

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{
  delete: [id: number]
  update: [id: number, title: string, description: string]
}>()

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

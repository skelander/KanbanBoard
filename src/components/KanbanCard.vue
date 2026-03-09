<template>
  <div class="bg-white rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing border border-transparent hover:border-blue-300 transition group">
    <div class="flex justify-between items-start gap-2">
      <p class="text-sm text-gray-800 font-medium leading-snug">{{ card.title }}</p>
      <button
        @click.stop="$emit('delete', card.id)"
        class="text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 text-xs"
      >✕</button>
    </div>
    <p v-if="card.description" class="text-xs text-gray-500 mt-1">{{ card.description }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '@/services/api'

defineProps<{ card: Card }>()
defineEmits<{ delete: [id: number] }>()
</script>

<template>
  <div ref="container" class="relative overflow-x-auto p-4">
    <svg :width="svgWidth" :height="svgHeight" class="block">
      <!-- Horizontal grid lines + Y-axis tick labels -->
      <g v-for="tick in yTicks" :key="tick">
        <line
          :x1="PAD_LEFT" :y1="yPos(tick)"
          :x2="svgWidth - PAD_RIGHT" :y2="yPos(tick)"
          stroke="#e2e8f0" stroke-width="1"
        />
        <text
          :x="PAD_LEFT - 6" :y="yPos(tick)"
          text-anchor="end" dominant-baseline="middle"
          fill="#94a3b8" font-size="10"
        >{{ tick }}</text>
      </g>

      <!-- Y-axis line -->
      <line :x1="PAD_LEFT" :y1="PAD_TOP" :x2="PAD_LEFT" :y2="PAD_TOP + CHART_H" stroke="#cbd5e1" stroke-width="1" />

      <!-- Baseline -->
      <line :x1="PAD_LEFT" :y1="PAD_TOP + CHART_H" :x2="svgWidth - PAD_RIGHT" :y2="PAD_TOP + CHART_H" stroke="#cbd5e1" stroke-width="1" />

      <!-- Column vertical guides + X-axis labels -->
      <g v-for="(col, i) in columns" :key="col.id">
        <line
          :x1="xCenter(i)" :y1="PAD_TOP"
          :x2="xCenter(i)" :y2="PAD_TOP + CHART_H"
          stroke="#f1f5f9" stroke-width="1"
        />
        <text
          :x="xCenter(i)" :y="PAD_TOP + CHART_H + 18"
          text-anchor="middle" fill="#64748b" font-size="11"
        >{{ col.name.length > 12 ? col.name.slice(0, 11) + '…' : col.name }}</text>
      </g>

      <!-- No-data label -->
      <text
        v-if="dots.length === 0"
        :x="(svgWidth - PAD_RIGHT + PAD_LEFT) / 2" :y="PAD_TOP + CHART_H / 2"
        text-anchor="middle" dominant-baseline="middle"
        fill="#94a3b8" font-size="13" font-style="italic"
      >No cards on this board yet</text>

      <!-- Dots -->
      <circle
        v-for="dot in dots" :key="dot.cardId"
        :cx="xCenter(dot.colIndex) + dot.jitter"
        :cy="yPos(dot.days)"
        r="6"
        :fill="dot.isDone ? '#22c55e' : '#3b82f6'"
        :fill-opacity="dot.cardId === selectedCardId ? 1 : 0.8"
        :stroke="dot.cardId === selectedCardId ? '#1d4ed8' : 'white'"
        :stroke-width="dot.cardId === selectedCardId ? 2.5 : 1.5"
        class="cursor-pointer"
        @click="emit('select', dot.cardId)"
        @mouseenter="showTooltip($event, dot)"
        @mouseleave="tooltip = null"
      />
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltip && tooltip.cardId !== selectedCardId"
      class="absolute z-10 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 pointer-events-none whitespace-nowrap"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: 'translate(-50%, calc(-100% - 8px))' }"
    >
      <div><span class="text-slate-400">#{{ tooltip.cardId }}</span> {{ tooltip.cardTitle }}</div>
      <div class="text-slate-300 mt-0.5">{{ tooltip.columnName }} · <span class="text-white font-medium">{{ tooltip.days }}d</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Column } from '@/services/api'

const props = defineProps<{
  columns: Column[]
  selectedCardId?: number
}>()

const emit = defineEmits<{ select: [cardId: number] }>()

const PAD_LEFT = 48
const PAD_RIGHT = 24
const PAD_TOP = 16
const PAD_BOTTOM = 40
const CHART_H = 260
const COL_W = 130

const container = ref<HTMLElement>()

const svgWidth = computed(() => PAD_LEFT + props.columns.length * COL_W + PAD_RIGHT)
const svgHeight = PAD_TOP + CHART_H + PAD_BOTTOM

interface Dot {
  cardId: number
  cardTitle: string
  columnName: string
  colIndex: number
  isDone: boolean
  days: number
  jitter: number
}

interface TooltipData extends Dot {
  x: number
  y: number
}

const tooltip = ref<TooltipData | null>(null)

const backlogColName = computed(() => props.columns.find((c) => c.isBacklog)?.name ?? null)

const doneColName = computed(() => {
  const sorted = props.columns.filter((c) => !c.isBacklog).sort((a, b) => a.position - b.position)
  return sorted[sorted.length - 1]?.name ?? null
})

const dots = computed<Dot[]>(() => {
  const now = Date.now()
  if (!backlogColName.value) return []

  return props.columns.flatMap((col, i) =>
    col.cards.flatMap((card) => {
      const backlogEntry = card.stateHistory.find((s) => s.columnName === backlogColName.value)
      if (!backlogEntry?.exitedAt) return [] // not yet started

      const startTime = new Date(backlogEntry.exitedAt).getTime()
      const doneEntry = doneColName.value
        ? card.stateHistory.find((s) => s.columnName === doneColName.value)
        : null
      const endTime = doneEntry ? new Date(doneEntry.enteredAt).getTime() : now

      return [{
        cardId: card.id,
        cardTitle: card.title,
        columnName: col.name,
        colIndex: i,
        isDone: !!doneEntry,
        days: Math.round(((endTime - startTime) / 86400000 + 1) * 10) / 10,
        jitter: ((card.id % 9) - 4) * 5,
      }]
    }),
  )
})

const yMax = computed(() => {
  const max = Math.max(0, ...dots.value.map((d) => d.days))
  if (max <= 5) return 5
  if (max <= 10) return 10
  if (max <= 20) return 20
  return Math.ceil(max / 5) * 5
})

const yTicks = computed(() => {
  const step =
    yMax.value <= 10 ? 1
    : yMax.value <= 20 ? 2
    : yMax.value <= 50 ? 5
    : yMax.value <= 100 ? 10
    : 20
  const ticks: number[] = []
  for (let v = 0; v <= yMax.value; v += step) ticks.push(v)
  return ticks
})

function yPos(days: number): number {
  return PAD_TOP + CHART_H - (days / yMax.value) * CHART_H
}

function xCenter(colIndex: number): number {
  return PAD_LEFT + colIndex * COL_W + COL_W / 2
}

function showTooltip(event: MouseEvent, dot: Dot) {
  const rect = container.value!.getBoundingClientRect()
  tooltip.value = {
    ...dot,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}
</script>

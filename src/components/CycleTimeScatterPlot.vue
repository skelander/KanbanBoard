<template>
  <div ref="container" class="relative overflow-x-auto p-4">
    <svg :width="svgWidth" :height="svgHeight" class="block">
      <!-- Chart area border -->
      <rect
        :x="PAD_LEFT" :y="PAD_TOP"
        :width="CHART_W" :height="CHART_H"
        fill="white" stroke="#cbd5e1" stroke-width="1"
      />

      <!-- Horizontal grid lines + Y-axis tick labels -->
      <g v-for="tick in yTicks" :key="tick">
        <line
          :x1="PAD_LEFT" :y1="yPos(tick)"
          :x2="PAD_LEFT + CHART_W" :y2="yPos(tick)"
          stroke="#e2e8f0" stroke-width="1"
        />
        <text
          :x="PAD_LEFT - 6" :y="yPos(tick)"
          text-anchor="end" dominant-baseline="middle"
          fill="#94a3b8" font-size="10"
        >{{ tick }}</text>
      </g>

      <!-- X-axis date labels -->
      <text
        v-for="tick in xTicks" :key="tick.time"
        :x="xPos(tick.time)" :y="PAD_TOP + CHART_H + 18"
        text-anchor="middle" fill="#64748b" font-size="10"
      >{{ tick.label }}</text>

      <!-- No-data label -->
      <text
        v-if="dots.length === 0"
        :x="PAD_LEFT + CHART_W / 2" :y="PAD_TOP + CHART_H / 2"
        text-anchor="middle" dominant-baseline="middle"
        fill="#94a3b8" font-size="13" font-style="italic"
      >No completed items yet</text>

      <!-- 50% percentile line -->
      <g v-if="showPct50 !== false && pct50 !== null">
        <line
          :x1="PAD_LEFT" :y1="yPos(pct50 ?? 0)"
          :x2="PAD_LEFT + CHART_W" :y2="yPos(pct50 ?? 0)"
          stroke="#a855f7" stroke-width="1.5" stroke-dasharray="6 3"
        />
        <text
          :x="PAD_LEFT + CHART_W + 4" :y="yPos(pct50 ?? 0)"
          dominant-baseline="middle" fill="#a855f7" font-size="9" font-weight="600"
        >50% {{ pct50 }}d</text>
      </g>

      <!-- 85% percentile line -->
      <g v-if="showPct85 !== false && pct85 !== null">
        <line
          :x1="PAD_LEFT" :y1="yPos(pct85 ?? 0)"
          :x2="PAD_LEFT + CHART_W" :y2="yPos(pct85 ?? 0)"
          stroke="#f97316" stroke-width="1.5" stroke-dasharray="6 3"
        />
        <text
          :x="PAD_LEFT + CHART_W + 4" :y="yPos(pct85 ?? 0)"
          dominant-baseline="middle" fill="#f97316" font-size="9" font-weight="600"
        >85% {{ pct85 }}d</text>
      </g>

      <!-- Dots -->
      <circle
        v-for="dot in dots" :key="dot.cardId"
        :cx="xPos(dot.completedAt)"
        :cy="yPos(dot.days)"
        r="6"
        fill="#22c55e"
        :fill-opacity="dot.cardId === selectedCardId ? 1 : 0.7"
        :stroke="dot.cardId === selectedCardId ? '#15803d' : 'white'"
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
      <div class="text-slate-300 mt-0.5">
        Completed {{ formatDate(new Date(tooltip.completedAt)) }} · Cycle time <span class="text-white font-medium">{{ tooltip.days }}d</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Column } from '@/services/api'

const props = defineProps<{
  columns: Column[]
  selectedCardId?: number
  viewDate?: number // timestamp; defaults to now
  showPct50?: boolean
  showPct85?: boolean
}>()

const emit = defineEmits<{ select: [cardId: number] }>()

const PAD_LEFT = 48
const PAD_RIGHT = 72
const PAD_TOP = 16
const PAD_BOTTOM = 40
const CHART_H = 260
const CHART_W = 600

const svgWidth = PAD_LEFT + CHART_W + PAD_RIGHT
const svgHeight = PAD_TOP + CHART_H + PAD_BOTTOM

const container = ref<HTMLElement>()

interface Dot {
  cardId: number
  cardTitle: string
  days: number
  completedAt: number
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
  const t = props.viewDate ?? Date.now()
  if (!backlogColName.value || !doneColName.value) return []

  const result: Dot[] = []
  for (const card of props.columns.flatMap((c) => c.cards)) {
    const backlogEntry = card.stateHistory.find((s) => s.columnName === backlogColName.value)
    if (!backlogEntry?.exitedAt) continue
    const startTime = new Date(backlogEntry.exitedAt).getTime()

    const doneEntry = card.stateHistory.find((s) => s.columnName === doneColName.value)
    if (!doneEntry) continue
    const completedAt = new Date(doneEntry.enteredAt).getTime()
    if (completedAt > t) continue

    const days = Math.round(((completedAt - startTime) / 86400000 + 1) * 10) / 10
    if (days <= 0) continue

    result.push({ cardId: card.id, cardTitle: card.title, days, completedAt })
  }
  return result.sort((a, b) => a.completedAt - b.completedAt)
})

function percentile(pct: number): number | null {
  if (dots.value.length < 2) return null
  const sorted = [...dots.value.map((d) => d.days)].sort((a, b) => a - b)
  const idx = Math.ceil(pct * sorted.length) - 1
  return Math.round(sorted[idx]! * 10) / 10
}

const pct50 = computed<number | null>(() => percentile(0.5))
const pct85 = computed<number | null>(() => percentile(0.85))

const yMax = computed(() => {
  const max = Math.max(0, ...dots.value.map((d) => d.days), pct50.value ?? 0, pct85.value ?? 0)
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

const xMin = computed(() => {
  if (dots.value.length === 0) return (props.viewDate ?? Date.now()) - 30 * 86400000
  return dots.value[0]!.completedAt - 86400000
})

const xMax = computed(() => props.viewDate ?? Date.now())

function xPos(time: number): number {
  const range = xMax.value - xMin.value
  if (range === 0) return PAD_LEFT + CHART_W / 2
  return PAD_LEFT + ((time - xMin.value) / range) * CHART_W
}

const xTicks = computed(() => {
  const rangeDays = (xMax.value - xMin.value) / 86400000
  const intervalDays =
    rangeDays <= 30 ? 7
    : rangeDays <= 60 ? 14
    : rangeDays <= 180 ? 28
    : 56
  const intervalMs = intervalDays * 86400000
  const firstTick = Math.ceil(xMin.value / intervalMs) * intervalMs
  const ticks: { time: number; label: string }[] = []
  for (let t = firstTick; t <= xMax.value; t += intervalMs) {
    ticks.push({ time: t, label: formatDate(new Date(t)) })
  }
  return ticks
})

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

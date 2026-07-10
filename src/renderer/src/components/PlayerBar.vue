<template>
  <div ref="barRef" class="player-bar">
    <div class="player-inner">
      <!-- 进度条 -->
      <div class="progress-track-full" @click="handleProgressClick" @pointerdown="onProgressDown" @pointermove="onProgressMove" @pointerup="onProgressUp" ref="progressRef">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        <div class="progress-glow" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <!-- 控件行 -->
      <div class="player-controls-row">
        <!-- 左：歌曲信息 -->
        <div class="player-left" @click="$emit('showDetail')" style="cursor: pointer">
          <div ref="miniCoverRef" class="mini-cover" :class="{ spinning: isCoverSpinning }">
            <img
              v-if="state.coverUrl && state.currentTrack"
              :src="state.coverUrl"
              alt=""
              @error="onCoverError"
            />
            <div v-else class="mini-cover-empty">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
          </div>
          <div class="player-track-info">
            <span class="pt-name">{{ state.currentTrack?.name || '—' }}</span>
            <span class="pt-singer">{{ state.currentTrack?.singer || '' }}</span>
          </div>
        </div>

        <!-- 中：控制 -->
        <div class="player-center">
          <div class="controls-row">
            <button class="ctrl" title="上一首" @click="emit('prev')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 20L9 12l10-8v16z"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
            </button>
            <button ref="playBtnRef" class="ctrl-main" @click="handlePlayClick" :title="state.isPlaying ? '暂停' : '播放'">
              <div class="ctrl-main-glow"></div>
              <svg v-if="!state.isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button class="ctrl" title="下一首" @click="emit('next')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l10 8-10 8V4z"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            </button>
          </div>
          <div class="time-row">
            <span class="time">{{ formatTime(state.currentTime) }}</span>
            <span class="time-sep">/</span>
            <span class="time">{{ formatTime(state.duration) }}</span>
          </div>
        </div>

        <!-- 右：音量 + 歌词 -->
        <div class="player-right">
          <div class="volume-group" @wheel.prevent="handleWheel">
            <button class="tool-btn" @click="toggleMute">
              <svg v-if="state.volume === 0 || isMuted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
            </button>
            <input
              type="range"
              class="vol-slider"
              :style="{ '--vol-percent': (state.volume * 100) + '%' }"
              min="0" max="1" step="0.01"
              :value="state.volume"
              @input="handleVolumeInput"
            />
            <span class="vol-percent">{{ Math.round(state.volume * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import type { PlayerState } from '../composables/usePlayer'

let ctx: gsap.Context | null = null

const props = defineProps<{
  state: PlayerState
}>()

const emit = defineEmits<{
  togglePlay: []
  prev: []
  next: []
  seek: [time: number]
  volume: [vol: number]
  showDetail: []
}>()

const isMuted = ref(false)
const prevVolume = ref(0.8)
const isCoverSpinning = ref(false)
const progressRef = ref<HTMLElement | null>(null)
const playBtnRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)
const miniCoverRef = ref<HTMLElement | null>(null)

const progressPercent = computed(() => {
  if (!props.state.duration) return 0
  return (props.state.currentTime / props.state.duration) * 100
})

const formatTime = (seconds: number) => {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

let isDraggingProgress = false

const handleProgressClick = (e: MouseEvent) => {
  if (isDraggingProgress) return
  if (!progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  emit('seek', percent * props.state.duration)
}

const onProgressDown = (e: PointerEvent) => {
  isDraggingProgress = true
  if (!progressRef.value) return
  progressRef.value.setPointerCapture(e.pointerId)
  seekFromEvent(e)
}

const onProgressMove = (e: PointerEvent) => {
  if (!isDraggingProgress) return
  seekFromEvent(e)
}

const onProgressUp = () => {
  isDraggingProgress = false
}

function seekFromEvent(e: PointerEvent) {
  if (!progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  emit('seek', percent * props.state.duration)
}

const handleVolumeInput = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  isMuted.value = false
  emit('volume', val)
}

const toggleMute = () => {
  if (isMuted.value) {
    isMuted.value = false
    emit('volume', prevVolume.value)
  } else {
    prevVolume.value = props.state.volume
    isMuted.value = true
    emit('volume', 0)
  }
}

const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  const newVol = Math.max(0, Math.min(1, props.state.volume + delta))
  isMuted.value = false
  emit('volume', newVol)
}

const onCoverError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.display = 'none'
}

// 入场动画
onMounted(() => {
  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    if (barRef.value) {
      gsap.fromTo(barRef.value,
        { y: 60, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', delay: 0.4 }
      )
    }
  }, barRef.value)
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
})

// 播放按钮点击脉冲
watch(() => props.state.isPlaying, (v) => {
  isCoverSpinning.value = v
}, { immediate: true })

const handlePlayClick = () => {
  if (playBtnRef.value) {
    gsap.fromTo(playBtnRef.value,
      { scale: 0.85 },
      { scale: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.35)' }
    )
    // 发光脉冲
    const glow = playBtnRef.value.querySelector('.ctrl-main-glow') as HTMLElement
    if (glow) {
      gsap.fromTo(glow,
        { opacity: 0.6, scale: 1 },
        { opacity: 0, scale: 2, duration: 0.6, ease: 'power2.out' }
      )
    }
  }
  emit('togglePlay')
}

// 播放状态变化 → 按钮脉冲 + 封面弹跳
watch(() => props.state.isPlaying, (playing) => {
  if (playBtnRef.value) {
    gsap.fromTo(playBtnRef.value,
      { scale: playing ? 0.85 : 1.15 },
      { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.3)' }
    )
  }
  if (miniCoverRef.value) {
    // 只做 scale 弹跳，rotation 交给 CSS .spinning 类的动画控制
    gsap.fromTo(miniCoverRef.value,
      { scale: 0.8 },
      { scale: 1, duration: 0.6, ease: 'back.out(1.5)',
        onComplete: () => {
          // 清除 GSAP 内联样式，让 CSS 动画完全接管
          gsap.set(miniCoverRef.value!, { clearProps: 'scale,rotation' })
        }
      }
    )
  }
})

onBeforeUnmount(() => {
  gsap.killTweensOf(playBtnRef.value)
})
</script>

<style scoped>
.player-bar {
  flex-shrink: 0;
  margin: 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0;
  background: rgba(180, 160, 220, 0.15);
  border-top: 1px solid rgba(180, 160, 220, 0.2);
  border-radius: 16px 16px 24px 24px;
  backdrop-filter: blur(10px) saturate(1.5);
  -webkit-backdrop-filter: blur(10px) saturate(1.5);
}

/* 顶部折射线 */
.player-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.06) 75%, transparent 100%);
  pointer-events: none;
}

/* 全宽进度条 */
.progress-track-full {
  width: calc(100% - 80px);
  margin: 0 40px;
  height: 5px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  position: relative;
  border-radius: 3px;
  margin-bottom: 10px;
  transition: background var(--t-fast);
}

.progress-track-full:hover {
  background: rgba(255, 255, 255, 0.18);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--amber-dim), var(--amber));
  border-radius: 0 2px 2px 0;
  transition: width 0.1s linear;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 50%;
  transform: translateY(-50%) scale(0);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 12px var(--amber-glow-lg);
  transition: transform var(--t-fast);
}

.progress-track-full:hover .progress-fill::after {
  transform: translateY(-50%) scale(1);
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--amber-glow-md));
  filter: blur(6px);
  pointer-events: none;
  transition: width 0.1s linear;
}

.player-inner {
  display: flex;
  flex-direction: column;
  padding: 8px var(--space-xl) 10px;
  gap: 0;
}
.player-controls-row {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

/* 左 */
.player-left {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 240px;
  flex-shrink: 0;
}

.mini-cover {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
}

.mini-cover.spinning {
  border-radius: 50%;
  animation: vinyl-spin 4s linear infinite;
  border-color: var(--amber-border);
  box-shadow: 0 0 20px var(--amber-glow-sm), 0 2px 12px rgba(0, 0, 0, 0.3);
}

@keyframes vinyl-spin { to { transform: rotate(360deg); } }

.mini-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-cover-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-ghost);
}

.player-track-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.pt-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-cream);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pt-singer {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 中 */
.player-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.ctrl {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 10px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all var(--t-fast);
  width: 36px;
  height: 36px;
}

.ctrl:hover {
  color: var(--text-cream);
  background: rgba(0, 0, 0, 0.1);
}

.ctrl-main {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  color: #0d0b14;
  transition: all var(--t-fast);
  box-shadow: 0 4px 30px var(--amber-glow-lg);
  position: relative;
  overflow: hidden;
}

.ctrl-main:hover {
  box-shadow: 0 8px 40px var(--amber-shadow);
  transform: scale(1.05);
}

/* 播放按钮发光脉冲 */
.ctrl-main-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 60%);
  opacity: 0;
  pointer-events: none;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-ghost);
  font-variant-numeric: tabular-nums;
}

.time-sep {
  font-size: 10px;
  color: var(--text-ghost);
  opacity: 0.4;
}

/* 右 */
.player-right {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 180px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all var(--t-fast);
  position: relative;
}

.tool-btn:hover,
.tool-btn.active {
  color: var(--amber);
  background: rgba(255, 255, 255, 0.08);
}

.volume-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.vol-percent {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-ghost);
  min-width: 32px;
  text-align: right;
}

.vol-slider {
  width: 70px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, var(--amber) 0%, var(--amber) var(--vol-percent, 43%), rgba(255, 255, 255, 0.08) var(--vol-percent, 43%), rgba(255, 255, 255, 0.08) 100%);
  border-radius: 3px;
  outline: none;
}

.vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--amber);
  cursor: pointer;
  box-shadow: 0 0 8px var(--amber-glow-lg);
}

</style>

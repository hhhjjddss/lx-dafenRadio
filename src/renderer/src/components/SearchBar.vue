<template>
  <div ref="sectionRef" class="search-section">
    <div ref="wrapRef" class="search-wrap" :class="{ focused: isFocused }">
      <!-- 玻璃折射层 -->
      <div class="glass-shine"></div>
      <!-- 光标跟踪光晕 -->
      <div class="cursor-glow" ref="glowRef"></div>

      <div class="search-icon-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="7"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>
      <input
        ref="inputRef"
        v-model="keyword"
        class="search-input"
        type="text"
        placeholder="搜索歌曲、歌手或专辑…"
        @keydown.enter="handleSearch"
        @focus="onFocus"
        @blur="onBlur"
        @mousemove="onMouseMove"
      />
      <button v-if="keyword" class="clear-btn" @click="clearInput">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <button
        ref="btnRef"
        class="search-trigger"
        :disabled="!keyword.trim() || searching"
        @click="handleSearch"
        @mouseenter="onBtnHover"
      >
        <span v-if="searching" class="dots">
          <span></span><span></span><span></span>
        </span>
        <span v-else>GO</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

let ctx: gsap.Context | null = null

const props = defineProps<{
  searching: boolean
}>()

const emit = defineEmits<{
  search: [keyword: string]
  clear: []
}>()

const keyword = ref('')
const isFocused = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const sectionRef = ref<HTMLElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const glowRef = ref<HTMLElement | null>(null)
const btnRef = ref<HTMLElement | null>(null)

// 入场动画
onMounted(() => {
  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    if (sectionRef.value) {
      gsap.fromTo(sectionRef.value,
        { y: -20, autoAlpha: 0, scale: 0.97 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.out', delay: 0.2 }
      )
    }
  }, sectionRef.value)
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
})

const onFocus = () => {
  isFocused.value = true
  if (wrapRef.value) {
    gsap.to(wrapRef.value, {
      scale: 1.01,
      duration: 0.4,
      ease: 'power2.out'
    })
  }
}

const onBlur = () => {
  isFocused.value = false
  if (wrapRef.value) {
    gsap.to(wrapRef.value, {
      scale: 1,
      duration: 0.4,
      ease: 'power2.out'
    })
  }
}

// 鼠标跟踪光晕
const onMouseMove = (e: MouseEvent) => {
  if (!wrapRef.value || !glowRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  gsap.to(glowRef.value, {
    x: x - 60,
    y: y - 60,
    duration: 0.4,
    ease: 'power2.out'
  })
}

// 按钮 hover 磁吸
const onBtnHover = () => {
  if (!btnRef.value) return
  gsap.fromTo(btnRef.value,
    { scale: 1 },
    { scale: 1.06, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1 }
  )
}

const handleSearch = () => {
  if (keyword.value.trim() && !props.searching) {
    // 搜索按钮脉冲
    if (wrapRef.value) {
      gsap.fromTo(wrapRef.value,
        { boxShadow: '0 0 0 0 rgba(212, 168, 83, 0)' },
        { boxShadow: '0 0 0 6px rgba(212, 168, 83, 0)', duration: 0.6, ease: 'power2.out',
          keyframes: [
            { boxShadow: '0 0 0 3px rgba(212, 168, 83, 0.25)', duration: 0.15 },
            { boxShadow: '0 0 0 6px rgba(212, 168, 83, 0)', duration: 0.45 }
          ]
        }
      )
    }
    emit('search', keyword.value.trim())
  }
}

const clearInput = () => {
  keyword.value = ''
  emit('clear')
  inputRef.value?.focus()
}
</script>

<style scoped>
.search-section {
  padding: var(--space-lg) var(--space-xl) var(--space-md);
  flex-shrink: 0;
}

.search-wrap {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 0 6px 0 16px;
  transition: border-color var(--t-normal), box-shadow var(--t-normal), background var(--t-normal);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.search-wrap.focused {
  border-color: rgba(212, 168, 83, 0.3);
  box-shadow: 0 0 0 3px rgba(212, 168, 83, 0.1), 0 4px 30px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.08);
}

/* 玻璃折射高光 */
.glass-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.04) 100%);
  pointer-events: none;
}

/* 鼠标跟踪光晕 */
.cursor-glow {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--amber-glow-sm) 0%, transparent 65%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
  top: 0;
  left: 0;
}

.search-wrap.focused .cursor-glow {
  opacity: 1;
}

.search-icon-wrap {
  color: var(--text-ghost);
  flex-shrink: 0;
  transition: color var(--t-fast);
  position: relative;
  z-index: 1;
}

.search-wrap.focused .search-icon-wrap {
  color: var(--amber-dim);
  filter: drop-shadow(0 0 4px var(--amber-highlight));
}

.search-input {
  flex: 1;
  height: 50px;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 400;
  color: var(--text-cream);
  background: transparent;
  position: relative;
  z-index: 1;
}

.search-input::placeholder {
  color: var(--text-ghost);
  font-style: italic;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--r-full);
  color: var(--text-muted);
  transition: all var(--t-fast);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.clear-btn:hover {
  color: var(--text-cream);
  background: rgba(255, 255, 255, 0.08);
}

.search-trigger {
  height: 42px;
  padding: 0 28px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  color: #0d0b14;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  transition: all var(--t-fast);
  flex-shrink: 0;
  box-shadow: 0 4px 30px var(--amber-glow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  position: relative;
  z-index: 1;
  box-shadow: 0 2px 12px var(--amber-glow-md);
}

.search-trigger:hover:not(:disabled) {
  box-shadow: 0 8px 32px var(--amber-shadow);
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.search-trigger:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.dots {
  display: flex;
  gap: 3px;
  align-items: center;
}

.dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--bg-deep);
  animation: dotPulse 1s ease-in-out infinite;
}

.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes dotPulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

</style>

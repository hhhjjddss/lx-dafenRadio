<template>
  <div ref="panelRef" class="lyrics-panel">
    <!-- 玻璃折射层 -->
    <div class="panel-refraction"></div>

    <div class="lyrics-scroll" ref="scrollContainer">
      <template v-if="parsedLines.length > 0">
        <div class="lyrics-spacer"></div>
        <div
          v-for="(line, index) in parsedLines"
          :key="index"
          class="lyric-line"
          :class="{
            active: index === activeLineIndex,
            past: index < activeLineIndex
          }"
          :ref="(el) => { if (index === activeLineIndex) activeLineRef = el as HTMLElement }"
        >
          <span class="lyric-main">{{ line.text }}</span>
          <span v-if="line.translation" class="lyric-trans">{{ line.translation }}</span>
          <!-- 活跃行光晕 -->
          <div v-if="index === activeLineIndex" class="line-glow"></div>
        </div>
        <div class="lyrics-spacer"></div>
      </template>
      <div v-else class="no-lyrics">
        <div ref="noLyricsIconRef" class="no-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.15">
            <path d="M4 6h16M4 10h12M4 14h8M4 18h6"/>
          </svg>
        </div>
        <p>{{ currentTime > 0 ? '当前歌曲暂无歌词' : '播放歌曲后显示歌词' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let ctx: gsap.Context | null = null

const props = defineProps<{
  lyric: string
  tlyric: string
  currentTime: number
}>()

defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const activeLineRef = ref<HTMLElement | null>(null)
const noLyricsIconRef = ref<HTMLElement | null>(null)

interface LyricLine {
  time: number
  text: string
  translation: string
}

const parsedLines = computed<LyricLine[]>(() => {
  if (!props.lyric) return []

  const mainLines = parseLrc(props.lyric)
  const transLines = parseLrc(props.tlyric)
  const transMap = new Map<number, string>()
  transLines.forEach((l) => transMap.set(l.time, l.text))

  return mainLines.map((line) => ({
    ...line,
    translation: transMap.get(line.time) || ''
  }))
})

const activeLineIndex = computed(() => {
  if (!parsedLines.value.length) return -1
  let idx = -1
  for (let i = 0; i < parsedLines.value.length; i++) {
    if (parsedLines.value[i].time <= props.currentTime) {
      idx = i
    }
  }
  return idx
})

// 面板入场动画
onMounted(async () => {
  await nextTick()

  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    // 时间线编排入场
    const tl = gsap.timeline()
    if (panelRef.value) {
      tl.fromTo(panelRef.value,
        { x: 320, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }
      )
    }
    const lines = scrollContainer.value?.querySelectorAll('.lyric-line')
    if (lines?.length) {
      tl.fromTo(lines,
        { y: 12, autoAlpha: 0, scale: 0.97 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.025, ease: 'power3.out' },
        '-=0.3'
      )
    }
    // 空状态图标浮动
    if (noLyricsIconRef.value) {
      gsap.to(noLyricsIconRef.value, {
        y: -6,
        duration: 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      })
    }

    // ScrollTrigger 歌词滚动触发 - 远离中心的行变暗缩小
    if (scrollContainer.value && lines?.length) {
      ScrollTrigger.batch('.lyric-line', {
        scroller: scrollContainer.value,
        start: 'top 85%',
        end: 'bottom 15%',
        onToggle: (self) => {
          if (self.isActive) {
            gsap.to(self.targets, {
              autoAlpha: 1,
              scale: 1,
              duration: 0.3,
              overwrite: 'auto'
            })
          }
        }
      })
    }
  }, panelRef.value)
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
  ScrollTrigger.getAll().forEach(t => t.kill()) // 清理ScrollTrigger
})

// GSAP 平滑滚动歌词 + 活跃行动画
watch(activeLineIndex, async (newIdx) => {
  if (newIdx >= 0 && activeLineRef.value && scrollContainer.value) {
    await nextTick()
    const container = scrollContainer.value
    const el = activeLineRef.value
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2

    gsap.to(container, {
      scrollTop: container.scrollTop + offset,
      duration: 0.7,
      ease: 'power2.inOut'
    })

    // 活跃行弹入
    gsap.fromTo(el,
      { scale: 0.96 },
      { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
    )
  }
})

function parseLrc(lrc: string): { time: number; text: string }[] {
  if (!lrc) return []
  const result: { time: number; text: string }[] = []
  for (const line of lrc.split('\n')) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{1,3})\](.*)/)
    if (match) {
      const min = parseInt(match[1])
      const sec = parseInt(match[2])
      const ms = parseInt(match[3].padEnd(3, '0'))
      const time = min * 60 + sec + ms / 1000
      const text = match[4].trim()
      if (text) result.push({ time, text })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}
</script>

<style scoped>
.lyrics-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 整面玻璃折射 */
.panel-refraction {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(255,255,255,0.03) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.015) 100%);
  pointer-events: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.header-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--text-ghost);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--text-ghost);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all var(--t-fast);
}

.close-btn:hover {
  color: var(--text-cream);
  background: rgba(255, 255, 255, 0.08);
}

.lyrics-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 32px;
  position: relative;
  z-index: 1;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

.lyrics-spacer {
  height: 45%;
}

.lyric-line {
  padding: 10px 0;
  text-align: center;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.lyric-main {
  display: block;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 400;
  color: var(--text-ghost);
  line-height: 1.7;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.lyric-trans {
  display: block;
  font-size: 12px;
  color: var(--text-ghost);
  opacity: 0.4;
  margin-top: 3px;
  line-height: 1.4;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.lyric-line.active .lyric-main {
  font-size: 22px;
  font-weight: 500;
  font-style: italic;
  color: var(--amber);
  text-shadow: 0 0 24px var(--amber-highlight), 0 2px 8px rgba(0,0,0,0.2);
}

.lyric-line.active .lyric-trans {
  opacity: 0.7;
  color: var(--text-muted);
  font-style: italic;
}

.lyric-line.past .lyric-main {
  opacity: 0.6;
}

.lyric-line.past .lyric-trans {
  opacity: 0.3;
}

/* 活跃行光晕 */
.line-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(ellipse, var(--amber-glow-sm) 0%, transparent 65%);
  pointer-events: none;
  filter: blur(12px);
}

.no-lyrics {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 14px;
}

.no-icon {
  opacity: 0.6;
  filter: drop-shadow(0 0 12px var(--amber-glow-sm));
}

.no-lyrics p {
  font-family: var(--font-display);
  font-size: 13px;
  font-style: italic;
  color: var(--text-ghost);
}
</style>

<template>
  <div class="search-results">
    <!-- 加载中 -->
    <div v-if="searching" class="loading-state">
      <div class="loading-rings">
        <div class="ring r1"></div>
        <div class="ring r2"></div>
        <div class="ring r3"></div>
      </div>
      <p class="loading-text">正在搜索</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="results.length === 0" class="empty-state">
      <div ref="emptyRef" class="empty-vinyl">
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6" stroke-dasharray="2 3"/>
          <circle cx="12" cy="12" r="2.5"/>
        </svg>
      </div>
      <p class="empty-hint">输入关键词，发现你的音乐</p>
    </div>

    <!-- 结果列表 -->
    <div v-else class="results-list">
      <div class="results-meta">
        <span class="meta-text">{{ results.length }} 首歌曲</span>
      </div>
      <div class="results-scroll">
        <!-- 表头 -->
        <div class="list-header">
          <span class="col-idx">#</span>
          <span class="col-title">标题</span>
          <span class="col-artist">艺术家</span>
          <span class="col-album">专辑</span>
          <span class="col-dur">时长</span>
          <span class="col-play"></span>
        </div>
        <!-- 列表 -->
        <div
          v-for="(item, index) in results"
          :key="item.songmid"
          class="list-row"
          :class="{ active: currentTrack?.songmid === item.songmid }"
          @click="$emit('play', item)"
          @mouseenter="onRowHover($event)"
          @mouseleave="onRowLeave($event)"
        >
          <span class="col-idx">
            <template v-if="currentTrack?.songmid === item.songmid">
              <span class="eq">
                <span></span><span></span><span></span>
              </span>
            </template>
            <template v-else>{{ String(index + 1).padStart(2, '0') }}</template>
          </span>
          <span class="col-title">
            <span class="title-text">{{ item.name }}</span>
          </span>
          <span class="col-artist">{{ item.singer }}</span>
          <span class="col-album">{{ item.album || '—' }}</span>
          <span class="col-dur">{{ item.duration ? formatDuration(item.duration) : '—' }}</span>
          <span class="col-play">
            <button class="row-play-btn" @click.stop="$emit('play', item)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </span>
          <!-- 行玻璃高光 -->
          <div class="row-shine"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { MusicInfo } from '../composables/useSource'

let ctx: gsap.Context | null = null

const props = defineProps<{
  results: MusicInfo[]
  searching: boolean
  currentTrack: MusicInfo | null
}>()

defineEmits<{
  play: [track: MusicInfo]
}>()

const emptyRef = ref<HTMLElement | null>(null)

const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// 行 hover 动画
const onRowHover = (e: MouseEvent) => {
  const row = e.currentTarget as HTMLElement
  gsap.to(row, {
    x: 4,
    duration: 0.25,
    ease: 'power2.out'
  })
  const shine = row.querySelector('.row-shine') as HTMLElement
  if (shine) {
    gsap.to(shine, { opacity: 1, duration: 0.3 })
  }
}

const onRowLeave = (e: MouseEvent) => {
  const row = e.currentTarget as HTMLElement
  gsap.to(row, {
    x: 0,
    duration: 0.25,
    ease: 'power2.out'
  })
  const shine = row.querySelector('.row-shine') as HTMLElement
  if (shine) {
    gsap.to(shine, { opacity: 0, duration: 0.3 })
  }
}

// 搜索结果交错入场
watch(() => props.results, async (newResults) => {
  if (newResults.length > 0) {
    await nextTick()
    // 清理之前的动画
    ctx?.revert()
    ScrollTrigger.getAll().forEach(t => t.kill())
    const rows = document.querySelectorAll('.list-row')
    if (rows.length) {
      // gsap.context 作用域管理
      ctx = gsap.context(() => {
        // 时间线编排列表入场
        const tl = gsap.timeline()
        tl.fromTo(rows,
          { y: 16, autoAlpha: 0, filter: 'blur(4px)' },
          {
            y: 0,
            autoAlpha: 1,
            filter: 'blur(0px)',
            duration: 0.45,
            stagger: 0.035,
            ease: 'power3.out',
            overwrite: 'auto'
          }
        )

        // ScrollTrigger 滚动渐入 - 新滚入视口的行渐入
        const scrollContainer = document.querySelector('.results-scroll')
        if (scrollContainer) {
          ScrollTrigger.batch('.list-row', {
            scroller: scrollContainer,
            start: 'top 95%',
            onEnter: (elements) => {
              gsap.fromTo(elements,
                { autoAlpha: 0.3, y: 8 },
                { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.02, overwrite: 'auto' }
              )
            },
            once: true
          })
        }
      })
    }
  }
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
  ScrollTrigger.getAll().forEach(t => t.kill()) // 清理ScrollTrigger
})
</script>

<style scoped>
.search-results {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 var(--space-xl);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 20px;
}

.loading-rings {
  position: relative;
  width: 80px;
  height: 80px;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--amber);
  filter: drop-shadow(0 0 4px var(--amber-highlight));
}

.r1 { animation: spin 1.2s linear infinite; }
.r2 { inset: 6px; border-top-color: var(--copper); animation: spin 1.8s linear infinite reverse; }
.r3 { inset: 12px; border-top-color: var(--amber-dim); animation: spin 2.4s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text {
  font-family: var(--font-display);
  font-size: 14px;
  font-style: italic;
  color: var(--text-muted);
  letter-spacing: 2px;
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
}

.empty-vinyl {
  animation: slowSpin 20s linear infinite;
  filter: drop-shadow(0 0 20px var(--amber-glow-sm));
}

@keyframes slowSpin { to { transform: rotate(360deg); } }

.empty-hint {
  font-family: var(--font-display);
  font-size: 15px;
  font-style: italic;
  color: var(--text-ghost);
}

/* Results */
.results-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.results-meta {
  padding-bottom: var(--space-sm);
  flex-shrink: 0;
}

.meta-text {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-ghost);
}

.results-scroll {
  flex: 1;
  overflow-y: auto;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 0 16px 12px;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 6px;
}

.list-header span {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-ghost);
}

.col-idx { width: 42px; flex-shrink: 0; text-align: left; }
.col-title { flex: 2; min-width: 0; }
.col-artist { flex: 1.2; min-width: 0; }
.col-album { flex: 1; min-width: 0; }
.col-dur { width: 56px; text-align: right; flex-shrink: 0; }
.col-play { width: 36px; text-align: center; flex-shrink: 0; }

.list-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  transition: all var(--t-fast);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
}

.list-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.list-row.active {
  background: rgba(212, 168, 83, 0.12);
  border-color: rgba(212, 168, 83, 0.2);
  box-shadow: 0 0 30px rgba(212, 168, 83, 0.08);
}

.list-row.active .title-text {
  color: var(--amber);
  text-shadow: 0 0 12px var(--amber-highlight);
}

/* 行玻璃高光 */
.row-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%);
  pointer-events: none;
  opacity: 0;
}

/* Index / EQ */
.col-idx {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-ghost);
}

.eq {
  display: inline-flex;
  gap: 2px;
  align-items: flex-end;
  height: 12px;
}

.eq span {
  width: 2.5px;
  background: var(--amber);
  border-radius: 1px;
  animation: eqBar 0.7s ease-in-out infinite;
  filter: drop-shadow(0 0 3px var(--amber-glow-lg));
}

.eq span:nth-child(1) { height: 6px; animation-delay: 0s; }
.eq span:nth-child(2) { height: 12px; animation-delay: 0.12s; }
.eq span:nth-child(3) { height: 4px; animation-delay: 0.24s; }

@keyframes eqBar {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

/* Text columns */
.col-title {
  font-size: 14px;
  color: var(--text-cream);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-text {
  display: inline;
}

.col-artist {
  font-size: 13px;
  color: var(--text-warm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-album {
  font-size: 12.5px;
  color: var(--text-ghost);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-dur {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-ghost);
}

/* Play button */
.row-play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--text-muted);
  opacity: 0.45;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  transition: all var(--t-fast);
}

.list-row:hover .row-play-btn {
  opacity: 1;
  color: var(--amber);
  border-color: rgba(255, 255, 255, 0.1);
}

.row-play-btn:hover {
  color: #0d0b14;
  background: var(--amber);
  transform: scale(1.1);
  box-shadow: 0 0 12px var(--amber-highlight);
}
</style>

<template>
  <div ref="barRef" class="titlebar" style="-webkit-app-region: drag">
    <div class="titlebar-left">
      <div ref="logoRef" class="logo-mark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
        </svg>
      </div>
      <span class="app-name">DaFen</span>
      <span class="app-name-accent">Radio</span>
    </div>

    <div class="titlebar-center">
      <!-- LX 有音源：显示当前音源 + 设置按钮 -->
      <template v-if="lxStatus?.activeId">
        <div class="lx-badge" :class="{ loaded: lxStatus?.loaded, error: lxStatus?.error }" @click="$emit('open-settings')">
          <svg v-if="lxStatus?.loaded" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" opacity="0.4"/></svg>
          <span>{{ lxStatus.loadedSource?.metadata?.name || 'LX 音源' }}</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="immersive-wrap">
          <button class="immersive-btn" @click="$emit('enter-immersive')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
            <span>沉浸</span>
          </button>
          <div class="immersive-tooltip">
            <div class="tooltip-title">⚠️ 沉浸模式</div>
            <div class="tooltip-desc">粒子封面特效 + 全屏渲染，CPU/GPU 占用较高</div>
          </div>
        </div>
        <button class="playlist-btn" @click="$emit('toggle-playlists')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span>歌单</span>
        </button>
      </template>

      <!-- LX 未加载：导入按钮 + 下拉面板 -->
      <div v-else class="lx-import-wrap" ref="importWrapRef">
        <button class="lx-import-btn" @click="togglePanel" title="导入落雪音源">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>导入音源</span>
        </button>

        <!-- 下拉面板 -->
        <transition name="panel-pop">
          <div v-if="showPanel" class="import-panel" ref="panelRef">
            <div class="panel-section">
              <button class="panel-option" @click="handleLocalImport">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/>
                </svg>
                <div class="option-text">
                  <span class="option-title">本地文件</span>
                  <span class="option-desc">选择 .js 音源文件</span>
                </div>
              </button>
            </div>

            <div class="panel-divider"></div>

            <div class="panel-section">
              <div class="url-label">在线链接</div>
              <div class="url-input-row">
                <input
                  ref="urlInputRef"
                  v-model="sourceUrl"
                  class="url-input"
                  type="text"
                  placeholder="https://...xxx.js"
                  @keydown.enter="handleUrlImport"
                />
                <button
                  class="url-go-btn"
                  :disabled="!sourceUrl.trim() || urlLoading"
                  @click="handleUrlImport"
                >
                  <span v-if="urlLoading" class="dots"><span></span><span></span><span></span></span>
                  <span v-else>导入</span>
                </button>
              </div>
              <div v-if="urlError" class="url-error">{{ urlError }}</div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div class="titlebar-right">
      <button class="win-btn" @click="minimize">
        <svg width="10" height="1"><rect width="10" height="1" rx="0.5" fill="currentColor"/></svg>
      </button>
      <button class="win-btn" @click="maximize">
        <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" stroke="currentColor" fill="none"/></svg>
      </button>
      <button class="win-btn win-close" @click="closeWindow">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import type { LxSourceStatus } from '../composables/useSource'

let ctx: gsap.Context | null = null

const props = defineProps<{
  lxStatus: LxSourceStatus | null
  onImportUrl?: (url: string) => Promise<void>
}>()

const emit = defineEmits<{
  'import-lx': []
  'remove-lx': []
  'open-settings': []
  'enter-immersive': []
  'toggle-playlists': []
}>()

const barRef = ref<HTMLElement | null>(null)
const logoRef = ref<HTMLElement | null>(null)
const importWrapRef = ref<HTMLElement | null>(null)
const urlInputRef = ref<HTMLInputElement | null>(null)

const showPanel = ref(false)
const sourceUrl = ref('')
const urlLoading = ref(false)
const urlError = ref('')

const togglePanel = () => {
  showPanel.value = !showPanel.value
  urlError.value = ''
  if (showPanel.value) {
    nextTick(() => urlInputRef.value?.focus())
  }
}

const onClickOutside = (e: MouseEvent) => {
  if (!showPanel.value) return
  if (importWrapRef.value && !importWrapRef.value.contains(e.target as Node)) {
    showPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    gsap.fromTo(barRef.value, { y: -40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', delay: 0.05 })
    gsap.fromTo(logoRef.value, { rotation: -180, scale: 0 }, { rotation: 0, scale: 1, duration: 0.9, ease: 'back.out(2)', delay: 0.3 })
  }, barRef.value)
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
})

onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

const handleLocalImport = () => {
  showPanel.value = false
  emit('import-lx')
}

const handleUrlImport = async () => {
  const url = sourceUrl.value.trim()
  if (!url) return
  urlLoading.value = true
  urlError.value = ''
  try {
    if (props.onImportUrl) {
      await props.onImportUrl(url)
    }
  } catch (e: any) {
    urlError.value = e.message
  } finally {
    urlLoading.value = false
  }
}

const minimize = () => window.api.windowMinimize()
const maximize = () => window.api.windowMaximize()
const closeWindow = () => window.api.windowClose()
</script>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 10px 0 14px;
  background: rgba(30, 25, 35, 0.4);
  backdrop-filter: blur(10px) saturate(1.5);
  -webkit-backdrop-filter: blur(10px) saturate(1.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.titlebar::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.06) 75%, transparent 100%);
  pointer-events: none;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.logo-mark {
  color: var(--amber);
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 8px rgba(212, 168, 83, 0.4));
}

.app-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-cream);
  letter-spacing: 0.5px;
  text-shadow: 0 0 20px rgba(245, 237, 224, 0.3);
}

.app-name-accent {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 300;
  font-style: italic;
  color: var(--text-muted);
  letter-spacing: 1px;
}

.theme-classic .app-name { text-shadow: none !important; }
.theme-classic .app-name-accent { color: #888 !important; }

.titlebar-center {
  display: flex;
  align-items: center;
  gap: 6px;
  -webkit-app-region: no-drag;
}

.lx-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--t-fast);
  position: relative;
  overflow: hidden;
}
.lx-badge.loaded {
  color: #66d9a0;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.lx-badge.error {
  color: #e88;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.lx-badge:not(.loaded):not(.error) {
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.lx-badge:hover {
  background: rgba(200, 90, 90, 0.1);
  border-color: rgba(200, 90, 90, 0.2);
  color: #e88;
}
.immersive-wrap {
  position: relative;
  -webkit-app-region: no-drag;
}

.immersive-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; padding: 5px 12px;
  border-radius: 999px;
  color: var(--amber-dim); background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer; transition: all var(--t-fast);
}
.immersive-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 0 12px rgba(212, 168, 83, 0.2);
}

.immersive-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  padding: 10px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--shadow-glass);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 100;
}
.immersive-wrap:hover .immersive-tooltip {
  opacity: 1;
  visibility: visible;
}
.tooltip-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-cream);
  margin-bottom: 4px;
}
.tooltip-desc {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.4;
}

.playlist-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; padding: 5px 12px;
  border-radius: 999px;
  color: var(--text-muted); background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer; transition: all var(--t-fast);
  -webkit-app-region: no-drag;
}
.playlist-btn:hover {
  color: var(--amber);
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 0 12px rgba(212, 168, 83, 0.15);
}

.lx-import-wrap {
  position: relative;
  -webkit-app-region: no-drag;
}

.lx-import-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  padding: 5px 14px;
  border-radius: 999px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all var(--t-fast);
  letter-spacing: 0.3px;
}

.lx-import-btn:hover {
  color: var(--amber);
  border-color: var(--amber-focus);
  background: var(--amber-glass);
}

.import-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background: rgba(30, 25, 35, 0.5);
  backdrop-filter: blur(10px) saturate(1.5);
  -webkit-backdrop-filter: blur(10px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
  padding: 10px;
  z-index: 300;
  overflow: hidden;
}

.import-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 100%);
  pointer-events: none;
}

.panel-section { position: relative; z-index: 1; }

.panel-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--r-md);
  color: var(--text-muted);
  transition: all var(--t-fast);
  text-align: left;
}
.panel-option:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-cream); }

.option-text { display: flex; flex-direction: column; gap: 1px; }
.option-title { font-size: 12px; font-weight: 500; color: var(--text-cream); }
.option-desc { font-size: 10px; color: var(--text-ghost); }

.panel-divider { height: 1px; background: rgba(255, 255, 255, 0.04); margin: 6px 4px; }

.url-label { font-size: 10px; color: var(--text-ghost); letter-spacing: 0.5px; padding: 2px 2px 6px; }

.url-input-row { display: flex; gap: 6px; }

.url-input {
  flex: 1; height: 34px; padding: 0 12px; font-size: 11px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; color: var(--text-cream);
  transition: all var(--t-fast);
}
.url-input:focus { border-color: rgba(212, 168, 83, 0.3); background: rgba(255, 255, 255, 0.08); }
.url-input::placeholder { color: var(--text-ghost); font-style: italic; }

.url-go-btn {
  height: 38px; padding: 0 18px; border-radius: 12px;
  background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  color: #0d0b14; font-size: 10px; font-weight: 600;
  letter-spacing: 0.5px; transition: all var(--t-fast);
  display: flex; align-items: center; justify-content: center; min-width: 52px;
  box-shadow: 0 4px 30px var(--amber-glow-md);
}
.url-go-btn:hover:not(:disabled) { box-shadow: 0 8px 40px var(--amber-glow-lg); transform: translateY(-1px); }
.url-go-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.url-error { font-size: 10px; color: var(--ruby); padding-top: 6px; }

.dots { display: flex; gap: 3px; align-items: center; }
.dots span { width: 3px; height: 3px; border-radius: 50%; background: var(--bg-deep); animation: dotPulse 1s ease-in-out infinite; }
.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

.panel-pop-enter-active { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.panel-pop-leave-active { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.panel-pop-enter-from, .panel-pop-leave-to { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.95); }
.panel-pop-enter-to, .panel-pop-leave-from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 1px;
  -webkit-app-region: no-drag;
}

.win-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border-radius: var(--r-sm);
  color: var(--text-muted);
  transition: all var(--t-fast);
}
.win-btn:hover { color: var(--text-warm); background: rgba(255, 255, 255, 0.06); }
.win-close:hover { color: var(--text-cream); background: rgba(200, 90, 90, 0.6); }

</style>

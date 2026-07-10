<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel" ref="panelRef">
      <div class="settings-header">
        <h3>音源管理</h3>
        <button class="settings-close" @click="$emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="settings-body">
        <!-- 已导入的音源列表 -->
        <div class="source-list">
          <div class="section-label">已导入 ({{ sources.length }})</div>
          <div v-if="sources.length === 0" class="source-empty">
            <p>暂无音源，请导入</p>
          </div>
          <div
            v-for="item in sources"
            :key="item.id"
            class="source-item"
            :class="{ active: item.id === activeId }"
          >
            <div class="source-info">
              <div class="source-name">
                <span v-if="item.id === activeId" class="active-dot"></span>
                {{ item.metadata?.name || '未命名音源' }}
              </div>
              <div class="source-meta">
                <span v-if="item.metadata?.version">v{{ item.metadata.version }}</span>
                <span v-if="item.metadata?.author">· {{ item.metadata.author }}</span>
                <span>· {{ formatDate(item.importedAt) }}</span>
              </div>
              <div v-if="item.metadata?.description" class="source-desc">{{ item.metadata.description }}</div>
            </div>
            <div class="source-actions">
              <button v-if="item.id !== activeId" class="src-btn use" @click="$emit('set-active', item.id)">使用</button>
              <span v-else class="src-badge">当前</span>
              <button class="src-btn delete" @click="$emit('remove', item.id)">删除</button>
            </div>
          </div>
        </div>

        <!-- 导入区域 -->
        <div class="import-section">
          <div class="section-label">导入新音源</div>
          <div class="import-row">
            <button class="import-btn" @click="$emit('import-local')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>
              本地文件
            </button>
            <div class="url-import">
              <input v-model="importUrl" class="url-input" type="text" placeholder="在线链接 https://...js" @keydown.enter="handleUrlImport" />
              <button class="import-btn primary" :disabled="!importUrl.trim() || urlLoading" @click="handleUrlImport">
                <span v-if="urlLoading" class="dots"><span></span><span></span><span></span></span>
                <span v-else>导入</span>
              </button>
            </div>
          </div>
          <div v-if="urlError" class="url-error">{{ urlError }}</div>
        </div>

        <!-- 主题切换 -->
        <div class="theme-section">
          <div class="section-label">主题</div>
          <div class="theme-list">
            <button
              class="theme-item"
              :class="{ active: currentTheme === 'purple' }"
              @click="setTheme('purple')"
            >
              <div class="theme-preview purple"></div>
              <span>蓝紫</span>
            </button>
            <button
              class="theme-item"
              :class="{ active: currentTheme === 'pink' }"
              @click="setTheme('pink')"
            >
              <div class="theme-preview pink"></div>
              <span>粉色</span>
            </button>
            <button
              class="theme-item"
              :class="{ active: currentTheme === 'classic' }"
              @click="setTheme('classic')"
            >
              <div class="theme-preview classic"></div>
              <span>经典</span>
            </button>
          </div>
        </div>

        <!-- 危险操作 -->
        <div v-if="sources.length > 0" class="danger-zone">
          <button class="danger-btn" @click="$emit('remove-all')">清空所有音源</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import type { LxSourceItem } from '../composables/useSource'

let ctx: gsap.Context | null = null

// 主题切换 — 从 localStorage 读取，默认 classic
const currentTheme = ref(localStorage.getItem('theme') || 'classic')

const setTheme = (theme: string) => {
  currentTheme.value = theme
  localStorage.setItem('theme', theme)
  document.documentElement.classList.remove('theme-pink', 'theme-classic')
  if (theme === 'pink') {
    document.documentElement.classList.add('theme-pink')
  } else if (theme === 'classic') {
    document.documentElement.classList.add('theme-classic')
  }
}

defineProps<{
  sources: LxSourceItem[]
  activeId: string
}>()

const emit = defineEmits<{
  close: []
  'set-active': [id: string]
  remove: [id: string]
  'remove-all': []
  'import-local': []
  'import-url': [url: string]
}>()

const panelRef = ref<HTMLElement | null>(null)
const importUrl = ref('')
const urlLoading = ref(false)
const urlError = ref('')

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const handleUrlImport = async () => {
  const url = importUrl.value.trim()
  if (!url) return
  urlLoading.value = true
  urlError.value = ''
  try {
    emit('import-url', url)
    importUrl.value = ''
  } catch (e: any) {
    urlError.value = e.message
  } finally {
    urlLoading.value = false
  }
}

onMounted(() => {
  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    if (panelRef.value) {
      gsap.fromTo(panelRef.value, { scale: 0.95, autoAlpha: 0, y: 20 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.35, ease: 'back.out(1.3)' })
    }
  }, panelRef.value)
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
})
</script>

<style scoped>
.settings-overlay {
  position: fixed; inset: 0; z-index: 500;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.4);
}

.settings-panel {
  width: 520px; max-height: 80vh;
  background: linear-gradient(160deg, rgba(45, 40, 55, 0.92) 0%, rgba(30, 25, 38, 0.88) 50%, rgba(25, 20, 32, 0.85) 100%);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
  box-shadow:
    0 4px 30px rgba(0,0,0,0.2),
    0 0 0 1px rgba(255,255,255,0.05),
    inset 0 1px 0 rgba(255,255,255,0.1),
    inset 0 -1px 0 rgba(0,0,0,0.1);
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}

.settings-panel::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, transparent 100%);
  pointer-events: none;
}

.settings-panel::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 50%);
  pointer-events: none;
}

.settings-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 28px; border-bottom: 1.5px solid rgba(255,255,255,0.08);
  position: relative; z-index: 1;
}

.settings-header h3 {
  font-family: var(--font-display); font-size: 20px; font-weight: 500; color: var(--text-cream);
}

.settings-close {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-ghost); transition: all var(--t-fast);
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
}
.settings-close:hover { color: var(--text-cream); background: rgba(255,255,255,0.08); }

.settings-body {
  flex: 1; overflow-y: auto; padding: 28px 32px;
  display: flex; flex-direction: column; gap: 28px;
  position: relative; z-index: 1;
}

.section-label {
  font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--text-ghost); margin-bottom: 10px;
  padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06);
}

.source-list { display: flex; flex-direction: column; gap: 6px; }

.source-empty {
  padding: 28px; text-align: center; border-radius: 12px;
  background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.08);
}
.source-empty p { font-size: 12px; color: var(--text-ghost); font-style: italic; }

.source-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-radius: 12px;
  background: linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.06),
    0 2px 8px rgba(0,0,0,0.1);
  transition: all var(--t-fast);
  position: relative;
  overflow: hidden;
}
.source-item::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%);
  pointer-events: none;
}
.source-item:hover {
  background: linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%);
  border-color: rgba(255,255,255,0.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 4px 12px rgba(0,0,0,0.15);
}
.source-item.active {
  background: linear-gradient(160deg, rgba(102,217,160,0.08) 0%, rgba(102,217,160,0.03) 100%);
  border-color: rgba(102,217,160,0.2);
  box-shadow:
    inset 0 1px 0 rgba(102,217,160,0.1),
    0 2px 12px rgba(102,217,160,0.1);
}

.source-info { flex: 1; min-width: 0; }
.source-name { font-size: 13px; font-weight: 500; color: var(--text-cream); display: flex; align-items: center; gap: 6px; }
.source-meta { font-size: 10px; color: var(--text-ghost); margin-top: 2px; }
.source-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.active-dot { width: 6px; height: 6px; border-radius: 50%; background: #66d9a0; box-shadow: 0 0 6px #66d9a0; flex-shrink: 0; }

.source-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.src-btn {
  font-size: 10px; padding: 6px 14px; border-radius: 999px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  transition: all var(--t-fast);
}
.src-btn.use {
  color: var(--amber); background: var(--amber-glass); border: 1.5px solid var(--amber-border);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px var(--amber-glow-sm);
}
.src-btn.use:hover { background: var(--amber-border); }
.src-btn.delete {
  color: var(--text-ghost); background: transparent; border: 1px solid transparent;
}
.src-btn.delete:hover { color: var(--ruby); background: rgba(200,90,90,0.08); border-color: rgba(200,90,90,0.12); }

.src-badge {
  font-size: 9px; padding: 2px 8px; border-radius: var(--r-full);
  color: #66d9a0; background: rgba(102,217,160,0.08); border: 1px solid rgba(102,217,160,0.15);
}

.import-section { padding-top: 4px; }
.import-row { display: flex; gap: 8px; align-items: center; }

.import-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 10px 16px; border-radius: 999px;
  font-size: 11px; color: var(--text-muted);
  background: linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 2px 8px rgba(0,0,0,0.1);
  transition: all var(--t-fast); flex-shrink: 0;
}
.import-btn:hover {
  background: linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%);
  color: var(--text-cream);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.1),
    0 4px 12px rgba(0,0,0,0.15);
}
.import-btn.primary {
  background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  color: #0d0b14; border: none; font-weight: 600;
  box-shadow: 0 4px 30px var(--amber-glow-md);
}
.import-btn.primary:hover { box-shadow: 0 8px 40px var(--amber-glow-lg); }
.import-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.url-import { flex: 1; display: flex; gap: 8px; }
.url-input {
  flex: 1; height: 38px; padding: 0 14px; font-size: 11px;
  background: linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; color: var(--text-cream); transition: all var(--t-fast);
}
.url-input:focus {
  border-color: rgba(212, 168, 83, 0.4);
  background: linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%);
  box-shadow: 0 0 0 3px rgba(212, 168, 83, 0.1), inset 0 1px 0 rgba(255,255,255,0.06);
}
.url-input::placeholder { color: var(--text-ghost); font-style: italic; }

.url-error { font-size: 10px; color: var(--ruby); padding-top: 4px; }

.dots { display: flex; gap: 3px; align-items: center; }
.dots span { width: 3px; height: 3px; border-radius: 50%; background: var(--bg-deep); animation: dotPulse 1s ease-in-out infinite; }
.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

.danger-zone { padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
.danger-btn {
  font-size: 11px; color: var(--ruby); padding: 10px 18px; border-radius: 999px;
  background: rgba(200,90,90,0.08); border: 1px solid rgba(200,90,90,0.12);
  transition: all var(--t-fast);
}
.danger-btn:hover { background: rgba(200,90,90,0.12); }

.theme-section { padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); }
.theme-list { display: flex; gap: 10px; margin-top: 10px; }
.theme-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; border-radius: 999px;
  background: linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.06),
    0 2px 8px rgba(0,0,0,0.1);
  transition: all var(--t-fast); font-size: 12px; color: var(--text-muted);
}
.theme-item:hover {
  background: linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 4px 12px rgba(0,0,0,0.15);
}
.theme-item.active {
  border-color: var(--amber);
  color: var(--amber);
  background: linear-gradient(160deg, rgba(212, 168, 83, 0.12) 0%, rgba(212, 168, 83, 0.04) 100%);
  box-shadow:
    inset 0 1px 0 rgba(212, 168, 83, 0.15),
    0 2px 12px rgba(212, 168, 83, 0.15);
}
.theme-preview {
  width: 24px; height: 24px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
}
.theme-preview.purple {
  background: linear-gradient(135deg, #13111c, #2a1f3d, #1a1528);
  border: 1.5px solid rgba(255,255,255,0.12);
}
.theme-preview.pink {
  background: linear-gradient(135deg, #1e1722, #4a2d52, #3a2545);
  border: 1.5px solid rgba(255,255,255,0.12);
}
.theme-preview.classic {
  background: linear-gradient(135deg, #f5f5f5, #ffffff, #e8e8e8);
  border: 1.5px solid rgba(0,0,0,0.1);
}

</style>

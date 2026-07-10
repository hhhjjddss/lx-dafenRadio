<template>
  <div
    class="playlists-panel"
    :style="{ '--origin-x': (originX || 50) + '%', '--origin-y': (originY || 0) + '%' }"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    @click.self="handleClose"
  >
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 分类下拉菜单 -->
      <div class="category-dropdown" v-if="categoryGroups.length > 0" @click.stop>
        <button class="dropdown-btn" @click="handleDropdownClick">
          <span>{{ currentCategoryName || '全部' }}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
        <div class="dropdown-menu" v-if="showCategoryMenu">
          <div class="dropdown-item" :class="{ active: !currentCategory }" @click="selectCategory('')">
            全部
          </div>
          <template v-for="group in categoryGroups" :key="group.name">
            <div class="dropdown-group">{{ group.name }}</div>
            <div
              v-for="cat in group.items"
              :key="cat.id"
              class="dropdown-item"
              :class="{ active: currentCategory === cat.id }"
              @click="selectCategory(cat.id)"
            >
              {{ cat.name }}
            </div>
          </template>
        </div>
      </div>
      <!-- 排序标签 -->
      <div class="sort-tabs">
        <button
          v-for="sort in sortOptions"
          :key="sort.id"
          class="sort-tab"
          :class="{ active: currentSort === sort.id }"
          @click="switchSort(sort.id)"
        >
          {{ sort.name }}
        </button>
      </div>
    </div>

    <!-- 歌单网格 -->
    <div class="playlists-content">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-wrap">
        <div class="loading-spinner"></div>
        <span>正在加载...</span>
      </div>

      <!-- 歌单列表 -->
      <div v-else class="playlist-grid">
        <div
          v-for="pl in playlists"
          :key="pl.id"
          class="playlist-card"
          @click="handlePlaylistClick(pl)"
        >
          <div class="card-cover">
            <img :src="pl.cover" :alt="pl.name" @error="onCoverError" />
          </div>
          <div class="card-info">
            <div class="card-title">{{ pl.name }}</div>
            <div class="card-creator">{{ pl.creator }}</div>
            <div class="card-stats">
              <span class="stat-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                {{ pl.trackCount || 0 }}
              </span>
              <span class="stat-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                {{ formatCount(pl.playCount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && !playlists.length" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <p>暂无歌单数据</p>
      </div>
    </div>
  </div>

  <!-- 歌单详情弹窗（放在外面避免 backdrop-filter 影响） -->
  <teleport to="body">
    <transition name="detail-fade">
      <div v-if="detailPlaylist" class="detail-overlay" @click.self="detailPlaylist = null">
        <div class="detail-panel">
          <div class="detail-header">
            <img :src="detailPlaylist.cover" :alt="detailPlaylist.name" class="detail-cover" @error="onCoverError" />
            <div class="detail-meta">
              <h3>{{ detailPlaylist.name }}</h3>
              <p class="detail-creator">{{ detailPlaylist.creator }}</p>
              <p class="detail-desc">{{ detailPlaylist.description || '暂无简介' }}</p>
              <button class="detail-play-btn" @click="playAll">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                播放全部
              </button>
            </div>
            <button class="detail-close" @click="detailPlaylist = null">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="detail-songs" v-if="detailSongs.length">
            <div
              v-for="(song, i) in detailSongs"
              :key="song.id"
              class="detail-song-item"
              @click="$emit('play', song)"
            >
              <span class="song-idx">{{ i + 1 }}</span>
              <div class="song-info">
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">{{ song.singer }}</span>
              </div>
              <span class="song-duration">{{ song.interval }}</span>
            </div>
          </div>
          <div v-else-if="detailLoading" class="detail-loading">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

interface MusicInfo {
  id: string
  name: string
  singer: string
  source: string
  interval: string
  albumName?: string
  songmid?: string
}

interface Playlist {
  id: string
  name: string
  cover: string
  creator: string
  playCount: number
  description?: string
  trackCount?: number
  platform?: string
}

interface Category {
  id: string
  name: string
}

interface CategoryGroup {
  name: string
  items: Category[]
}

const props = defineProps<{
  originX?: number
  originY?: number
}>()

const emit = defineEmits<{
  'close': []
  'play': [song: MusicInfo]
}>()

const isEntering = ref(true)
const isLeaving = ref(false)

const handleClose = () => {
  isLeaving.value = true
  setTimeout(() => emit('close'), 300)
}

const loading = ref(false)
const playlists = ref<Playlist[]>([])
const currentPlatformKey = ref('netease')
const currentCategory = ref('')
const currentSort = ref('hot')
const showCategoryMenu = ref(false)
const categoryGroups = ref<CategoryGroup[]>([])
const detailPlaylist = ref<Playlist | null>(null)
const detailSongs = ref<MusicInfo[]>([])
const detailLoading = ref(false)
const isMounted = ref(true)

const sortOptions = [
  { id: 'hot', name: '最热' },
  { id: 'new', name: '最新' }
]

// 当前分类名称
const currentCategoryName = computed(() => {
  if (!currentCategory.value) return '全部'
  for (const group of categoryGroups.value) {
    const cat = group.items.find(c => c.id === currentCategory.value)
    if (cat) return cat.name
  }
  return currentCategory.value
})

const formatCount = (count: number) => {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  return count.toString()
}

const onCoverError = (e: Event) => {
  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="14">♪</text></svg>'
}

// 加载分类
const loadCategories = async (platform: string) => {
  try {
    const result = await window.api.playlistCategories(platform)
    if (!isMounted.value) return
    if (result.success && result.data) {
      const groups: CategoryGroup[] = []
      for (const [name, items] of Object.entries(result.data)) {
        if (Array.isArray(items) && items.length > 0) {
          groups.push({
            name,
            items: items.map((item: any) => ({ id: item.id, name: item.name }))
          })
        }
      }
      categoryGroups.value = groups
    }
  } catch (e) {
    console.warn('加载分类失败:', e)
    categoryGroups.value = []
  }
}

// 选择分类
const selectCategory = async (categoryId: string) => {
  showCategoryMenu.value = false
  currentCategory.value = categoryId
  await loadPlaylistsByCategory()
}

// 点击歌单
const handlePlaylistClick = (pl: Playlist) => {
  console.log('[PlaylistsPanel] 点击歌单:', pl.name, 'id:', pl.id, 'platform:', pl.platform)
  showCategoryMenu.value = false
  openPlaylistDetail(pl)
}

// 切换排序
const switchSort = async (sortId: string) => {
  if (currentSort.value === sortId) return
  currentSort.value = sortId
  await loadPlaylistsByCategory()
}

// 按分类加载歌单
const loadPlaylistsByCategory = async () => {
  loading.value = true
  playlists.value = []
  try {
    const category = currentCategory.value || undefined
    const result = await window.api.playlistList(currentPlatformKey.value, category)
    if (!isMounted.value) return
    if (result.success && result.data) {
      playlists.value = result.data
    }
  } catch (e) {
    console.warn('加载歌单失败:', e)
  } finally {
    if (isMounted.value) loading.value = false
  }
}

// 选择分类时关闭下拉菜单
const handleDropdownClick = () => {
  showCategoryMenu.value = !showCategoryMenu.value
}

// 初始加载
const loadPlaylists = async () => {
  loading.value = true
  playlists.value = []
  console.log('[PlaylistsPanel] 开始加载歌单...')

  // 依次尝试各平台，有数据就停
  const platforms = ['netease', 'kuwo', 'qq', 'kugou']
  for (const platform of platforms) {
    if (!isMounted.value) return
    try {
      console.log(`[PlaylistsPanel] 尝试加载 ${platform}...`)
      const result = await window.api.playlistList(platform)
      if (!isMounted.value) return
      console.log(`[PlaylistsPanel] ${platform} 结果:`, result)
      if (result.success && result.data && result.data.length > 0) {
        console.log(`[PlaylistsPanel] ✅ 使用 ${platform}，返回 ${result.data.length} 条数据`)
        playlists.value = result.data
        currentPlatformKey.value = platform
        // 加载该平台的分类
        await loadCategories(platform)
        break
      } else {
        console.log(`[PlaylistsPanel] ❌ ${platform} 无数据，尝试下一个`)
      }
    } catch (e) {
      console.warn(`[PlaylistsPanel] ❌ ${platform} 加载失败:`, e)
    }
  }

  console.log(`[PlaylistsPanel] 最终加载 ${playlists.value.length} 条歌单`)
  if (isMounted.value) loading.value = false
}

const openPlaylistDetail = async (pl: Playlist) => {
  console.log('[PlaylistsPanel] 点击歌单:', pl.name, 'id:', pl.id, 'platform:', pl.platform)
  detailPlaylist.value = pl
  detailLoading.value = true
  detailSongs.value = []
  try {
    const platform = pl.platform || 'netease'
    console.log('[PlaylistsPanel] 调用详情API, platform:', platform, 'id:', pl.id)
    const result = await window.api.playlistDetail(platform, pl.id)
    console.log('[PlaylistsPanel] 详情API结果:', result)
    if (!isMounted.value) return
    if (result.success && result.data) {
      detailSongs.value = result.data
      console.log('[PlaylistsPanel] 加载歌曲数量:', result.data.length)
    }
  } catch (e) {
    console.error('[PlaylistsPanel] 加载歌单详情失败:', e)
  } finally {
    if (isMounted.value) detailLoading.value = false
  }
}

const playAll = () => {
  if (detailSongs.value.length) {
    emit('play', detailSongs.value[0])
  }
}

onMounted(async () => {
  // 进入动画完成后移除class
  setTimeout(() => { isEntering.value = false }, 350)
  await loadPlaylists()
})

onBeforeUnmount(() => {
  isMounted.value = false
})
</script>

<style scoped>
.playlists-panel {
  position: fixed;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 80px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  transform-origin: var(--origin-x, 50%) var(--origin-y, 0%);
  animation: playlistsExpand 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.toolbar {
  padding: 16px 28px 0;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 16px;
}

.category-dropdown {
  position: relative;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-cream);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  cursor: pointer;
  transition: all var(--t-fast);
}

.dropdown-btn:hover {
  background: var(--glass-bg-hover);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--shadow-deep);
  z-index: 100;
  padding: 8px;
}

.dropdown-group {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-ghost);
  text-transform: uppercase;
}

.dropdown-item {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--t-fast);
}

.dropdown-item:hover {
  color: var(--text-cream);
  background: rgba(255, 255, 255, 0.06);
}

.dropdown-item.active {
  color: var(--amber);
  background: rgba(255, 212, 93, 0.1);
}

.sort-tabs {
  display: flex;
  gap: 6px;
}

.sort-tab {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--t-fast);
}

.sort-tab:hover {
  color: var(--text-cream);
  background: var(--glass-bg);
}

.sort-tab.active {
  color: var(--amber);
  border-color: var(--amber);
  background: var(--amber-glass);
}

@keyframes playlistsExpand {
  from {
    opacity: 0;
    transform: scaleY(0.3);
    transform-origin: top center;
  }
  to {
    opacity: 1;
    transform: scaleY(1);
    transform-origin: top center;
  }
}

.playlists-panel:not(.is-entering) {
  animation: none;
}

.playlists-panel.is-leaving {
  animation: playlistsCollapse 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes playlistsCollapse {
  from {
    opacity: 1;
    transform: scaleY(1);
    transform-origin: top center;
  }
  to {
    opacity: 0;
    transform: scaleY(0.3);
    transform-origin: top center;
  }
}

.playlists-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 28px;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-ghost);
  font-size: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (max-width: 900px) {
  .playlist-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .playlist-grid { grid-template-columns: 1fr; }
}

.playlist-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  cursor: pointer;
  border-radius: 10px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  transition: all var(--t-fast);
}

.playlist-card:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border);
}

.card-cover {
  width: 130px;
  height: 130px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-cream);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.card-creator {
  font-size: 11px;
  color: var(--text-ghost);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-ghost);
}

.empty-state p {
  font-size: 13px;
}

/* 详情弹窗 */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.detail-panel {
  width: 90%;
  max-width: 600px;
  max-height: 70vh;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--shadow-deep);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.detail-header {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
}

.detail-cover {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.detail-meta {
  flex: 1;
  min-width: 0;
}

.detail-meta h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  color: var(--text-cream);
  margin-bottom: 6px;
}

.detail-creator {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.detail-desc {
  font-size: 11px;
  color: var(--text-ghost);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-play-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 20px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: #0d0b14;
  background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  box-shadow: 0 4px 20px var(--amber-glow-md);
  transition: all var(--t-fast);
}

.detail-play-btn:hover {
  box-shadow: 0 6px 30px var(--amber-glow-lg);
  transform: translateY(-1px);
}

.detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-ghost);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  transition: all var(--t-fast);
}

.detail-close:hover {
  color: var(--text-cream);
  background: var(--glass-bg-hover);
}

.detail-songs {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.detail-song-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--t-fast);
}

.detail-song-item:hover {
  background: var(--glass-bg);
}

.song-idx {
  width: 24px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-ghost);
  flex-shrink: 0;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-name {
  display: block;
  font-size: 13px;
  color: var(--text-cream);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 11px;
  color: var(--text-ghost);
}

.song-duration {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-ghost);
  flex-shrink: 0;
}

.detail-loading {
  padding: 40px;
  display: flex;
  justify-content: center;
}

.detail-fade-enter-active { transition: opacity 0.2s ease; }
.detail-fade-leave-active { transition: opacity 0.15s ease; }
.detail-fade-enter-from, .detail-fade-leave-to { opacity: 0; }

/* 经典主题 */
.theme-classic :deep(.playlists-panel) {
  background: #f0f0f0 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
}
.theme-classic :deep(.toolbar) {
  border-bottom-color: rgba(0, 0, 0, 0.06) !important;
}
.theme-classic :deep(.dropdown-btn) {
  background: rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  color: #333 !important;
}
.theme-classic :deep(.dropdown-menu) {
  background: #fff !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1) !important;
}
.theme-classic :deep(.dropdown-item) {
  color: #666 !important;
}
.theme-classic :deep(.dropdown-item:hover) {
  background: rgba(0, 0, 0, 0.04) !important;
  color: #1a1a1a !important;
}
.theme-classic :deep(.dropdown-item.active) {
  color: var(--amber) !important;
  background: rgba(184, 148, 46, 0.08) !important;
}
.theme-classic :deep(.dropdown-group) {
  color: #999 !important;
}
.theme-classic :deep(.sort-tab) {
  background: rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  color: #666 !important;
}
.theme-classic :deep(.sort-tab:hover) {
  background: rgba(0, 0, 0, 0.08) !important;
}
.theme-classic :deep(.sort-tab.active) {
  color: var(--amber) !important;
  border-color: var(--amber) !important;
  background: rgba(184, 148, 46, 0.08) !important;
}
.theme-classic :deep(.playlist-card) {
  background: rgba(0, 0, 0, 0.03) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
}
.theme-classic :deep(.playlist-card:hover) {
  background: rgba(0, 0, 0, 0.06) !important;
  border-color: rgba(0, 0, 0, 0.1) !important;
}
.theme-classic :deep(.card-title) {
  color: #1a1a1a !important;
}
.theme-classic :deep(.card-creator) {
  color: #999 !important;
}
.theme-classic :deep(.stat-item) {
  color: #999 !important;
}
.theme-classic :deep(.empty-state) {
  color: #999 !important;
}
.theme-classic :deep(.detail-overlay) {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: none !important;
}
.theme-classic :deep(.detail-panel) {
  background: #fff !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15) !important;
}
.theme-classic :deep(.detail-meta h3) {
  color: #1a1a1a !important;
}
.theme-classic :deep(.detail-creator) {
  color: #666 !important;
}
.theme-classic :deep(.detail-desc) {
  color: #999 !important;
}
.theme-classic :deep(.detail-close) {
  background: rgba(0, 0, 0, 0.05) !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  color: #888 !important;
}
.theme-classic :deep(.detail-close:hover) {
  background: rgba(0, 0, 0, 0.08) !important;
  color: #333 !important;
}
.theme-classic :deep(.detail-play-btn) {
  color: #fff !important;
}
.theme-classic :deep(.song-name) {
  color: #1a1a1a !important;
}
.theme-classic :deep(.song-artist) {
  color: #999 !important;
}
.theme-classic :deep(.song-idx) {
  color: #bbb !important;
}
.theme-classic :deep(.song-duration) {
  color: #999 !important;
}
.theme-classic :deep(.detail-song-item) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04) !important;
}
.theme-classic :deep(.detail-song-item:hover) {
  background: rgba(0, 0, 0, 0.03) !important;
}
</style>

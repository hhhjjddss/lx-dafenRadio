<template>
  <div class="app">
    <!-- 开机画面 -->
    <SplashScreen v-if="showSplash" @complete="showSplash = false" />

    <!-- 液态玻璃背景光斑 -->
    <div class="bg-orbs">
      <div class="orb orb-gold"></div>
      <div class="orb orb-purple"></div>
      <div class="orb orb-blue"></div>
      <div class="orb orb-amber"></div>
      <div class="orb orb-center"></div>
    </div>

    <TitleBar
      :lx-status="lxStatus"
      :on-import-url="handleImportLxUrl"
      @import-lx="handleImportLx"
      @remove-lx="handleRemoveLx"
      @open-settings="showSettings = true"
      @enter-immersive="handleEnterImmersive"
      @toggle-playlists="togglePlaylists"
    />

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toastMsg" class="toast" :class="toastType">
        <svg v-if="toastType === 'loading'" class="toast-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        <svg v-else-if="toastType === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        <span>{{ toastMsg }}</span>
      </div>
    </transition>

    <div class="app-body">
      <!-- 左侧：黑胶播放面板 -->
      <aside ref="sidebarRef" class="vinyl-sidebar" :class="{ playing: playerState.isPlaying, expanded: sidebarExpanded }">
        <div class="sidebar-refraction"></div>
        <div class="sidebar-glow"></div>

        <!-- 展开/收起按钮 -->
        <button class="sidebar-toggle" :class="{ disabled: !playerState.isPlaying }" @click="toggleSidebar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" :style="{ transform: sidebarExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        <div class="vinyl-scene">
          <div ref="discRef" class="vinyl-disc" :class="{ 'disc-playing-spin': playerState.isPlaying, 'disc-expanded-spin': !playerState.isPlaying && sidebarExpanded }">
            <div class="disc-outer">
              <div class="disc-grooves"></div>
              <div class="disc-grooves g2"></div>
              <div class="disc-grooves g3"></div>
              <div class="disc-grooves g4"></div>
              <div class="disc-inner">
                <img v-if="playerState.coverUrl" :src="playerState.coverUrl" alt="" class="disc-art" @error="onImgError" />
                <div v-else class="disc-art-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div class="disc-center-hole"></div>
              </div>
            </div>
            <div class="disc-halo"></div>
          </div>
          <div ref="tonearmRef" class="tonearm">
            <div class="tonearm-base"></div>
            <div class="tonearm-arm"><div class="tonearm-head"></div></div>
          </div>
        </div>

        <!-- 封面 + 歌曲信息 -->
        <div class="sidebar-main" :class="{ 'layout-expanded': sidebarExpanded }">
          <div v-if="playerState.coverUrl" ref="coverLargeRef" class="cover-large" :class="{ 'cover-expanded-spin': playerState.isPlaying && sidebarExpanded }">
            <div class="cover-3d">
              <img :src="playerState.coverUrl" alt="" class="cover-img" @error="onImgError" />
              <div class="cover-edge"></div>
              <div class="cover-reflection"></div>
            </div>
          </div>

          <div ref="nowPlayingRef" class="now-playing">
            <div class="np-label">NOW PLAYING</div>
            <h2 class="np-title">{{ playerState.currentTrack?.name || '—' }}</h2>
            <p class="np-artist">{{ playerState.currentTrack?.singer || '搜索音乐开始' }}</p>
            <div v-if="lxStatus?.loaded" class="np-source">
              <span class="source-dot"></span>
              {{ lxStatus.loadedSource?.metadata?.name || 'LX 音源' }}
            </div>
            <p v-if="sidebarExpanded && currentLyricLine" class="np-lyric-line">{{ currentLyricLine }}</p>
          </div>

          <button
            v-if="playerState.currentTrack"
            class="sidebar-fav"
            :class="{ active: isFav(playerState.currentTrack.songmid) }"
            @click="toggleFav(playerState.currentTrack!)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="isFav(playerState.currentTrack.songmid) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>

        <!-- 心电图 -->
        <div v-if="sidebarExpanded" class="ecg-container">
          <canvas ref="ecgCanvas" class="ecg-canvas"></canvas>
        </div>

      </aside>

      <!-- 中间：搜索 + 状态条 -->
      <main ref="mainRef" class="main-content">
        <SearchBar :searching="searching" @search="handleSearch" @clear="searchResults = []" />

        <!-- 搜索结果 -->
        <SearchResults
          :results="searchResults"
          :searching="searching"
          :current-track="playerState.currentTrack"
          @play="handlePlay"
        />
      </main>

      <!-- 右侧：收藏 / 歌词 -->
      <div class="right-panel">
        <div class="right-tabs">
          <button class="rtab" :class="{ active: rightTab === 'favorites' }" @click="rightTab = 'favorites'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            收藏
            <span v-if="favorites.length" class="rtab-count">{{ favorites.length }}</span>
          </button>
          <button class="rtab" :class="{ active: rightTab === 'lyrics' }" @click="rightTab = 'lyrics'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 10h12M4 14h8"/></svg>
            歌词
          </button>
        </div>

        <!-- 收藏 -->
        <div v-if="rightTab === 'favorites'" class="fav-list">
          <div v-if="favorites.length === 0" class="fav-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.15"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <p>暂无收藏</p>
          </div>
          <template v-else>
            <!-- 播放模式 -->
            <div class="fav-controls">
              <button class="fav-play-all" @click="playAllFavorites(); showToast('播放全部收藏')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                播放全部
              </button>
              <div class="fav-mode-group">
                <button class="fav-mode-btn" :class="{ active: playMode === 'sequence' }" @click="setPlayMode('sequence'); showToast('顺序播放')" title="顺序播放">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16M4 12h16M4 20h16"/></svg>
                </button>
                <button class="fav-mode-btn" :class="{ active: playMode === 'repeat-all' }" @click="setPlayMode('repeat-all'); showToast('列表循环')" title="列表循环">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                </button>
                <button class="fav-mode-btn" :class="{ active: playMode === 'repeat-one' }" @click="setPlayMode('repeat-one'); showToast('单曲循环')" title="单曲循环">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                  <span class="mode-dot">1</span>
                </button>
                <button class="fav-mode-btn" :class="{ active: playMode === 'shuffle' }" @click="setPlayMode('shuffle'); showToast('随机播放')" title="随机播放">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                </button>
              </div>
            </div>
            <div class="fav-scroll">
            <div
              v-for="(item, index) in favorites"
              :key="item.songmid"
              class="fav-item"
              :class="{ active: playerState.currentTrack?.songmid === item.songmid }"
              @click="handlePlayFav(item)"
            >
              <span class="fav-idx">{{ index + 1 }}</span>
              <div class="fav-info">
                <span class="fav-name">{{ item.name }}</span>
                <span class="fav-singer">{{ item.singer }}</span>
              </div>
              <button class="fav-remove" @click.stop="toggleFav(item); showToast('已取消收藏')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </template>
        </div>

        <LyricsPanel
          v-if="rightTab === 'lyrics'"
          :lyric="playerState.lyric"
          :tlyric="playerState.tlyric"
          :current-time="playerState.currentTime"
        />
      </div>
      <!-- 详情页覆盖 -->
      <transition name="detail-slide" mode="out-in">
        <SongDetail
          v-if="showDetail"
          :key="detailTrack?.songmid"
          class="detail-overlay"
          :track="detailTrack!"
          :cover-url="playerState.coverUrl"
          :lyric="playerState.lyric"
          :tlyric="playerState.tlyric"
          :current-time="playerState.currentTime"
          :is-playing="playerState.isPlaying"
          :is-fav="detailTrack ? isFav(detailTrack.songmid) : false"
          @close="showDetail = false"
          @play="handlePlayFromDetail"
          @toggle-fav="toggleFav"
          @seek="handleSeek"
        />
      </transition>
    </div>

    <!-- 设置面板 -->
    <transition name="panel-slide">
      <Settings
        v-if="showSettings"
        :sources="lxStatus?.sources || []"
        :active-id="lxStatus?.activeId || ''"
        @close="showSettings = false"
        @set-active="handleSetActiveLx"
        @remove="handleRemoveLx"
        @remove-all="handleRemoveAllLx"
        @import-local="handleImportLx"
        @import-url="handleImportLxUrl"
      />
    </transition>

    <PlayerBar
      ref="playerBarRef"
      :state="playerState"
      @toggle-play="handleTogglePlay"
      @prev="handlePrev"
      @next="handleNext"
      @seek="handleSeek"
      @volume="handleVolume"
      @show-detail="openDetailFromPlayer"
    />

    <!-- 沉浸播放模式 -->
    <ImmersiveOverlay
      v-if="isImmersive"
      :track="playerState.currentTrack"
      :cover-url="playerState.coverUrl"
      :lyric="playerState.lyric"
      @play-fav="handlePlayFromImmersive"
    />

    <!-- 歌单面板 -->
    <PlaylistsPanel
      v-if="showPlaylists"
      :origin-x="playlistOriginX"
      :origin-y="playlistOriginY"
      @close="showPlaylists = false"
      @play="handlePlayFromPlaylist"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import gsap from 'gsap'
import TitleBar from './components/TitleBar.vue'
import SearchBar from './components/SearchBar.vue'
import SearchResults from './components/SearchResults.vue'
import PlayerBar from './components/PlayerBar.vue'
import LyricsPanel from './components/LyricsPanel.vue'
import SongDetail from './components/SongDetail.vue'
import Settings from './components/Settings.vue'
import SplashScreen from './components/SplashScreen.vue'
import ImmersiveOverlay from './components/ImmersiveOverlay.vue'
import PlaylistsPanel from './components/PlaylistsPanel.vue'
import { useSource, type MusicInfo } from './composables/useSource'
import { usePlayer } from './composables/usePlayer'
import { useFavorites } from './composables/useFavorites'
import { usePlaylist } from './composables/usePlaylist'
import { useEcg } from './composables/useEcg'
import { useSidebarAnimation } from './composables/useSidebarAnimation'
import { useTheme } from './composables/useTheme'
import { useImmersiveMode } from './composables/useImmersiveMode'

const {
  searchResults, searching, lxStatus, refreshLxStatus,
  search, getMusicUrl, getLyric, getPic,
  importLxSource, removeLxSource, removeAllLxSources, setActiveLxSource, importLxSourceFromUrl
} = useSource()

const {
  state: playerState, play, togglePlay, seek, setVolume, setCover, setLyric, setLoading, playMode, setPlayMode, getFrequencyData, getAudioEnergy
} = usePlayer()

const {
  favorites, isFavorite, toggleFavorite
} = useFavorites()

const {
  setPlayQueue, getCurrentInfo, getNextTrack, getPrevTrack
} = usePlaylist()

const {
  ecgCanvas, startEcg, stopEcg
} = useEcg(getAudioEnergy, getFrequencyData, () => playerState.isPlaying)

const {
  sidebarRef, discRef, tonearmRef, coverLargeRef,
  updateDiscAnimation, updateCoverAnimation, toggleSidebar: doToggleSidebar
} = useSidebarAnimation()

const { initTheme } = useTheme()
const { isImmersive, enterImmersive, exitImmersive } = useImmersiveMode()

// 进入沉浸模式 = 全屏 + 沉浸UI（隐藏任务栏）
const handleEnterImmersive = async () => {
  if (!playerState.isPlaying) {
    showToast('俺不中了', 'error')
    return
  }
  enterImmersive()
  try {
    await window.api.setFullscreen(true)
  } catch {}
}
// 退出沉浸模式 = 退出全屏 + 恢复UI
const handleExitImmersive = async () => {
  exitImmersive()
  try {
    await window.api.exitFullscreen()
  } catch {}
}

const showSettings = ref(false)
const showDetail = ref(false)
const showSplash = ref(true)
const showPlaylists = ref(false)
const playlistOriginX = ref(50)
const playlistOriginY = ref(20)
let urlFailCount = 0 // 连续获取链接失败计数
const sidebarExpanded = ref(false)
const rightTab = ref<'favorites' | 'lyrics'>('favorites')
const detailTrack = ref<MusicInfo | null>(null)
const toastMsg = ref('')
const toastType = ref<'success' | 'error' | 'loading'>('success')
const isFullscreen = ref(false)
const activePlatform = ref('netease')

// Refs
const nowPlayingRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const playerBarRef = ref<any>(null)

// 歌词预解析（只在歌词变化时解析一次）
interface ParsedLyricLine { time: number; text: string }
const parsedLyrics = ref<ParsedLyricLine[]>([])
watch(() => playerState.lyric, (lyric) => {
  if (!lyric) { parsedLyrics.value = []; return }
  const lines: ParsedLyricLine[] = []
  for (const l of lyric.split('\n')) {
    const m = l.match(/\[(\d{2}):(\d{2})\.(\d{1,3})\](.*)/)
    if (m) {
      const text = m[4].trim()
      if (text) {
        const time = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, '0')) / 1000
        lines.push({ time, text })
      }
    }
  }
  parsedLyrics.value = lines
}, { immediate: true })

// 当前行歌词（从预解析结果中查找，无需每次重新解析）
const currentLyricLine = computed(() => {
  if (!parsedLyrics.value.length || playerState.currentTime <= 0) return ''
  const t = playerState.currentTime
  let line = ''
  // 线性查找足够快（预解析后只是比较数字）
  for (const l of parsedLyrics.value) {
    if (l.time <= t) line = l.text
    else break
  }
  return line
})

const isFav = (songmid: string) => isFavorite(songmid)
const toggleFav = (track: MusicInfo) => {
  toggleFavorite(track)
  showToast(isFavorite(track.songmid) ? '已收藏' : '已取消收藏')
}

onMounted(() => {
  // 初始化主题
  initTheme()
  refreshLxStatus()

  playEntranceAnimation()
})

function toggleSidebar() {
  if (!playerState.isPlaying) {
    showToast('俺不中了，要不亲爱的先放一首呢', 'error')
    return
  }
  sidebarExpanded.value = !sidebarExpanded.value
  const expanded = sidebarExpanded.value
  const hasCover = !!playerState.coverUrl

  if (expanded && !hasCover) {
    sidebarExpanded.value = false
    return
  }

  doToggleSidebar(expanded, hasCover, playMode.value)
}

function showToast(msg: string, type: 'success' | 'error' | 'loading' = 'success') {
  toastMsg.value = msg
  toastType.value = type
  // loading类型的toast不自动消失，由调用方手动关闭
  if (type !== 'loading') {
    setTimeout(() => { toastMsg.value = '' }, 3000)
  }
}

function playEntranceAnimation() {
  // gsap.context 作用域管理
  const ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (sidebarRef.value) {
    gsap.set(sidebarRef.value, { x: -50, autoAlpha: 0, filter: 'blur(8px)' })
    tl.to(sidebarRef.value, { x: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.9 }, 0.1)
  }
  if (discRef.value) {
    // 唱片 3D 飞入
    gsap.set(discRef.value, { scale: 0.3, autoAlpha: 0, rotateX: 60, rotateY: -30, rotateZ: -90 })
    tl.to(discRef.value, {
      scale: 1, autoAlpha: 1, rotateX: 15, rotateY: 0, rotateZ: 0,
      duration: 1.4, ease: 'back.out(1.2)'
    }, 0.2)
  }
  if (tonearmRef.value) {
    gsap.set(tonearmRef.value, { rotation: -60, autoAlpha: 0 })
    tl.to(tonearmRef.value, { rotation: -45, autoAlpha: 1, duration: 1, ease: 'power2.out' }, 0.4)
  }
  if (nowPlayingRef.value) {
    gsap.set(nowPlayingRef.value.children, { y: 20, autoAlpha: 0, filter: 'blur(4px)' })
    tl.to(nowPlayingRef.value.children, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.12 }, 0.5)
  }
  if (mainRef.value) {
    gsap.set(mainRef.value, { y: 40, autoAlpha: 0, filter: 'blur(6px)' })
    tl.to(mainRef.value, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8 }, 0.3)
  }
  if (playerBarRef.value?.$el) {
    gsap.set(playerBarRef.value.$el, { y: 60, autoAlpha: 0, filter: 'blur(6px)' })
    tl.to(playerBarRef.value.$el, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.7 }, 0.5)
  }
  }) // end gsap.context
}

watch(() => playerState.isPlaying, (playing) => {
  updateDiscAnimation(playing, sidebarExpanded.value)
  updateCoverAnimation(playing, sidebarExpanded.value)

  // 清理旧的动画再创建新的
  if (tonearmRef.value) gsap.killTweensOf(tonearmRef.value)
  if (sidebarRef.value) gsap.killTweensOf(sidebarRef.value, '--amber-glow-opacity')

  if (playing) {
    if (!sidebarExpanded.value && tonearmRef.value) gsap.to(tonearmRef.value, { rotation: -8, duration: 0.8, ease: 'power2.inOut' })
    if (sidebarRef.value) gsap.to(sidebarRef.value, { '--amber-glow-opacity': 1, duration: 1.5, ease: 'power1.inOut' })
  } else {
    if (!sidebarExpanded.value && tonearmRef.value) gsap.to(tonearmRef.value, { rotation: -45, duration: 0.8, ease: 'power2.inOut' })
    if (sidebarRef.value) gsap.to(sidebarRef.value, { '--amber-glow-opacity': 0, duration: 1.2, ease: 'power1.inOut' })
  }
})

// 清理全局事件监听器和 GSAP 动画
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('track-ended', handleTrackEnded)
  // 清理所有 GSAP 动画，防止内存泄漏
  gsap.killTweensOf('*')
})

// 搜索
const handleSearch = (keyword: string) => search(keyword)

// 全屏切换
const toggleFullscreen = async () => {
  try {
    if (isFullscreen.value) {
      await window.api.exitFullscreen()
    } else {
      await window.api.setFullscreen(true)
    }
    isFullscreen.value = !isFullscreen.value
  } catch (e) {
    console.error('全屏切换失败:', e)
  }
}

// 监听全屏状态变化
window.api.onFullscreenChange((fullscreen: boolean) => {
  isFullscreen.value = fullscreen
})

// 监听键盘事件
function handleKeydown(e: KeyboardEvent) {
  // ESC 键退出沉浸模式或全屏
  if (e.key === 'Escape') {
    if (isImmersive.value) {
      handleExitImmersive()
    } else {
      window.api.exitFullscreen()
      isFullscreen.value = false
    }
  }
  // 空格键控制播放/暂停
  if (e.code === 'Space' && !e.target.matches('input, textarea, button')) {
    e.preventDefault()
    handleTogglePlay()
  }
}
document.addEventListener('keydown', handleKeydown)

// 播放单曲
const handlePlay = async (track: MusicInfo) => {
  await doPlay(track, true)
}

// 从详情页播放
const handlePlayFromDetail = async (track: MusicInfo) => {
  showDetail.value = false
  await doPlay(track, true)
}
const handlePlayFromImmersive = async (track: MusicInfo) => {
  await doPlay(track, true)
}

// 切换歌单面板显示/隐藏
const togglePlaylists = () => {
  if (showPlaylists.value) {
    // 已打开则关闭
    showPlaylists.value = false
  } else {
    // 歌单按钮在标题栏右侧区域
    playlistOriginX.value = 58
    playlistOriginY.value = 0
    showPlaylists.value = true
  }
}

// 从歌单播放歌曲
const handlePlayFromPlaylist = async (song: any) => {
  // 用歌曲名+歌手名搜索，获取当前音源支持的歌曲
  const songName = song.name || ''
  const songSinger = song.singer || song.artist || ''
  console.log('[App] 从歌单播放:', songName, '-', songSinger)

  // 先搜索匹配的歌曲
  showToast('正在搜索歌曲…', 'loading')
  await search(`${songName} ${songSinger}`)
  console.log('[App] 搜索结果:', searchResults.value.length, '条')

  if (!searchResults.value.length) {
    showToast('未找到匹配的歌曲', 'error')
    return
  }

  // 精确匹配：歌名和歌手都完全一致
  let matched = searchResults.value.find((s: MusicInfo) =>
    s.name === songName && (s.singer === songSinger || s.singer.includes(songSinger) || songSinger.includes(s.singer))
  )

  // 模糊匹配：只匹配歌名
  if (!matched) {
    matched = searchResults.value.find((s: MusicInfo) => s.name === songName)
  }

  // 兜底：用第一首
  if (!matched) {
    matched = searchResults.value[0]
  }

  console.log('[App] 匹配到:', matched.name, '-', matched.singer, 'source:', matched.source)
  await doPlay(matched, true)
}

// 上一首 / 下一首
const handlePrev = async () => {
  const info = getCurrentInfo()
  if (info.queue.length === 0) return

  let prevIndex = info.index - 1
  if (prevIndex < 0) {
    prevIndex = info.queue.length - 1
  }
  const prevTrack = info.queue[prevIndex]
  if (prevTrack) {
    await doPlay(prevTrack, false)
  }
}

const handleNext = async () => {
  const info = getCurrentInfo()
  if (info.queue.length === 0) return

  let nextIndex = info.index + 1
  if (nextIndex >= info.queue.length) {
    if (playMode.value === 'repeat-all') {
      nextIndex = 0
    } else {
      return // 顺序播放到最后一首停止
    }
  }

  if (playMode.value === 'shuffle') {
    if (info.queue.length === 1) {
      nextIndex = 0
    } else {
      do {
        nextIndex = Math.floor(Math.random() * info.queue.length)
      } while (nextIndex === info.index)
    }
  }

  const nextTrack = info.queue[nextIndex]
  if (nextTrack) {
    await doPlay(nextTrack, false)
  }
}

// 监听歌曲结束事件，自动播放下一首
async function handleTrackEnded(e: any) {
  const nextTrack = e.detail
  console.log('[App] track-ended:', nextTrack?.name, '开始播放下一首')
  if (nextTrack) {
    await doPlay(nextTrack, false)
  }
}
window.addEventListener('track-ended', handleTrackEnded)

// 实际播放逻辑
const doPlay = async (track: MusicInfo, addToQueue: boolean = true) => {
  try {
    // 设置播放队列
    if (addToQueue) {
      if (searchResults.value.length > 0) {
        const trackIndex = searchResults.value.findIndex(t => t.songmid === track.songmid)
        if (trackIndex >= 0) {
          setPlayQueue(searchResults.value, trackIndex)
        } else {
          setPlayQueue([track], 0)
        }
      } else {
        // 从歌单或收藏播放，直接设置单曲队列
        setPlayQueue([track], 0)
      }
    }
    // 注意：如果 addToQueue 为 false，保持当前播放队列不变

    setLoading(true)
    showToast('正在获取播放链接…', 'loading')
    const url = await getMusicUrl(track)
    if (!url) {
      urlFailCount++
      if (urlFailCount >= 8) {
        showToast('请耐心等待音源恢复连接', 'error')
      } else {
        showToast('俺不中了，获取播放链接失败', 'error')
      }
      setLoading(false)
      return
    }
    urlFailCount = 0 // 成功则重置计数
    showToast('正在播放')
    setCover('')
    await play(track, url)
    // 顺序获取封面，拿到就停
    const picUrl = await getPic(track).catch(() => '')
    if (picUrl) {
      setCover(picUrl)
    } else if (track.albumId) {
      setCover(`http://img1.kuwo.cn/star/albumcover/500/${track.albumId}/500.jpg`)
    }
    // 歌词单独异步，不阻塞
    getLyric(track).then(l => setLyric(l.lyric, l.tlyric)).catch(() => {})
  } catch (e: any) {
    showToast('播放失败: ' + (e.message || '未知错误'), 'error')
    setLoading(false)
  }
}

// 收藏列表播放
const handlePlayFav = async (track: MusicInfo) => {
  // 设置播放队列为收藏列表
  const trackIndex = favorites.value.findIndex(t => t.songmid === track.songmid)
  if (trackIndex >= 0) {
    setPlayQueue(favorites.value, trackIndex)
  } else {
    setPlayQueue([track], 0)
  }
  await doPlay(track, false)
}

// 播放全部收藏
const playAllFavorites = async () => {
  if (favorites.value.length === 0) return
  // 设置播放队列
  if (playMode.value === 'shuffle') {
    const shuffled = [...favorites.value].sort(() => Math.random() - 0.5)
    setPlayQueue(shuffled, 0)
    await doPlay(shuffled[0], false)
  } else {
    setPlayQueue(favorites.value, 0)
    await doPlay(favorites.value[0], false)
  }
}

// 音源导入
const handleImportLx = async () => {
  try { await importLxSource(); showToast('音源导入成功') }
  catch (e: any) { showToast('导入失败: ' + (e.message || ''), 'error') }
}
const handleRemoveLx = async (id?: string) => {
  if (id) {
    await removeLxSource(id); showToast('音源已删除')
  } else {
    await removeLxSource(lxStatus.value?.activeId || ''); showToast('音源已删除')
  }
}
const handleRemoveAllLx = async () => {
  await removeAllLxSources(); showToast('已清空所有音源')
}
const handleSetActiveLx = async (id: string) => {
  try { await setActiveLxSource(id); showToast('已切换音源') }
  catch (e: any) { showToast('切换失败: ' + (e.message || ''), 'error') }
}
const handleImportLxUrl = async (url: string) => {
  try { await importLxSourceFromUrl(url); showToast('音源导入成功') }
  catch (e: any) { showToast('导入失败: ' + (e.message || ''), 'error') }
}

watch(() => sidebarExpanded.value, async (expanded) => {
  updateDiscAnimation(playerState.isPlaying, expanded)
  updateCoverAnimation(playerState.isPlaying, expanded)

  if (expanded) {
    // 展开时清除GSAP内联样式，让CSS接管
    if (discRef.value) {
      gsap.set(discRef.value, { clearProps: 'transform,scale,rotation,rotateX,rotateY,rotateZ' })
    }
    if (tonearmRef.value) {
      gsap.set(tonearmRef.value, { clearProps: 'transform,opacity,rotation' })
    }
    // 等待DOM更新完成后再启动电波图
    await nextTick()
    startEcg()
  } else {
    stopEcg()
    // 收起时恢复唱针的GSAP动画（根据播放状态）
    if (tonearmRef.value) {
      gsap.killTweensOf(tonearmRef.value)
      const targetRotation = playerState.isPlaying ? -8 : -45
      gsap.to(tonearmRef.value, { rotation: targetRotation, autoAlpha: 1, duration: 0.6, ease: 'power2.inOut' })
    }
  }
})

const openDetailFromPlayer = () => {
  if (showDetail.value) {
    // 已打开则关闭
    showDetail.value = false
  } else if (playerState.currentTrack) {
    // 未打开则打开
    detailTrack.value = playerState.currentTrack
    showDetail.value = true
  }
}

const handleTogglePlay = () => togglePlay()
const handleSeek = (time: number) => seek(time)
const handleVolume = (vol: number) => setVolume(vol)
const onImgError = (e: Event) => {
  console.warn('[Cover] 图片加载失败:', (e.target as HTMLImageElement).src)
  ;(e.target as HTMLImageElement).style.display = 'none'
}

// 监听当前播放歌曲变化，同步更新详情页
watch(() => playerState.currentTrack, (newTrack) => {
  if (showDetail.value && newTrack) {
    detailTrack.value = newTrack
  }
})
</script>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; background: var(--bg-deep); overflow: hidden; position: relative; }

/* ===== 沉浸播放模式 ===== */
.immersive-mode .app {
  background: transparent !important;
}
.immersive-mode .app::before { display: none !important; }
.immersive-mode .titlebar { display: none !important; }
.immersive-mode .vinyl-sidebar { display: none !important; }
.immersive-mode .main-content { display: none !important; }
.immersive-mode .right-panel { display: none !important; }
.immersive-mode .app-body { display: none !important; }
.immersive-mode .detail-overlay { display: none !important; }
.immersive-mode .bg-orbs { display: none !important; }
.immersive-mode .settings-overlay { z-index: 99999 !important; }
.immersive-mode .toast { z-index: 99999 !important; }
.immersive-mode .playlists-panel { display: none !important; }
.immersive-mode .lyrics-panel { display: none !important; }
.immersive-mode .song-detail { display: none !important; }
.immersive-mode .play-queue { display: none !important; }
/* 沉浸模式下隐藏噪点纹理 */
.immersive-mode #app::after { display: none !important; }
.immersive-mode html, .immersive-mode body, .immersive-mode #app { background: transparent !important; }

/* 全局深色覆盖层 - 减薄让光透出 */
.app::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 1;
  pointer-events: none;
}

/* 背景光斑 - 暖光 */
.bg-orbs { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; will-change: transform; }
/* 模糊直接写进 background，避免 filter 属性破坏 GPU 合成层 */
.orb-gold { width: 800px; height: 600px; left: -5%; top: -10%; background: radial-gradient(ellipse, rgba(230,180,60,0.5) 0%, rgba(212,168,83,0.15) 30%, transparent 60%); animation: orbFloat1 18s ease-in-out infinite alternate; }
.orb-purple { width: 700px; height: 700px; right: -8%; bottom: -5%; background: radial-gradient(ellipse, rgba(160,100,80,0.35) 0%, rgba(140,80,60,0.08) 30%, transparent 60%); animation: orbFloat2 22s ease-in-out infinite alternate; }
.orb-blue { width: 600px; height: 500px; right: 5%; top: 5%; background: radial-gradient(ellipse, rgba(100,140,200,0.25) 0%, rgba(80,120,180,0.06) 30%, transparent 60%); animation: orbFloat3 20s ease-in-out infinite alternate; }
.orb-amber { width: 500px; height: 400px; left: 10%; bottom: 10%; background: radial-gradient(ellipse, rgba(240,170,60,0.4) 0%, transparent 50%); animation: orbFloat4 16s ease-in-out infinite alternate; }
.orb-center { width: 500px; height: 400px; left: 40%; top: 40%; background: radial-gradient(ellipse, rgba(220,150,100,0.15) 0%, transparent 45%); animation: orbFloat5 24s ease-in-out infinite alternate; }

/* 粉色主题背景光球 - 樱花 */
.theme-pink .orb-gold { background: radial-gradient(ellipse, rgba(240,160,185,0.45) 0%, rgba(232,132,155,0.1) 30%, transparent 55%); }
.theme-pink .orb-purple { background: radial-gradient(ellipse, rgba(220,140,200,0.4) 0%, rgba(200,120,180,0.08) 30%, transparent 55%); }
.theme-pink .orb-blue { background: radial-gradient(ellipse, rgba(180,160,220,0.3) 0%, rgba(160,140,200,0.06) 30%, transparent 55%); }
.theme-pink .orb-amber { background: radial-gradient(ellipse, rgba(232,132,155,0.3) 0%, transparent 45%); }
.theme-pink .orb-center { background: radial-gradient(ellipse, rgba(200,150,190,0.18) 0%, transparent 45%); }

/* 经典白色主题 - 无玻璃模糊 */
.theme-classic {
  color-scheme: light;
}
.theme-classic .bg-orbs { display: none !important; }
.theme-classic .app::before { display: none !important; }
.theme-classic #app::after { display: none !important; }
.theme-classic .app { background: #f2f2f2 !important; }
.theme-classic.immersive-mode .app { background: transparent !important; }
/* 标题栏 */
.theme-classic .titlebar { background: #f0f0f0 !important; border-bottom: 1px solid rgba(0,0,0,0.08) !important; backdrop-filter: none !important; }
.theme-classic .titlebar .app-name { color: #1a1a1a !important; text-shadow: none !important; }
.theme-classic .titlebar .app-name-accent { color: #888 !important; }
.theme-classic .titlebar .logo-mark { color: var(--amber) !important; filter: none !important; }
/* 左侧边栏 */
.theme-classic .vinyl-sidebar { background: #f0f0f0 !important; border-right: 1px solid rgba(0,0,0,0.08) !important; backdrop-filter: none !important; }
.theme-classic .sidebar-fav { background: rgba(0,0,0,0.05) !important; border: 1.5px solid rgba(0,0,0,0.12) !important; color: #999 !important; }
.theme-classic .sidebar-fav:hover { color: var(--ruby) !important; background: rgba(200,64,64,0.08) !important; border-color: rgba(200,64,64,0.15) !important; }
.theme-classic .sidebar-fav.active { color: #e55 !important; background: rgba(200,64,64,0.1) !important; border-color: rgba(200,64,64,0.2) !important; }
.theme-classic .sidebar-fav.active svg { fill: #e55 !important; }
.theme-classic .now-playing .track-name { color: #1a1a1a !important; }
.theme-classic .now-playing .track-singer { color: #666 !important; }
.theme-classic .sidebar-toggle { background: rgba(0,0,0,0.05) !important; border: 1.5px solid rgba(0,0,0,0.12) !important; color: #666 !important; }
.theme-classic .sidebar-toggle:hover { color: var(--amber) !important; background: rgba(0,0,0,0.08) !important; border-color: rgba(0,0,0,0.18) !important; }
/* 中间内容 */
.theme-classic .main-content { background: #f2f2f2 !important; backdrop-filter: none !important; }
.theme-classic .main-content::before { background: rgba(0,0,0,0.06) !important; }
/* 右侧面板 */
.theme-classic .right-panel { background: #f0f0f0 !important; border-left: 1px solid rgba(0,0,0,0.08) !important; backdrop-filter: none !important; }
.theme-classic .rtab { color: #888 !important; }
.theme-classic .rtab:hover { color: #333 !important; }
.theme-classic .rtab.active { color: var(--amber) !important; border-bottom-color: var(--amber) !important; }
.theme-classic .fav-name { color: #1a1a1a !important; }
.theme-classic .fav-singer { color: #666 !important; }
.theme-classic .fav-item:hover { background: rgba(0,0,0,0.04) !important; }
.theme-classic .fav-controls { border-bottom-color: rgba(0,0,0,0.06) !important; }
.theme-classic .fav-play-all { background: var(--amber) !important; color: #fff !important; border: none !important; }
/* 播放条 */
.theme-classic .player-bar { background: #f0f0f0 !important; border-top: 1px solid rgba(0,0,0,0.08) !important; backdrop-filter: none !important; }
.theme-classic .pt-name { color: #1a1a1a !important; }
.theme-classic .pt-singer { color: #666 !important; }
.theme-classic .time { color: #888 !important; }
.theme-classic .time-sep { color: #bbb !important; }
.theme-classic .ctrl { background: rgba(0,0,0,0.05) !important; border: 1.5px solid rgba(0,0,0,0.12) !important; color: #555 !important; }
.theme-classic .ctrl:hover { background: rgba(0,0,0,0.08) !important; color: #1a1a1a !important; border-color: rgba(0,0,0,0.18) !important; }
.theme-classic .ctrl-main { color: #fff !important; border: none !important; }
.theme-classic .ctrl-main-glow { display: none !important; }
.theme-classic .tool-btn { background: rgba(0,0,0,0.05) !important; border: 1.5px solid rgba(0,0,0,0.12) !important; color: #555 !important; }
.theme-classic .tool-btn:hover { color: #1a1a1a !important; background: rgba(0,0,0,0.08) !important; border-color: rgba(0,0,0,0.18) !important; }
.theme-classic .tool-btn { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #555 !important; }
.theme-classic .tool-btn:hover { color: #1a1a1a !important; background: rgba(0,0,0,0.08) !important; }
.theme-classic .vol-slider { background: rgba(0,0,0,0.12) !important; box-shadow: inset 0 1px 0 rgba(0,0,0,0.06) !important; }
.theme-classic .vol-slider::-webkit-slider-track { background: rgba(0,0,0,0.12) !important; height: 4px !important; border-radius: 2px !important; }
.theme-classic .vol-slider::-webkit-slider-thumb { background: var(--amber) !important; box-shadow: 0 0 6px rgba(184,148,46,0.3) !important; }
.theme-classic .vol-percent { color: #888 !important; }
.theme-classic .vol-label { color: #888 !important; }
.theme-classic .progress-track-full { background: rgba(0,0,0,0.12) !important; }
.theme-classic .progress-track-full:hover { background: rgba(0,0,0,0.18) !important; }
.theme-classic .progress-fill { background: linear-gradient(90deg, var(--amber-dim), var(--amber)) !important; }
.theme-classic .progress-dot { background: var(--amber) !important; box-shadow: 0 0 8px var(--amber-glow) !important; }
/* 标题栏按钮 */
.theme-classic .lx-badge { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #555 !important; }
.theme-classic .immersive-btn, .theme-classic .playlist-btn { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #555 !important; }
.theme-classic .immersive-btn:hover, .theme-classic .playlist-btn:hover { color: var(--amber) !important; background: rgba(184,148,46,0.08) !important; border-color: rgba(184,148,46,0.2) !important; }
.theme-classic .immersive-wrap .immersive-tooltip { background: #fff !important; color: #333 !important; border: 1px solid rgba(0,0,0,0.1) !important; }
.theme-classic .immersive-wrap .tooltip-title { color: #333 !important; }
.theme-classic .immersive-wrap .tooltip-desc { color: #888 !important; }
/* 搜索 */
.theme-classic .search-input { background: #fff !important; border: 1px solid rgba(0,0,0,0.1) !important; color: #1a1a1a !important; }
.theme-classic .search-input::placeholder { color: #aaa !important; }
.theme-classic .search-icon-wrap { color: #999 !important; }
.theme-classic .glass-shine { display: none !important; }
.theme-classic .cursor-glow { display: none !important; }
.theme-classic .clear-btn { color: #999 !important; }
.theme-classic .clear-btn:hover { color: #333 !important; background: rgba(0,0,0,0.06) !important; }
.theme-classic .search-trigger { background: var(--amber) !important; color: #fff !important; border: none !important; }
.theme-classic .search-trigger:disabled { opacity: 0.4 !important; }
/* 搜索结果 */
.theme-classic .result-item { border-bottom: 1px solid rgba(0,0,0,0.05) !important; }
.theme-classic .result-item:hover { background: rgba(0,0,0,0.03) !important; }
.theme-classic .result-name { color: #1a1a1a !important; }
.theme-classic .result-singer { color: #666 !important; }
.theme-classic .result-album { color: #999 !important; }
.theme-classic .track-item:hover { background: rgba(0,0,0,0.03) !important; }
.theme-classic .track-item.playing { background: rgba(184,148,46,0.08) !important; }
.theme-classic .track-item .track-name { color: #1a1a1a !important; }
.theme-classic .track-item .track-singer { color: #666 !important; }
/* 设置 */
.theme-classic .settings-overlay { background: rgba(0,0,0,0.25) !important; backdrop-filter: none !important; }
.theme-classic .settings-panel { background: #fff !important; border: 1px solid rgba(0,0,0,0.1) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important; backdrop-filter: none !important; }
.theme-classic .settings-header h3 { color: #1a1a1a !important; }
.theme-classic .settings-close { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #888 !important; }
.theme-classic .settings-close:hover { color: #333 !important; background: rgba(0,0,0,0.06) !important; }
.theme-classic .section-label { color: #888 !important; }
.theme-classic .source-item { background: rgba(0,0,0,0.02) !important; border: 1px solid rgba(0,0,0,0.06) !important; }
.theme-classic .source-item::before { background: none !important; }
.theme-classic .source-item:hover { background: rgba(0,0,0,0.04) !important; }
.theme-classic .source-item.active { background: rgba(184,148,46,0.06) !important; border-color: rgba(184,148,46,0.15) !important; }
.theme-classic .source-name { color: #1a1a1a !important; }
.theme-classic .source-desc { color: #666 !important; }
.theme-classic .source-meta { color: #999 !important; }
.theme-classic .active-dot { background: #4caf50 !important; box-shadow: 0 0 6px #4caf50 !important; }
.theme-classic .src-btn { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #666 !important; }
.theme-classic .src-btn:hover { background: rgba(0,0,0,0.06) !important; }
.theme-classic .src-btn.use { color: var(--amber) !important; background: rgba(184,148,46,0.08) !important; border-color: rgba(184,148,46,0.2) !important; }
.theme-classic .src-badge { color: #4caf50 !important; background: rgba(76,175,80,0.08) !important; border-color: rgba(76,175,80,0.15) !important; }
.theme-classic .import-btn { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #666 !important; }
.theme-classic .import-btn:hover { background: rgba(0,0,0,0.06) !important; color: #333 !important; }
.theme-classic .import-btn.primary { background: var(--amber) !important; color: #fff !important; border: none !important; }
.theme-classic .url-input { background: rgba(0,0,0,0.02) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #1a1a1a !important; }
.theme-classic .url-input::placeholder { color: #aaa !important; }
.theme-classic .url-input:focus { border-color: var(--amber-border) !important; }
.theme-classic .url-error { color: var(--ruby) !important; }
.theme-classic .danger-btn { background: rgba(200,64,64,0.06) !important; border: 1px solid rgba(200,64,64,0.12) !important; color: var(--ruby) !important; }
.theme-classic .theme-item { background: rgba(0,0,0,0.03) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #666 !important; }
.theme-classic .theme-item:hover { background: rgba(0,0,0,0.05) !important; }
.theme-classic .theme-item.active { border-color: var(--amber) !important; color: var(--amber) !important; background: rgba(184,148,46,0.08) !important; }
.theme-classic .source-empty { background: rgba(0,0,0,0.02) !important; border-color: rgba(0,0,0,0.08) !important; }
.theme-classic .source-empty p { color: #999 !important; }
/* 歌单面板 */
/* 歌词/队列/详情 */
.theme-classic .lyrics-panel { background: #f0f0f0 !important; backdrop-filter: none !important; }
.theme-classic .song-detail { background: #f0f0f0 !important; backdrop-filter: none !important; }
.theme-classic .play-queue { background: #f0f0f0 !important; backdrop-filter: none !important; }
.theme-classic .queue-item { border-bottom: 1px solid rgba(0,0,0,0.04) !important; }
.theme-classic .queue-item:hover { background: rgba(0,0,0,0.03) !important; }
.theme-classic .queue-item.active { background: rgba(184,148,46,0.06) !important; }
.theme-classic .queue-name { color: #1a1a1a !important; }
.theme-classic .queue-singer { color: #666 !important; }
.theme-classic .queue-remove { color: #bbb !important; }
.theme-classic .queue-remove:hover { color: var(--ruby) !important; }
/* Toast */
.theme-classic .toast { backdrop-filter: none !important; background: #fff !important; color: #333 !important; border: 1px solid rgba(0,0,0,0.1) !important; box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important; }
.theme-classic .toast svg { stroke: currentColor !important; }
/* 引导页 */
.theme-classic .guide-overlay { background: rgba(0,0,0,0.4) !important; }
.theme-classic .guide-panel { background: #fff !important; border: 1px solid rgba(0,0,0,0.1) !important; }
.theme-classic .guide-close { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #888 !important; }
.theme-classic .guide-btn.secondary { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.08) !important; color: #666 !important; }
.theme-classic .guide-btn.primary { background: var(--amber) !important; color: #fff !important; border: none !important; }
.theme-classic .guide-step-title { color: #1a1a1a !important; }
.theme-classic .guide-step-desc { color: #666 !important; }
/* 唱片/封面 */
.theme-classic .cover-large { box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important; }
.theme-classic .cover-img { border-radius: 4px !important; }
.theme-classic .vinyl-disc { filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15)) !important; }
/* 链接 */
.theme-classic a { color: var(--amber) !important; }
/* 启动页 */
.theme-classic .splash-screen { background: #f2f2f2 !important; }
.theme-classic .splash-orb { display: none !important; }
.theme-classic .logo-dafen { color: #1a1a1a !important; text-shadow: none !important; }
.theme-classic .logo-radio { color: #888 !important; }
.theme-classic .logo-icon { filter: none !important; }
.theme-classic .splash-loader { background: rgba(0,0,0,0.08) !important; }
.theme-classic .splash-version { color: #999 !important; }
/* 标题栏文字 */
.theme-classic .app-name { color: #1a1a1a !important; text-shadow: none !important; }
.theme-classic .app-name-accent { color: #888 !important; }
/* 搜索相关 */
.theme-classic .search-wrap { background: #ffffff !important; border: 1px solid var(--glass-border) !important; }
.theme-classic .search-wrap.focused { border-color: var(--amber-border) !important; box-shadow: 0 0 0 3px var(--amber-glow-sm) !important; }
.theme-classic .search-icon-wrap { color: var(--text-ghost) !important; }
.theme-classic .glass-shine { display: none !important; }
.theme-classic .cursor-glow { display: none !important; }
.theme-classic .clear-btn { color: var(--text-ghost) !important; }
.theme-classic .clear-btn:hover { color: var(--text-cream) !important; background: var(--bg-hover) !important; }
.theme-classic .search-trigger { background: var(--amber) !important; color: #ffffff !important; border: none !important; }
.theme-classic .search-trigger:hover:not(:disabled) { filter: brightness(1.1) !important; }
.theme-classic .search-trigger:disabled { opacity: 0.4 !important; }
/* 搜索结果 */
.theme-classic .search-results { background: rgba(255,255,255,0.98) !important; }
.theme-classic .result-item { border-bottom: 1px solid var(--border-subtle) !important; }
.theme-classic .result-item:hover { background: var(--bg-hover) !important; }
.theme-classic .result-name { color: var(--text-cream) !important; }
.theme-classic .result-singer { color: var(--text-muted) !important; }
.theme-classic .result-album { color: var(--text-ghost) !important; }
.theme-classic .result-actions { opacity: 0.6 !important; }
.theme-classic .result-item:hover .result-actions { opacity: 1 !important; }
/* 引导页 */
.theme-classic .guide-overlay { background: rgba(0,0,0,0.4) !important; }
.theme-classic .guide-panel { background: #ffffff !important; border: 1px solid var(--glass-border) !important; }
.theme-classic .guide-close { background: var(--glass-bg) !important; border: 1px solid var(--glass-border) !important; color: var(--text-muted) !important; }
.theme-classic .guide-close:hover { background: var(--glass-bg-hover) !important; color: var(--text-cream) !important; }
.theme-classic .guide-btn.secondary { background: var(--glass-bg) !important; border: 1px solid var(--glass-border) !important; color: var(--text-muted) !important; }
.theme-classic .guide-btn.secondary:hover { background: var(--glass-bg-hover) !important; }
.theme-classic .guide-btn.primary { background: var(--amber) !important; color: #ffffff !important; border: none !important; }
.theme-classic .guide-step-title { color: var(--text-cream) !important; }
.theme-classic .guide-step-desc { color: var(--text-muted) !important; }
/* 右侧面板 */
.theme-classic .fav-item { border-bottom: 1px solid var(--border-subtle) !important; }
.theme-classic .fav-item:hover { background: var(--bg-hover) !important; }
.theme-classic .fav-name { color: var(--text-cream) !important; }
.theme-classic .fav-singer { color: var(--text-muted) !important; }
.theme-classic .fav-remove { color: var(--text-ghost) !important; }
.theme-classic .fav-remove:hover { color: var(--ruby) !important; }
.theme-classic .fav-play-all { background: var(--amber) !important; color: #ffffff !important; border: none !important; }
.theme-classic .fav-play-all:hover { filter: brightness(1.1) !important; }
.theme-classic .rtab { color: var(--text-muted) !important; }
.theme-classic .rtab:hover { color: var(--text-cream) !important; }
.theme-classic .rtab.active { color: var(--amber) !important; border-bottom-color: var(--amber) !important; }
/* 歌词 */
.theme-classic .lyric-line { color: var(--text-ghost) !important; }
.theme-classic .lyric-line.active { color: var(--amber) !important; }
.theme-classic .lyric-line.past { color: var(--text-muted) !important; }
/* 播放队列 */
.theme-classic .queue-item { border-bottom: 1px solid var(--border-subtle) !important; }
.theme-classic .queue-item:hover { background: var(--bg-hover) !important; }
.theme-classic .queue-item.active { background: var(--amber-glass) !important; }
.theme-classic .queue-name { color: var(--text-cream) !important; }
.theme-classic .queue-singer { color: var(--text-muted) !important; }
.theme-classic .queue-remove { color: var(--text-ghost) !important; }
.theme-classic .queue-remove:hover { color: var(--ruby) !important; }
/* 歌曲详情 */
.theme-classic .song-detail-cover { box-shadow: var(--shadow-warm) !important; }
.theme-classic .song-detail-name { color: var(--text-cream) !important; }
.theme-classic .song-detail-singer { color: var(--text-muted) !important; }
.theme-classic .song-detail-album { color: var(--text-ghost) !important; }
/* 沉浸模式 */
.theme-classic .immersive-overlay { background: transparent !important; }
/* 通用按钮 */
.theme-classic button { color: inherit !important; }
.theme-classic a { color: var(--amber) !important; }
.theme-classic a:hover { filter: brightness(1.1) !important; }

@keyframes orbFloat1 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(40px,30px,0) scale(1.08); } }
@keyframes orbFloat2 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-30px,-25px,0) scale(1.05); } }
@keyframes orbFloat3 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-20px,35px,0) scale(0.95); } }
@keyframes orbFloat4 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(25px,-20px,0) scale(1.1); } }
@keyframes orbFloat5 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-15px,15px,0) scale(1.15); } }

.app-body { flex: 1; display: flex; overflow: hidden; position: relative; z-index: 3; padding-bottom: 90px; }

/* 侧边栏 — CSS变量驱动响应式 */
.vinyl-sidebar {
  --sb-scene: 180px;
  --sb-disc: 160px;
  --sb-cover: 150px;
  --sb-cover-lg: 240px;
  --sb-padding: 24px;
  --sb-width: 280px;
  width: var(--sb-width); flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--sb-padding); background: rgba(30, 25, 35, 0.4); backdrop-filter: blur(10px) saturate(1.5); -webkit-backdrop-filter: blur(10px) saturate(1.5); border-right: 1px solid rgba(255,255,255,0.08); border-radius: 0 16px 16px 0; box-shadow: 4px 0 30px rgba(0,0,0,0.1); position: relative; overflow: hidden;
}

/* 响应式断点 */
@media (max-width: 900px) {
  .vinyl-sidebar {
    --sb-scene: 150px;
    --sb-disc: 135px;
    --sb-cover: 130px;
    --sb-cover-lg: 200px;
    --sb-padding: 16px;
    --sb-width: 250px;
  }
}

@media (max-width: 700px) {
  .vinyl-sidebar {
    --sb-scene: 120px;
    --sb-disc: 108px;
    --sb-cover: 110px;
    --sb-cover-lg: 170px;
    --sb-padding: 12px;
    --sb-width: 210px;
  }
}

@media (max-width: 550px) {
  .vinyl-sidebar {
    --sb-scene: 100px;
    --sb-disc: 90px;
    --sb-cover: 95px;
    --sb-cover-lg: 150px;
    --sb-padding: 10px;
    --sb-width: 180px;
  }
}

.sidebar-main { display: flex; flex-direction: column; align-items: center; gap: 16px; flex-shrink: 0; width: 100%; max-width: 100%; position: relative; z-index: 2; margin-top: 60px; }
.sidebar-main.layout-expanded { flex-direction: column; align-items: center; gap: 20px; justify-content: center; }
.cover-large { width: var(--sb-cover); height: var(--sb-cover); min-width: var(--sb-cover); min-height: var(--sb-cover); position: relative; cursor: pointer; flex-shrink: 0; transform-style: preserve-3d; /* GSAP 控制动画 */ will-change: transform; z-index: 2; }
.sidebar-main:not(.layout-expanded) .cover-large { width: var(--sb-cover); height: var(--sb-cover); min-width: var(--sb-cover); min-height: var(--sb-cover); }
.sidebar-main.layout-expanded .cover-large { width: var(--sb-cover-lg); height: var(--sb-cover-lg); min-width: var(--sb-cover-lg); min-height: var(--sb-cover-lg); }
.now-playing { text-align: left; min-width: 0; flex: 1; padding-left: 10px; }
.sidebar-main:not(.layout-expanded) .now-playing { text-align: center; padding-left: 0; width: 100%; }
.sidebar-main.layout-expanded .now-playing { text-align: center; padding-left: 0; width: 100%; }
.cover-3d { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; }
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; position: relative; z-index: 2; border-radius: 2px; }
/* 3D 厚度 — 多层边缘模拟玻璃厚度 */
.cover-edge {
  position: absolute; inset: -3px; border-radius: 3px; z-index: 1;
  background:
    /* 顶部高光 */
    linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 2px, transparent 6px),
    /* 底部暗边 */
    linear-gradient(0deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 3px, transparent 8px),
    /* 左侧高光 */
    linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 3px),
    /* 右侧暗边 */
    linear-gradient(270deg, rgba(0,0,0,0.2) 0%, transparent 3px),
    /* 整体玻璃底色 */
    linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.08) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.3),
    0 4px 16px rgba(0,0,0,0.4),
    0 12px 40px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.12),
    inset 0 -1px 0 rgba(0,0,0,0.2);
  pointer-events: none;
}
/* 玻璃内表面高光 */
.cover-reflection {
  position: absolute; inset: 0; border-radius: 2px; z-index: 3;
  background: linear-gradient(155deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 15%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%);
  pointer-events: none;
}
/* 底部倒影 */
.cover-3d::after {
  content: '';
  position: absolute;
  left: 5%; right: 5%; top: calc(100% + 2px); height: 30px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%);
  transform: perspective(300px) rotateX(25deg);
  opacity: 0.6;
  filter: blur(1px);
  pointer-events: none;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 70%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 70%);
}
.sidebar-toggle { position: absolute; top: 12px; right: 12px; z-index: 10; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.15); transition: all var(--t-fast); }
.sidebar-toggle:hover { color: var(--amber); background: rgba(255,255,255,0.15); border-color: rgba(212,168,83,0.3); box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 12px rgba(212,168,83,0.2); }
.sidebar-toggle.disabled { opacity: 0.3; cursor: not-allowed; }

/* 全屏按钮 */
.fullscreen-btn { position: absolute; top: 12px; right: 52px; z-index: 10; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-ghost); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); transition: all var(--t-fast); }
.fullscreen-btn:hover { color: var(--amber); background: rgba(212, 168, 83, 0.1); border-color: rgba(212, 168, 83, 0.2); }
.sidebar-refraction { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%); pointer-events: none; }
.sidebar-glow { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 40%, var(--amber-glow) 0%, transparent 70%); opacity: var(--amber-glow-opacity, 0); transition: opacity 1.2s ease; pointer-events: none; filter: blur(10px); }

.vinyl-scene { position: relative; width: var(--sb-scene); height: var(--sb-scene); margin-bottom: calc(var(--sb-padding) * 0.6); perspective: 800px; transition: all 0.4s ease; z-index: 1; }
.vinyl-sidebar.expanded .vinyl-scene { width: calc(var(--sb-scene) * 0.6); height: calc(var(--sb-scene) * 0.6); margin-bottom: calc(var(--sb-scene) * -0.8); z-index: 3; position: static; }
.vinyl-disc { width: var(--sb-disc); height: var(--sb-disc); position: absolute; top: 10px; left: 10px; transform-style: preserve-3d; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.3)); transition: all 0.3s ease; }
.vinyl-sidebar.expanded .vinyl-disc { width: calc(var(--sb-scene) * 0.6); height: calc(var(--sb-scene) * 0.6); position: absolute; top: 90px; left: 50%; margin-left: calc(var(--sb-scene) * -0.3); z-index: 10; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4)); }
.vinyl-sidebar.expanded { overflow: visible; }
.disc-expanded-spin { animation: expandedSpin 0.8s ease-out forwards; }
@keyframes expandedSpin { from { transform: rotateZ(0deg); } to { transform: rotateZ(360deg); } }
.disc-playing-spin { animation: discSpin 4s linear infinite; }
@keyframes discSpin { from { transform: rotateZ(0deg); } to { transform: rotateZ(360deg); } }
.cover-expanded-spin { animation: coverSpin 6s linear infinite; }
@keyframes coverSpin { from { transform: rotateZ(-15deg); } to { transform: rotateZ(-375deg); } }
.disc-outer { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(145deg, #1e1923, #14121c); box-shadow: 0 0 0 2px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.3); transform-style: preserve-3d; }
.disc-outer::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.1) 100%); pointer-events: none; }
.disc-grooves { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.02); }
.disc-grooves:nth-child(1) { inset: 12px; }
.disc-grooves.g2 { inset: 28px; border-color: rgba(255,255,255,0.03); }
.disc-grooves.g3 { inset: 44px; }
.disc-grooves.g4 { inset: 60px; border-color: rgba(255,255,255,0.03); }
.disc-inner { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 0 20px rgba(0,0,0,0.25); }
.disc-art { width: 100%; height: 100%; object-fit: cover; }
.disc-art-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-ghost); }
.disc-center-hole { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 10px; height: 10px; border-radius: 50%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); }
.disc-halo { position: absolute; inset: -24px; border-radius: 50%; background: radial-gradient(circle, var(--amber-glow) 0%, transparent 65%); opacity: 0; pointer-events: none; transition: opacity 1s ease; filter: blur(3px); }
.vinyl-sidebar.playing .disc-halo { opacity: 1; animation: haloBreath 3s ease-in-out infinite alternate; }
@keyframes haloBreath { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.1); opacity: 1; } }

.tonearm { position: absolute; top: -5px; right: 15px; z-index: 2; transform-origin: top right; transform: rotate(-45deg); transition: all 0.4s ease; }
.vinyl-sidebar.expanded .tonearm { opacity: 0; transform: rotate(-70deg) scale(0.5); }
.tonearm-base { position: absolute; top: 0; right: 0; width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.1); }
.tonearm-arm { position: absolute; top: 8px; right: 8px; width: 3.5px; height: 120px; background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 100%); transform-origin: top center; transform: rotate(30deg); border-radius: 2px; }
.tonearm-head { position: absolute; bottom: -5px; left: -4px; width: 14px; height: 20px; background: rgba(255,255,255,0.1); border-radius: 3px; }

.np-label { font-family: var(--font-body); font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--amber-dim); margin-bottom: var(--space-sm); }
.np-title { font-family: var(--font-display); font-size: clamp(14px, 3.5vw, 24px); font-weight: 400; font-style: italic; color: var(--text-cream); line-height: 1.3; margin-bottom: var(--space-xs); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 2px 8px rgba(0,0,0,0.3); max-width: 100%; }
.sidebar-main.layout-expanded .np-title { font-size: clamp(16px, 4vw, 28px); }
.np-artist { font-size: clamp(11px, 2vw, 14px); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 10px; }
.sidebar-main.layout-expanded .np-artist { font-size: clamp(12px, 2.2vw, 15px); }

/* 侧边栏margin-top响应式 */
@media (max-width: 900px) {
  .sidebar-main { margin-top: 40px; }
}
@media (max-width: 700px) {
  .sidebar-main { margin-top: 30px; gap: 10px; }
}
@media (max-width: 550px) {
  .sidebar-main { margin-top: 20px; gap: 8px; }
}
.np-source { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; padding: 4px 12px; border-radius: 999px; color: var(--amber-dim); background: rgba(212, 168, 83, 0.08); border: 1px solid rgba(212, 168, 83, 0.12); margin-top: 6px; }
.np-lyric-line {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  font-style: italic;
  color: var(--amber);
  text-shadow: 0 0 20px var(--amber-highlight), 0 2px 8px rgba(0,0,0,0.2);
  margin-top: 14px;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.source-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }

/* 心电图 */
.ecg-container {
  position: absolute;
  top: 50%;
  left: 36px;
  right: 36px;
  transform: translateY(-50%);
  height: 200px;
  z-index: 1;
}

.ecg-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.sidebar-fav { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-ghost); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); transition: all var(--t-fast); margin-top: 8px; }
.sidebar-fav:hover { color: var(--ruby); background: rgba(200,90,90,0.08); }
.sidebar-fav.active { color: #e88; background: rgba(200,90,90,0.1); }

/* 中间内容区 */
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; position: relative; background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px) saturate(1.5); -webkit-backdrop-filter: blur(10px) saturate(1.5); }
.main-content::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.06); pointer-events: none; z-index: 1; }

/* Toast */
.toast { position: fixed; top: 52px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: 999px; font-size: 12px; box-shadow: 0 4px 30px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.1); pointer-events: none; }
.toast.success { color: #66d9a0; background: rgba(30,60,45,0.75); border: 1.5px solid rgba(102,217,160,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.12); }
.toast.error { color: #e88; background: rgba(60,30,30,0.75); border: 1.5px solid rgba(200,90,90,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.12); }
.toast.loading { color: var(--amber); background: rgba(50,40,20,0.75); border: 1.5px solid rgba(212,168,83,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.12); }
.toast-enter-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.95); }
.toast-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 详情页覆盖 */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(30, 25, 35, 0.8);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  overflow: visible;
}

.detail-slide-enter-active { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease; }
.detail-slide-leave-active { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease; }
.detail-slide-enter-from { transform: translateY(100%); opacity: 0; }
.detail-slide-leave-to { transform: translateY(100%); opacity: 0; }

/* 收藏列表 */
.fav-list { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; z-index: 1; }
.fav-controls { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.fav-play-all {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 999px;
  font-size: 11px; font-weight: 500;
  color: #0d0b14; background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  box-shadow: 0 4px 30px var(--amber-glow-md);
  transition: all var(--t-fast);
}
.fav-play-all:hover { box-shadow: 0 6px 40px var(--amber-glow-lg); transform: translateY(-1px); }
.fav-mode-group { display: flex; gap: 4px; }
.fav-mode-btn {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  color: var(--text-ghost); background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  transition: all var(--t-fast);
}
.fav-mode-btn:hover { color: var(--text-cream); background: rgba(255,255,255,0.08); }
.fav-mode-btn.active { color: var(--amber); background: rgba(212, 168, 83, 0.08); border-color: rgba(212, 168, 83, 0.15); }
.mode-dot { position: absolute; font-size: 7px; font-weight: 700; bottom: 4px; right: 5px; color: var(--amber); }
.fav-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 12px; }
.fav-empty p { font-family: var(--font-display); font-size: 13px; color: var(--text-ghost); font-style: italic; }
.fav-scroll { flex: 1; overflow-y: auto; padding: 4px 10px; }
.fav-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 12px;
  cursor: pointer; transition: all var(--t-fast);
  border: 1px solid transparent;
}
.fav-item:hover { background: rgba(255,255,255,0.05); }
.fav-item.active { background: rgba(212, 168, 83, 0.1); border-color: rgba(212, 168, 83, 0.15); }
.fav-item.active .fav-name { color: var(--amber); }
.fav-idx { width: 20px; text-align: center; font-family: var(--font-mono); font-size: 10px; color: var(--text-ghost); flex-shrink: 0; }
.fav-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.fav-name { font-size: 12px; color: var(--text-cream); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-singer { font-size: 10px; color: var(--text-ghost); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-remove {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%;
  color: #e88; transition: all var(--t-fast);
  background: rgba(232,136,136,0.08); border: 1px solid rgba(232,136,136,0.15); flex-shrink: 0;
}
.fav-remove:hover { background: rgba(232,136,136,0.15); }

/* 右侧面板（队列+歌词切换） */
.right-panel {
  display: flex; flex-direction: column;
  width: 280px; flex-shrink: 0;
  background: rgba(30, 25, 35, 0.4);
  border-left: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px 0 0 16px;
  box-shadow: -4px 0 30px rgba(0,0,0,0.1);
  position: relative; overflow: hidden;
}
.right-panel::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%);
  pointer-events: none;
}

.right-tabs {
  display: flex; gap: 3px; padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  position: relative; z-index: 1;
}
.rtab {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: 999px;
  font-size: 10px; color: var(--text-ghost);
  transition: all var(--t-fast);
  border: 1px solid transparent;
}
.rtab:hover { color: var(--text-muted); background: rgba(255,255,255,0.04); }
.rtab.active { color: var(--text-cream); background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.08); }
.rtab-count { font-size: 9px; padding: 2px 6px; border-radius: 999px; background: rgba(255,255,255,0.06); }

/* 歌词面板过渡 */
.panel-slide-enter-active, .panel-slide-leave-active { transition: transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease, filter 0.5s ease; }
.panel-slide-enter-from, .panel-slide-leave-to { transform: translateX(100%); opacity: 0; filter: blur(8px); }

/* 右侧面板响应式 */
@media (max-width: 1000px) {
  .right-panel { width: 240px; }
  .fav-controls { padding: 8px 10px; }
  .fav-play-all { padding: 6px 12px; font-size: 10px; gap: 4px; }
  .fav-play-all svg { width: 10px; height: 10px; }
  .fav-mode-btn { width: 30px; height: 30px; }
  .fav-mode-btn svg { width: 12px; height: 12px; }
}
@media (max-width: 700px) {
  .right-panel { width: 200px; }
  .fav-controls { padding: 6px 8px; }
  .fav-play-all { padding: 5px 10px; font-size: 9px; gap: 3px; }
  .fav-mode-btn { width: 26px; height: 26px; }
  .fav-mode-btn svg { width: 10px; height: 10px; }
}
@media (max-width: 550px) {
  .right-panel { width: 160px; }
  .fav-controls { padding: 4px 6px; }
  .fav-play-all { padding: 4px 8px; font-size: 8px; gap: 2px; }
  .fav-mode-btn { width: 22px; height: 22px; }
  .fav-mode-btn svg { width: 8px; height: 8px; }
}

</style>

<!-- 非 scoped：沉浸模式需要穿透子组件 -->
<style>
.immersive-mode .player-bar { display: none !important; }
</style>

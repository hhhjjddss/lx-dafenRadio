import { ref } from 'vue'
import type { MusicInfo } from './useSource'

const favorites = ref<MusicInfo[]>([])
let loaded = false
let saving = false

// 从项目文件夹的 data/favorites.json 加载（Electron 主进程读写）
async function loadFavorites(): Promise<void> {
  if (loaded) return
  loaded = true // 先标记为已加载，防止重复调用
  try {
    if (window.api?.favoritesLoad) {
      const data = await window.api.favoritesLoad()
      if (Array.isArray(data) && data.length > 0) {
        favorites.value = data
        console.log('[Favorites] 从文件加载了', data.length, '首歌曲')
      } else {
        // 文件为空或不存在，尝试从旧 localStorage 迁移
        const legacy = localStorage.getItem('dafen_favorites')
        if (legacy) {
          const parsed = JSON.parse(legacy)
          if (Array.isArray(parsed) && parsed.length > 0) {
            favorites.value = parsed
            window.api.favoritesSave(parsed)
            console.log('[Favorites] 从旧存储迁移了', parsed.length, '首歌曲')
          }
        }
      }
    } else {
      const saved = localStorage.getItem('dafen_favorites')
      if (saved) favorites.value = JSON.parse(saved)
    }
  } catch (e) {
    console.warn('[Favorites] 加载失败:', e)
  }
}

// 保存到项目文件夹（JSON.parse/stringify 去掉 Vue 响应式代理）
function saveFavorites(): void {
  if (saving) return
  saving = true
  try {
    if (window.api?.favoritesSave) {
      // 必须转成纯对象，Vue Proxy 对象无法通过 IPC 传输
      const plain = JSON.parse(JSON.stringify(favorites.value))
      window.api.favoritesSave(plain).then(ok => {
        console.log('[Favorites] 保存结果:', ok, '共', plain.length, '首')
        saving = false
      }).catch((e: any) => {
        console.warn('[Favorites] 保存失败:', e)
        saving = false
      })
    } else {
      localStorage.setItem('dafen_favorites', JSON.stringify(favorites.value))
      saving = false
    }
  } catch (e) {
    console.warn('[Favorites] 保存异常:', e)
    saving = false
  }
}

export function useFavorites() {
  // 首次使用时触发加载（异步，不阻塞）
  if (!loaded) loadFavorites()

  const isFavorite = (songmid: string) => {
    return favorites.value.some(t => t.songmid === songmid)
  }

  const toggleFavorite = (track: MusicInfo) => {
    const idx = favorites.value.findIndex(t => t.songmid === track.songmid)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push(track)
    }
    console.log('[Favorites] toggleFavorite 被调用, 当前数量:', favorites.value.length, 'window.api:', !!window.api, 'favoritesSave:', !!(window.api as any)?.favoritesSave)
    saveFavorites()
  }

  const addFavorite = (track: MusicInfo) => {
    if (!isFavorite(track.songmid)) {
      favorites.value.push(track)
      saveFavorites()
    }
  }

  const removeFavorite = (songmid: string) => {
    const idx = favorites.value.findIndex(t => t.songmid === songmid)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
      saveFavorites()
    }
  }

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite
  }
}

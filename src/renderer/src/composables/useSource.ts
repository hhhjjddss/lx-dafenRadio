import { ref } from 'vue'

export interface MusicInfo {
  songmid: string; name: string; singer: string; album?: string; duration?: number; source: string; img?: string; albumId?: string
}

export interface LxSourceItem {
  id: string; filePath: string; importedAt: number
  metadata: { name: string; description: string; version: string; author: string; homepage: string }
}

export interface LxSourceStatus {
  activeId: string; sources: LxSourceItem[]; loaded: boolean
  loadedSource: LxSourceItem | null; error: string
  loadedSources: Record<string, { name: string; actions: string[]; qualitys: string[] }>
}

export function useSource() {
  const searchResults = ref<MusicInfo[]>([])
  const searching = ref(false)
  const lxStatus = ref<LxSourceStatus | null>(null)

  const search = async (keyword: string) => {
    if (!keyword.trim()) return
    searching.value = true
    try {
      const result = await window.api.sourceSearch(keyword)
      searchResults.value = result.success ? result.data.list : []
    } catch { searchResults.value = [] }
    finally { searching.value = false }
  }

  const getMusicUrl = async (musicInfo: MusicInfo, quality = '320k'): Promise<string> => {
    const safe = { songmid: String(musicInfo.songmid || ''), name: String(musicInfo.name || ''), singer: String(musicInfo.singer || ''), album: String(musicInfo.album || ''), duration: Number(musicInfo.duration) || 0, source: String(musicInfo.source || '') }
    return await window.api.sourceGetUrl(safe, quality) || ''
  }

  const getLyric = async (musicInfo: MusicInfo) => {
    const safe = { songmid: String(musicInfo.songmid || ''), name: String(musicInfo.name || ''), singer: String(musicInfo.singer || '') }
    const result = await window.api.sourceGetLyric(safe)
    if (result.success) return result.data
    throw new Error(result.error)
  }

  const getPic = async (musicInfo: MusicInfo) => {
    const safe = { songmid: String(musicInfo.songmid || ''), name: String(musicInfo.name || ''), singer: String(musicInfo.singer || ''), albumId: String(musicInfo.albumId || '') }
    const result = await window.api.sourceGetPic(safe)
    if (result.success) return result.data as string
    throw new Error(result.error)
  }

  const refreshLxStatus = async () => {
    try {
      const result = await window.api.lxStatus()
      if (result.success) lxStatus.value = result.data
    } catch {}
  }

  const importLxSource = async () => {
    const result = await window.api.lxImport()
    if (result.success) { lxStatus.value = result.data; return result.data }
    throw new Error(result.error)
  }

  const removeLxSource = async (id: string) => {
    const result = await window.api.lxRemove(id)
    if (result.success) lxStatus.value = result.data
  }

  const removeAllLxSources = async () => {
    const result = await window.api.lxRemoveAll()
    if (result.success) lxStatus.value = result.data
  }

  const setActiveLxSource = async (id: string) => {
    const result = await window.api.lxSetActive(id)
    if (result.success) { lxStatus.value = result.data; return result.data }
    throw new Error(result.error)
  }

  const importLxSourceFromUrl = async (url: string) => {
    const result = await window.api.lxImportUrl(url)
    if (result.success) { lxStatus.value = result.data; return result.data }
    throw new Error(result.error)
  }

  return {
    searchResults, searching, lxStatus, search, getMusicUrl, getLyric, getPic,
    refreshLxStatus, importLxSource, removeLxSource, removeAllLxSources, setActiveLxSource, importLxSourceFromUrl
  }
}

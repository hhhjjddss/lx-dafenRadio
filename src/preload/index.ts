import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 窗口控制
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  setFullscreen: (fullscreen: boolean) => ipcRenderer.invoke('window:setFullscreen', fullscreen),
  exitFullscreen: () => ipcRenderer.invoke('window:exitFullscreen'),
  setKiosk: (enable: boolean) => ipcRenderer.invoke('window:setKiosk', enable),
  onFullscreenChange: (callback: (fullscreen: boolean) => void) => {
    const handler = (_: any, fullscreen: boolean) => callback(fullscreen)
    ipcRenderer.on('window:fullscreen-change', handler)
    return () => ipcRenderer.removeListener('window:fullscreen-change', handler)
  },

  // 搜索
  sourceSearch: (keyword: string) => ipcRenderer.invoke('source:search', keyword),

  // LX 音源操作
  sourceGetUrl: (musicInfo: any, quality: string): Promise<string> =>
    ipcRenderer.invoke('source:getUrl', musicInfo, quality),
  sourceGetLyric: (musicInfo: any) => ipcRenderer.invoke('source:getLyric', musicInfo),
  sourceGetPic: (musicInfo: any) => ipcRenderer.invoke('source:getPic', musicInfo),

  // LX 音源管理
  lxImport: () => ipcRenderer.invoke('lx:import'),
  lxStatus: () => ipcRenderer.invoke('lx:status'),
  lxRemove: (id: string) => ipcRenderer.invoke('lx:remove', id),
  lxRemoveAll: () => ipcRenderer.invoke('lx:removeAll'),
  lxSetActive: (id: string) => ipcRenderer.invoke('lx:setActive', id),
  lxImportUrl: (url: string) => ipcRenderer.invoke('lx:importUrl', url),

  // 播放器控制
  playerPlay: (url: string) => ipcRenderer.send('player:play', url),
  playerPause: () => ipcRenderer.send('player:pause'),
  playerResume: () => ipcRenderer.send('player:resume'),
  playerStop: () => ipcRenderer.send('player:stop'),
  playerSetVolume: (volume: number) => ipcRenderer.send('player:setVolume', volume),
  playerSeek: (time: number) => ipcRenderer.send('player:seek', time),

  // 收藏数据（存到项目文件夹）
  favoritesLoad: () => ipcRenderer.invoke('favorites:load'),
  favoritesSave: (data: any[]) => ipcRenderer.invoke('favorites:save', data),

  // 歌单 API
  playlistCategories: (platform: string) => ipcRenderer.invoke('playlist:categories', platform),
  playlistList: (platform: string, category?: string) => ipcRenderer.invoke('playlist:list', platform, category),
  playlistDetail: (platform: string, playlistId: string) => ipcRenderer.invoke('playlist:detail', platform, playlistId),

  // 播放器事件监听（返回清理函数，防止内存泄漏）
  onPlayUrl: (callback: (url: string) => void) => {
    const handler = (_: any, url: string) => callback(url)
    ipcRenderer.on('player:play-url', handler)
    return () => ipcRenderer.removeListener('player:play-url', handler)
  },
  onPause: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('player:pause', handler)
    return () => ipcRenderer.removeListener('player:pause', handler)
  },
  onResume: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('player:resume', handler)
    return () => ipcRenderer.removeListener('player:resume', handler)
  },
  onStop: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('player:stop', handler)
    return () => ipcRenderer.removeListener('player:stop', handler)
  },
  onSetVolume: (callback: (volume: number) => void) => {
    const handler = (_: any, volume: number) => callback(volume)
    ipcRenderer.on('player:set-volume', handler)
    return () => ipcRenderer.removeListener('player:set-volume', handler)
  },
  onSeek: (callback: (time: number) => void) => {
    const handler = (_: any, time: number) => callback(time)
    ipcRenderer.on('player:seek', handler)
    return () => ipcRenderer.removeListener('player:seek', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api

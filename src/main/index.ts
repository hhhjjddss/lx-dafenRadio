import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { LxSourceManager } from './lx-source'
import { PlayerManager } from './player-manager'
import axios from 'axios'

// 允许自动播放音频（无需用户手势）
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// 绕过系统代理，直接连接网络（解决代理导致 CDN 链接播放失败的问题）
app.commandLine.appendSwitch('no-proxy-server')

// 数据存储目录
// 开发时: 项目根目录/data (process.cwd())
// 打包后: 安装目录/data (exe 同级目录)
const APP_DIR = is.dev ? process.cwd() : dirname(app.getPath('exe'))
const DATA_DIR = join(APP_DIR, 'data')
const FAVORITES_FILE = join(DATA_DIR, 'favorites.json')

console.log('[Data] APP_DIR:', APP_DIR)
console.log('[Data] FAVORITES_FILE:', FAVORITES_FILE)

let mainWindow: BrowserWindow | null = null
let savedBounds: Electron.Rectangle | null = null // 进入全屏前保存窗口尺寸
const lxSourceManager = new LxSourceManager()
const playerManager = new PlayerManager()

const HEADERS = { 'User-Agent': 'okhttp/3.10.0' }

// ===== 歌单 API（参考 lx-music-desktop） =====

// 网易云歌单分类（固定列表，因为 catlist API 不可用）
function getNeteasePlaylistCategories() {
  return {
    '语种': [
      { id: '华语', name: '华语' },
      { id: '欧美', name: '欧美' },
      { id: '日语', name: '日语' },
      { id: '韩语', name: '韩语' },
      { id: '粤语', name: '粤语' }
    ],
    '风格': [
      { id: '流行', name: '流行' },
      { id: '摇滚', name: '摇滚' },
      { id: '民谣', name: '民谣' },
      { id: '电子', name: '电子' },
      { id: '说唱', name: '说唱' },
      { id: '轻音乐', name: '轻音乐' },
      { id: '爵士', name: '爵士' },
      { id: '古典', name: '古典' }
    ],
    '场景': [
      { id: '清晨', name: '清晨' },
      { id: '夜晚', name: '夜晚' },
      { id: '学习', name: '学习' },
      { id: '工作', name: '工作' },
      { id: '运动', name: '运动' },
      { id: '旅行', name: '旅行' }
    ]
  }
}

// 网易云歌单列表
async function getNeteasePlaylists(cat = '全部', limit = 200, offset = 0) {
  console.log('[Netease] 请求歌单列表, 分类:', cat)
  const resp = await axios.post('https://music.163.com/api/playlist/list', `cat=${encodeURIComponent(cat)}&order=hot&limit=${limit}&offset=${offset}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      'Referer': 'https://music.163.com',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000
  })
  console.log('[Netease] 响应code:', resp.data?.code, 'playlists数量:', resp.data?.playlists?.length)
  const playlists = resp.data?.playlists || []
  return playlists.map((p: any) => ({
    id: String(p.id),
    name: p.name || '',
    cover: p.coverImgUrl || '',
    creator: p.creator?.nickname || '',
    playCount: p.playCount || p.subscribedCount || 0,
    description: p.description || '',
    trackCount: p.trackCount || 0,
    platform: 'netease'
  }))
}

// 获取QQ音乐歌单分类
async function getQQPlaylistCategories() {
  const resp = await axios.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    params: {
      loginUin: 0,
      hostUin: 0,
      format: 'json',
      inCharset: 'utf-8',
      outCharset: 'utf-8',
      notice: 0,
      platform: 'wk_v15.json',
      needNewCode: 0,
      data: JSON.stringify({
        tags: { method: 'get_all_categories', param: { qq: '' }, module: 'playlist.PlaylistAllCategoriesServer' }
      })
    },
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com' },
    timeout: 10000
  })
  const groups = resp.data?.tags?.data?.v_group || []
  const result: Record<string, { id: string; name: string }[]> = {}
  for (const group of groups) {
    // 只返回前几个分类，避免太多
    result[group.group_name] = group.v_item.slice(0, 10).map((item: any) => ({
      id: String(item.id),
      name: item.name
    }))
  }
  return result
}

// QQ音乐歌单列表
async function getQQPlaylists(categoryId = 10000000, limit = 200, page = 1) {
  let data: any
  if (categoryId && categoryId !== 10000000) {
    // 按分类获取
    data = {
      comm: { cv: 1602, ct: 20 },
      playlist: {
        method: 'get_category_content',
        param: { titleid: categoryId, caller: '0', category_id: categoryId, size: limit, page: page - 1, use_page: 1 },
        module: 'playlist.PlayListCategoryServer',
      }
    }
  } else {
    // 广场模式
    data = {
      comm: { cv: 1602, ct: 20 },
      playlist: {
        method: 'get_playlist_by_tag',
        param: { id: 10000000, sin: limit * (page - 1), size: limit, order: 5, cur_page: page },
        module: 'playlist.PlayListPlazaServer',
      }
    }
  }
  const resp = await axios.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    params: {
      loginUin: 0,
      hostUin: 0,
      format: 'json',
      inCharset: 'utf-8',
      outCharset: 'utf-8',
      notice: 0,
      platform: 'wk_v15.json',
      needNewCode: 0,
      data: JSON.stringify(data)
    },
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com' },
    timeout: 10000
  })
  const playlists = resp.data?.playlist?.data?.v_playlist || resp.data?.playlist?.data?.content?.v_item || []
  return playlists.map((p: any) => ({
    id: String(p.tid || p.basic?.tid),
    name: p.title || p.basic?.title || '',
    cover: p.cover_url_medium || p.basic?.cover?.medium_url || '',
    creator: p.creator_info?.nick || p.basic?.creator?.nick || '',
    playCount: p.access_num || p.basic?.play_cnt || 0,
    description: p.desc || p.basic?.desc || '',
    trackCount: p.song_ids?.length || p.basic?.total_cnt || 0,
    platform: 'qq'
  }))
}

// 获取酷我歌单分类
async function getKuwoPlaylistCategories() {
  const resp = await axios.get('http://wapi.kuwo.cn/api/pc/classify/playlist/getTagList?cmd=rcm_keyword_playlist&user=0&prod=kwplayer_pc_9.0.5.0&vipver=9.0.5.0&source=kwplayer_pc_9.0.5.0&loginUid=0&loginSid=0&appUid=76039576', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
      'Referer': 'http://www.kuwo.cn/'
    },
    timeout: 10000
  })
  const data = resp.data?.data || []
  const result: Record<string, { id: string; name: string }[]> = {}
  for (const type of data) {
    result[type.name] = type.data.map((item: any) => ({
      id: `${item.id}-${item.digest}`,
      name: item.name
    }))
  }
  return result
}

// 酷我歌单列表
async function getKuwoPlaylists(sortId = 'hot', pageNum = 1, pageSize = 200) {
  let url: string
  if (!sortId || sortId === 'hot' || sortId === 'recommend') {
    // 推荐歌单
    url = `http://wapi.kuwo.cn/api/pc/classify/playlist/getRcmPlayList?loginUid=0&loginSid=0&appUid=76039576&pn=${pageNum}&rn=${pageSize}&order=${sortId || 'new'}`
  } else {
    // 分类歌单，需要从 "id-digest" 格式中提取纯数字 id
    const parts = sortId.split('-')
    const id = parts[0]
    url = `http://wapi.kuwo.cn/api/pc/classify/playlist/getTagPlayList?loginUid=0&loginSid=0&appUid=76039576&pn=${pageNum}&id=${id}&rn=${pageSize}`
  }
  const resp = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
      'Referer': 'http://www.kuwo.cn/'
    },
    timeout: 10000
  })
  const playlists = resp.data?.data?.data || []
  return playlists.map((p: any) => ({
    id: `digest-${p.digest}__${p.id}`,
    name: p.name || '',
    cover: p.img || '',
    creator: p.uname || '',
    playCount: p.listencnt || 0,
    description: p.desc || '',
    trackCount: p.total || 0,
    platform: 'kuwo'
  }))
}

// 获取酷狗歌单分类
async function getKugouPlaylistCategories() {
  const resp = await axios.get('http://www2.kugou.kugou.com/yueku/v9/special/getSpecial', {
    params: { is_smarty: 1, cdn: 'cdn' },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36'
    },
    timeout: 10000
  })
  const tagids = resp.data?.data?.tagids || {}
  const result: Record<string, { id: string; name: string }[]> = {}
  // 分类标签
  for (const name of Object.keys(tagids)) {
    if (tagids[name]?.data) {
      result[name] = tagids[name].data.map((tag: any) => ({
        id: String(tag.id),
        name: tag.name
      }))
    }
  }
  return result
}

// 酷狗歌单列表
async function getKugouPlaylists(sortId = '5', tagId = '', page = 1) {
  const resp = await axios.get(`http://www2.kugou.kugou.com/yueku/v9/special/getSpecial`, {
    params: {
      is_ajax: 1,
      cdn: 'cdn',
      t: sortId,
      c: tagId,
      p: page
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36'
    },
    timeout: 10000
  })
  // 酷狗数据在 special_db 字段
  const playlists = resp.data?.special_db || []
  return playlists.map((p: any) => ({
    id: String(p.specialid),
    name: p.specialname || '',
    cover: p.imgurl?.replace('{size}', '400') || '',
    creator: p.nickname || '',
    playCount: parseInt(p.total_play_count) || p.playcount || 0,
    description: p.intro || '',
    trackCount: p.songcount || 0,
    platform: 'kugou'
  }))
}

// 获取歌单详情
async function getPlaylistDetail(platform: string, playlistId: string) {
  if (platform === 'netease') {
    const resp = await axios.get('https://music.163.com/api/v3/playlist/detail', {
      params: { id: playlistId, n: 100000, s: 8 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Referer': 'https://music.163.com'
      },
      timeout: 10000
    })
    const tracks = resp.data?.playlist?.tracks || []
    return tracks.map((t: any) => ({
      id: String(t.id),
      name: t.name || '',
      singer: t.ar?.map((a: any) => a.name).join('/') || '',
      source: 'netease',
      interval: formatDuration(t.dt),
      albumName: t.al?.name || '',
      songmid: String(t.id)
    }))
  } else if (platform === 'kuwo') {
    // 使用 lx-music-desktop 的接口
    const resp = await axios.get(`http://nplserver.kuwo.cn/pl.svc`, {
      params: {
        op: 'getlistinfo',
        pid: playlistId,
        pn: 0,
        rn: 1000,
        encode: 'utf8',
        keyset: 'pl2012',
        identity: 'kuwo',
        pcmp4: 1,
        vipver: 'MUSIC_9.0.5.0_W1',
        newver: 1
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36'
      },
      timeout: 10000
    })
    const tracks = resp.data?.musiclist || []
    return tracks.map((t: any) => ({
      id: String(t.id),
      name: t.name || '',
      singer: t.artist || '',
      source: 'kuwo',
      interval: formatDuration(parseInt(t.duration)),
      albumName: t.album || '',
      songmid: String(t.id)
    }))
  } else if (platform === 'qq') {
    const resp = await axios.get('https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg', {
      params: {
        type: 1,
        json: 1,
        utf8: 1,
        onlysong: 0,
        new_format: 1,
        disstid: playlistId,
        loginUin: 0,
        hostUin: 0,
        format: 'json',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        notice: 0,
        platform: 'yqq.json',
        needNewCode: 0
      },
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com' },
      timeout: 10000
    })
    const tracks = resp.data?.cdlist?.[0]?.songlist || []
    return tracks.map((t: any) => ({
      id: String(t.songmid || t.mid),
      name: t.name || t.songname || '',
      singer: t.singer?.map((s: any) => s.name).join('/') || '',
      source: 'qq',
      interval: t.interval ? formatDuration(t.interval) : '',
      albumName: t.album?.name || t.albumname || '',
      songmid: String(t.songmid || t.mid)
    }))
  } else if (platform === 'kugou') {
    // 酷狗需要解析HTML页面
    const resp = await axios.get(`http://www2.kugou.kugou.com/yueku/v9/special/single/${playlistId}-5-9999.html`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36' },
      timeout: 10000
    })
    const listMatch = resp.data?.match(/global\.data = (\[.+\]);/)
    if (listMatch) {
      try {
        const tracks = JSON.parse(listMatch[1])
        return tracks.map((t: any) => ({
          id: String(t.hash || t.id),
          name: t.name || '',
          singer: t.author || '',
          source: 'kugou',
          interval: t.duration ? formatDuration(t.duration) : '',
          albumName: t.album_name || '',
          songmid: String(t.hash || t.id)
        }))
      } catch {}
    }
    return []
  }
  return []
}

function formatDuration(ms: number): string {
  const total = Math.floor((ms || 0) / 1000)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1078,
    height: 705,
    minWidth: 1078,
    minHeight: 705,
    maxHeight: 900,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    backgroundColor: '#00000000',
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 搜索（用酷我公开 API，仅用于获取歌曲列表）
async function searchFromKuwo(keyword: string, page = 1, limit = 30) {
  const resp = await axios.get('https://search.kuwo.cn/r.s', {
    params: {
      all: keyword,
      pn: (page - 1) * limit,
      rn: limit,
      client: 'kt',
      vipver: 1,
      show_copyright_off: 1,
      newver: 1,
      ft: 'music',
      rformat: 'json',
      encoding: 'utf8',
      moession: 1
    },
    headers: HEADERS,
    timeout: 15000
  })

  let data: any
  if (typeof resp.data === 'string') {
    data = JSON.parse(resp.data.replace(/'/g, '"'))
  } else {
    data = resp.data
  }

  return (data.abslist || []).map((item: any) => ({
    songmid: (item.MUSICRID || item.DC_TARGETID || '').toString().replace('MUSIC_', ''),
    name: (item.NAME || '').replace(/&nbsp;/g, ' '),
    singer: (item.ARTIST || '').replace(/&nbsp;/g, ' '),
    album: (item.ALBUM || '').replace(/&nbsp;/g, ' '),
    duration: parseInt(item.DURATION) || 0,
    source: 'kuwo',
    albumId: item.ALBUMID || ''
  }))
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.dafen.radio')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 窗口控制
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    // 原生最大化/还原
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  // 全屏控制
  ipcMain.handle('window:setFullscreen', (_, fullscreen: boolean) => {
    if (fullscreen && mainWindow) {
      savedBounds = mainWindow.getBounds()
      mainWindow.setFullScreen(true)
    } else {
      mainWindow?.setFullScreen(false)
    }
  })
  ipcMain.handle('window:exitFullscreen', () => {
    mainWindow?.setFullScreen(false)
    // 恢复之前的窗口尺寸
    if (savedBounds && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBounds(savedBounds)
      savedBounds = null
    }
  })

  // Kiosk 模式 — 独占屏幕，隐藏任务栏
  ipcMain.handle('window:setKiosk', (_, enable: boolean) => {
    mainWindow?.setKiosk(enable)
  })

  // 监听全屏状态变化
  mainWindow?.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-change', true)
  })
  mainWindow?.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-change', false)
  })

  // 搜索
  ipcMain.handle('source:search', async (_, keyword: string) => {
    try {
      const list = await searchFromKuwo(keyword)
      return { success: true, data: { list, total: list.length } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 获取播放链接（LX 音源）
  ipcMain.handle('source:getUrl', async (_, musicInfo: any, quality: string) => {
    try {
      console.log('[IPC] getUrl:', musicInfo.songmid, musicInfo.name)
      if (!lxSourceManager.isLoaded()) {
        throw new Error('音源未加载，请先导入音源')
      }
      const url = await lxSourceManager.getMusicUrl(musicInfo, quality)
      if (!url) throw new Error('俺不中了，未获取到播放链接')
      return url
    } catch (error: any) {
      console.error('[IPC] getUrl 失败:', error.message)
      return ''
    }
  })

  // 获取歌词（LX 音源）
  ipcMain.handle('source:getLyric', async (_, musicInfo: any) => {
    try {
      if (!lxSourceManager.isLoaded()) return { success: true, data: { lyric: '', tlyric: '' } }
      const result = await lxSourceManager.getLyric(musicInfo)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 获取封面（LX 音源）
  ipcMain.handle('source:getPic', async (_, musicInfo: any) => {
    try {
      // 等待音源加载完成（最多3秒）
      for (let i = 0; i < 6; i++) {
        if (lxSourceManager.isLoaded()) break
        await new Promise(r => setTimeout(r, 500))
      }
      if (!lxSourceManager.isLoaded()) return { success: true, data: '' }
      const url = await lxSourceManager.getPic(musicInfo)
      return { success: true, data: url }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // LX 音源管理
  ipcMain.handle('lx:import', async () => {
    try {
      const status = await lxSourceManager.importSource(mainWindow!)
      return { success: true, data: status }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('lx:status', async () => {
    const status = await lxSourceManager.getStatus()
    console.log('[LX] sources:', JSON.stringify(status.loadedSources))
    return { success: true, data: status }
  })

  ipcMain.handle('lx:remove', async (_, id: string) => {
    return { success: true, data: await lxSourceManager.removeSource(id) }
  })

  ipcMain.handle('lx:removeAll', async () => {
    return { success: true, data: await lxSourceManager.removeAll() }
  })

  ipcMain.handle('lx:setActive', async (_, id: string) => {
    try {
      return { success: true, data: await lxSourceManager.setActive(id) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('lx:importUrl', async (_, url: string) => {
    try {
      const status = await lxSourceManager.importFromUrl(url)
      return { success: true, data: status }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ===== 歌单 API =====

  // 获取歌单分类列表
  ipcMain.handle('playlist:categories', async (_, platform: string) => {
    try {
      console.log(`[Playlist] 获取${platform}分类...`)
      let categories: any = {}
      switch (platform) {
        case 'netease':
          categories = await getNeteasePlaylistCategories()
          break
        case 'qq':
          categories = await getQQPlaylistCategories()
          break
        case 'kuwo':
          categories = await getKuwoPlaylistCategories()
          break
        case 'kugou':
          categories = await getKugouPlaylistCategories()
          break
      }
      console.log(`[Playlist] ${platform}分类数量:`, Object.keys(categories).length)
      return { success: true, data: categories }
    } catch (error: any) {
      console.error('[Playlist] categories error:', error.message)
      return { success: false, error: error.message, data: {} }
    }
  })

  // 获取歌单列表（支持分类筛选）
  ipcMain.handle('playlist:list', async (_, platform: string, category?: string) => {
    try {
      console.log(`[Playlist] 加载${platform}歌单，分类:`, category || '全部')
      let playlists: any[] = []
      switch (platform) {
        case 'netease':
          playlists = await getNeteasePlaylists(category || '全部')
          break
        case 'qq':
          playlists = await getQQPlaylists(category ? parseInt(category) : 10000000)
          break
        case 'kuwo':
          playlists = await getKuwoPlaylists(category || 'hot')
          break
        case 'kugou':
          playlists = await getKugouPlaylists('5', category || '')
          break
      }
      console.log(`[Playlist] ${platform}返回${playlists.length}条数据`)
      return { success: true, data: playlists }
    } catch (error: any) {
      console.error('[Playlist] list error:', error.message)
      return { success: false, error: error.message, data: [] }
    }
  })

  ipcMain.handle('playlist:detail', async (_, platform: string, playlistId: string) => {
    try {
      const tracks = await getPlaylistDetail(platform, playlistId)
      return { success: true, data: tracks }
    } catch (error: any) {
      console.error('[Playlist] detail error:', error.message)
      return { success: false, error: error.message, data: [] }
    }
  })

  // 收藏数据存储（存到项目文件夹的 data/favorites.json）
  ipcMain.handle('favorites:load', () => {
    try {
      console.log('[Favorites] 加载:', FAVORITES_FILE)
      if (!existsSync(FAVORITES_FILE)) return []
      const raw = readFileSync(FAVORITES_FILE, 'utf-8')
      const data = JSON.parse(raw)
      console.log('[Favorites] 已加载', data.length, '首歌曲')
      return data
    } catch (e: any) {
      console.warn('[Favorites] 加载失败:', e.message)
      return []
    }
  })

  ipcMain.handle('favorites:save', (_, data: any[]) => {
    try {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
      writeFileSync(FAVORITES_FILE, JSON.stringify(data, null, 2), 'utf-8')
      console.log('[Favorites] 已保存', data.length, '首歌曲到', FAVORITES_FILE)
      return true
    } catch (e: any) {
      console.warn('[Favorites] 保存失败:', e.message)
      return false
    }
  })

  // 播放器控制
  ipcMain.on('player:play', (_, url: string) => {
    mainWindow?.webContents.send('player:play-url', url)
  })
  ipcMain.on('player:pause', () => mainWindow?.webContents.send('player:pause'))
  ipcMain.on('player:resume', () => mainWindow?.webContents.send('player:resume'))
  ipcMain.on('player:stop', () => mainWindow?.webContents.send('player:stop'))
  ipcMain.on('player:setVolume', (_, volume: number) => {
    playerManager.setVolume(volume)
    mainWindow?.webContents.send('player:set-volume', volume)
  })
  ipcMain.on('player:seek', (_, time: number) => mainWindow?.webContents.send('player:seek', time))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

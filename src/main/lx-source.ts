import { app, dialog, BrowserWindow } from 'electron'
import { join, basename, dirname } from 'path'
import { is } from '@electron-toolkit/utils'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from 'fs'
import * as vm from 'vm'
import * as crypto from 'crypto'
import * as zlib from 'zlib'
import * as http from 'http'
import * as https from 'https'
import { URL, URLSearchParams } from 'url'
import axios from 'axios'

// 将 LX 音源数据存储在 data 文件夹
// 开发时: 项目根目录/data
// 打包后: 安装目录/data (exe 同级目录)
const PROJECT_DATA_DIR = join(is.dev ? process.cwd() : dirname(app.getPath('exe')), 'data')

interface LxSourceMeta {
  name: string; description: string; version: string; author: string; homepage: string
}

interface LxSourceItem {
  id: string
  filePath: string
  importedAt: number
  metadata: LxSourceMeta
}

interface LxMultiConfig {
  activeId: string
  sources: LxSourceItem[]
}

export interface LxSourceStatus {
  activeId: string
  sources: LxSourceItem[]
  loaded: boolean
  loadedSource: LxSourceItem | null
  error: string
  loadedSources: Record<string, { name: string; actions: string[]; qualitys: string[] }>
}

const MAX_FILE_SIZE = 2 * 1024 * 1024
const INIT_TIMEOUT = 8000
const ACTION_TIMEOUT = 15000

export class LxSourceManager {
  private sourceDir: string
  private configFile: string

  private loaded = false
  private loading: Promise<any> | null = null
  private error = ''
  private metadata: LxSourceMeta | null = null
  private sources: Record<string, { name: string; actions: string[]; qualitys: string[] }> = {}
  private handler: ((args: any) => Promise<any>) | null = null

  constructor() {
    // 将 LX 音源数据存储在项目文件夹的 data/lx-sources 目录
    this.sourceDir = join(PROJECT_DATA_DIR, 'lx-sources')
    this.configFile = join(this.sourceDir, 'config.json')
    if (!existsSync(this.sourceDir)) mkdirSync(this.sourceDir, { recursive: true })
  }

  // ---- 配置 ----

  private readConfig(): LxMultiConfig {
    try {
      if (!existsSync(this.configFile)) return { activeId: '', sources: [] }
      const raw = JSON.parse(readFileSync(this.configFile, 'utf8'))
      // 兼容旧格式（单音源）
      if (raw.filePath && !raw.sources) {
        const item: LxSourceItem = {
          id: 'legacy-' + Date.now(),
          filePath: raw.filePath,
          importedAt: raw.importedAt || Date.now(),
          metadata: raw.metadata || { name: '', description: '', version: '', author: '', homepage: '' }
        }
        const config: LxMultiConfig = { activeId: item.id, sources: [item] }
        this.writeConfig(config)
        return config
      }
      return raw
    } catch {
      return { activeId: '', sources: [] }
    }
  }

  private writeConfig(config: LxMultiConfig): void {
    writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8')
  }

  // ---- 脚本元信息 ----

  private parseScriptInfo(scriptText: string): LxSourceMeta {
    const head = scriptText.slice(0, 4096)
    const out: Record<string, string> = {}
    head.replace(/^\s*\*\s*@([a-zA-Z0-9_-]+)\s+(.+?)\s*$/gm, (_m, key, value) => {
      out[key] = String(value || '').trim()
      return ''
    })
    return { name: out.name || '', description: out.description || '', version: out.version || '', author: out.author || '', homepage: out.homepage || '' }
  }

  // ---- HTTP ----

  private lxHttpRequest(targetUrl: string, options: any, callback: Function): () => void {
    options = options || {}
    let finished = false
    let body = options.body
    const headers: Record<string, string> = { ...(options.headers || {}) }
    if (options.form && typeof options.form === 'object') {
      body = new URLSearchParams(Object.keys(options.form).map(key => [key, String(options.form[key] == null ? '' : options.form[key])])).toString()
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) body = JSON.stringify(body)
    if (body && !headers['Content-Length'] && !headers['content-length']) headers['Content-Length'] = String(Buffer.byteLength(body))

    try {
      const u = new URL(targetUrl)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Unsupported protocol')
      const lib = u.protocol === 'https:' ? https : http
      const req = lib.request(u, { method: options.method || (body ? 'POST' : 'GET'), headers }, (response: http.IncomingMessage) => {
        const chunks: Buffer[] = []; let total = 0
        response.on('data', (chunk: Buffer) => { total += chunk.length; if (total > MAX_FILE_SIZE) { req.destroy(new Error('Response too large')); return } chunks.push(chunk) })
        response.on('end', () => {
          if (finished) return; finished = true
          const buffer = Buffer.concat(chunks); const text = buffer.toString('utf8')
          const ct = response.headers?.['content-type'] || ''
          let parsedBody: any = text
          if (/json/i.test(ct) || /^[\s\r\n]*[\[{]/.test(text)) { try { parsedBody = JSON.parse(text) } catch {} }
          callback(null, { statusCode: response.statusCode || 0, status: response.statusCode || 0, headers: response.headers || {}, body: parsedBody, rawBody: buffer }, parsedBody)
        })
      })
      req.setTimeout(Math.max(1000, Number(options.timeout) || 30000), () => req.destroy(new Error('Request timeout')))
      req.on('error', (err: Error) => { if (finished) return; finished = true; callback(err) })
      if (body) req.write(body)
      req.end()
      return () => req.destroy()
    } catch (err) {
      setTimeout(() => callback(err), 0)
      return () => {}
    }
  }

  private createLxUtils() {
    return {
      buffer: { from: (...args: any[]) => Buffer.from(...args as [any]), bufToString: (buffer: any, format: string) => Buffer.from(buffer || '').toString((format || 'utf8') as BufferEncoding) },
      crypto: {
        md5: (value: string) => crypto.createHash('md5').update(String(value || '')).digest('hex'),
        randomBytes: (size: number) => crypto.randomBytes(Math.max(0, Number(size) || 0)),
        aesEncrypt: (buffer: any, mode: string, key: string, iv: string) => { const kb = Buffer.from(key || ''); const ib = Buffer.from(iv || ''); const algo = 'aes-' + (kb.length * 8) + '-' + String(mode || 'cbc').toLowerCase(); const c = crypto.createCipheriv(algo as any, kb, ib); return Buffer.concat([c.update(Buffer.from(buffer || '')), c.final()]) },
        rsaEncrypt: (buffer: any, key: string) => crypto.publicEncrypt(String(key || ''), Buffer.from(buffer || '')),
      },
      zlib: {
        inflate: (buffer: any) => new Promise<Buffer>((resolve, reject) => zlib.inflate(Buffer.from(buffer || ''), (err, out) => err ? reject(err) : resolve(out!))),
        deflate: (buffer: any) => new Promise<Buffer>((resolve, reject) => zlib.deflate(Buffer.from(buffer || ''), (err, out) => err ? reject(err) : resolve(out!))),
      },
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(msg)), ms)
      promise.then(val => { clearTimeout(timer); resolve(val) }, err => { clearTimeout(timer); reject(err) })
    })
  }

  // ---- 加载脚本 ----

  private async loadScript(filePath: string): Promise<void> {
    if (!existsSync(filePath)) throw new Error('音源文件不存在: ' + filePath)
    const scriptText = readFileSync(filePath, 'utf8')

    // 检测是否需要 API Key
    const apiKeyPatterns = [/X-Request-Key\s*[:=]\s*['"]\s*['"]/, /apiKey\s*[:=]\s*['"]\s*['"]/, /token\s*[:=]\s*['"]\s*['"]/, /key\s*[:=]\s*['"]\s*['"]/i]
    for (const pattern of apiKeyPatterns) {
      if (pattern.test(scriptText)) {
        throw new Error('俺不中了，这个音源需要 API Key 才能使用')
      }
    }

    // 检测是否是加密/混淆脚本（无法读取）
    if (scriptText.length < 100 && !scriptText.includes('lx') && !scriptText.includes('source')) {
      throw new Error('俺不中了，无法识别此音源文件')
    }

    const metadata = { ...this.parseScriptInfo(scriptText), rawScript: scriptText } as any

    const handlers = new Map<string, Function>()
    let resolveInited: Function
    const initedPromise = new Promise<any>(resolve => { resolveInited = resolve })
    const EVENT_NAMES = { inited: 'inited', request: 'request', updateAlert: 'updateAlert' }

    const lx: any = {
      version: '1.2.0', env: 'desktop', currentScriptInfo: metadata, EVENT_NAMES,
      request: this.lxHttpRequest.bind(this),
      on: (eventName: string, handler: Function) => { if (typeof handler === 'function') handlers.set(eventName, handler) },
      send: (eventName: string, payload: any) => {
        if (eventName === EVENT_NAMES.inited) resolveInited!(payload || {})
      },
      utils: this.createLxUtils(),
    }

    const sandbox: any = { globalThis: null, lx, console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, URL, URLSearchParams, TextEncoder, TextDecoder,
      atob: (v: string) => Buffer.from(String(v || ''), 'base64').toString('binary'),
      btoa: (v: string) => Buffer.from(String(v || ''), 'binary').toString('base64'),
    }
    sandbox.globalThis = sandbox

    const context = vm.createContext(sandbox, { name: 'dafen-lx-source' })
    vm.runInContext(scriptText, context, { filename: basename(filePath), timeout: 2000, displayErrors: true })

    const initedPayload = await this.withTimeout(initedPromise, INIT_TIMEOUT, '音源初始化超时')
    if (!initedPayload || !initedPayload.sources) throw new Error('音源未返回 sources')

    const handler = handlers.get(EVENT_NAMES.request)
    if (typeof handler !== 'function') throw new Error('音源未注册 request handler')

    this.loaded = true
    this.error = ''
    this.metadata = metadata
    this.sources = initedPayload.sources || {}
    this.handler = handler as any
    // 打印每个源的完整信息
    for (const [key, src] of Object.entries(this.sources)) {
      console.log(`[LX] 源 "${key}":`, JSON.stringify(src))
    }
  }

  private reset(): void {
    this.loaded = false; this.loading = null; this.error = ''; this.metadata = null; this.sources = {}; this.handler = null
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    const config = this.readConfig()
    const active = config.sources.find(s => s.id === config.activeId)
    if (!active) throw new Error('未设置活动音源')
    await this.loadScript(active.filePath)
  }

  // ---- 公开 API ----

  async getStatus(): Promise<LxSourceStatus> {
    const config = this.readConfig()
    console.log('[LX] getStatus: activeId:', config.activeId, 'sources:', config.sources.length, 'loaded:', this.loaded)
    // 如果有配置但未加载，自动加载
    if (config.activeId && config.sources.length > 0 && !this.loaded && !this.loading) {
      // 检查活动音源文件是否存在
      let active = config.sources.find(s => s.id === config.activeId)
      if (active && !existsSync(active.filePath)) {
        // 活动文件不存在，切换到第一个存在的文件
        const firstValid = config.sources.find(s => existsSync(s.filePath))
        if (firstValid) {
          config.activeId = firstValid.id
          this.writeConfig(config)
          console.log('[LX] 活动音源文件不存在，切换到:', firstValid.metadata?.name)
          active = firstValid
        }
      }
      if (active) {
        console.log('[LX] 自动加载音源:', active.metadata?.name, '文件:', active.filePath)
        try { await this.withTimeout(this.loadScript(active.filePath), 12000, '俺不中了，音源加载超时') } catch (e: any) { console.warn('[LX] 自动加载失败:', e.message) }
      }
    }
    return {
      activeId: config.activeId,
      sources: config.sources,
      loaded: this.loaded,
      loadedSource: config.sources.find(s => s.id === config.activeId) || null,
      error: this.error,
      loadedSources: this.sources,
    }
  }

  async setActive(id: string): Promise<LxSourceStatus> {
    const config = this.readConfig()
    if (!config.sources.some(s => s.id === id)) throw new Error('音源不存在')
    config.activeId = id
    this.writeConfig(config)
    this.reset()
    console.log('[LX] setActive:', id)
    try {
      await this.loadScript(config.sources.find(s => s.id === id)!.filePath)
    } catch (e: any) {
      console.error('[LX] setActive 加载失败:', e.message)
      this.error = e.message
      // 即使加载失败，也更新状态让 UI 显示切换结果
      const status = await this.getStatus()
      return status
    }
    const status = await this.getStatus()
    console.log('[LX] setActive 结果: activeId:', status.activeId, 'loaded:', status.loaded, 'error:', status.error)
    return status
  }

  async importSource(parentWindow?: BrowserWindow): Promise<LxSourceStatus> {
    const win = parentWindow || BrowserWindow.getFocusedWindow()
    if (!win) {
      // 没有窗口时用 fallback：直接返回当前状态
      console.warn('[LX] 没有可用窗口，跳过文件选择')
      return this.getStatus()
    }
    const result = await dialog.showOpenDialog(win, { title: '选择落雪音源文件', filters: [{ name: 'JavaScript', extensions: ['js'] }], properties: ['openFile'] })
    if (result.canceled || !result.filePaths.length) return this.getStatus()
    return this.importFromFile(result.filePaths[0])
  }

  async importFromFile(filePath: string): Promise<LxSourceStatus> {
    const scriptText = readFileSync(filePath, 'utf8')
    console.log('[LX] 导入文件:', basename(filePath), '长度:', scriptText.length, '前200字:', scriptText.substring(0, 200))
    if (Buffer.byteLength(scriptText, 'utf8') > MAX_FILE_SIZE) throw new Error('文件过大（最大 2MB）')
    const metadata = this.parseScriptInfo(scriptText)
    const fileName = (metadata.name || basename(filePath)).replace(/[\\/:*?"<>|]+/g, '-') + '.js'
    const destPath = join(this.sourceDir, fileName)
    writeFileSync(destPath, scriptText, 'utf8')

    const id = 'src-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    const item: LxSourceItem = { id, filePath: destPath, importedAt: Date.now(), metadata }
    const config = this.readConfig()
    config.sources.push(item)
    // 第一个导入的自动成为活动音源
    if (!config.activeId) config.activeId = id
    this.writeConfig(config)
    console.log('[LX] 导入完成:', metadata.name, 'id:', id, 'activeId:', config.activeId)

    // 总是尝试加载（无论是否是活动音源）
    this.reset()
    try {
      await this.withTimeout(this.loadScript(destPath), 12000, '俺不中了，音源加载超时')
      console.log('[LX] 脚本加载成功:', metadata.name)
    } catch (e: any) {
      console.warn('[LX] 脚本加载失败:', e.message)
      this.error = e.message
    }
    return this.getStatus()
  }

  async importFromUrl(url: string): Promise<LxSourceStatus> {
    if (!url || !/^https?:\/\/.+/i.test(url.trim())) throw new Error('请输入有效的音源链接')
    console.log('[LX] 从 URL 导入:', url)
    let resp: any
    try {
      resp = await axios.get(url.trim(), {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        responseType: 'text',
        maxRedirects: 5
      })
    } catch (e: any) {
      if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        throw new Error('俺不中了，导入超时，请检查网络连接')
      }
      throw new Error('俺不中了，导入失败: ' + (e.message || '未知错误'))
    }
    const scriptText = typeof resp.data === 'string' ? resp.data : String(resp.data || '')
    console.log('[LX] URL导入内容长度:', scriptText.length, '前100字符:', scriptText.substring(0, 100))
    if (!scriptText || scriptText.length < 50) throw new Error('音源内容为空或过短')
    if (Buffer.byteLength(scriptText, 'utf8') > MAX_FILE_SIZE) throw new Error('音源文件过大（最大 2MB）')

    const metadata = this.parseScriptInfo(scriptText)
    const urlPath = new URL(url).pathname
    const fallbackName = basename(urlPath) || 'remote-source.js'
    const fileName = (metadata.name || fallbackName).replace(/[\\/:*?"<>|]+/g, '-') + '.js'
    const destPath = join(this.sourceDir, fileName)
    writeFileSync(destPath, scriptText, 'utf8')

    const id = 'src-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    const item: LxSourceItem = { id, filePath: destPath, importedAt: Date.now(), metadata }
    const config = this.readConfig()
    config.sources.push(item)
    if (!config.activeId) config.activeId = id
    this.writeConfig(config)
    console.log('[LX] URL导入完成:', metadata.name, 'id:', id)

    // 总是尝试加载
    this.reset()
    try {
      await this.withTimeout(this.loadScript(destPath), 12000, '俺不中了，音源加载超时')
      console.log('[LX] 脚本加载成功:', metadata.name)
    } catch (e: any) {
      console.warn('[LX] 脚本加载失败:', e.message)
      this.error = e.message
    }
    return this.getStatus()
  }

  async removeSource(id: string): Promise<LxSourceStatus> {
    const config = this.readConfig()
    const idx = config.sources.findIndex(s => s.id === id)
    if (idx < 0) return this.getStatus()
    const item = config.sources[idx]
    if (existsSync(item.filePath)) { try { unlinkSync(item.filePath) } catch {} }
    config.sources.splice(idx, 1)
    if (config.activeId === id) {
      config.activeId = config.sources[0]?.id || ''
      this.reset()
      if (config.activeId) {
        try { await this.withTimeout(this.loadScript(config.sources[0].filePath), 15000, '俺不中了，音源加载超时') } catch (e: any) { this.error = e.message }
      }
    }
    this.writeConfig(config)
    return this.getStatus()
  }

  async removeAll(): Promise<LxSourceStatus> {
    const config = this.readConfig()
    for (const item of config.sources) {
      if (existsSync(item.filePath)) { try { unlinkSync(item.filePath) } catch {} }
    }
    this.writeConfig({ activeId: '', sources: [] })
    this.reset()
    return this.getStatus()
  }

  // ---- 播放相关 ----

  isLoaded(): boolean { return this.loaded }

  private firstSourceForAction(action: string): string {
    // 跳过 local 源（只支持本地文件，远程歌曲获取不到歌词/封面）
    // 优先找 kw 源（最常用的远程源）
    const keys = Object.keys(this.sources)
    const remoteKeys = keys.filter(k => k !== 'local')
    // 先检查 actions 列表
    const match = remoteKeys.find(key => {
      const source = this.sources[key]
      return Array.isArray(source.actions) && source.actions.includes(action)
    })
    if (match) return match
    // 如果没有匹配的，返回第一个远程源（脚本可能混淆了 action 名）
    return remoteKeys[0] || ''
  }

  private async invokeAction(action: string, params: any): Promise<{ sourceKey: string; result: any }> {
    await this.ensureLoaded()
    if (!this.handler) throw new Error('音源 handler 不可用')
    const sourceKey = this.firstSourceForAction(action)
    if (!sourceKey) throw new Error(`音源不支持 ${action}`)
    const songmid = params.songmid || params.id || ''
    const musicInfo = { ...params, id: params.id || songmid, songmid, mid: params.mid || songmid, name: params.name || '', singer: params.singer || params.artist || '', artist: params.artist || params.singer || '', album: params.album || '', duration: params.duration || params.interval || 0, interval: params.interval || params.duration || 0, source: params.source || sourceKey }
    const info = action === 'musicUrl' ? { type: params.quality || params.type || '320k', musicInfo } : { musicInfo }
    console.log('[LX] invokeAction:', action, '源:', sourceKey, '歌曲:', musicInfo.name)
    const result = await this.withTimeout(Promise.resolve(this.handler({ source: sourceKey, action, info })), ACTION_TIMEOUT, '音源请求超时')
    console.log('[LX] invokeAction 结果:', action, '返回类型:', typeof result, '结果:', result)
    return { sourceKey, result }
  }

  async getMusicUrl(musicInfo: any, quality = '320k'): Promise<string> {
    await this.ensureLoaded()
    const actionSource = this.firstSourceForAction('musicUrl')
    if (!actionSource) {
      console.warn('[LX] getMusicUrl: 没有找到支持 musicUrl 的源')
      return ''
    }
    console.log('[LX] getMusicUrl: 使用源', actionSource, '获取音乐URL，质量:', quality)
    const seen = new Set<string>()
    for (const q of [quality, 'lossless', '320k', '128k']) {
      if (seen.has(q)) continue; seen.add(q)
      try {
        console.log('[LX] getMusicUrl: 尝试质量', q)
        const { result } = await this.invokeAction('musicUrl', { ...musicInfo, quality: q, type: q })
        console.log('[LX] getMusicUrl: 音源返回结果:', typeof result, result)
        const url = typeof result === 'string' ? result : (result?.url || result?.location || result?.src || '')
        console.log('[LX] getMusicUrl: 提取的URL:', url)
        if (url && typeof url === 'string' && url.startsWith('http')) {
          console.log('[LX] getMusicUrl: 成功获取URL:', url.substring(0, 100) + '...')
          return url
        }
      } catch (e: any) {
        console.warn('[LX] getMusicUrl: 质量', q, '失败:', e.message)
      }
    }
    console.warn('[LX] getMusicUrl: 所有质量尝试均失败')
    return ''
  }

  async getLyric(musicInfo: any): Promise<{ lyric: string; tlyric: string }> {
    // 1. 尝试 LX 音源
    try {
      await this.ensureLoaded()
      const actionSource = this.firstSourceForAction('lyric')
      if (actionSource) {
        const { result } = await this.invokeAction('lyric', musicInfo)
        const lyric = result?.lyric || result?.lrc || ''
        if (lyric) return { lyric, tlyric: result?.tlyric || result?.tlrc || '' }
      }
    } catch {}

    // 2. 兜底：酷我歌词
    try {
      const resp = await axios.get('https://m.kuwo.cn/newh5/singles/songinfoandlrc', {
        params: { musicId: musicInfo.songmid },
        headers: { 'User-Agent': 'okhttp/3.10.0' },
        timeout: 8000
      })
      const lrcList = resp.data?.data?.lrclist || []
      if (lrcList.length > 0) {
        const lyric = lrcList.map((l: any) => {
          const time = parseFloat(l.time) || 0
          const min = Math.floor(time / 60)
          const sec = Math.floor(time % 60)
          const ms = Math.floor((time % 1) * 100)
          return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${l.lineLyric || ''}`
        }).join('\n')
        return { lyric, tlyric: '' }
      }
    } catch {}

    // 3. QQ 音乐（支持逐字歌词）
    try {
      const qqResp = await axios.get('https://c.y.qq.com/soso/fcgi-bin/client_search_cp', {
        params: {
          w: musicInfo.name + ' ' + (musicInfo.singer || ''),
          format: 'json',
          p: 1,
          n: 1
        },
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com' },
        timeout: 8000
      })
      const qqSong = qqResp.data?.data?.song?.list?.[0]
      if (qqSong) {
        const qqMid = qqSong.songmid
        const qqLyricResp = await axios.get('https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg', {
          params: { songmid: qqMid, format: 'json', nobase64: 1 },
          headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com' },
          timeout: 8000
        })
        const lyric = qqLyricResp.data?.lyric || ''
        const tlyric = qqLyricResp.data?.trans || ''
        if (lyric) return { lyric, tlyric }
      }
    } catch {}

    // 4. 网易云 歌词（按歌名搜索）
    try {
      const searchResp = await axios.get('https://music.163.com/api/search/get', {
        params: { s: musicInfo.name + ' ' + (musicInfo.singer || ''), type: 1, limit: 1 },
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.163.com' },
        timeout: 8000
      })
      const songId = searchResp.data?.result?.songs?.[0]?.id
      if (songId) {
        const lrcResp = await axios.get('https://music.163.com/api/song/lyric', {
          params: { id: songId, lv: 1, tv: 1 },
          headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.163.com' },
          timeout: 8000
        })
        // 优先使用逐字歌词 (yrc)
        const yrcLyric = lrcResp.data?.yrc?.lyric || ''
        const lyric = lrcResp.data?.lrc?.lyric || ''
        const tlyric = lrcResp.data?.tlyric?.lyric || ''
        // 如果有逐字歌词，添加标记前缀
        if (yrcLyric) return { lyric: '[yrc]' + yrcLyric, tlyric }
        if (lyric) return { lyric, tlyric }
      }
    } catch {}
    return { lyric: '', tlyric: '' }
  }

  async getPic(musicInfo: any): Promise<string> {
    console.log('[Pic] 开始获取封面:', musicInfo.name, 'songmid:', musicInfo.songmid)

    // 1. QQ 音乐搜索封面（最稳定）
    try {
      const qqResp = await axios.get('https://c.y.qq.com/soso/fcgi-bin/client_search_cp', {
        params: {
          w: musicInfo.name + ' ' + (musicInfo.singer || ''),
          format: 'json',
          p: 1,
          n: 1
        },
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com' },
        timeout: 8000
      })
      const qqSong = qqResp.data?.data?.song?.list?.[0]
      if (qqSong?.albummid) {
        const picUrl = `https://y.qq.com/music/photo_new/T002R500x500M000${qqSong.albummid}.jpg`
        console.log('[Pic] QQ 音乐返回:', picUrl)
        return picUrl
      }
    } catch (e: any) { console.warn('[Pic] QQ 音乐失败:', e.message) }

    // 2. 网易云搜索 + 歌曲详情拿封面
    try {
      const searchResp = await axios.get('https://music.163.com/api/search/get/web', {
        params: { s: musicInfo.name + ' ' + (musicInfo.singer || ''), type: 1, limit: 1 },
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Referer: 'https://music.163.com' },
        timeout: 8000
      })
      const songId = searchResp.data?.result?.songs?.[0]?.id
      if (songId) {
        const detailResp = await axios.get(`https://music.163.com/api/song/detail?ids=[${songId}]`, {
          headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.163.com' },
          timeout: 8000
        })
        const picUrl = detailResp.data?.songs?.[0]?.album?.picUrl
        if (picUrl) {
          console.log('[Pic] 网易云返回:', picUrl)
          return picUrl
        }
      }
    } catch (e: any) { console.warn('[Pic] 网易云失败:', e.message) }

    // 3. 尝试 LX 音源的 pic action
    try {
      await this.ensureLoaded()
      const actionSource = this.firstSourceForAction('pic')
      if (actionSource) {
        const { result } = await this.invokeAction('pic', musicInfo)
        const pic = typeof result === 'string' ? result : (result?.url || result?.pic || result?.cover || '')
        if (pic) { console.log('[Pic] LX 音源返回:', pic); return pic }
      }
    } catch (e: any) { console.warn('[Pic] LX 音源失败:', e.message) }

    // 3. 都没有，返回空
    console.warn('[Pic] 所有途径均未获取到封面:', musicInfo.name)
    return ''
  }
}

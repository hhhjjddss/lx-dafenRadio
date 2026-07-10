<template>
  <div class="song-detail" ref="cardRef">
    <!-- 左侧 -->
    <div class="detail-left">
      <div class="detail-top">
        <button class="detail-back" @click="$emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回
        </button>
      </div>

      <div class="left-content">
        <!-- 粒子封面 -->
        <div class="cover-scene">
          <canvas ref="particleCanvas" class="particle-canvas"></canvas>
        </div>

        <!-- 质量选择器 - 放在封面下方居中 -->
        <div class="quality-selector">
          <button v-for="q in qualities" :key="q.key"
            class="q-btn" :class="{ active: quality === q.key }"
            @click="setQuality(q.key)"
          >{{ q.label }}</button>
        </div>

        <!-- 歌曲信息 -->
        <div class="detail-info">
          <h2 class="detail-title">{{ track.name }}</h2>
          <p class="detail-singer">{{ track.singer }}</p>
        </div>
      </div>
    </div>

    <!-- 右侧：歌词 -->
    <div class="detail-right">
      <div class="lyrics-scroll" ref="lyricsScrollRef">
        <template v-if="parsedLyricLines.length > 0">
          <div class="lyrics-spacer"></div>
          <div
            v-for="(line, index) in parsedLyricLines"
            :key="index"
            class="lyric-line"
            :class="{ active: index === activeLyricIndex, past: index < activeLyricIndex }"
            :ref="(el) => { lyricLineRefs[index] = el as HTMLElement }"
            @click="seekToLyric(line.time)"
          >
            <span class="lyric-text">{{ line.text }}</span>
            <span v-if="line.translation" class="lyric-trans">{{ line.translation }}</span>
          </div>
          <div class="lyrics-spacer"></div>
        </template>
        <div v-else class="no-lyrics">
          <p>暂无歌词</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { MusicInfo } from '../composables/useSource'
import { usePlayer } from '../composables/usePlayer'

const { getAudioEnergy, getFrequencyData } = usePlayer()
let ctx: gsap.Context | null = null

const props = defineProps<{
  track: MusicInfo
  coverUrl: string
  lyric: string
  tlyric: string
  currentTime: number
  isPlaying: boolean
  isFav: boolean
}>()

defineEmits<{
  close: []
  play: [track: MusicInfo]
  'toggle-fav': [track: MusicInfo]
  seek: [time: number]
}>()

const cardRef = ref<HTMLElement | null>(null)
const lyricsScrollRef = ref<HTMLElement | null>(null)
const lyricLineRefs = ref<(HTMLElement | null)[]>([])
const isFullscreen = ref(false)

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

// 监听全屏状态变化（保存清理函数）
const cleanupFullscreen = window.api.onFullscreenChange((fullscreen: boolean) => {
  isFullscreen.value = fullscreen
})

// 监听 ESC 键退出全屏
function handleDetailKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}
document.addEventListener('keydown', handleDetailKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleDetailKeydown)
  cleanupFullscreen?.()
})

// 歌词解析
interface LyricLine { time: number; text: string; translation: string }

const parsedLyricLines = computed<LyricLine[]>(() => {
  if (!props.lyric) return []
  const mainLines = parseLrc(props.lyric)
  const transLines = parseLrc(props.tlyric)
  const transMap = new Map<number, string>()
  transLines.forEach(l => transMap.set(l.time, l.text))
  return mainLines.map(l => ({ ...l, translation: transMap.get(l.time) || '' }))
})

const activeLyricIndex = computed(() => {
  if (!parsedLyricLines.value.length) return -1
  let idx = -1
  for (let i = 0; i < parsedLyricLines.value.length; i++) {
    if (parsedLyricLines.value[i].time <= props.currentTime) idx = i
  }
  return idx
})

function parseLrc(lrc: string): { time: number; text: string }[] {
  if (!lrc) return []
  const result: { time: number; text: string }[] = []
  for (const line of lrc.split('\n')) {
    const m = line.match(/\[(\d{2}):(\d{2})\.(\d{1,3})\](.*)/)
    if (m) {
      const time = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, '0')) / 1000
      const text = m[4].trim()
      if (text) result.push({ time, text })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

// 点击歌词跳转
function seekToLyric(time: number) {
  emit('seek', time)
}

// 歌词自动滚动（当前行偏上方 1/3 位置，下方留更多空间给后续歌词）
watch(activeLyricIndex, async (newIdx) => {
  if (newIdx >= 0 && lyricLineRefs.value[newIdx] && lyricsScrollRef.value) {
    await nextTick()
    const container = lyricsScrollRef.value
    const el = lyricLineRefs.value[newIdx]
    if (el) {
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      // 1/3 位置：当前行偏上方，下方显示更多即将播放的歌词
      const offset = elRect.top - containerRect.top - containerRect.height * 0.36 + elRect.height / 2
      container.scrollTo({
        top: container.scrollTop + offset,
        behavior: 'smooth'
      })
    }
  }
})
const particleCanvas = ref<HTMLCanvasElement | null>(null)

const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const onCoverError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.display = 'none'
}

// ===== 对数频段分析 + EMA 平滑 =====
function logScaleIndex(i: number, size: number): number {
  return Math.floor(Math.pow(i / size, 2) * size)
}

function getBandEnergy(data: Uint8Array, startPercent: number, endPercent: number): number {
  const size = data.length
  const start = Math.floor(size * startPercent)
  const end = Math.floor(size * endPercent)
  let sum = 0
  for (let i = start; i < end; i++) sum += data[i]
  return sum / ((end - start) * 255)
}

// 独立 EMA buffer
let emaBass = 0, emaMid = 0, emaTreble = 0
const EMA_BASS = 0.1, EMA_MID = 0.1, EMA_TREBLE = 0.1

function getSmoothBands() {
  const freq = getFrequencyData()
  if (!freq) return { bass: 0, mid: 0, treble: 0, raw: { bass: 0, mid: 0, treble: 0 } }

  // 频段划分：bass 2-6%, mid 15-40%, treble 40-70%（避开人声300-3000Hz）
  const rawBass = getBandEnergy(freq, 0.02, 0.06)
  const rawMid = getBandEnergy(freq, 0.15, 0.40)
  const rawTreble = getBandEnergy(freq, 0.40, 0.70)

  // EMA 平滑（每个频段独立）
  emaBass = emaBass * EMA_BASS + rawBass * (1 - EMA_BASS)
  emaMid = emaMid * EMA_MID + rawMid * (1 - EMA_MID)
  emaTreble = emaTreble * EMA_TREBLE + rawTreble * (1 - EMA_TREBLE)

  return {
    bass: Math.min(1, emaBass * 0.8),
    mid: Math.min(1, emaMid * 0.6),
    treble: Math.min(1, emaTreble * 0.5),
    raw: { bass: rawBass, mid: rawMid, treble: rawTreble }
  }
}

// ===== SILK 粒子效果（规则网格 + z轴涟漪） =====
const qualities = [
  { key: 'original', label: '原图', count: 0 },
  { key: 'low', label: '低', grid: 48 },
  { key: 'medium', label: '中', grid: 64 },
  { key: 'high', label: '高', grid: 96 },
] as const

const quality = ref<string>('medium')

interface Dot {
  tx: number; ty: number       // 网格目标位置
  r: number; g: number; b: number
  brightness: number
  edge: number
  phase: number
  rand: number                 // 每粒子随机值
}

let dots: Dot[] = []
let offscreenImg: HTMLImageElement | null = null
let rafId = 0
let animFrame = 0
let currentPlaying = false
let currentGrid = 96  // 当前网格密度，animate 中使用
const CANVAS_SIZE = 640
const COVER_SIZE = 420
const CENTER = CANVAS_SIZE / 2
const COVER_OFFSET = (CANVAS_SIZE - COVER_SIZE) / 2

// ===== 3D 拖拽旋转 =====
let rotX = 0
let rotY = 0
let targetRotX = 0
let targetRotY = 0
let isDragging = false
let lastMouseX = 0
let lastMouseY = 0
const ROTATION_SENSITIVITY = 0.005
const ROTATION_DAMPING = 0.08
const PERSPECTIVE = 800
// 涟漪
const ripples: { x: number; y: number; birth: number }[] = []
const RIPPLE_SPEED = 180
const RIPPLE_DECAY = 2.5
// 拖拽事件清理函数
let cleanupDrag: (() => void) | null = null

// 粒子缓存：避免重复计算
const particleCache = new Map<string, { img: HTMLImageElement; dots: Dot[] }>()
// 像素数据缓存
let cachedPixelData: Uint8ClampedArray | null = null


function getConfig() {
  return qualities.find(q => q.key === quality.value) || qualities[3]
}

function setQuality(key: string) {
  quality.value = key
  particleCache.clear()
  cachedPixelData = null
  buildDots()
}

// Sobel 边缘检测
function sobelEdge(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const edge = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4
      const l = (data[((y) * w + x - 1) * 4] + data[((y) * w + x - 1) * 4 + 1] + data[((y) * w + x - 1) * 4 + 2]) / 3
      const r = (data[((y) * w + x + 1) * 4] + data[((y) * w + x + 1) * 4 + 1] + data[((y) * w + x + 1) * 4 + 2]) / 3
      const t = (data[((y - 1) * w + x) * 4] + data[((y - 1) * w + x) * 4 + 1] + data[((y - 1) * w + x) * 4 + 2]) / 3
      const b = (data[((y + 1) * w + x) * 4] + data[((y + 1) * w + x) * 4 + 1] + data[((y + 1) * w + x) * 4 + 2]) / 3
      edge[y * w + x] = Math.min(1, Math.abs(r - l) + Math.abs(b - t)) / 255
    }
  }
  return edge
}

function buildDots() {
  if (!offscreenImg) return
  const cfg = getConfig()
  dots = []
  if (cfg.grid === undefined) return

  const grid = cfg.grid  // 网格密度
  currentGrid = grid    // 保存供 animate 使用

  // 采样图片到 COVER_SIZE
  const temp = document.createElement('canvas')
  temp.width = COVER_SIZE
  temp.height = COVER_SIZE
  const ctx = temp.getContext('2d')!
  const imgRatio = offscreenImg.width / offscreenImg.height
  let drawW: number, drawH: number, drawX: number, drawY: number
  if (imgRatio > 1) {
    drawW = COVER_SIZE; drawH = COVER_SIZE / imgRatio
    drawX = 0; drawY = (COVER_SIZE - drawH) / 2
  } else {
    drawH = COVER_SIZE; drawW = COVER_SIZE * imgRatio
    drawX = (COVER_SIZE - drawW) / 2; drawY = 0
  }
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE)
  ctx.drawImage(offscreenImg, drawX, drawY, drawW, drawH)

  let data: Uint8ClampedArray
  if (!cachedPixelData) {
    try {
      cachedPixelData = ctx.getImageData(0, 0, COVER_SIZE, COVER_SIZE).data
    } catch (e) {
      console.error('[Particle] getImageData failed:', e)
      quality.value = 'original'
      return
    }
  }
  data = cachedPixelData

  // 计算亮度和边缘
  const brightness = new Float32Array(COVER_SIZE * COVER_SIZE)
  for (let i = 0; i < COVER_SIZE * COVER_SIZE; i++) {
    const pi = i * 4
    brightness[i] = (data[pi] + data[pi + 1] + data[pi + 2]) / (3 * 255)
  }
  const edgeData = sobelEdge(data, COVER_SIZE, COVER_SIZE)

  // 规则网格采样 — 只在图片实际范围内均匀分布
  const imgLeft = drawX + COVER_OFFSET
  const imgTop = drawY + COVER_OFFSET
  const imgW = drawW
  const imgH = drawH
  const stepX = imgW / grid
  const stepY = imgH / grid
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      // 在图片范围内均匀取样
      const sx = Math.floor(gx * stepX + stepX / 2)
      const sy = Math.floor(gy * stepY + stepY / 2)
      const pi = (sy * COVER_SIZE + sx) * 4

      const br = brightness[sy * COVER_SIZE + sx]
      const ed = edgeData[sy * COVER_SIZE + sx]

      dots.push({
        tx: gx * stepX + stepX / 2 + imgLeft,
        ty: gy * stepY + stepY / 2 + imgTop,
        r: data[pi], g: data[pi + 1], b: data[pi + 2],
        brightness: br,
        edge: ed,
        phase: Math.random() * Math.PI * 2,
        rand: Math.random()
      })
    }
  }

  console.log(`[SILK] Built ${dots.length} particles (grid: ${grid}x${grid})`)
}

// ===== Simplex 3D 噪声（仿 Mineradio GLSL） =====
function snoise3D(x: number, y: number, z: number): number {
  const p = (n: number) => ((n * 73856093) ^ (n * 19349663)) & 0x7fffffff
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + t * (b - a)

  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255
  const xf = x - Math.floor(x), yf = y - Math.floor(y), zf = z - Math.floor(z)
  const u = fade(xf), v = fade(yf), w = fade(zf)

  const hash = (ix: number, iy: number, iz: number) => {
    const h = p(ix + p(iy + p(iz)))
    return ((h >> 16) & 0xff) / 128.0 - 1.0
  }

  const g000 = hash(X, Y, Z), g100 = hash(X + 1, Y, Z)
  const g010 = hash(X, Y + 1, Z), g110 = hash(X + 1, Y + 1, Z)
  const g001 = hash(X, Y, Z + 1), g101 = hash(X + 1, Y, Z + 1)
  const g011 = hash(X, Y + 1, Z + 1), g111 = hash(X + 1, Y + 1, Z + 1)

  return lerp(
    lerp(lerp(g000, g100, u), lerp(g010, g110, u), v),
    lerp(lerp(g001, g101, u), lerp(g011, g111, u), v),
    w
  )
}

let lastFrameTime = 0
const FRAME_INTERVAL = 1000 / 60

function animate(canvas: HTMLCanvasElement, timestamp: number) {
  rafId = requestAnimationFrame((t) => animate(canvas, t))
  if (timestamp - lastFrameTime < FRAME_INTERVAL) return
  lastFrameTime = timestamp

  const ctx = canvas.getContext('2d')!
  const cfg = getConfig()
  animFrame++

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // 原图模式
  if (cfg.grid === undefined) {
    if (offscreenImg) {
      const imgRatio = offscreenImg.width / offscreenImg.height
      let dw, dh, dx, dy
      if (imgRatio > 1) {
        dw = COVER_SIZE; dh = COVER_SIZE / imgRatio
        dx = COVER_OFFSET; dy = COVER_OFFSET + (COVER_SIZE - dh) / 2
      } else {
        dh = COVER_SIZE; dw = COVER_SIZE * imgRatio
        dx = COVER_OFFSET + (COVER_SIZE - dw) / 2; dy = COVER_OFFSET
      }
      ctx.drawImage(offscreenImg, dx, dy, dw, dh)
    }
    return
  }

  // 平滑旋转（惯性）
  rotX += (targetRotX - rotX) * ROTATION_DAMPING
  rotY += (targetRotY - rotY) * ROTATION_DAMPING
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX)
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY)

  const time = animFrame * 0.016  // 秒级时间
  const K = 1.0  // 强度系数

  // 三频段音频能量
  const bands = getSmoothBands()
  const uBass = bands.bass
  const uMid = bands.mid
  const uTreble = bands.treble

  // 涟漪衰减
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (time - ripples[i].birth > 3) ripples.splice(i, 1)
  }

  // 音乐能量总和（用于全局震动）
  const energy = (uBass + uMid + uTreble) / 5
  const beatPulse = Math.pow(energy, 2) * 1.2  // 节拍脉冲

  for (let i = 0; i < dots.length; i++) {
    const p = dots[i]

    // 归一化 UV 坐标（0-1）
    const u = (p.tx - COVER_OFFSET) / COVER_SIZE
    const v = (p.ty - COVER_OFFSET) / COVER_SIZE

    // === 随音乐震动效果 ===
    // bass → 强烈脉冲震动（像心脏跳动）
    const bassActive = uBass > 0.3 ? (uBass - 0.3) * 1.4 : 0
    const bassShake = bassActive * 1.5 * Math.sin(time * 30 + p.phase) * K
    const bassExpand = bassActive * 1.5 * K

    // mid → 流场位移（合并噪声调用，从3次降到1次）
    const midNoise = snoise3D(u * 1.4, v * 1.4, time * 0.55)
    const midN = midNoise * 0.6 + snoise3D(u * 2.8 + 5.0, v * 2.8 - 3.0, time * 0.85) * 0.4
    const midMask = 0.55 + 0.45 * snoise3D(u * 0.4, v * 0.4, time * 0.18)
    const midDisp = midN * uMid * 0.55 * midMask * K

    // treble → 高频抖动（复用已计算的值）
    const trebleNoise = snoise3D(u * 8, v * 8, time * 5 + p.rand * 6)
    const trebleJitter = trebleNoise * uTreble * 0.3 * K

    const depthZ = (p.brightness - 0.5) * 0.8 * 1.4

    // 涟漪
    let rippleZ = 0
    for (const rip of ripples) {
      const rdx = p.tx - rip.x
      const rdy = p.ty - rip.y
      const rd = Math.sqrt(rdx * rdx + rdy * rdy)
      const age = time - rip.birth
      rippleZ += Math.sin(rd * 0.05 - age * 5) * Math.exp(-age * RIPPLE_DECAY) * 15
    }
    const distToEdge = Math.min(u, 1 - u, v, 1 - v) * 2
    const shakeFalloff = Math.pow(1 - distToEdge, 4) * 1.5
    const z = rippleZ * 1.3
            + bassShake * 15 * shakeFalloff
            + midDisp * 40
            + trebleJitter * 25
            + depthZ * 8

    // xy 位移（用偏移近似替代额外噪声调用）
    const angle = Math.atan2(v - 0.5, u - 0.5)
    const expandX = Math.cos(angle) * bassExpand * 70 * shakeFalloff
    const expandY = Math.sin(angle) * bassExpand * 70 * shakeFalloff
    const dx = expandX + midDisp * 30 + trebleJitter * 10
    // 用 phase 偏移近似代替额外的 3 次噪声调用
    const dy = expandY
             + (midNoise * 0.5 + 0.5) * uMid * midMask * K * 20
             + Math.sin(u * 12 + time * 5 + p.phase) * uTreble * K * 8

    // 3D 坐标
    let dx3d = (p.tx + dx) - CENTER
    let dy3d = (p.ty + dy) - CENTER
    let dz = z

    // 绕X轴旋转
    const ry1 = dy3d * cosX - dz * sinX
    const rz1 = dy3d * sinX + dz * cosX
    // 绕Y轴旋转
    const rx2 = dx3d * cosY + rz1 * sinY
    const rz2 = -dx3d * sinY + rz1 * cosY

    // 透视投影
    const scale = PERSPECTIVE / (PERSPECTIVE + rz2)
    const sx = CENTER + rx2 * scale
    const sy = CENTER + ry1 * scale

    // 粒子大小随音乐震动
    const beatSize = 1 + beatPulse * 0.8
    const depthAlpha = 0.4 + p.brightness * 0.6
    const edgeBoost = p.edge * 0.3
    const size = (1.5 + edgeBoost + beatSize) * scale

    // 透明度
    ctx.globalAlpha = Math.max(0.2, Math.min(1, depthAlpha * scale))

    // 粒子颜色
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`

    // 绘制粒子
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(0.8, size), 0, 6.2832)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

onMounted(async () => {
  // 重置模块级状态，确保每次挂载都是干净的
  dots = []
  offscreenImg = null
  cachedPixelData = null
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  animFrame = 0
  rotX = 0; rotY = 0; targetRotX = 0; targetRotY = 0

  await nextTick()
  loadCover()

  // ===== 3D 拖拽旋转事件 =====
  const canvas = particleCanvas.value
  if (canvas) {
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      lastMouseX = e.clientX
      lastMouseY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const dx = e.clientX - lastMouseX
      const dy = e.clientY - lastMouseY
      lastMouseX = e.clientX
      lastMouseY = e.clientY
      targetRotY -= dx * ROTATION_SENSITIVITY
      targetRotX -= dy * ROTATION_SENSITIVITY
      // 限制X轴旋转范围，防止翻转
      targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX))
    }
    const onPointerUp = (e: PointerEvent) => {
      // 如果没有拖动过，视为点击 → 产生涟漪
      if (isDragging) {
        const dx = Math.abs(e.clientX - lastMouseX)
        const dy = Math.abs(e.clientY - lastMouseY)
        if (dx < 3 && dy < 3) {
          const rect = canvas.getBoundingClientRect()
          const rx = (e.clientX - rect.left) / rect.width * CANVAS_SIZE
          const ry = (e.clientY - rect.top) / rect.height * CANVAS_SIZE
          ripples.push({ x: rx, y: ry, birth: animFrame * 0.016 })
        }
      }
      isDragging = false
      targetRotX = 0
      targetRotY = 0
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    // 保存清理函数，在 onBeforeUnmount 中调用
    cleanupDrag = () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
    }
  }

  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    // 时间线编排入场动画
    const tl = gsap.timeline()
    tl.fromTo(cardRef.value,
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }
    )
    .fromTo('.flip-card',
      { scale: 0.85, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.4)' },
      '-=0.2'
    )
    .fromTo('.back-title',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
      '-=0.3'
    )
    .fromTo('.back-singer',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
      '-=0.2'
    )
    .fromTo('.card-controls',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
      '-=0.2'
    )

  }, cardRef.value)

  // 进入详情页时快速定位到当前歌词（等歌词 DOM 完全渲染后再定位）
  await nextTick()
  // 用 requestAnimationFrame 确保布局计算完成
  requestAnimationFrame(() => {
    scrollToCurrentLyric()
  })
})

// 快速定位到当前歌词（无动画，同样偏上方 1/3）
function scrollToCurrentLyric() {
  const idx = activeLyricIndex.value
  if (idx >= 0 && lyricLineRefs.value[idx] && lyricsScrollRef.value) {
    const container = lyricsScrollRef.value
    const el = lyricLineRefs.value[idx]
    if (el) {
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - containerRect.top - containerRect.height * 0.22 + elRect.height / 2
      container.scrollTop = container.scrollTop + offset
    }
  }
}

// 图片缓存（最多保留3张，减少内存占用）
const imgCache = new Map<string, HTMLImageElement>()
function cacheImg(key: string, img: HTMLImageElement) {
  if (imgCache.size >= 3) { const firstKey = imgCache.keys().next().value!; imgCache.delete(firstKey) }
  imgCache.set(key, img)
}

watch(() => props.coverUrl, () => loadCover())
watch(() => props.isPlaying, (v) => {
  currentPlaying = v
})

function loadCover() {
  console.log('[SongDetail] loadCover called, coverUrl:', props.coverUrl)
  if (!particleCanvas.value || !props.coverUrl) {
    console.log('[SongDetail] loadCover early return: canvas or coverUrl missing')
    return
  }

  // 检查图片缓存
  const cachedImg = imgCache.get(props.coverUrl)
  if (cachedImg) {
    console.log('[SongDetail] Using cached image')
    particleCanvas.value.width = CANVAS_SIZE
    particleCanvas.value.height = CANVAS_SIZE
    offscreenImg = cachedImg
    cachedPixelData = null
    buildDots()
    currentPlaying = props.isPlaying
    if (rafId) cancelAnimationFrame(rafId)
    lastFrameTime = 0
    rafId = requestAnimationFrame((t) => {
      if (particleCanvas.value) animate(particleCanvas.value, t)
    })
    return
  }

  const img = new Image()
  img.onload = () => {
    if (!particleCanvas.value) return
    console.log('[SongDetail] Image loaded successfully')
    cacheImg(props.coverUrl, img)
    particleCanvas.value.width = CANVAS_SIZE
    particleCanvas.value.height = CANVAS_SIZE
    offscreenImg = img
    cachedPixelData = null
    buildDots()
    currentPlaying = props.isPlaying
    if (rafId) cancelAnimationFrame(rafId)
    lastFrameTime = 0
    rafId = requestAnimationFrame((t) => {
      if (particleCanvas.value) animate(particleCanvas.value, t)
    })
  }
  img.onerror = () => {
    console.error('[SongDetail] Image load failed:', props.coverUrl)
  }
  img.src = props.coverUrl
}

onBeforeUnmount(() => {
  ctx?.revert()
  ScrollTrigger.getAll().forEach(t => t.kill())
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  cleanupDrag?.()
  cleanupDrag = null
})
</script>

<style scoped>
.song-detail {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: visible;
  position: relative;
  background: var(--bg-deep);
  padding-bottom: 100px;
}

/* 左侧 */
.detail-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 32px;
  position: relative;
}

.left-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  overflow: visible;
  padding-top: 20px;
}

.left-content::-webkit-scrollbar {
  display: none;
}

.detail-top {
  position: absolute;
  top: 52px;
  left: 16px;
  z-index: 2;
}

.detail-top-right {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 2;
}

.detail-back {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--t-fast);
  position: relative;
  overflow: hidden;
}
.detail-back::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--glass-refraction);
  pointer-events: none;
}
.detail-back:hover {
  color: var(--text-cream);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

/* 全屏按钮 */
.detail-fullscreen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--t-fast);
  margin-left: 8px;
}
.detail-fullscreen:hover {
  color: var(--amber);
  background: rgba(212, 168, 83, 0.1);
  border-color: rgba(212, 168, 83, 0.2);
}

/* 质量选择器 */
.quality-selector {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
  margin-top: -80px;
}

.q-btn {
  font-size: 10px;
  padding: 4px 10px;
  border-radius: var(--r-full);
  color: var(--text-ghost);
  transition: all var(--t-fast);
}

.q-btn:hover {
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
}

.q-btn.active {
  color: var(--amber);
  background: var(--amber-glass);
}

/* 歌曲信息 */
.detail-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.cover-scene {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: visible;
  margin-top: -80px;
}

.particle-canvas {
  /* canvas 绘制 640x640，CSS 显示 510x510，粒子可以飘出封面框 */
  width: 510px;
  height: 510px;
  display: block;
  border: none;
  outline: none;
  pointer-events: auto;
  cursor: grab;
}
.particle-canvas:active {
  cursor: grabbing;
}

.detail-title {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 500;
  font-style: italic;
  color: var(--amber);
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.detail-singer {
  font-size: 16px;
  color: var(--text-muted);
}

.detail-album {
  font-size: 16px;
  color: var(--text-ghost);
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: all var(--t-fast);
  position: relative;
  overflow: hidden;
}
.action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--glass-refraction);
  pointer-events: none;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--text-cream);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  color: #0d0b14;
  border: none;
  font-weight: 600;
  box-shadow: 0 4px 30px var(--amber-glow-md);
}
.action-btn.primary:hover {
  box-shadow: 0 8px 40px var(--amber-glow-lg);
}

.action-btn.favorited {
  color: #e88;
  border-color: rgba(200, 90, 90, 0.15);
  background: rgba(200, 90, 90, 0.06);
}

/* 右侧歌词 */
.detail-right {
  width: 520px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.lyrics-scroll {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 0 28px 0 0;
  position: relative;
  z-index: 1;
  perspective: 600px;
  perspective-origin: center 40%;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

.lyrics-spacer {
  height: 40%;
}

.lyric-line {
  padding: 10px 16px;
  text-align: center;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;
  transform-style: preserve-3d;
  cursor: pointer;
  border-radius: 12px;
  position: relative;
}

.lyric-line:hover:not(.active) {
  background: rgba(255, 255, 255, 0.04);
}

.lyric-text {
  display: block;
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--text-ghost);
  line-height: 1.7;
  transition: color 0.4s ease, text-shadow 0.4s ease;
}

.lyric-trans {
  display: block;
  font-size: 12px;
  color: var(--text-ghost);
  opacity: 0.4;
  margin-top: 3px;
  transition: opacity 0.4s ease;
}

/* 活跃行 - 向前弹出 */
.lyric-line.active {
  transform: translateZ(60px) scale(1.15);
  z-index: 10;
}

.lyric-line.active .lyric-text {
  font-size: 24px;
  font-weight: 500;
  font-style: italic;
  color: var(--amber);
  text-shadow: 0 4px 20px rgba(212, 168, 83, 0.5), 0 2px 8px rgba(0,0,0,0.3);
}

.lyric-line.active .lyric-trans {
  opacity: 0.7;
  color: var(--text-muted);
  font-style: italic;
}


/* 已播放行 - 向后退缩 */
.lyric-line.past {
  transform: translateZ(-40px) scale(0.88);
  opacity: 0.7;
}

.lyric-line.past .lyric-text {
  opacity: 0.6;
}

.lyric-line.past .lyric-trans {
  opacity: 0.3;
}

/* 未播放的未来歌词 - 更远 */
.lyric-line:not(.active):not(.past) {
  transform: translateZ(-20px) scale(0.95);
  opacity: 0.7;
}

.no-lyrics {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.no-lyrics p {
  font-family: var(--font-display);
  font-size: 14px;
  font-style: italic;
  color: var(--text-ghost);
}
</style>

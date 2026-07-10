<template>
  <div class="immersive-overlay" @dblclick="handleExit">
    <!-- 粒子画布（可开关） -->
    <canvas v-show="showParticles" ref="particleCanvas" class="immersive-particle"></canvas>

    <!-- 控制栏 — 顶部 -->
    <div class="imm-top-bar">
      <div class="imm-meta" v-if="track">
        <span class="imm-title">{{ track.name }}</span>
        <span class="imm-dot">·</span>
        <span class="imm-singer">{{ track.singer }}</span>
      </div>
      <div class="imm-top-actions">
        <!-- 切换粒子 -->
        <button class="imm-icon-btn" :class="{ active: showParticles }" @click="showParticles = !showParticles" :title="showParticles ? '隐藏粒子' : '显示粒子'">
          <svg v-if="showParticles" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="1"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>
        </button>
        <!-- 切换喜欢列表 -->
        <button class="imm-icon-btn" :class="{ active: showFavList }" @click="showFavList = !showFavList" title="喜欢列表">
          <svg width="18" height="18" viewBox="0 0 24 24" :fill="showFavList ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </button>
        <!-- 退出沉浸 -->
        <button class="imm-icon-btn exit-btn" @click="handleExit" title="退出沉浸" style="position: relative;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
        </button>
      </div>
    </div>

    <!-- 喜欢列表面板 -->
    <transition name="fav-panel">
      <div v-if="showFavList" class="imm-fav-panel">
        <div class="imm-fav-glass"></div>
        <div class="imm-fav-header">
          <span class="imm-fav-title">♥ 喜欢的歌曲</span>
          <span class="imm-fav-count">{{ favList.length }}</span>
        </div>
        <div class="imm-fav-list">
          <div
            v-for="(item, index) in favList"
            :key="item.songmid"
            class="imm-fav-item"
            :class="{ playing: track?.songmid === item.songmid }"
            :style="{ transform: `perspective(600px) rotateY(${(index - scrollOffset) * 2}deg) translateZ(${Math.abs(index - scrollOffset) * 2}px)` }"
            @click="$emit('play-fav', item)"
          >
            <div class="fav-item-index">{{ index + 1 }}</div>
            <div class="fav-item-info">
              <div class="fav-item-name">{{ item.name }}</div>
              <div class="fav-item-singer">{{ item.singer }}</div>
            </div>
            <div v-if="track?.songmid === item.songmid" class="fav-item-playing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 可拖动歌词区域 -->
    <div
      class="imm-lyrics-area"
      ref="lyricsAreaRef"
      :class="{ dragging: lyricsDragging }"
      :style="{ transform: `translate(${lyricsPos.x}px, ${lyricsPos.y}px) scale(${lyricsScale})`, boxShadow: lyricsShadow ? '0 12px 60px rgba(212,168,83,0.25)' : '' }"
      @mousedown="startDragLyrics"
    >
      <div class="imm-lyric-glow"></div>
      <transition name="lyric-swap" mode="out-in">
        <div :key="currentLyricLine || 'empty'" class="imm-lyric-content">
          <span v-if="currentLyricLine" class="imm-lyric-text">{{ currentLyricLine }}</span>
          <span v-else class="imm-lyric-empty">♪</span>
        </div>
      </transition>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import { usePlayer } from '../composables/usePlayer'
import { useImmersiveMode } from '../composables/useImmersiveMode'
import { useFavorites } from '../composables/useFavorites'
import type { MusicInfo } from '../composables/useSource'

const { state: playerState, togglePlay, getAudioEnergy, getFrequencyData } = usePlayer()
const { exitImmersive } = useImmersiveMode()
const { favorites: favList } = useFavorites()

// 喜欢列表显示控制
const showFavList = ref(false)
const scrollOffset = computed(() => {
  if (!props.track) return 0
  const idx = favList.value.findIndex(t => t.songmid === props.track!.songmid)
  return idx >= 0 ? idx : 0
})

const handleExit = async () => {
  exitImmersive()
  try {
    await window.api.exitFullscreen()
  } catch {}
}

const props = defineProps<{
  track: MusicInfo | null
  coverUrl: string
  lyric: string
}>()

const emit = defineEmits<{
  'play-fav': [track: MusicInfo]
}>()

// ===== 歌词（预解析） =====
interface ParsedLyricLine { time: number; text: string }
const parsedLyrics = computed<ParsedLyricLine[]>(() => {
  if (!props.lyric) return []
  const lines: ParsedLyricLine[] = []
  for (const l of props.lyric.split('\n')) {
    const m = l.match(/\[(\d{2}):(\d{2})\.(\d{1,3})\](.*)/)
    if (m) {
      const text = m[4].trim()
      if (text) {
        const time = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, '0')) / 1000
        lines.push({ time, text })
      }
    }
  }
  return lines
})

const currentLyricLine = computed(() => {
  if (!parsedLyrics.value.length || playerState.currentTime <= 0) return ''
  const t = playerState.currentTime
  let line = ''
  for (const l of parsedLyrics.value) {
    if (l.time <= t) line = l.text
    else break
  }
  return line
})

// 歌词可拖动 — 惯性拖拽 + 边界回弹 + 拖拽缩放
const lyricsAreaRef = ref<HTMLElement | null>(null)
const lyricsPos = reactive({ x: 0, y: 0 })
const lyricsScale = ref(1)
const lyricsShadow = ref(0)
let lyricsDragging = false
let lyricsDragOffsetX = 0
let lyricsDragOffsetY = 0
let lyricsRaf = 0
let pendingX = 0, pendingY = 0
// 惯性
let velocityX = 0, velocityY = 0
let lastDragX = 0, lastDragY = 0, lastDragTime = 0
let inertiaRaf = 0

function initLyricsPos() {
  lyricsPos.x = window.innerWidth / 2 - 250
  lyricsPos.y = window.innerHeight * 0.65
}
initLyricsPos()
window.addEventListener('resize', initLyricsPos)
onBeforeUnmount(() => window.removeEventListener('resize', initLyricsPos))

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function startDragLyrics(e: MouseEvent) {
  lyricsDragging = true
  velocityX = 0; velocityY = 0
  if (inertiaRaf) { cancelAnimationFrame(inertiaRaf); inertiaRaf = 0 }
  lyricsDragOffsetX = e.clientX - lyricsPos.x
  lyricsDragOffsetY = e.clientY - lyricsPos.y
  lastDragX = e.clientX; lastDragY = e.clientY; lastDragTime = Date.now()
  lyricsScale.value = 1.03
  lyricsShadow.value = 1
  document.addEventListener('mousemove', onDragLyrics)
  document.addEventListener('mouseup', stopDragLyrics)
}
function onDragLyrics(e: MouseEvent) {
  if (!lyricsDragging) return
  const now = Date.now()
  const dt = Math.max(1, now - lastDragTime)
  velocityX = (e.clientX - lastDragX) / dt * 16
  velocityY = (e.clientY - lastDragY) / dt * 16
  lastDragX = e.clientX; lastDragY = e.clientY; lastDragTime = now
  pendingX = e.clientX - lyricsDragOffsetX
  pendingY = e.clientY - lyricsDragOffsetY
  if (!lyricsRaf) {
    lyricsRaf = requestAnimationFrame(() => {
      lyricsPos.x = pendingX
      lyricsPos.y = pendingY
      lyricsRaf = 0
    })
  }
}
function stopDragLyrics() {
  lyricsDragging = false
  lyricsScale.value = 1
  lyricsShadow.value = 0
  if (lyricsRaf) { cancelAnimationFrame(lyricsRaf); lyricsRaf = 0 }
  document.removeEventListener('mousemove', onDragLyrics)
  document.removeEventListener('mouseup', stopDragLyrics)
  // 惯性滑行
  startInertia()
}
function startInertia() {
  const friction = 0.92
  const minSpeed = 0.3
  const W = window.innerWidth, H = window.innerHeight
  const elW = 500, elH = 80
  function tick() {
    velocityX *= friction
    velocityY *= friction
    if (Math.abs(velocityX) < minSpeed && Math.abs(velocityY) < minSpeed) return
    lyricsPos.x = clamp(lyricsPos.x + velocityX, -elW + 100, W - 100)
    lyricsPos.y = clamp(lyricsPos.y + velocityY, 0, H - elH)
    inertiaRaf = requestAnimationFrame(tick)
  }
  inertiaRaf = requestAnimationFrame(tick)
}

// ===== 粒子开关 =====
const showParticles = ref(false)

// ===== 粒子效果 =====
const particleCanvas = ref<HTMLCanvasElement | null>(null)
const CANVAS_SIZE = 640
const COVER_SIZE = 420
const CENTER = CANVAS_SIZE / 2
const COVER_OFFSET = (CANVAS_SIZE - COVER_SIZE) / 2
const GRID = 64
const PERSPECTIVE = 800

interface Dot { tx: number; ty: number; r: number; g: number; b: number; brightness: number; edge: number; phase: number; z: number; rand: number }
let dots: Dot[] = []
let offscreenImg: HTMLImageElement | null = null
let rafId = 0
let animFrame = 0
let lastFrameTime = 0
const FRAME_INTERVAL = 1000 / 60
let rotX = 0, rotY = 0, targetRotX = 0, targetRotY = 0
const ROTATION_DAMPING = 0.06
const ripples: { x: number; y: number; birth: number }[] = []
const RIPPLE_DECAY = 2.5
let smoothBass = 0, smoothMid = 0, smoothTreble = 0

// Simplex 3D 噪声
function snoise3D(x: number, y: number, z: number): number {
  const p = (n: number) => ((n * 73856093) ^ (n * 19349663)) & 0x7fffffff
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + t * (b - a)
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255
  const xf = x - Math.floor(x), yf = y - Math.floor(y), zf = z - Math.floor(z)
  const u = fade(xf), v = fade(yf), w = fade(zf)
  const hash = (ix: number, iy: number, iz: number) => { const h = p(ix + p(iy + p(iz))); return ((h >> 16) & 0xff) / 128.0 - 1.0 }
  const g000 = hash(X, Y, Z), g100 = hash(X + 1, Y, Z), g010 = hash(X, Y + 1, Z), g110 = hash(X + 1, Y + 1, Z)
  const g001 = hash(X, Y, Z + 1), g101 = hash(X + 1, Y, Z + 1), g011 = hash(X, Y + 1, Z + 1), g111 = hash(X + 1, Y + 1, Z + 1)
  return lerp(lerp(lerp(g000, g100, u), lerp(g010, g110, u), v), lerp(lerp(g001, g101, u), lerp(g011, g111, u), v), w)
}

function getFrequencyBands() {
  const freq = getFrequencyData()
  if (!freq) return { bass: 0, mid: 0, treble: 0 }
  const len = freq.length
  const bassEnd = Math.floor(len * 0.06)
  const midStart = Math.floor(len * 0.15)
  const midEnd = Math.floor(len * 0.40)
  const trebleEnd = Math.floor(len * 0.70)
  let bassSum = 0, midSum = 0, trebleSum = 0
  for (let i = Math.floor(len * 0.02); i < bassEnd; i++) bassSum += freq[i]
  for (let i = midStart; i < midEnd; i++) midSum += freq[i]
  for (let i = midEnd; i < trebleEnd; i++) trebleSum += freq[i]
  return { bass: bassSum / ((bassEnd - Math.floor(len * 0.02)) * 255), mid: midSum / ((midEnd - midStart) * 255), treble: trebleSum / ((trebleEnd - midEnd) * 255) }
}
function getSmoothBands() {
  const raw = getFrequencyBands()
  smoothBass = smoothBass * 0.1 + raw.bass * 0.9
  smoothMid = smoothMid * 0.1 + raw.mid * 0.9
  smoothTreble = smoothTreble * 0.1 + raw.treble * 0.9
  return { bass: Math.min(1, smoothBass), mid: Math.min(1, smoothMid), treble: Math.min(1, smoothTreble) }
}
function sobelEdge(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const edge = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const l = (data[(y * w + x - 1) * 4] + data[(y * w + x - 1) * 4 + 1] + data[(y * w + x - 1) * 4 + 2]) / 3
      const r = (data[(y * w + x + 1) * 4] + data[(y * w + x + 1) * 4 + 1] + data[(y * w + x + 1) * 4 + 2]) / 3
      const t = (data[((y - 1) * w + x) * 4] + data[((y - 1) * w + x) * 4 + 1] + data[((y - 1) * w + x) * 4 + 2]) / 3
      const b = (data[((y + 1) * w + x) * 4] + data[((y + 1) * w + x) * 4 + 1] + data[((y + 1) * w + x) * 4 + 2]) / 3
      edge[y * w + x] = Math.min(1, Math.abs(r - l) + Math.abs(b - t)) / 255
    }
  }
  return edge
}
function buildDots() {
  if (!offscreenImg) return
  dots = []
  const temp = document.createElement('canvas')
  temp.width = COVER_SIZE; temp.height = COVER_SIZE
  const ctx = temp.getContext('2d')!
  const imgRatio = offscreenImg.width / offscreenImg.height
  let drawW: number, drawH: number, drawX: number, drawY: number
  if (imgRatio > 1) { drawW = COVER_SIZE; drawH = COVER_SIZE / imgRatio; drawX = 0; drawY = (COVER_SIZE - drawH) / 2 }
  else { drawH = COVER_SIZE; drawW = COVER_SIZE * imgRatio; drawX = (COVER_SIZE - drawW) / 2; drawY = 0 }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE)
  ctx.drawImage(offscreenImg, drawX, drawY, drawW, drawH)
  let data: Uint8ClampedArray
  try { data = ctx.getImageData(0, 0, COVER_SIZE, COVER_SIZE).data } catch { return }
  const brightness = new Float32Array(COVER_SIZE * COVER_SIZE)
  for (let i = 0; i < COVER_SIZE * COVER_SIZE; i++) { const pi = i * 4; brightness[i] = (data[pi] + data[pi + 1] + data[pi + 2]) / (3 * 255) }
  const edgeData = sobelEdge(data, COVER_SIZE, COVER_SIZE)
  const imgLeft = drawX + COVER_OFFSET, imgTop = drawY + COVER_OFFSET
  const stepX = drawW / GRID, stepY = drawH / GRID
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const sx = Math.floor(gx * stepX + stepX / 2), sy = Math.floor(gy * stepY + stepY / 2)
      const pi = (sy * COVER_SIZE + sx) * 4
      dots.push({ tx: gx * stepX + stepX / 2 + imgLeft, ty: gy * stepY + stepY / 2 + imgTop, r: data[pi], g: data[pi + 1], b: data[pi + 2], brightness: brightness[sy * COVER_SIZE + sx], edge: edgeData[sy * COVER_SIZE + sx], phase: Math.random() * Math.PI * 2, z: 0, rand: Math.random() })
    }
  }
}
function animate(canvas: HTMLCanvasElement, timestamp: number) {
  rafId = requestAnimationFrame((t) => animate(canvas, t))
  if (timestamp - lastFrameTime < FRAME_INTERVAL) return
  lastFrameTime = timestamp
  const ctx = canvas.getContext('2d')!
  animFrame++

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

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
    const bassActive = uBass > 0.3 ? (uBass - 0.3) * 1.4 : 0
    const bassShake = bassActive * 1.5 * Math.sin(time * 30 + p.phase) * K
    const bassExpand = bassActive * 1.5 * K

    // mid → 流场位移（合并噪声调用，从3次降到2次）
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
    ctx.arc(sx, sy, Math.max(1, size), 0, 6.2832)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
const imgCache = new Map<string, HTMLImageElement>()
function cacheImg(key: string, img: HTMLImageElement) {
  if (imgCache.size >= 3) { const firstKey = imgCache.keys().next().value!; imgCache.delete(firstKey) }
  imgCache.set(key, img)
}
function loadCover() {
  if (!particleCanvas.value || !props.coverUrl) return
  const cached = imgCache.get(props.coverUrl)
  if (cached) { particleCanvas.value.width = CANVAS_SIZE; particleCanvas.value.height = CANVAS_SIZE; offscreenImg = cached; buildDots(); startAnimation(); return }
  const img = new Image()
  img.onload = () => { if (!particleCanvas.value) return; cacheImg(props.coverUrl, img); particleCanvas.value.width = CANVAS_SIZE; particleCanvas.value.height = CANVAS_SIZE; offscreenImg = img; buildDots(); startAnimation() }
  img.src = props.coverUrl
}
function startAnimation() { if (rafId) cancelAnimationFrame(rafId); lastFrameTime = 0; rafId = requestAnimationFrame((t) => { if (particleCanvas.value) animate(particleCanvas.value, t) }) }

let cleanupDrag: (() => void) | null = null
onMounted(() => {
  const canvas = particleCanvas.value
  if (!canvas) return
  dots = []; offscreenImg = null; rafId = 0; animFrame = 0; rotX = 0; rotY = 0; targetRotX = 0; targetRotY = 0
  let isPressed = false, dragStartX = 0, dragStartY = 0
  const onMouseDown = (e: MouseEvent) => { isPressed = true; dragStartX = e.clientX; dragStartY = e.clientY; canvas.style.cursor = 'grabbing' }
  const onMouseUp = () => { isPressed = false; targetRotX = 0; targetRotY = 0; canvas.style.cursor = 'grab' }
  const onMouseMove = (e: MouseEvent) => { if (!isPressed) return; const dx = (e.clientX - dragStartX) / window.innerWidth * 2; const dy = (e.clientY - dragStartY) / window.innerHeight * 2; targetRotY = Math.max(-1.2, Math.min(1.2, dx * 0.8)); targetRotX = Math.max(-1.2, Math.min(1.2, dy * 0.6)) }
  const onBlur = () => { isPressed = false; targetRotX = 0; targetRotY = 0; canvas.style.cursor = 'grab' }
  const onClick = (e: MouseEvent) => { const rect = canvas.getBoundingClientRect(); ripples.push({ x: (e.clientX - rect.left) / rect.width * CANVAS_SIZE, y: (e.clientY - rect.top) / rect.height * CANVAS_SIZE, birth: animFrame * 0.016 }) }
  canvas.addEventListener('mousedown', onMouseDown); window.addEventListener('mouseup', onMouseUp); window.addEventListener('mousemove', onMouseMove); window.addEventListener('blur', onBlur); canvas.addEventListener('click', onClick)
  cleanupDrag = () => { canvas.removeEventListener('mousedown', onMouseDown); window.removeEventListener('mouseup', onMouseUp); window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('blur', onBlur); canvas.removeEventListener('click', onClick) }
  loadCover()
})
watch(() => props.coverUrl, () => loadCover())
onBeforeUnmount(() => { if (rafId) cancelAnimationFrame(rafId); rafId = 0; cleanupDrag?.(); cleanupDrag = null })
</script>

<style scoped>
.immersive-overlay {
  position: fixed; inset: 0; z-index: 9000;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  background: transparent !important; pointer-events: auto;
  user-select: none;
}

.immersive-particle {
  position: absolute; width: 510px; height: 510px;
  top: 50%; left: 50%; transform: translate(-50%, -55%);
  pointer-events: auto; cursor: grab;
}

/* ===== 顶部栏 ===== */
.imm-top-bar {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 32px; z-index: 3;
}
.imm-meta {
  display: flex; align-items: center; gap: 10px;
}
.imm-title {
  font-family: var(--font-display); font-size: 28px; font-weight: 500; font-style: italic;
  color: var(--amber); text-shadow: 0 2px 20px rgba(212,168,83,0.4), 0 4px 16px rgba(0,0,0,0.5);
}
.imm-dot { color: rgba(255,255,255,0.3); font-size: 16px; }
.imm-singer { font-size: 16px; color: rgba(255,255,255,0.6); text-shadow: 0 2px 12px rgba(0,0,0,0.5); }

.imm-top-actions { display: flex; gap: 8px; }
.imm-icon-btn {
  width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(6px);
  transition: all 0.2s ease; cursor: pointer;
}
.imm-icon-btn:hover { color: #fff; background: rgba(255,255,255,0.15); }
.imm-icon-btn.active { color: var(--amber); background: rgba(212,168,83,0.15); border-color: rgba(212,168,83,0.3); }
.exit-btn:hover { color: #e88; background: rgba(200,90,90,0.2); border-color: rgba(200,90,90,0.3); }

/* ===== 可拖动歌词 ===== */
.imm-lyrics-area {
  position: fixed; top: 0; left: 0; z-index: 10; cursor: grab;
  padding: 16px 40px; border-radius: 20px;
  width: 500px; will-change: transform;
  transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s ease;
}
.imm-lyrics-area.dragging { cursor: grabbing; transition: none; }
.imm-lyric-glow {
  position: absolute; inset: -20px; border-radius: 40px; z-index: -1;
  pointer-events: none;
}
.imm-lyric-content { text-align: center; }
.imm-lyric-text {
  font-family: var(--font-display); font-size: 36px; font-weight: 500; font-style: italic;
  color: rgba(255,255,255,0.92);
  text-shadow: 0 0 40px rgba(212,168,83,0.5), 0 0 80px rgba(212,168,83,0.2), 0 4px 16px rgba(0,0,0,0.4);
  white-space: nowrap;
}
.imm-lyric-empty {
  font-size: 40px; color: rgba(212,168,83,0.3);
  animation: notePulse 2s ease-in-out infinite;
}
@keyframes notePulse { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }

.lyric-swap-enter-active { transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.lyric-swap-leave-active { transition: all 0.25s ease; }
.lyric-swap-enter-from { opacity: 0; transform: translateY(10px) scale(0.95); filter: blur(4px); }
.lyric-swap-leave-to { opacity: 0; transform: translateY(-10px) scale(0.95); filter: blur(4px); }

/* ===== 喜欢列表面板 ===== */
.imm-fav-panel {
  position: fixed; top: 70px; right: 24px; bottom: 100px;
  width: 320px; z-index: 20;
  border-radius: 24px; overflow: hidden;
  display: flex; flex-direction: column;
  perspective: 800px;
}
.imm-fav-glass {
  position: absolute; inset: 0; border-radius: 24px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);
}
.imm-fav-header {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.imm-fav-title {
  font-family: var(--font-display); font-size: 15px; font-weight: 500; font-style: italic;
  color: rgba(255,255,255,0.8);
}
.imm-fav-count {
  font-size: 11px; color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 999px;
}
.imm-fav-list {
  position: relative; z-index: 1;
  flex: 1; overflow-y: auto; padding: 8px 12px;
  scrollbar-width: none; -ms-overflow-style: none;
  transform-style: preserve-3d;
}
.imm-fav-list::-webkit-scrollbar { display: none; }
.imm-fav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 14px;
  cursor: pointer; transition: all 0.3s ease;
  transform-style: preserve-3d;
  margin-bottom: 4px;
}
.imm-fav-item:hover {
  background: rgba(255,255,255,0.06);
}
.imm-fav-item.playing {
  background: rgba(212,168,83,0.1);
  border: 1px solid rgba(212,168,83,0.15);
}
.imm-fav-item:not(.playing) {
  border: 1px solid transparent;
}
.fav-item-index {
  font-size: 11px; color: rgba(255,255,255,0.25);
  width: 20px; text-align: center; flex-shrink: 0;
}
.imm-fav-item.playing .fav-item-index { color: var(--amber); }
.fav-item-info { flex: 1; min-width: 0; }
.fav-item-name {
  font-size: 13px; color: rgba(255,255,255,0.75);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color 0.3s;
}
.imm-fav-item.playing .fav-item-name { color: var(--amber); font-weight: 500; }
.fav-item-singer {
  font-size: 11px; color: rgba(255,255,255,0.3);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 2px;
}
.fav-item-playing {
  display: flex; align-items: flex-end; gap: 2px; height: 14px; flex-shrink: 0;
}
.fav-item-playing span {
  width: 3px; background: var(--amber); border-radius: 2px;
  animation: favBar 0.8s ease-in-out infinite alternate;
}
.fav-item-playing span:nth-child(1) { height: 6px; animation-delay: 0s; }
.fav-item-playing span:nth-child(2) { height: 10px; animation-delay: 0.2s; }
.fav-item-playing span:nth-child(3) { height: 4px; animation-delay: 0.4s; }
@keyframes favBar { 0% { height: 3px; } 100% { height: 14px; } }

/* 面板进出动画 */
.fav-panel-enter-active { transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.fav-panel-leave-active { transition: all 0.3s ease; }
.fav-panel-enter-from { opacity: 0; transform: translateX(40px) scale(0.95); }
.fav-panel-leave-to { opacity: 0; transform: translateX(40px) scale(0.95); }

</style>

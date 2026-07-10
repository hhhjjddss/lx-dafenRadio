import { ref, reactive } from 'vue'
import type { MusicInfo } from './useSource'
import { usePlaylist } from './usePlaylist'

// 复用 usePlaylist 的队列，避免两份 playQueue 不同步
const playlist = usePlaylist()

export type PlayMode = 'sequence' | 'repeat-all' | 'repeat-one' | 'shuffle'

export interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  currentTrack: MusicInfo | null
  audioUrl: string
  coverUrl: string
  lyric: string
  tlyric: string
  isLoading: boolean
}

const state = reactive<PlayerState>({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  currentTrack: null,
  audioUrl: '',
  coverUrl: '',
  lyric: '',
  tlyric: '',
  isLoading: false
})

// 播放模式
const playMode = ref<PlayMode>('sequence')

const audio = new Audio()
audio.volume = state.volume

// ===== Web Audio API 真实 FFT 分析 =====
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let freqData: Uint8Array | null = null
let audioConnected = false

function initAudioAnalyser() {
  if (audioConnected) return
  try {
    audioCtx = new AudioContext()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.85
    const source = audioCtx.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    freqData = new Uint8Array(analyser.frequencyBinCount)
    audioConnected = true
    console.log('[Audio] AnalyserNode 初始化成功, fftSize:', analyser.fftSize)
  } catch (e) {
    console.error('[Audio] AnalyserNode 初始化失败:', e)
  }
}

// 真实频谱数据
let fftDebugged = false
function getFrequencyData(): Uint8Array | null {
  if (!analyser || !freqData) return null
  // 确保 AudioContext 处于运行状态
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume()
  }
  analyser.getByteFrequencyData(freqData)
  // 调试：首次输出频谱数据
  if (!fftDebugged && freqData[0] > 0) {
    console.log('[FFT] bass:', freqData[2], 'mid:', freqData[20], 'treble:', freqData[100])
    fftDebugged = true
  }
  return freqData
}

function getAudioEnergy(): number {
  if (!freqData) return 0
  const data = getFrequencyData()
  if (!data) return 0
  let sum = 0
  for (let i = 0; i < data.length; i++) sum += data[i]
  return sum / (data.length * 255)
}

// 音频事件绑定
audio.addEventListener('timeupdate', () => {
  state.currentTime = audio.currentTime
})

audio.addEventListener('loadedmetadata', () => {
  state.duration = audio.duration
})

// 调试：监听音频错误
audio.addEventListener('error', () => {
  const err = audio.error
  const codes: Record<number, string> = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED' }
  console.error('[Audio] error code:', err?.code, codes[err?.code || 0] || 'UNKNOWN', 'src:', audio.src?.substring(0, 120))
})

audio.addEventListener('canplay', () => {
  console.log('[Audio] canplay, duration:', audio.duration)
})

// 播放下一首（委托给 usePlaylist）
const playNext = () => {
  return playlist.getNextTrack(playMode.value)
}

// 播放上一首（委托给 usePlaylist）
const playPrev = () => {
  return playlist.getPrevTrack(playMode.value)
}

audio.addEventListener('ended', () => {
  const info = playlist.getCurrentInfo()
  console.log('[Audio] ended, playMode:', playMode.value, 'currentIndex:', info.index, 'queueLen:', info.queue.length)
  if (playMode.value === 'repeat-one') {
    audio.currentTime = 0
    audio.play().catch(() => {})
    return
  }
  const nextTrack = playNext()
  console.log('[Audio] nextTrack:', nextTrack?.name || 'null')
  if (nextTrack) {
    state.isPlaying = false
    state.currentTrack = nextTrack
    window.dispatchEvent(new CustomEvent('track-ended', { detail: nextTrack }))
  } else {
    state.isPlaying = false
    state.currentTime = 0
  }
})

audio.addEventListener('error', () => {
  state.isPlaying = false
})

export function usePlayer() {
  const play = async (track: MusicInfo, url: string) => {
    // 先暂停旧歌曲，避免触发ended或error事件
    audio.pause()
    state.currentTrack = track
    state.audioUrl = url
    audio.src = url

    // 首次播放时初始化 FFT 分析器
    initAudioAnalyser()
    // 恢复 AudioContext（浏览器 autoplay policy）
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume()
    }
    try {
      await audio.play()
      state.isPlaying = true
    } catch (e: any) {
      console.error('[Audio] 播放失败:', e.message, 'url:', url)
      state.isPlaying = false
      throw e
    } finally {
      state.isLoading = false
    }
  }

  const pause = () => {
    audio.pause()
    state.isPlaying = false
  }

  const resume = () => {
    if (!state.audioUrl) return
    audio.play().catch(() => {})
    state.isPlaying = true
  }

  const togglePlay = () => {
    if (state.isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  const stop = () => {
    audio.pause()
    audio.currentTime = 0
    state.isPlaying = false
    state.currentTime = 0
  }

  const seek = (time: number) => {
    audio.currentTime = time
    state.currentTime = time
  }

  const setVolume = (volume: number) => {
    state.volume = Math.max(0, Math.min(1, volume))
    audio.volume = state.volume
  }

  const setCover = (url: string) => {
    state.coverUrl = url
  }

  const setLyric = (lyric: string, tlyric: string) => {
    state.lyric = lyric
    state.tlyric = tlyric
  }

  const setLoading = (loading: boolean) => {
    state.isLoading = loading
  }

  // 监听来自主进程的控制命令
  window.api.onPlayUrl((url) => {
    audio.src = url
    audio.play().then(() => {
      state.isPlaying = true
    }).catch(() => {})
  })

  window.api.onPause(() => pause())
  window.api.onResume(() => resume())
  window.api.onStop(() => stop())
  window.api.onSetVolume((v) => setVolume(v))
  window.api.onSeek((t) => seek(t))

  const setPlayMode = (mode: PlayMode) => {
    playMode.value = mode
  }

  return {
    state,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    seek,
    setVolume,
    setCover,
    setLyric,
    setLoading,
    playMode,
    setPlayMode,
    getFrequencyData,
    getAudioEnergy
  }
}

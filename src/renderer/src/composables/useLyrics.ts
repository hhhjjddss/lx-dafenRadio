import { computed, ref, watch, nextTick } from 'vue'

export interface LyricLine {
  time: number
  text: string
  translation: string
}

export function useLyrics(lyric: () => string, tlyric: () => string, currentTime: () => number) {
  const lyricsScrollRef = ref<HTMLElement | null>(null)
  const lyricLineRefs = ref<(HTMLElement | null)[]>([])

  // 歌词解析
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

  const parsedLyricLines = computed<LyricLine[]>(() => {
    if (!lyric()) return []
    const mainLines = parseLrc(lyric())
    const transLines = parseLrc(tlyric())
    const transMap = new Map<number, string>()
    transLines.forEach(l => transMap.set(l.time, l.text))
    return mainLines.map(l => ({ ...l, translation: transMap.get(l.time) || '' }))
  })

  const activeLyricIndex = computed(() => {
    if (!parsedLyricLines.value.length) return -1
    let idx = -1
    for (let i = 0; i < parsedLyricLines.value.length; i++) {
      if (parsedLyricLines.value[i].time <= currentTime()) idx = i
    }
    return idx
  })

  // 歌词自动滚动
  watch(activeLyricIndex, async (newIdx) => {
    if (newIdx >= 0 && lyricLineRefs.value[newIdx] && lyricsScrollRef.value) {
      await nextTick()
      const container = lyricsScrollRef.value
      const el = lyricLineRefs.value[newIdx]
      if (el) {
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2
        container.scrollTo({
          top: container.scrollTop + offset,
          behavior: 'smooth'
        })
      }
    }
  })

  // 快速定位到当前歌词（无动画）
  function scrollToCurrentLyric() {
    const idx = activeLyricIndex.value
    if (idx >= 0 && lyricLineRefs.value[idx] && lyricsScrollRef.value) {
      const container = lyricsScrollRef.value
      const el = lyricLineRefs.value[idx]
      if (el) {
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2
        container.scrollTop = container.scrollTop + offset
      }
    }
  }

  // 点击歌词跳转
  function seekToLyric(time: number, emit: (event: 'seek', ...args: any[]) => void) {
    emit('seek', time)
  }

  return {
    parsedLyricLines,
    activeLyricIndex,
    lyricsScrollRef,
    lyricLineRefs,
    scrollToCurrentLyric,
    seekToLyric
  }
}

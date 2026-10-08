import { ref, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

export function useEcg(getAudioEnergy: () => number, getFrequencyData: () => Uint8Array | null, isPlaying: () => boolean) {
  const ecgCanvas = ref<HTMLCanvasElement | null>(null)
  let ecgRafId = 0
  let ecgTime = 0
  let ecgWidth = 280
  const ECG_HEIGHT = 200
  const ecgPoints: number[] = []
  const ecgSmoothPoints: number[] = []
  const ECG_BASELINE = ECG_HEIGHT / 2
  let currentEnergy = 0

  function initEcgPoints() {
    ecgPoints.length = 0
    ecgSmoothPoints.length = 0
    if (ecgCanvas.value) {
      ecgWidth = ecgCanvas.value.width
    }
    for (let i = 0; i < ecgWidth; i++) {
      ecgPoints.push(ECG_BASELINE)
      ecgSmoothPoints.push(ECG_BASELINE)
    }
  }

  function generateWave(t: number): number {
    if (!isPlaying()) return ECG_BASELINE

    const energy = getAudioEnergy()
    const freq = getFrequencyData()

    currentEnergy += (energy - currentEnergy) * 0.15

    let y = ECG_BASELINE
    const amp = currentEnergy * 60
    y += Math.sin(t * 2.3) * amp * 0.9
    y += Math.sin(t * 3.9) * amp * 0.6
    y += Math.sin(t * 5.7) * amp * 0.4
    y += Math.sin(t * 8.2) * amp * 0.25
    y += Math.sin(t * 11.5) * amp * 0.15

    if (freq) {
      const sampleCount = 20
      for (let i = 0; i < sampleCount; i++) {
        const freqIdx = Math.floor(i * freq.length / sampleCount)
        const val = freq[freqIdx] / 255
        y += Math.sin(t * (1.5 + i * 0.7) + i * 0.5) * val * 30
      }
    }

    y += (Math.random() - 0.5) * currentEnergy * 8
    return y
  }

  let lastEcgTime = 0
  const ECG_FRAME_INTERVAL = 1000 / 30 // 30fps
  let cachedCtx: CanvasRenderingContext2D | null = null
  let cachedGradient: CanvasGradient | null = null
  let ecgIdle = false // 暂停且波形归位时跳过重绘

  function animateEcg(timestamp: number) {
    if (!ecgCanvas.value) return
    // 限帧到 30fps
    if (timestamp - lastEcgTime < ECG_FRAME_INTERVAL) {
      ecgRafId = requestAnimationFrame(animateEcg)
      return
    }
    lastEcgTime = timestamp
    if (!cachedCtx) cachedCtx = ecgCanvas.value.getContext('2d')!
    const ctx = cachedCtx
    const playing = isPlaying()

    if (playing) {
      ecgTime += 0.018
      ecgPoints.shift()
      ecgPoints.push(generateWave(ecgTime))
      ecgIdle = false
    } else {
      let maxDev = 0
      for (let i = 0; i < ecgPoints.length; i++) {
        ecgPoints[i] += (ECG_BASELINE - ecgPoints[i]) * 0.12
        const d = Math.abs(ecgPoints[i] - ECG_BASELINE)
        if (d > maxDev) maxDev = d
      }
      // 已归位则画一次基线后完全停掉循环，恢复播放时由 wakeEcg 唤醒
      if (maxDev < 0.5) {
        if (!ecgIdle) {
          ctx.clearRect(0, 0, ecgWidth, ECG_HEIGHT)
          drawBaseline(ctx)
          ecgIdle = true
        }
        ecgRafId = 0
        return
      }
      ecgIdle = false
    }

    for (let i = 0; i < ecgPoints.length; i++) {
      ecgSmoothPoints[i] += (ecgPoints[i] - ecgSmoothPoints[i]) * 0.2
    }

    ctx.clearRect(0, 0, ecgWidth, ECG_HEIGHT)

    drawBaseline(ctx)

    // 单次路径采样（隔点取样减半顶点数），四层描边共用
    const n = ecgSmoothPoints.length
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < n; i += 2) {
      if (i === 0) ctx.moveTo(0, ecgSmoothPoints[0])
      else ctx.lineTo(i, ecgSmoothPoints[i])
    }

    // 外层发光（粗线+低透明度模拟模糊）
    ctx.strokeStyle = `rgba(14, 165, 233, ${0.08 + currentEnergy * 0.1})`
    ctx.lineWidth = 10
    ctx.stroke()

    // 中层光晕
    ctx.strokeStyle = `rgba(14, 165, 233, ${0.2 + currentEnergy * 0.2})`
    ctx.lineWidth = 5
    ctx.stroke()

    // 主线条
    if (!cachedGradient) {
      cachedGradient = ctx.createLinearGradient(0, 0, ecgWidth, 0)
      cachedGradient.addColorStop(0, 'rgba(14, 165, 233, 0.3)')
      cachedGradient.addColorStop(0.3, 'rgba(14, 165, 233, 0.9)')
      cachedGradient.addColorStop(0.7, 'rgba(56, 189, 248, 1)')
      cachedGradient.addColorStop(1, 'rgba(14, 165, 233, 0.3)')
    }
    ctx.strokeStyle = cachedGradient
    ctx.lineWidth = 2.5
    ctx.stroke()

    // 高亮核心线
    ctx.strokeStyle = `rgba(224, 247, 255, ${0.4 + currentEnergy * 0.4})`
    ctx.lineWidth = 1
    ctx.stroke()

    // 波峰光点
    if (currentEnergy > 0.3) {
      for (let i = 4; i < n - 4; i += 2) {
        const prev = ecgSmoothPoints[i - 1]
        const curr = ecgSmoothPoints[i]
        const next = ecgSmoothPoints[i + 1]
        if (curr < prev && curr < next && Math.abs(ECG_BASELINE - curr) > 20) {
          const intensity = Math.min(1, (Math.abs(ECG_BASELINE - curr) - 20) / 40)
          ctx.beginPath()
          ctx.fillStyle = `rgba(224, 247, 255, ${intensity * 0.8})`
          ctx.arc(i, curr, 2 + intensity * 2, 0, 6.2832)
          ctx.fill()
          ctx.beginPath()
          ctx.fillStyle = `rgba(14, 165, 233, ${intensity * 0.3})`
          ctx.arc(i, curr, 6 + intensity * 4, 0, 6.2832)
          ctx.fill()
        }
      }
    }

    ecgRafId = requestAnimationFrame(animateEcg)
  }

  function drawBaseline(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 8])
    ctx.moveTo(0, ECG_BASELINE)
    ctx.lineTo(ecgWidth, ECG_BASELINE)
    ctx.stroke()
    ctx.setLineDash([])
  }

  function startEcg() {
    if (ecgCanvas.value) {
      const container = ecgCanvas.value.parentElement
      if (container) {
        ecgCanvas.value.width = container.clientWidth
      }
      ecgCanvas.value.height = ECG_HEIGHT
      initEcgPoints()
      cachedCtx = null
      cachedGradient = null
      ecgIdle = false
      if (ecgRafId) cancelAnimationFrame(ecgRafId)
      animateEcg()

      const ecgContainer = ecgCanvas.value.parentElement
      if (ecgContainer) {
        gsap.fromTo(ecgContainer,
          { autoAlpha: 0, y: 15, scale: 0.95 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out', delay: 0.2 }
        )
      }
    }
  }

  /** 暂停归位后循环已停；恢复播放时唤醒 */
  function wakeEcg() {
    if (ecgCanvas.value && !ecgRafId) {
      ecgIdle = false
      ecgRafId = requestAnimationFrame(animateEcg)
    }
  }

  function stopEcg() {
    // 立即停止动画循环
    if (ecgRafId) {
      cancelAnimationFrame(ecgRafId)
      ecgRafId = 0
    }
    // 清空 Canvas，释放像素数据
    if (ecgCanvas.value) {
      const ctx = ecgCanvas.value.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, ecgCanvas.value.width, ecgCanvas.value.height)
      }
    }
    // 重置数据
    ecgPoints.length = 0
    ecgSmoothPoints.length = 0
    ecgTime = 0
    currentEnergy = 0
    // 淡出动画
    const ecgContainer = ecgCanvas.value?.parentElement
    if (ecgContainer) {
      gsap.to(ecgContainer, {
        autoAlpha: 0, y: 10, duration: 0.3, ease: 'power2.in'
      })
    }
  }

  onBeforeUnmount(() => {
    if (ecgRafId) cancelAnimationFrame(ecgRafId)
  })

  return {
    ecgCanvas,
    startEcg,
    stopEcg,
    wakeEcg
  }
}

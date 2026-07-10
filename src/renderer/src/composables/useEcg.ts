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

  function animateEcg(timestamp: number) {
    if (!ecgCanvas.value) return
    // 限帧到 30fps
    if (timestamp - lastEcgTime < ECG_FRAME_INTERVAL) {
      ecgRafId = requestAnimationFrame(animateEcg)
      return
    }
    lastEcgTime = timestamp
    const ctx = ecgCanvas.value.getContext('2d')!
    const playing = isPlaying()

    if (playing) {
      ecgTime += 0.018
      ecgPoints.shift()
      ecgPoints.push(generateWave(ecgTime))
    } else {
      for (let i = 0; i < ecgPoints.length; i++) {
        ecgPoints[i] += (ECG_BASELINE - ecgPoints[i]) * 0.12
      }
    }

    for (let i = 0; i < ecgPoints.length; i++) {
      ecgSmoothPoints[i] += (ecgPoints[i] - ecgSmoothPoints[i]) * 0.2
    }

    ctx.clearRect(0, 0, ecgWidth, ECG_HEIGHT)

    // 背景渐变遮罩
    const fadeWidth = 60
    const leftFade = ctx.createLinearGradient(0, 0, fadeWidth, 0)
    leftFade.addColorStop(0, 'rgba(26, 21, 32, 1)')
    leftFade.addColorStop(1, 'rgba(26, 21, 32, 0)')
    ctx.fillStyle = leftFade
    ctx.fillRect(0, 0, fadeWidth, ECG_HEIGHT)

    const rightFade = ctx.createLinearGradient(ecgWidth - fadeWidth, 0, ecgWidth, 0)
    rightFade.addColorStop(0, 'rgba(26, 21, 32, 0)')
    rightFade.addColorStop(1, 'rgba(26, 21, 32, 1)')
    ctx.fillStyle = rightFade
    ctx.fillRect(ecgWidth - fadeWidth, 0, fadeWidth, ECG_HEIGHT)

    // 基线
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(212, 168, 83, 0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 8])
    ctx.moveTo(0, ECG_BASELINE)
    ctx.lineTo(ecgWidth, ECG_BASELINE)
    ctx.stroke()
    ctx.setLineDash([])

    // 外层发光
    ctx.beginPath()
    ctx.strokeStyle = `rgba(212, 168, 83, ${0.15 + currentEnergy * 0.2})`
    ctx.lineWidth = 8
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.filter = 'blur(6px)'
    for (let i = 0; i < ecgSmoothPoints.length; i++) {
      if (i === 0) ctx.moveTo(i, ecgSmoothPoints[i])
      else ctx.lineTo(i, ecgSmoothPoints[i])
    }
    ctx.stroke()
    ctx.filter = 'none'

    // 中层光晕
    ctx.beginPath()
    ctx.strokeStyle = `rgba(212, 168, 83, ${0.3 + currentEnergy * 0.3})`
    ctx.lineWidth = 4
    ctx.filter = 'blur(2px)'
    for (let i = 0; i < ecgSmoothPoints.length; i++) {
      if (i === 0) ctx.moveTo(i, ecgSmoothPoints[i])
      else ctx.lineTo(i, ecgSmoothPoints[i])
    }
    ctx.stroke()
    ctx.filter = 'none'

    // 主线条
    const gradient = ctx.createLinearGradient(0, 0, ecgWidth, 0)
    gradient.addColorStop(0, 'rgba(212, 168, 83, 0.3)')
    gradient.addColorStop(0.3, 'rgba(212, 168, 83, 0.9)')
    gradient.addColorStop(0.7, 'rgba(240, 200, 100, 1)')
    gradient.addColorStop(1, 'rgba(212, 168, 83, 0.3)')

    ctx.beginPath()
    ctx.strokeStyle = gradient
    ctx.lineWidth = 2.5
    for (let i = 0; i < ecgSmoothPoints.length; i++) {
      if (i === 0) ctx.moveTo(i, ecgSmoothPoints[i])
      else ctx.lineTo(i, ecgSmoothPoints[i])
    }
    ctx.stroke()

    // 高亮核心线
    ctx.beginPath()
    ctx.strokeStyle = `rgba(255, 230, 160, ${0.4 + currentEnergy * 0.4})`
    ctx.lineWidth = 1
    for (let i = 0; i < ecgSmoothPoints.length; i++) {
      if (i === 0) ctx.moveTo(i, ecgSmoothPoints[i])
      else ctx.lineTo(i, ecgSmoothPoints[i])
    }
    ctx.stroke()

    // 波峰光点
    if (currentEnergy > 0.3) {
      for (let i = 4; i < ecgSmoothPoints.length - 4; i++) {
        const prev = ecgSmoothPoints[i - 1]
        const curr = ecgSmoothPoints[i]
        const next = ecgSmoothPoints[i + 1]
        if (curr < prev && curr < next && Math.abs(ECG_BASELINE - curr) > 20) {
          const intensity = Math.min(1, (Math.abs(ECG_BASELINE - curr) - 20) / 40)
          ctx.beginPath()
          ctx.fillStyle = `rgba(255, 240, 180, ${intensity * 0.8})`
          ctx.arc(i, curr, 2 + intensity * 2, 0, 6.2832)
          ctx.fill()
          ctx.beginPath()
          ctx.fillStyle = `rgba(212, 168, 83, ${intensity * 0.3})`
          ctx.arc(i, curr, 6 + intensity * 4, 0, 6.2832)
          ctx.fill()
        }
      }
    }

    ecgRafId = requestAnimationFrame(animateEcg)
  }

  function startEcg() {
    if (ecgCanvas.value) {
      const container = ecgCanvas.value.parentElement
      if (container) {
        ecgCanvas.value.width = container.clientWidth
      }
      ecgCanvas.value.height = ECG_HEIGHT
      initEcgPoints()
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
    stopEcg
  }
}

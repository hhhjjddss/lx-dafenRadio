import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

export function useMouseEffects() {
  const petalContainer = ref<HTMLElement | null>(null)
  const cursorDot = ref<HTMLElement | null>(null)
  const cursorRing = ref<HTMLElement | null>(null)

  // 鼠标花瓣效果
  let lastPetalTime = 0
  const petalColors = [
    'rgba(255, 182, 193, 0.8)',
    'rgba(255, 218, 185, 0.8)',
    'rgba(255, 192, 203, 0.7)',
    'rgba(255, 160, 200, 0.7)',
    'rgba(255, 200, 220, 0.6)',
  ]

  function onMouseMove(e: MouseEvent) {
    // 移动光标
    if (cursorDot.value) {
      cursorDot.value.style.left = `${e.clientX}px`
      cursorDot.value.style.top = `${e.clientY}px`
    }
    if (cursorRing.value) {
      gsap.to(cursorRing.value, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.15,
        ease: 'power2.out'
      })
    }

    const now = Date.now()
    if (now - lastPetalTime < 50) return
    lastPetalTime = now

    if (!petalContainer.value) return

    // 创建花瓣
    const petal = document.createElement('div')
    petal.className = 'petal'
    petal.style.left = `${e.clientX}px`
    petal.style.top = `${e.clientY}px`
    petal.style.backgroundColor = petalColors[Math.floor(Math.random() * petalColors.length)]
    petal.style.width = `${Math.random() * 8 + 6}px`
    petal.style.height = `${Math.random() * 8 + 6}px`
    petalContainer.value.appendChild(petal)

    // 使用 GSAP 动画
    gsap.to(petal, {
      x: (Math.random() - 0.5) * 100,
      y: Math.random() * 150 + 50,
      rotation: Math.random() * 360,
      opacity: 0,
      scale: 0,
      duration: 1 + Math.random() * 0.5,
      ease: 'power2.out',
      onComplete: () => {
        petal.remove()
      }
    })
  }

  onMounted(() => {
    document.addEventListener('mousemove', onMouseMove)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onMouseMove)
  })

  return {
    petalContainer,
    cursorDot,
    cursorRing
  }
}

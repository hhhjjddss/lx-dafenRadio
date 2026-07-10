import { ref } from 'vue'

/**
 * 沉浸播放模式管理
 * 全屏透明窗口 + 居中粒子 + 单行歌词
 */
const isImmersive = ref(false)

export function useImmersiveMode() {
  function enterImmersive() {
    isImmersive.value = true
    document.documentElement.classList.add('immersive-mode')
  }

  function exitImmersive() {
    isImmersive.value = false
    document.documentElement.classList.remove('immersive-mode')
  }

  function toggleImmersive() {
    if (isImmersive.value) {
      exitImmersive()
    } else {
      enterImmersive()
    }
  }

  return { isImmersive, enterImmersive, exitImmersive, toggleImmersive }
}

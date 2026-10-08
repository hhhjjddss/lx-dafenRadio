import { ref } from 'vue'

export type ThemeName = 'purple'

/**
 * 主题管理 Composable
 * 集中管理主题切换、持久化和 DOM class 同步
 * （粉色 / 经典主题已移除，仅保留蓝紫默认主题）
 */
export function useTheme() {
  const currentTheme = ref<ThemeName>('purple')

  /** 将 theme name 应用到 document.documentElement */
  function applyTheme(theme: ThemeName) {
    if (theme !== 'purple') theme = 'purple'
    currentTheme.value = theme
    // 清理历史遗留的主题 class（老用户 localStorage 里可能还存着 pink/classic）
    document.documentElement.classList.remove('theme-pink', 'theme-classic')
  }

  /** 切换主题并持久化 */
  function setTheme(theme: ThemeName) {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }

  /** 从 localStorage 读取并应用主题 */
  function initTheme() {
    const saved = localStorage.getItem('theme') as ThemeName | null
    applyTheme(saved === 'purple' ? saved : 'purple')
  }

  return { currentTheme, setTheme, applyTheme, initTheme }
}

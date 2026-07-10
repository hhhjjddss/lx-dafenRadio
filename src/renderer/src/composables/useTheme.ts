import { ref } from 'vue'

export type ThemeName = 'purple' | 'pink' | 'classic'

const VALID_THEMES: ThemeName[] = ['purple', 'pink', 'classic']
const THEME_CLASSES: Record<ThemeName, string> = {
  purple: '',
  pink: 'theme-pink',
  classic: 'theme-classic'
}

/**
 * 主题管理 Composable
 * 集中管理主题切换、持久化和 DOM class 同步
 */
export function useTheme() {
  const currentTheme = ref<ThemeName>('purple')

  /** 将 theme name 应用到 document.documentElement */
  function applyTheme(theme: ThemeName) {
    if (!VALID_THEMES.includes(theme)) theme = 'purple'
    currentTheme.value = theme
    document.documentElement.classList.remove('theme-pink', 'theme-classic')
    const cls = THEME_CLASSES[theme]
    if (cls) document.documentElement.classList.add(cls)
  }

  /** 切换主题并持久化 */
  function setTheme(theme: ThemeName) {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }

  /** 从 localStorage 读取并应用主题 */
  function initTheme() {
    const saved = localStorage.getItem('theme') as ThemeName | null
    applyTheme(saved && VALID_THEMES.includes(saved) ? saved : 'classic')
  }

  return { currentTheme, setTheme, applyTheme, initTheme }
}

import { ref } from 'vue'
import gsap from 'gsap'

export function useSidebarAnimation() {
  const sidebarRef = ref<HTMLElement | null>(null)
  const discRef = ref<HTMLElement | null>(null)
  const tonearmRef = ref<HTMLElement | null>(null)
  const coverLargeRef = ref<HTMLElement | null>(null)
  let sidebarTl: gsap.core.Timeline | null = null

  // 从元素上读取 CSS 变量值（px）
  const getCssVar = (el: HTMLElement, name: string): number => {
    const raw = getComputedStyle(el).getPropertyValue(name).trim()
    return parseFloat(raw) || 0
  }

  function updateDiscAnimation(isPlaying: boolean, isExpanded: boolean) {
    if (!discRef.value) return

    // 旋转动画现在由 Vue :class 绑定管理（disc-playing-spin / disc-expanded-spin）
    // 暂停时唱片必须完全静止：只清 transform，不做任何补间动画
    if (!isPlaying && !isExpanded) {
      gsap.killTweensOf(discRef.value)
      gsap.set(discRef.value, { clearProps: 'rotation,rotateX,rotateY' })
    }
  }

  function updateCoverAnimation(isPlaying: boolean, isExpanded: boolean) {
    if (!coverLargeRef.value) return

    // 旋转动画由 Vue :class 绑定管理（cover-expanded-spin）
    // 暂停时封面必须完全静止：不旋转、不缩放、不弹跳
    if (!isPlaying && isExpanded) {
      gsap.killTweensOf(coverLargeRef.value)
      return
    }

    if (!isExpanded) {
      // 收起侧栏属于布局变化（非暂停），角度归零（尺寸由 CSS 接管）
      gsap.set(coverLargeRef.value, { clearProps: 'rotation' })
      gsap.to(coverLargeRef.value, {
        rotateZ: 0,
        duration: 0.5, ease: 'power2.out'
      })
    }
  }

  function toggleSidebar(expanded: boolean, hasCover: boolean, playMode: string) {
    if (expanded && !hasCover) return false

    // 清理旧的 timeline，防止内存泄漏
    if (sidebarTl) {
      sidebarTl.kill()
      sidebarTl = null
    }

    // 用 force3D 强制 GPU 加速，避免掉帧
    sidebarTl = gsap.timeline({ defaults: { force3D: true } })
    const tl = sidebarTl

    // 侧边栏宽度变化
    if (sidebarRef.value) {
      if (expanded) {
        tl.to(sidebarRef.value, {
          width: '100%',
          duration: 0.6, ease: 'power2.inOut'
        }, 0)
      } else {
        // 收起时：读取当前 CSS 变量控制的宽度
        const currentWidth = getCssVar(sidebarRef.value, '--sb-width') || 320
        tl.to(sidebarRef.value, {
          width: currentWidth,
          duration: 0.6, ease: 'power2.inOut',
          onComplete: () => {
            // 清除内联样式，让 CSS 接管
            if (sidebarRef.value) {
              sidebarRef.value.style.removeProperty('width')
            }
          }
        }, 0)
      }
    }

    // 搜索区域和右侧面板淡出
    const mainContent = document.querySelector('.main-content') as HTMLElement
    const rightPanel = document.querySelector('.right-panel') as HTMLElement
    if (mainContent) {
      tl.to(mainContent, {
        opacity: expanded ? 0 : 1,
        duration: 0.25, ease: 'power2.out',
        pointerEvents: expanded ? 'none' : 'auto'
      }, 0)
    }
    if (rightPanel) {
      tl.to(rightPanel, {
        opacity: expanded ? 0 : 1,
        duration: 0.25, ease: 'power2.out',
        pointerEvents: expanded ? 'none' : 'auto'
      }, 0)
    }

    // 黑胶唱片：展开/收起完全由CSS控制
    if (discRef.value) {
      if (!expanded) {
        tl.to(discRef.value, {
          rotateX: 15, rotateY: 0,
          duration: 0.5, ease: 'back.out(1.5)'
        }, 0.05)
      }
    }

    // 封面：尺寸完全由 CSS（--sb-cover-lg）控制，GSAP 只做微旋
    // （此前 GSAP 再叠一层 scale，与 CSS 宽度双重放大，导致封面过大且暂停时尺寸跳变）
    if (coverLargeRef.value) {
      if (expanded) {
        tl.to(coverLargeRef.value, {
          rotateZ: 0, rotateX: 0, rotateY: 0,
          duration: 0.6, ease: 'power3.out'
        }, 0.08)
      } else {
        tl.to(coverLargeRef.value, {
          rotateZ: 0, rotateX: 0, rotateY: 0,
          duration: 0.5, ease: 'power2.out'
        }, 0)
      }
    }

    // 点赞按钮
    const favBtn = document.querySelector('.sidebar-fav') as HTMLElement
    if (favBtn) {
      tl.to(favBtn, {
        right: expanded ? 'calc(50% - 250px)' : 24,
        bottom: expanded ? '110px' : 24,
        duration: 0.4, ease: 'power2.out'
      }, 0.1)
    }

    return true
  }

  return {
    sidebarRef,
    discRef,
    tonearmRef,
    coverLargeRef,
    updateDiscAnimation,
    updateCoverAnimation,
    toggleSidebar
  }
}

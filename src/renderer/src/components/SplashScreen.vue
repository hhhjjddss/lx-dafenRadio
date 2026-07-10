<template>
  <transition name="splash-fade">
    <div v-if="visible" class="splash-screen" ref="splashRef">
      <!-- 背景光斑 -->
      <div class="splash-orbs">
        <div class="splash-orb splash-orb-1"></div>
        <div class="splash-orb splash-orb-2"></div>
        <div class="splash-orb splash-orb-3"></div>
      </div>

      <!-- Logo 区域 -->
      <div class="splash-content" ref="contentRef">
        <!-- Logo 图标 -->
        <div class="logo-icon" ref="logoRef">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- 文字 Logo -->
        <div class="logo-text" ref="logoTextRef">
          <span class="logo-dafen">DaFen</span>
          <span class="logo-radio">Radio</span>
        </div>

        <!-- 加载指示器 -->
        <div class="splash-loader" ref="loaderRef">
          <div class="loader-bar"></div>
        </div>

        <!-- 版本信息 -->
        <div class="splash-version" ref="versionRef">v1.1.1 正式版</div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

let ctx: gsap.Context | null = null

const emit = defineEmits<{
  complete: []
}>()

const visible = ref(true)
const splashRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const logoRef = ref<HTMLElement | null>(null)
const logoTextRef = ref<HTMLElement | null>(null)
const loaderRef = ref<HTMLElement | null>(null)
const versionRef = ref<HTMLElement | null>(null)

onMounted(() => {
  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    // 创建时间线
    const tl = gsap.timeline({
    onComplete: () => {
      // 淡出并销毁
      gsap.to(splashRef.value, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => {
          visible.value = false
          emit('complete')
        }
      })
    }
  })

  // Logo 图标入场
  tl.fromTo(logoRef.value,
    { scale: 0, rotation: -180, opacity: 0 },
    { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
  )

  // 文字入场
  tl.fromTo('.logo-dafen',
    { x: -30, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
    '-=0.3'
  )

  tl.fromTo('.logo-radio',
    { x: 30, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
    '-=0.4'
  )

  // Logo 脉冲效果
  tl.to(logoRef.value, {
    scale: 1.06,
    duration: 0.2,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1
  }, '+=0.2')

  // 加载条动画
  tl.to('.loader-bar', {
    width: '100%',
    duration: 1.5,
    ease: 'power2.inOut'
  }, '-=0.2')

  // 版本号淡入
  tl.fromTo(versionRef.value,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    '-=1'
  )
  }, splashRef.value)
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
})
</script>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-deep);
  overflow: hidden;
}

/* 背景光斑 */
.splash-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.splash-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}

.splash-orb-1 {
  width: 400px;
  height: 400px;
  left: 20%;
  top: 30%;
  background: radial-gradient(ellipse, rgba(230, 180, 60, 0.25) 0%, transparent 70%);
  animation: orbPulse1 3s ease-in-out infinite alternate;
}

.splash-orb-2 {
  width: 300px;
  height: 300px;
  right: 25%;
  bottom: 35%;
  background: radial-gradient(ellipse, rgba(160, 100, 80, 0.2) 0%, transparent 70%);
  animation: orbPulse2 4s ease-in-out infinite alternate;
}

.splash-orb-3 {
  width: 250px;
  height: 250px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, rgba(180, 120, 200, 0.15) 0%, transparent 70%);
  animation: orbPulse3 3.5s ease-in-out infinite alternate;
}

@keyframes orbPulse1 {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.15); opacity: 1; }
}

@keyframes orbPulse2 {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes orbPulse3 {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
  100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
}

/* 内容区域 */
.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  z-index: 1;
}

/* Logo 图标 */
.logo-icon {
  color: var(--amber);
  filter: drop-shadow(0 0 24px rgba(212, 168, 83, 0.5));
}

/* 文字 Logo */
.logo-text {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.logo-dafen {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 600;
  color: var(--text-cream);
  text-shadow: 0 0 40px rgba(245, 237, 224, 0.4);
}

.logo-radio {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 300;
  font-style: italic;
  color: var(--text-muted);
}

.theme-classic .logo-dafen { text-shadow: none !important; }
.theme-classic .logo-radio { color: #888 !important; }

/* 加载条 */
.splash-loader {
  width: 160px;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.loader-bar {
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--amber), var(--amber-bright));
  border-radius: 2px;
  box-shadow: 0 0 10px var(--amber-glow-md);
}

/* 版本号 */
.splash-version {
  font-size: 13px;
  color: var(--text-ghost);
  letter-spacing: 3px;
}

/* 淡出动画 */
.splash-fade-leave-active {
  transition: opacity 0.5s ease;
}

.splash-fade-leave-to {
  opacity: 0;
}

</style>

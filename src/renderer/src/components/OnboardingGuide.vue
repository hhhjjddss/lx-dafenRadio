<template>
  <transition name="guide-fade">
    <div v-if="visible" class="guide-overlay" ref="overlayRef">
      <div class="guide-panel" ref="panelRef">
        <!-- 关闭按钮 -->
        <button class="guide-close" @click="close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <!-- 步骤指示器 -->
        <div class="guide-steps">
          <div
            v-for="(_, index) in steps"
            :key="index"
            class="step-dot"
            :class="{ active: currentStep === index, completed: currentStep > index }"
          ></div>
        </div>

        <!-- 内容区域 -->
        <div class="guide-content">
          <transition name="step-slide" mode="out-in">
            <div :key="currentStep" class="step-content">
              <!-- 步骤图标 -->
              <div class="step-icon" :style="{ background: steps[currentStep].color }">
                <div v-html="steps[currentStep].icon"></div>
              </div>

              <!-- 步骤标题 -->
              <h2 class="step-title">{{ steps[currentStep].title }}</h2>

              <!-- 步骤描述 -->
              <p class="step-desc">{{ steps[currentStep].desc }}</p>

              <!-- 动态演示 -->
              <div class="step-demo">
                <div v-html="steps[currentStep].demo"></div>
              </div>
            </div>
          </transition>
        </div>

        <!-- 底部按钮 -->
        <div class="guide-actions">
          <button v-if="currentStep > 0" class="guide-btn secondary" @click="prevStep">
            上一步
          </button>
          <button class="guide-btn primary" @click="nextStep">
            {{ currentStep === steps.length - 1 ? '开始使用' : '下一步' }}
          </button>
        </div>

        <!-- 跳过按钮 -->
        <button class="guide-skip" @click="close">跳过</button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

let ctx: gsap.Context | null = null

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)
const currentStep = ref(0)
const overlayRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const steps = [
  {
    title: '欢迎使用 DaFen Radio',
    desc: '一款优雅的音乐播放器，为你带来极致的听觉体验。',
    color: 'linear-gradient(135deg, rgba(212, 168, 83, 0.2), rgba(232, 144, 159, 0.2))',
    icon: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#D4A853" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    demo: `
      <div style="display: flex; gap: 16px; justify-content: center;">
        <div style="width: 80px; height: 80px; border-radius: 12px; background: linear-gradient(135deg, #1e1628, #2a1f3d); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A853" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <div style="text-align: left; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size: 14px; color: #f5ede0; font-weight: 500;">正在播放</div>
          <div style="font-size: 12px; color: #9A8F7A; margin-top: 4px;">歌曲名称</div>
        </div>
      </div>
    `
  },
  {
    title: '智能搜索',
    desc: '输入歌名、歌手或专辑，快速找到你想听的音乐。',
    color: 'linear-gradient(135deg, rgba(100, 180, 255, 0.2), rgba(160, 120, 255, 0.2))',
    icon: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64B4FF" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
    demo: `
      <div style="width: 280px; margin: 0 auto; padding: 12px 20px; border-radius: 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A8F7A" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <span style="color: #f5ede0; font-size: 14px;">周杰伦</span>
        <span style="color: #666; font-size: 14px;">|</span>
        <span style="color: #9A8F7A; font-size: 14px;">搜索中...</span>
      </div>
    `
  },
  {
    title: '收藏管理',
    desc: '一键收藏喜欢的歌曲，打造专属播放列表。',
    color: 'linear-gradient(135deg, rgba(232, 136, 155, 0.2), rgba(255, 150, 180, 0.2))',
    icon: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#E8889B" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    demo: `
      <div style="display: flex; gap: 12px; justify-content: center;">
        <div style="padding: 8px 16px; border-radius: 12px; background: rgba(232,136,155,0.1); border: 1px solid rgba(232,136,155,0.2); display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8889B"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span style="font-size: 12px; color: #E8889B;">已收藏</span>
        </div>
        <div style="padding: 8px 16px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A8F7A" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span style="font-size: 12px; color: #9A8F7A;">收藏</span>
        </div>
      </div>
    `
  },
  {
    title: '播放模式',
    desc: '支持顺序播放、单曲循环、随机播放，随心切换。',
    color: 'linear-gradient(135deg, rgba(102, 217, 160, 0.2), rgba(80, 200, 140, 0.2))',
    icon: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#66D9A0" stroke-width="1.5"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
    demo: `
      <div style="display: flex; gap: 10px; justify-content: center;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A8F7A" stroke-width="2"><path d="M4 4h16M4 12h16M4 20h16"/></svg>
        </div>
        <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(212,168,83,0.1); border: 1px solid rgba(212,168,83,0.2); display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A853" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
        </div>
        <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A8F7A" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
        </div>
      </div>
    `
  },
  {
    title: '开始享受音乐',
    desc: '现在就开始你的音乐之旅吧！点击下方按钮导入音源。',
    color: 'linear-gradient(135deg, rgba(212, 168, 83, 0.3), rgba(232, 192, 106, 0.3))',
    icon: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#D4A853" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    demo: `
      <div style="text-align: center; padding: 16px;">
        <div style="font-size: 48px; margin-bottom: 8px;">🎵</div>
        <div style="font-size: 13px; color: #9A8F7A;">点击顶部「导入音源」开始</div>
      </div>
    `
  }
]

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    close()
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const close = () => {
  // 保存已查看状态
  localStorage.setItem('dafen_onboarding_completed', 'true')

  gsap.to(panelRef.value, {
    scale: 0.95,
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      visible.value = false
      emit('close')
    }
  })
}

onMounted(() => {
  // gsap.context 作用域管理
  ctx = gsap.context(() => {
    // 入场动画
    gsap.fromTo(panelRef.value,
      { scale: 0.9, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
    )
  }, panelRef.value)
})

onBeforeUnmount(() => {
  ctx?.revert() // 清理所有GSAP动画
})
</script>

<style scoped>
.guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
}

.guide-panel {
  width: 480px;
  max-height: 90vh;
  background: rgba(30, 25, 35, 0.85);
  backdrop-filter: blur(15px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

/* 关闭按钮 */
.guide-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-ghost);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all var(--t-fast);
  z-index: 10;
}

.guide-close:hover {
  color: var(--text-cream);
  background: rgba(255, 255, 255, 0.1);
}

/* 步骤指示器 */
.guide-steps {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 24px 0 0;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.step-dot.active {
  background: var(--amber);
  transform: scale(1.2);
}

.step-dot.completed {
  background: rgba(212, 168, 83, 0.5);
}

/* 内容区域 */
.guide-content {
  padding: 32px 40px;
  min-height: 320px;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.step-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  color: var(--text-cream);
  margin-bottom: 12px;
}

.step-desc {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 320px;
  margin-bottom: 24px;
}

.step-demo {
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* 底部按钮 */
.guide-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 0 40px 24px;
}

.guide-btn {
  padding: 12px 32px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--t-fast);
}

.guide-btn.secondary {
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.guide-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.08);
}

.guide-btn.primary {
  color: #0d0b14;
  background: linear-gradient(135deg, var(--amber), var(--amber-bright));
  box-shadow: 0 4px 20px var(--amber-glow-md);
}

.guide-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 30px var(--amber-glow-lg);
}

/* 跳过按钮 */
.guide-skip {
  position: absolute;
  bottom: 24px;
  right: 24px;
  font-size: 12px;
  color: var(--text-ghost);
  transition: color var(--t-fast);
}

.guide-skip:hover {
  color: var(--text-muted);
}

/* 动画 */
.step-slide-enter-active,
.step-slide-leave-active {
  transition: all 0.3s ease;
}

.step-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.step-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.guide-fade-leave-active {
  transition: opacity 0.3s ease;
}

.guide-fade-leave-to {
  opacity: 0;
}
</style>

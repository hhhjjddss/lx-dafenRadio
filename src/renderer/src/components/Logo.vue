<template>
  <div class="logo" :class="{ animated: animated }">
    <svg :width="size" :height="size" viewBox="0 0 100 100">
      <!-- 背景圆 -->
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#logoGradient)" stroke-width="1.5" opacity="0.3"/>

      <!-- 外层轨道 -->
      <ellipse cx="50" cy="50" rx="42" ry="20" fill="none" stroke="url(#logoGradient)" stroke-width="1.2" transform="rotate(-30 50 50)" class="orbit orbit-1"/>

      <!-- 中层轨道 -->
      <ellipse cx="50" cy="50" rx="35" ry="16" fill="none" stroke="url(#logoGradient)" stroke-width="1.2" transform="rotate(30 50 50)" class="orbit orbit-2"/>

      <!-- 内层轨道 -->
      <ellipse cx="50" cy="50" rx="28" ry="12" fill="none" stroke="url(#logoGradient)" stroke-width="1.2" transform="rotate(-60 50 50)" class="orbit orbit-3"/>

      <!-- 中心点 -->
      <circle cx="50" cy="50" r="4" fill="url(#logoGradient)"/>

      <!-- 轨道上的粒子 -->
      <circle cx="50" cy="50" r="2.5" fill="#d4a853" class="particle particle-1">
        <animateMotion dur="3s" repeatCount="indefinite">
          <mpath href="#orbit1Path"/>
        </animateMotion>
      </circle>

      <circle cx="50" cy="50" r="2" fill="#f0c864" class="particle particle-2">
        <animateMotion dur="4s" repeatCount="indefinite">
          <mpath href="#orbit2Path"/>
        </animateMotion>
      </circle>

      <circle cx="50" cy="50" r="1.5" fill="#ffdb99" class="particle particle-3">
        <animateMotion dur="2.5s" repeatCount="indefinite">
          <mpath href="#orbit3Path"/>
        </animateMotion>
      </circle>

      <!-- 定义路径 -->
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d4a853"/>
          <stop offset="50%" stop-color="#f0c864"/>
          <stop offset="100%" stop-color="#d4a853"/>
        </linearGradient>

        <ellipse id="orbit1Path" cx="50" cy="50" rx="42" ry="20" transform="rotate(-30 50 50)"/>
        <ellipse id="orbit2Path" cx="50" cy="50" rx="35" ry="16" transform="rotate(30 50 50)"/>
        <ellipse id="orbit3Path" cx="50" cy="50" rx="28" ry="12" transform="rotate(-60 50 50)"/>
      </defs>
    </svg>

    <!-- 文字 -->
    <div v-if="showText" class="logo-text">
      <span class="logo-name">DaFen</span>
      <span class="logo-sub">Radio</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  size?: number
  showText?: boolean
  animated?: boolean
}>()
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo svg {
  filter: drop-shadow(0 0 10px rgba(212, 168, 83, 0.3));
}

.orbit {
  opacity: 0.7;
}

.animated .orbit-1 {
  animation: rotateOrbit1 8s linear infinite;
  transform-origin: center;
}

.animated .orbit-2 {
  animation: rotateOrbit2 12s linear infinite;
  transform-origin: center;
}

.animated .orbit-3 {
  animation: rotateOrbit3 6s linear infinite;
  transform-origin: center;
}

@keyframes rotateOrbit1 {
  from { transform: rotate(-30deg); }
  to { transform: rotate(330deg); }
}

@keyframes rotateOrbit2 {
  from { transform: rotate(30deg); }
  to { transform: rotate(-330deg); }
}

@keyframes rotateOrbit3 {
  from { transform: rotate(-60deg); }
  to { transform: rotate(300deg); }
}

.particle {
  filter: drop-shadow(0 0 4px currentColor);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.logo-name {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  font-style: italic;
  color: var(--amber);
  letter-spacing: 1px;
}

.logo-sub {
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 4px;
  text-transform: uppercase;
}
</style>

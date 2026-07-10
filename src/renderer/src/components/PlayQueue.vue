<template>
  <div class="play-queue">
    <div class="queue-header">
      <div class="queue-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
        </svg>
        <span>播放队列</span>
        <span class="queue-count">{{ queue.length }}</span>
      </div>
      <button v-if="queue.length" class="queue-clear" @click="$emit('clear')">清空</button>
    </div>

    <div class="queue-scroll">
      <template v-if="queue.length > 0">
        <div
          v-for="(item, index) in queue"
          :key="item.songmid + '-' + index"
          class="queue-item"
          :class="{ active: index === queueIndex }"
          @dblclick="$emit('play-index', index)"
        >
          <span class="qi-idx">
            <template v-if="index === queueIndex">
              <span class="qi-eq"><span></span><span></span><span></span></span>
            </template>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <div class="qi-info">
            <span class="qi-name">{{ item.name }}</span>
            <span class="qi-singer">{{ item.singer }}</span>
          </div>
          <button class="qi-remove" @click.stop="$emit('remove', item.songmid)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </template>
      <div v-else class="queue-empty">
        <p>暂无播放歌曲</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MusicInfo } from '../composables/useSource'

defineProps<{
  queue: MusicInfo[]
  queueIndex: number
}>()

defineEmits<{
  playIndex: [index: number]
  remove: [songmid: string]
  clear: []
}>()
</script>

<style scoped>
.play-queue {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px 10px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.06);
}

.queue-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  letter-spacing: 1.5px;
  color: var(--text-ghost);
}

.queue-count {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-ghost);
}

.queue-clear {
  font-size: 10px;
  color: var(--text-ghost);
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--t-fast);
}
.queue-clear:hover {
  color: var(--ruby);
  background: rgba(200, 90, 90, 0.08);
}

.queue-scroll {
  flex: 1;
  overflow-y: auto;
  position: relative;
  z-index: 1;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all var(--t-fast);
  border-left: 3px solid transparent;
  border-radius: 12px;
}
.queue-item:hover { background: rgba(255, 255, 255, 0.05); }
.queue-item.active {
  background: rgba(212, 168, 83, 0.1);
  border-left-color: var(--amber);
}
.queue-item.active .qi-name { color: var(--amber); }

.qi-idx {
  width: 20px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-ghost);
  flex-shrink: 0;
}

.qi-eq {
  display: inline-flex;
  gap: 1.5px;
  align-items: flex-end;
  height: 10px;
}
.qi-eq span {
  width: 2px;
  background: var(--amber);
  border-radius: 1px;
  animation: eqBar 0.7s ease-in-out infinite;
}
.qi-eq span:nth-child(1) { height: 5px; animation-delay: 0s; }
.qi-eq span:nth-child(2) { height: 10px; animation-delay: 0.12s; }
.qi-eq span:nth-child(3) { height: 3px; animation-delay: 0.24s; }
@keyframes eqBar { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }

.qi-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.qi-name {
  font-size: 13px;
  color: var(--text-cream);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qi-singer {
  font-size: 10px;
  color: var(--text-ghost);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qi-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--text-ghost);
  opacity: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  transition: all var(--t-fast);
}
.queue-item:hover .qi-remove { opacity: 0.7; }
.qi-remove:hover { opacity: 1 !important; color: var(--ruby); background: rgba(200, 90, 90, 0.12); border-color: rgba(200, 90, 90, 0.2); }

.queue-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.queue-empty p {
  font-size: 12px;
  color: var(--text-ghost);
  font-style: italic;
}
</style>

export interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  currentTrack: any | null
}

export class PlayerManager {
  private state: PlayerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    currentTrack: null
  }

  getState(): PlayerState {
    return { ...this.state }
  }

  updateState(updates: Partial<PlayerState>): void {
    this.state = { ...this.state, ...updates }
  }

  setCurrentTrack(track: any): void {
    this.state.currentTrack = track
    this.state.isPlaying = false
    this.state.currentTime = 0
  }

  setPlaying(playing: boolean): void {
    this.state.isPlaying = playing
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume))
  }
}

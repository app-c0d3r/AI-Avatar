import moonImg from '../../wallpaper/moon.jpg'
import nasaImg from '../../wallpaper/nasa.jpg'
import hackerVid from '../../live-wallpaper/hacker_bg.mp4'
import networkVid from '../../live-wallpaper/network_bg.mp4'

export const DEFAULT_WALLPAPERS = [
  { id: 'moon', src: moonImg, label: 'Moon' },
  { id: 'nasa', src: nasaImg, label: 'NASA' },
]

export const LIVE_WALLPAPERS = [
  { id: 'matrix', src: hackerVid, label: 'Matrix Rain' },
  { id: 'neon', src: networkVid, label: 'Neon Pulse' },
]

import { useEffect } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectOption } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DEFAULT_WALLPAPERS, LIVE_WALLPAPERS } from '@/lib/wallpapers'

export default function AppearanceSettings() {
  const [theme, setTheme] = useLocalStorage('mapa-theme', 'system')
  const [bgMode, setBgMode] = useLocalStorage('mapa-bgMode', 'static')
  const [uploadedWallpapers, setUploadedWallpapers] = useLocalStorage('mapa-wallpapers', [])
  const [activeWallpaper, setActiveWallpaper] = useLocalStorage('mapa-activeWallpaper', 'moon')
  const [activeLiveWallpaper, setActiveLiveWallpaper] = useLocalStorage('mapa-activeLiveWallpaper', '')

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [theme])

  const allStaticWallpapers = [...DEFAULT_WALLPAPERS, ...uploadedWallpapers]

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const newWallpaper = {
        id: `upload-${Date.now()}`,
        src: event.target.result,
        label: file.name.replace(/\.[^.]+$/, ''),
      }
      setUploadedWallpapers((prev) => [...prev, newWallpaper])
      setActiveWallpaper(newWallpaper.id)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance & Customization</CardTitle>
        <CardDescription>Theme, background, and visual style</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Theme Switcher */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <SelectOption value="system">System</SelectOption>
            <SelectOption value="light">Light</SelectOption>
            <SelectOption value="dark">Dark</SelectOption>
          </Select>
        </div>

        {/* Background Mode Toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Background Mode</label>
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setBgMode('static')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                bgMode === 'static'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              Static Wallpaper
            </button>
            <button
              onClick={() => setBgMode('live')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                bgMode === 'live'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              Live Wallpaper
            </button>
          </div>
        </div>

        {/* Static Gallery */}
        {bgMode === 'static' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Wallpaper Gallery</label>
              <label className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 h-9 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                Upload Wallpaper
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allStaticWallpapers.map((wp) => (
                <button
                  key={wp.id}
                  onClick={() => setActiveWallpaper(wp.id)}
                  className={cn(
                    'relative aspect-video rounded-md overflow-hidden border-2 transition-all',
                    activeWallpaper === wp.id
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-transparent hover:border-muted-foreground/40'
                  )}
                >
                  <img src={wp.src} alt={wp.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 truncate text-left">
                    {wp.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Gallery */}
        {bgMode === 'live' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Live Wallpaper Gallery</label>
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                Remotion Studio integration coming soon
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LIVE_WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  onClick={() => setActiveLiveWallpaper(wp.id)}
                  className={cn(
                    'relative aspect-video rounded-md overflow-hidden border-2 transition-all bg-black',
                    activeLiveWallpaper === wp.id
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-transparent hover:border-muted-foreground/40'
                  )}
                >
                  <video
                    src={wp.src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-70"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 truncate text-left">
                    {wp.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

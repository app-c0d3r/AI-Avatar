import { useState } from 'react'
import { AvatarProvider } from '@/context/AvatarContext'
import { ChatProvider } from '@/context/ChatContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DEFAULT_WALLPAPERS, LIVE_WALLPAPERS } from '@/lib/wallpapers'
import ChatInterface from '@/components/views/ChatInterface'
import AvatarStudio from '@/components/views/AvatarStudio'
import UserProfile from '@/components/views/UserProfile'
import SettingsBoard from '@/components/views/SettingsBoard'

function LayoutContent() {
  const [activeTab, setActiveTab] = useState('chat')
  const [bgMode] = useLocalStorage('mapa-bgMode', 'static')
  const [activeWallpaper] = useLocalStorage('mapa-activeWallpaper', 'moon')
  const [activeLiveWallpaper] = useLocalStorage('mapa-activeLiveWallpaper', '')
  const [uploadedWallpapers] = useLocalStorage('mapa-wallpapers', [])

  const allStaticWallpapers = [...DEFAULT_WALLPAPERS, ...uploadedWallpapers]
  const activeSrc = allStaticWallpapers.find((wp) => wp.id === activeWallpaper)?.src
  const activeLiveSrc = LIVE_WALLPAPERS.find((wp) => wp.id === activeLiveWallpaper)?.src

  const bgStyle =
    bgMode === 'static' && activeSrc
      ? { backgroundImage: `url(${activeSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : {}

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative" style={bgStyle}>

      {/* Live wallpaper video layer */}
      {bgMode === 'live' && activeLiveSrc && (
        <video
          key={activeLiveSrc}
          autoPlay
          loop
          muted
          playsInline
          src={activeLiveSrc}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Main Content Column */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Tab Navigation */}
        <div className="border-b bg-muted/30">
          <div className="flex gap-2 p-2">
            {['chat', 'studio', 'profile', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'studio' && <AvatarStudio />}
          {activeTab === 'profile' && <UserProfile />}
          {activeTab === 'settings' && <SettingsBoard />}
        </div>
      </main>
    </div>
  )
}

export default function MainLayout() {
  return (
    <AvatarProvider>
      <ChatProvider>
        <LayoutContent />
      </ChatProvider>
    </AvatarProvider>
  )
}

import { useState } from 'react'
import { AvatarProvider } from '@/context/AvatarContext'
import { ChatProvider } from '@/context/ChatContext'
import ChatInterface from '@/components/views/ChatInterface'
import AvatarStudio from '@/components/views/AvatarStudio'
import UserProfile from '@/components/views/UserProfile'
import SettingsBoard from '@/components/views/SettingsBoard'

function LayoutContent() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Main Content Column */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b bg-muted/30">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'chat'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
                }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'studio'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
                }`}
            >
              Studio
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
                }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
                }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Content Area - Conditional Rendering */}
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

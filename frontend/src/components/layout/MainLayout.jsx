import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AvatarProvider } from '@/context/AvatarContext'
import ChatInterface from '@/components/views/ChatInterface'
import AvatarStudio from '@/components/views/AvatarStudio'
import UserProfile from '@/components/views/UserProfile'
import SettingsBoard from '@/components/views/SettingsBoard'

const TABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'studio', label: 'Studio' },
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
]

function LayoutContent() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Placeholder only (no navigation) */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
        <div className="p-4">
          <h2 className="font-semibold text-lg">AI Avatar</h2>
          <p className="text-sm text-muted-foreground">Your Avatar</p>
        </div>
        <div className="flex-1 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Chat History
          </p>
          <p className="text-sm text-muted-foreground">
            Placeholder for future chat history sidebar
          </p>
        </div>
      </aside>

      {/* Right Column - Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Tab Navigation */}
        <header className="border-b bg-muted/30">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none h-14 bg-transparent p-2">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-background rounded-md"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Content Area - Inside Tabs for proper conditional rendering */}
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="chat" className="mt-0 h-full">
                <ChatInterface />
              </TabsContent>
              <TabsContent value="studio" className="mt-0 h-full">
                <AvatarStudio />
              </TabsContent>
              <TabsContent value="profile" className="mt-0 h-full">
                <UserProfile />
              </TabsContent>
              <TabsContent value="settings" className="mt-0 h-full">
                <SettingsBoard />
              </TabsContent>
            </div>
          </Tabs>
        </header>
      </div>
    </div>
  )
}

export default function MainLayout() {
  return (
    <AvatarProvider>
      <LayoutContent />
    </AvatarProvider>
  )
}

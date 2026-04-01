import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AvatarProvider } from '@/context/AvatarContext'
import ChatInterface from '@/components/views/ChatInterface'
import AvatarStudio from '@/components/views/AvatarStudio'
import UserProfile from '@/components/views/UserProfile'
import SettingsBoard from '@/components/views/SettingsBoard'

function LayoutContent() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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

      {/* Main Content Column */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="border-b p-2">
            <TabsList className="w-full justify-start rounded-none h-14 bg-transparent p-2">
              <TabsTrigger value="chat" className="data-[state=active]:bg-background rounded-md">
                Chat
              </TabsTrigger>
              <TabsTrigger value="studio" className="data-[state=active]:bg-background rounded-md">
                Studio
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-background rounded-md">
                Profile
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-background rounded-md">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content Area - Inner scrolling */}
          <div className="flex-1 overflow-hidden relative">
            <TabsContent value="chat" className="h-full m-0 data-[state=active]:flex flex-col">
              <ChatInterface />
            </TabsContent>
            <TabsContent value="studio" className="h-full m-0 overflow-y-auto">
              <AvatarStudio />
            </TabsContent>
            <TabsContent value="profile" className="h-full m-0 overflow-y-auto">
              <UserProfile />
            </TabsContent>
            <TabsContent value="settings" className="h-full m-0 overflow-y-auto">
              <SettingsBoard />
            </TabsContent>
          </div>
        </Tabs>
      </main>
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

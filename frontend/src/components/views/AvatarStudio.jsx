import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AvatarStudio() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Avatar Studio</h2>
        
        {/* Three.js Canvas Placeholder */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3D Avatar View</CardTitle>
            <CardDescription>
              Interactive avatar preview and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed">
              <div className="text-center text-muted-foreground">
                <div className="text-6xl mb-4">🎭</div>
                <p>Three.js canvas will render here</p>
                <p className="text-sm">Avatar visualization coming in Phase 04</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Configuration Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar Settings</CardTitle>
            <CardDescription>
              Customize appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">Model</p>
                <p className="text-sm text-muted-foreground">Not configured</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">Style</p>
                <p className="text-sm text-muted-foreground">Default</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

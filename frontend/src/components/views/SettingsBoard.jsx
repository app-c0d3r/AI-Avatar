import { useAvatar } from '@/context/AvatarContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SettingsBoard() {
  const { avatarDisplayMode, toggleAvatarMode } = useAvatar()
  const [llmProvider, setLlmProvider] = useLocalStorage('mapa-llmProvider', 'openrouter')
  const [modelName, setModelName] = useLocalStorage('mapa-modelName', 'meta-llama/llama-3-8b-instruct:free')
  const [apiKey, setApiKey] = useLocalStorage('mapa-apiKey', '')

  return (
    <div className="h-full p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">Settings</h2>

        {/* LLM Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Configuration</CardTitle>
            <CardDescription>
              Configure AI model and provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <div className="flex gap-2">
                <Button
                  variant={llmProvider === 'openrouter' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setLlmProvider('openrouter')}
                >
                  OpenRouter
                </Button>
                <Button
                  variant={llmProvider === 'ollama' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setLlmProvider('ollama')}
                >
                  Ollama (Local)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                placeholder="e.g., meta-llama/llama-3-8b-instruct:free"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key (optional)</label>
              <Input
                type="password"
                placeholder="sk-... (uses backend .env if empty)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Voice & Audio */}
        <Card>
          <CardHeader>
            <CardTitle>Voice & Audio</CardTitle>
            <CardDescription>
              Speech-to-text and text-to-speech settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">STT Language</label>
              <Input placeholder="e.g., en-US, de-DE" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">TTS Voice</label>
              <Input placeholder="Select voice..." />
            </div>
            <p className="text-xs text-muted-foreground">
              Voice features coming in Phase 05
            </p>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle>App Settings</CardTitle>
            <CardDescription>
              Application preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Avatar Display Mode</p>
                <p className="text-sm text-muted-foreground">
                  Current: <span className="font-medium">{avatarDisplayMode}</span>
                </p>
              </div>
              <Button onClick={toggleAvatarMode} variant="outline">
                Switch to {avatarDisplayMode === 'floating' ? 'Studio Only' : 'Floating'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

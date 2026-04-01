import { useAvatar } from '@/context/AvatarContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PROVIDER_DEFAULTS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3-8b-instruct:free'
  },
  ollama: {
    baseUrl: 'http://host.docker.internal:11434/v1',
    model: 'llama3'
  }
}

export default function SettingsBoard() {
  const { avatarDisplayMode, toggleAvatarMode } = useAvatar()
  const [llmProvider, setLlmProvider] = useLocalStorage('mapa-llmProvider', 'openrouter')
  const [modelName, setModelName] = useLocalStorage('mapa-modelName', PROVIDER_DEFAULTS.openrouter.model)
  const [apiKey, setApiKey] = useLocalStorage('mapa-apiKey', '')
  const [baseUrl, setBaseUrl] = useLocalStorage('mapa-baseUrl', PROVIDER_DEFAULTS.openrouter.baseUrl)

  const handleProviderChange = (provider) => {
    setLlmProvider(provider)
    setModelName(PROVIDER_DEFAULTS[provider].model)
    setBaseUrl(PROVIDER_DEFAULTS[provider].baseUrl)
  }

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
                  onClick={() => handleProviderChange('openrouter')}
                >
                  OpenRouter
                </Button>
                <Button
                  variant={llmProvider === 'ollama' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleProviderChange('ollama')}
                >
                  Ollama (Local)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Base URL</label>
              <Input
                placeholder="https://openrouter.ai/api/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave as default for selected provider. Required for Ollama.
              </p>
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
            <CardTitle>Studio</CardTitle>
            <CardDescription>
              Avatar Studio settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Avatar configuration coming in Phase 04
              </p>
            </div>
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

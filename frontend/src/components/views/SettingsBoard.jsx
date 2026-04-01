import { useEffect } from 'react'
import { useAvatar } from '@/context/AvatarContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Gemini' },
]

const PROVIDER_DEFAULTS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    models: []
  },
  ollama: {
    baseUrl: 'http://host.docker.internal:11434',
    models: [
      { value: 'llama3.2:latest', label: 'Llama 3.2 (Latest)' },
      { value: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder (7B)' },
      { value: 'phi3.5:latest', label: 'Phi 3.5 (Latest)' },
      { value: 'gemma3:12b', label: 'Gemma 3 (12B)' },
      { value: 'glm-5:cloud', label: 'GLM-5 (Cloud)' },
      { value: 'llama3.1:8b', label: 'Llama 3.1 (8B)' },
    ]
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    ]
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku' },
    ]
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ]
  },
}

export default function SettingsBoard() {
  const { avatarDisplayMode, toggleAvatarMode } = useAvatar()
  const [llmProvider, setLlmProvider] = useLocalStorage('mapa-llmProvider', 'openrouter')
  const [modelName, setModelName] = useLocalStorage('mapa-modelName', '')
  const [apiKey, setApiKey] = useLocalStorage('mapa-apiKey', '')
  const [baseUrl, setBaseUrl] = useLocalStorage('mapa-baseUrl', PROVIDER_DEFAULTS.openrouter.baseUrl)

  // Reset model name when provider changes
  useEffect(() => {
    setModelName('')
    setBaseUrl(PROVIDER_DEFAULTS[llmProvider].baseUrl)
  }, [llmProvider, setModelName, setBaseUrl])

  const showApiKey = llmProvider !== 'ollama'
  const showBaseUrl = llmProvider === 'ollama'
  const showModelSelect = llmProvider !== 'openrouter'
  const modelOptions = PROVIDER_DEFAULTS[llmProvider].models || []

  return (
    <div className="h-full p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>

        {/* LLM Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Configuration</CardTitle>
            <CardDescription>
              Configure AI model and provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
              >
                {PROVIDERS.map((provider) => (
                  <SelectOption key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectOption>
                ))}
              </Select>
            </div>

            {/* API Key - Hidden for Ollama */}
            {showApiKey && (
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  placeholder="sk-... (uses backend .env if empty)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                  data-1p-ignore="true"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the API key from backend .env file.
                </p>
              </div>
            )}

            {/* Base URL - Only for Ollama */}
            {showBaseUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Base URL</label>
                <Input
                  placeholder="http://host.docker.internal:11434"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL of your local Ollama instance.
                </p>
              </div>
            )}

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              {showModelSelect ? (
                <Select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                >
                  <SelectOption value="">Select a model...</SelectOption>
                  {modelOptions.map((model) => (
                    <SelectOption key={model.value} value={model.value}>
                      {model.label}
                    </SelectOption>
                  ))}
                </Select>
              ) : (
                <Input
                  placeholder="e.g., google/gemma-7b-it:free"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {llmProvider === 'openrouter'
                  ? 'Enter the full model path (e.g., google/gemma-7b-it:free). Leave empty for default.'
                  : 'Select a model from the list.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

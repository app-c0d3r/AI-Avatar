import { useState, useRef } from 'react'
import { useAvatar } from '@/context/AvatarContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ChatInterface() {
  const { avatarDisplayMode } = useAvatar()
  const [userName] = useLocalStorage('mapa-userName', '')
  const [llmProvider] = useLocalStorage('mapa-llmProvider', 'openrouter')
  const [apiKey] = useLocalStorage('mapa-apiKey', '')
  const [baseUrl] = useLocalStorage('mapa-baseUrl', '')
  const [modelName] = useLocalStorage('mapa-modelName', 'meta-llama/llama-3-8b-instruct:free')

  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello, I am your AI Avatar. How can I help you?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]

    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: { userName },
          settings: {
            llmProvider,
            apiKey,
            baseUrl,
            modelName
          }
        })
      })

      if (!response.ok) throw new Error('Backend unavailable')

      // Stream the response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                setMessages(prev => {
                  const last = prev[prev.length - 1]
                  return [...prev.slice(0, -1), {
                    ...last,
                    content: last.content + parsed.content
                  }]
                })
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: 'Sorry, I could not connect to the backend. Please ensure the server is running.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Floating Avatar Overlay (only in floating mode) */}
      {avatarDisplayMode === 'floating' && (
        <div className="absolute top-4 right-4 z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 border-2 border-primary shadow-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
        </div>
      )}

      {/* Message History - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
          >
            <Card className={`max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
              <CardContent className="p-3">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start mb-4">
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground">Avatar is typing...</p>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed Bottom */}
      <div className="p-4 border-t shrink-0">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Type your message..."
            className="flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

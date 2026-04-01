import { useState, useRef } from 'react'
import { useAvatar } from '@/context/AvatarContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ChatInterface() {
  const { avatarDisplayMode } = useAvatar()
  const [userName] = useLocalStorage('mapa-userName', '')
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
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: { userName }
        })
      })

      if (!response.ok) throw new Error('Backend unavailable')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      setMessages(prev => [...prev, {
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
    <div className="h-full flex flex-col relative">
      {/* Floating Avatar Overlay (only in floating mode) */}
      {avatarDisplayMode === 'floating' && (
        <div className="absolute top-4 right-4 z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 border-2 border-primary shadow-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
              <CardContent className="p-3">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground">Typing...</p>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-muted/30">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            className="flex-1 resize-none"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleSubmit} disabled={isLoading || !input.trim()} className="self-end">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

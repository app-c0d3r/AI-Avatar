import { useState, useRef, useEffect } from 'react'
import { useAvatar } from '@/context/AvatarContext'
import { useChat, createMessage } from '@/context/ChatContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function ChatHistorySidebar() {
  const { sessions, activeSessionId, createNewSession, deleteSession, setActiveSession } = useChat()

  const handleNewChat = () => {
    createNewSession()
  }

  const handleDelete = (e, sessionId) => {
    e.stopPropagation()
    deleteSession(sessionId)
  }

  return (
    <aside className="flex w-64 flex-col border-r bg-muted/30 shrink-0">
      {/* Header with New Chat button */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">AI Avatar</h2>
        <p className="text-sm text-muted-foreground mb-3">Your Avatar</p>
        <Button onClick={handleNewChat} className="w-full" size="sm">
          + New Chat
        </Button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-2">
          Chat History
        </p>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-4">
            No chat history yet. Click "New Chat" to start!
          </p>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`group flex items-center justify-between px-2 py-2 rounded-md text-sm cursor-pointer transition-colors ${activeSessionId === session.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                  }`}
              >
                <span className="flex-1 truncate">{session.title || 'Untitled Chat'}</span>
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  className={`ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${activeSessionId === session.id
                      ? 'hover:bg-primary-foreground text-primary-foreground'
                      : 'hover:bg-muted-foreground text-muted-foreground'
                    }`}
                  title="Delete chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export default function ChatInterface() {
  const { avatarDisplayMode } = useAvatar()
  const {
    activeSession,
    activeSessionId,
    createNewSession,
    updateSessionMessages
  } = useChat()

  const [userName] = useLocalStorage('mapa-userName', '')
  const [llmProvider] = useLocalStorage('mapa-llmProvider', 'openrouter')
  const [apiKey] = useLocalStorage('mapa-apiKey', '')
  const [baseUrl] = useLocalStorage('mapa-baseUrl', '')
  const [modelName] = useLocalStorage('mapa-modelName', '')

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Auto-create session if none exists
  useEffect(() => {
    if (!activeSessionId) {
      createNewSession()
    }
  }, [activeSessionId, createNewSession])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !activeSessionId) return

    const userMessage = createMessage('user', input.trim())
    const newMessages = [...(activeSession?.messages || []), userMessage]

    setInput('')
    setIsLoading(true)

    // Update session with user message (this will generate title if first message)
    updateSessionMessages(activeSessionId, newMessages, userMessage)

    // Add empty assistant message placeholder for streaming
    updateSessionMessages(activeSessionId, [...newMessages, createMessage('assistant', '')])

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
      let accumulatedContent = ''

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

              if (parsed.error) {
                updateSessionMessages(activeSessionId, [
                  ...newMessages,
                  createMessage('assistant', `Error: ${parsed.error}`)
                ])
                break
              }

              if (parsed.content) {
                accumulatedContent += parsed.content
                updateSessionMessages(activeSessionId, [
                  ...newMessages,
                  createMessage('assistant', accumulatedContent)
                ])
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      updateSessionMessages(activeSessionId, [
        ...newMessages,
        createMessage('assistant', 'Sorry, I could not connect to the backend. Please ensure the server is running.')
      ])
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

  // Show loading state if no active session
  if (!activeSessionId) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    )
  }

  const messages = activeSession?.messages || []

  return (
    <div className="flex flex-row h-full w-full">
      {/* Left Sidebar - Chat History */}
      <ChatHistorySidebar />

      {/* Right Column - Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
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
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">Welcome to AI Avatar!</p>
                <p className="text-sm">Start a conversation by typing a message below.</p>
              </div>
            </div>
          ) : (
            <>
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
            </>
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
    </div>
  )
}

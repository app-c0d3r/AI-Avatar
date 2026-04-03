import { useState, useRef, useEffect } from 'react'
import { Copy, Play, Volume2, VolumeX } from 'lucide-react'

import { useAvatar } from '@/context/AvatarContext'
import { useChat, createMessage } from '@/context/ChatContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import MiniAvatar from '@/components/chat/MiniAvatar'

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

  const [autoRead, setAutoRead] = useLocalStorage('mapa-autoRead', true)
  const [voiceProfile] = useLocalStorage('mapa-voiceProfile', 'female')
  const [userName] = useLocalStorage('mapa-userName', '')
  const [systemPrompt] = useLocalStorage('mapa-systemPrompt', 'You are a helpful, friendly AI assistant. Keep your answers concise.')
  const [llmProvider] = useLocalStorage('mapa-llmProvider', 'openrouter')
  const [apiKey] = useLocalStorage('mapa-apiKey', '')
  const [baseUrl] = useLocalStorage('mapa-baseUrl', '')
  const [modelName] = useLocalStorage('mapa-modelName', '')

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const currentAudioRef = useRef(null)

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

  const toggleMute = () => {
    const newState = !autoRead
    setAutoRead(newState)
    if (!newState && currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
  }

  const speakText = async (text, force = false) => {
    if (!force && !autoRead) return
    if (!text) return

    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    const detectedLang = /[äöüßÄÖÜ]/.test(text) ? 'de-DE' : 'en-US'

    try {
      const response = await fetch('http://localhost:8000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceProfile, language: detectedLang })
      })
      if (!response.ok) return
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio
      audio.play()
      window.dispatchEvent(new CustomEvent('vrm-audio-play', { detail: audio }))
    } catch {
      // TTS backend unavailable — fail silently
    }
  }

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text) }

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !activeSessionId) return

    const userMessage = createMessage('user', input.trim())
    const newMessages = [...(activeSession?.messages || []), userMessage]

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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
            modelName,
            systemPrompt: (systemPrompt || '') + '\n\nCRITICAL RULE: Automatically detect the language of the user\'s input and ALWAYS reply in that exact same language.'
          }
        })
      })

      if (!response.ok) throw new Error('Backend unavailable')

      // Stream the response
      const reader = response.body.getReader()
      const decoder = new TextDecoder(undefined, { stream: true })
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
                // Smart append: detect full-text vs delta mode per chunk
                if (accumulatedContent.length > 0 && parsed.content.startsWith(accumulatedContent)) {
                  accumulatedContent = parsed.content
                } else {
                  accumulatedContent += parsed.content
                }
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

      // Speak the full response exactly once after streaming finishes
      speakText(accumulatedContent)
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
      <div className="flex-1 flex flex-row h-full relative">

        {/* Left Column - Avatar */}
        <div className="shrink-0 p-6 flex flex-col items-center justify-start border-r border-border/20 bg-muted/5">
          <div className="rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <MiniAvatar />
          </div>
        </div>

        {/* Right Column - Messages + Input */}
        <div className="flex-1 flex flex-col h-full relative min-w-0">

          {/* Message History - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-2">Welcome to AI Avatar!</p>
                  <p className="text-sm">Start a conversation by typing a message below.</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) =>
                  msg.role === 'user' ? (
                    <div key={idx} className="flex justify-end mb-4">
                      <div className="flex flex-col items-end">
                        <Card className="max-w-full bg-primary text-primary-foreground">
                          <CardContent className="p-3">
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </CardContent>
                        </Card>
                        <div className="flex gap-3 mt-1 mr-1">
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={idx} className="flex items-start mb-6">
                      <div className="flex flex-col items-start max-w-[80%]">
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </CardContent>
                        </Card>
                        <div className="flex gap-3 mt-1 ml-1">
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => speakText(msg.content, true)}
                            disabled={!autoRead}
                            className={`transition-opacity ${!autoRead ? 'opacity-30 cursor-not-allowed' : 'opacity-60 hover:opacity-100 cursor-pointer'} text-muted-foreground`}
                            title="Play Audio"
                          >
                            <Play size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
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
            <div className="flex gap-2 items-end">
              <button
                onClick={toggleMute}
                className="shrink-0 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title={autoRead ? 'Mute auto-read' : 'Unmute auto-read'}
              >
                {autoRead ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <textarea
                ref={textareaRef}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto min-h-[40px] max-h-[150px]"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                onKeyDown={handleKeyDown}
              />
              <Button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
                Send
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

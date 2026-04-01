import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Types
export const createMessage = (role, content) => ({
  role,
  content,
  timestamp: Date.now()
})

export const createSession = (title = '') => ({
  id: `chat-${Date.now()}`,
  title,
  messages: [],
  updatedAt: Date.now()
})

// Initial state
const initialState = {
  sessions: [],
  activeSessionId: null
}

// Context
const ChatContext = createContext(null)

// Storage key
const STORAGE_KEY = 'ai-avatar-chat-sessions'

export function ChatProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          sessions: parsed.sessions || [],
          activeSessionId: parsed.activeSessionId || null
        }
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e)
    }
    return initialState
  })

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save chat sessions:', e)
    }
  }, [state])

  // Generate title from first message or date
  const generateTitle = useCallback((firstMessage) => {
    if (firstMessage && firstMessage.content) {
      const words = firstMessage.content.split(' ').slice(0, 5).join(' ')
      return words.length > 30 ? words.substring(0, 30) + '...' : words
    }
    return `Chat ${new Date().toLocaleDateString()}`
  }, [])

  // Create new session
  const createNewSession = useCallback(() => {
    const newSession = createSession()
    setState(prev => ({
      sessions: [newSession, ...prev.sessions],
      activeSessionId: newSession.id
    }))
    return newSession
  }, [])

  // Delete session
  const deleteSession = useCallback((sessionId) => {
    setState(prev => {
      const newSessions = prev.sessions.filter(s => s.id !== sessionId)
      const newActiveId = prev.activeSessionId === sessionId 
        ? (newSessions.length > 0 ? newSessions[0].id : null)
        : prev.activeSessionId
      return {
        sessions: newSessions,
        activeSessionId: newActiveId
      }
    })
  }, [])

  // Set active session
  const setActiveSession = useCallback((sessionId) => {
    setState(prev => ({
      ...prev,
      activeSessionId: sessionId
    }))
  }, [])

  // Update session messages
  const updateSessionMessages = useCallback((sessionId, messages, firstUserMessage) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(session => {
        if (session.id === sessionId) {
          let title = session.title
          // Generate title from first user message if no title exists
          if (!title && firstUserMessage) {
            title = generateTitle(firstUserMessage)
          }
          return {
            ...session,
            title,
            messages,
            updatedAt: Date.now()
          }
        }
        return session
      }).sort((a, b) => b.updatedAt - a.updatedAt) // Sort by newest first
    }))
  }, [generateTitle])

  // Get active session
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || null

  const value = {
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    activeSession,
    createNewSession,
    deleteSession,
    setActiveSession,
    updateSessionMessages
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}

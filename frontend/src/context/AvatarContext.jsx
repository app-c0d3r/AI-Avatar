import { createContext, useContext, useState, useEffect } from 'react'

const AvatarContext = createContext()

export function AvatarProvider({ children }) {
  const [avatarDisplayMode, setAvatarDisplayMode] = useState(() => {
    const saved = localStorage.getItem('avatarDisplayMode')
    return saved || 'floating'
  })

  useEffect(() => {
    localStorage.setItem('avatarDisplayMode', avatarDisplayMode)
  }, [avatarDisplayMode])

  const toggleAvatarMode = () => {
    setAvatarDisplayMode(prev => prev === 'floating' ? 'studio_only' : 'floating')
  }

  return (
    <AvatarContext.Provider value={{ avatarDisplayMode, toggleAvatarMode }}>
      {children}
    </AvatarContext.Provider>
  )
}

export function useAvatar() {
  const context = useContext(AvatarContext)
  if (!context) {
    throw new Error('useAvatar must be used within AvatarProvider')
  }
  return context
}

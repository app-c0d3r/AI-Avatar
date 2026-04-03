import { useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'

function applyTheme(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

function App() {
  useEffect(() => {
    const stored = localStorage.getItem('mapa-theme')
    applyTheme(stored ? JSON.parse(stored) : 'system')
  }, [])

  return <MainLayout />
}

export default App

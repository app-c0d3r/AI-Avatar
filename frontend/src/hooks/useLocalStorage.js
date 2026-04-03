import { useState, useEffect, useCallback } from 'react'

const STORAGE_EVENT = 'mapa-storage'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error('Error reading localStorage:', error)
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        window.dispatchEvent(
          new CustomEvent(STORAGE_EVENT, { detail: { key, value: valueToStore } })
        )
        return valueToStore
      })
    } catch (error) {
      console.error('Error setting localStorage:', error)
    }
  }, [key])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value)
      }
    }
    window.addEventListener(STORAGE_EVENT, handler)
    return () => window.removeEventListener(STORAGE_EVENT, handler)
  }, [key])

  return [storedValue, setValue]
}

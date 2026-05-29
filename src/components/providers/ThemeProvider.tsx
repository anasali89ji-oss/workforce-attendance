'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeCtxType {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeCtx = createContext<ThemeCtxType>({
  theme: 'system',
  toggle: () => {},
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeCtx)

function applyTheme(t: Theme) {
  const root = document.documentElement
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = t === 'dark' || (t === 'system' && systemDark)

  if (isDark) {
    root.setAttribute('data-theme', 'dark')
    root.classList.add('dark')
  } else {
    root.removeAttribute('data-theme')
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    const saved = (localStorage.getItem('wf_theme') as Theme) || 'system'
    setThemeState(saved)
    applyTheme(saved)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('wf_theme', t)
    applyTheme(t)
  }

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>
}

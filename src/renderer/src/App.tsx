import React, { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useFluxeraStore } from './store/useFluxeraStore'

export const App: React.FC = () => {
  const { initialize } = useFluxeraStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return <AppShell />
}

export default App

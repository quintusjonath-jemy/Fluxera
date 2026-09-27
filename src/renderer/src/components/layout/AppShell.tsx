import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useFluxeraStore } from '../../store/useFluxeraStore'
import { HomeView } from '../../views/HomeView'
import { DownloadsView } from '../../views/DownloadsView'
import { NetworksView } from '../../views/NetworksView'
import { LiveMonitorView } from '../../views/LiveMonitorView'
import { HistoryView } from '../../views/HistoryView'
import { SettingsView } from '../../views/SettingsView'
import { DiagnosticsView } from '../../views/DiagnosticsView'
import { AboutView } from '../../views/AboutView'
import { NewDownloadModal } from '../modals/NewDownloadModal'
import { EditInterfaceModal } from '../modals/EditInterfaceModal'
import { DownloadDetailModal } from '../modals/DownloadDetailModal'
import { Toast } from '../common/Toast'

export const AppShell: React.FC = () => {
  const { currentTab } = useFluxeraStore()

  const renderView = () => {
    switch (currentTab) {
      case 'home':
        return <HomeView />
      case 'downloads':
        return <DownloadsView />
      case 'networks':
        return <NetworksView />
      case 'monitor':
        return <LiveMonitorView />
      case 'history':
        return <HistoryView />
      case 'settings':
        return <SettingsView />
      case 'diagnostics':
        return <DiagnosticsView />
      case 'about':
        return <AboutView />
      default:
        return <HomeView />
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0D0E] text-[#F5F7F7]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden flex flex-col bg-[#0B0D0E]">
          {renderView()}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <NewDownloadModal />
      <EditInterfaceModal />
      <DownloadDetailModal />
      <Toast />
    </div>
  )
}

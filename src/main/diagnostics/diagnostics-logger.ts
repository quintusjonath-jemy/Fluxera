import os from 'os'
import { app } from 'electron'
import { DiagnosticLogEntry, DiagnosticsInfo, NetworkInterfaceInfo } from '../../shared/types'

export class DiagnosticsLogger {
  private logs: DiagnosticLogEntry[] = []
  private maxLogs = 500

  constructor() {
    this.log('info', 'System', 'Diagnostics logger initialized')
  }

  public log(
    level: 'info' | 'warn' | 'error' | 'debug',
    category: string,
    message: string,
    details?: Record<string, unknown>
  ): void {
    const entry: DiagnosticLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      details
    }

    this.logs.unshift(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.pop()
    }
  }

  public getLogs(): DiagnosticLogEntry[] {
    return [...this.logs]
  }

  public clearLogs(): void {
    this.logs = []
  }

  public getDiagnosticsInfo(
    detectedInterfaces: NetworkInterfaceInfo[],
    activeDownloadsCount: number,
    totalCompletedCount: number
  ): DiagnosticsInfo {
    return {
      appVersion: app.getVersion() || '1.0.0',
      electronVersion: process.versions.electron || 'unknown',
      nodeVersion: process.versions.node || process.version,
      platform: `${os.platform()} ${os.release()}`,
      arch: os.arch(),
      detectedInterfaces,
      activeDownloadsCount,
      totalCompletedCount,
      logs: this.getLogs()
    }
  }
}

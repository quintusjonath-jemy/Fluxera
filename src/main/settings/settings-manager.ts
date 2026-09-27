import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { AppSettings } from '../../shared/types'

export class SettingsManager {
  private filePath: string
  private settings: AppSettings

  constructor() {
    let defaultDownloadDir: string
    try {
      defaultDownloadDir = app.getPath('downloads')
    } catch {
      defaultDownloadDir = path.join(process.cwd(), 'downloads')
    }

    this.settings = {
      defaultDownloadDir,
      defaultConnectionMode: 'Auto',
      chunkSize: 8 * 1024 * 1024,
      maxConnectionsPerInterface: 16,
      retryLimit: 5,
      stallTimeout: 20,
      notificationsEnabled: true,
      theme: 'dark',
      interfaceCustomizations: {}
    }

    try {
      this.filePath = path.join(app.getPath('userData'), 'settings.json')
    } catch {
      this.filePath = path.join(process.cwd(), '.fluxera_settings.json')
    }
  }

  public async initialize(): Promise<AppSettings> {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = await fs.promises.readFile(this.filePath, 'utf-8')
        const loaded = JSON.parse(data)
        this.settings = { ...this.settings, ...loaded }
      } else {
        await this.save(this.settings)
      }
    } catch (err) {
      console.warn('[SettingsManager] Failed to load settings, using defaults:', err)
    }
    return this.settings
  }

  public getSettings(): AppSettings {
    return this.settings
  }

  public async save(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...newSettings }
    try {
      const parentDir = path.dirname(this.filePath)
      await fs.promises.mkdir(parentDir, { recursive: true })
      await fs.promises.writeFile(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (err) {
      console.warn('[SettingsManager] Failed to save settings to disk:', err)
    }
    return this.settings
  }
}

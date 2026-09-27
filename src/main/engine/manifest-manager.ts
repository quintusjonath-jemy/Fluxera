import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { DownloadItem } from '../../shared/types'

export class ManifestManager {
  private baseDir: string

  constructor(customDir?: string) {
    if (customDir) {
      this.baseDir = customDir
    } else {
      try {
        this.baseDir = path.join(app.getPath('userData'), 'manifests')
      } catch {
        this.baseDir = path.join(process.cwd(), '.fluxera_manifests')
      }
    }
  }

  public async initialize(): Promise<void> {
    await fs.promises.mkdir(this.baseDir, { recursive: true })
  }

  public async saveManifest(item: DownloadItem): Promise<void> {
    await this.initialize()
    const filePath = path.join(this.baseDir, `${item.id}.json`)
    // Serialize state cleanly (exclude transient activeStreams to keep disk write lightweight)
    const serialized = JSON.stringify(
      {
        ...item,
        activeStreams: []
      },
      null,
      2
    )
    await fs.promises.writeFile(filePath, serialized, 'utf-8')
  }

  public async loadAllManifests(): Promise<DownloadItem[]> {
    await this.initialize()
    const files = await fs.promises.readdir(this.baseDir)
    const items: DownloadItem[] = []

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const fullPath = path.join(this.baseDir, file)
        const content = await fs.promises.readFile(fullPath, 'utf-8')
        const item: DownloadItem = JSON.parse(content)

        // Relaunch recovery: Incomplete downloads become PAUSED or RECOVERED
        if (item.state === 'DOWNLOADING' || item.state === 'PROBING' || item.state === 'RESUMING' || item.state === 'VERIFYING') {
          item.state = 'RECOVERED'
          // Reset any pending chunk states
          item.chunks.forEach((chunk) => {
            if (chunk.state === 'DOWNLOADING' || chunk.state === 'RETRYING') {
              chunk.state = 'PENDING'
            }
          })
          item.activeStreams = []
        }

        items.push(item)
      } catch (err) {
        console.warn(`[ManifestManager] Failed to parse manifest file ${file}:`, err)
      }
    }

    // Sort by createdAt descending
    return items.sort((a, b) => b.createdAt - a.createdAt)
  }

  public async deleteManifest(downloadId: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, `${downloadId}.json`)
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
      }
    } catch (err) {
      console.warn(`[ManifestManager] Error deleting manifest ${downloadId}:`, err)
    }
  }
}

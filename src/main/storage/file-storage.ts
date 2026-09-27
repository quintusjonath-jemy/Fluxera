import fs from 'fs'
import path from 'path'
import { DiskSpaceInfo } from '../../shared/types'

export class FileStorageManager {
  private activeHandles: Map<string, fs.promises.FileHandle> = new Map()

  /**
   * Check available disk space on destination path
   */
  public async checkDiskSpace(destDir: string, requiredBytes: number): Promise<DiskSpaceInfo> {
    try {
      await fs.promises.mkdir(destDir, { recursive: true })
      // Use fs.promises.statfs if available (Node.js 18.15+)
      if (typeof fs.promises.statfs === 'function') {
        const stats = await fs.promises.statfs(destDir)
        const available = stats.bavail * stats.bsize
        const total = stats.blocks * stats.bsize
        return {
          available,
          total,
          required: requiredBytes,
          sufficient: available >= requiredBytes
        }
      }
    } catch (err) {
      console.warn('[FileStorageManager] statfs failed, assuming sufficient space:', err)
    }

    // Fallback if statfs unavailable
    return {
      available: Number.MAX_SAFE_INTEGER,
      total: Number.MAX_SAFE_INTEGER,
      required: requiredBytes,
      sufficient: true
    }
  }

  /**
   * Open or create the staging file (.plexo) for writing
   */
  public async prepareStagingFile(stagingPath: string, totalSize: number): Promise<fs.promises.FileHandle> {
    const parentDir = path.dirname(stagingPath)
    await fs.promises.mkdir(parentDir, { recursive: true })

    let handle: fs.promises.FileHandle

    if (fs.existsSync(stagingPath)) {
      handle = await fs.promises.open(stagingPath, 'r+')
    } else {
      handle = await fs.promises.open(stagingPath, 'w+')
      // Optionally truncate/preallocate if totalSize is known and positive
      if (totalSize > 0) {
        try {
          await handle.truncate(totalSize)
        } catch {
          // Truncation optional, can grow dynamically on write
        }
      }
    }

    this.activeHandles.set(stagingPath, handle)
    return handle
  }

  /**
   * Write chunk bytes directly to offset
   */
  public async writeAtOffset(
    stagingPath: string,
    buffer: Buffer,
    offset: number
  ): Promise<void> {
    let handle = this.activeHandles.get(stagingPath)
    if (!handle) {
      handle = await fs.promises.open(stagingPath, 'r+')
      this.activeHandles.set(stagingPath, handle)
    }

    await handle.write(buffer, 0, buffer.length, offset)
  }

  /**
   * Flush and close file handle
   */
  public async closeHandle(stagingPath: string): Promise<void> {
    const handle = this.activeHandles.get(stagingPath)
    if (handle) {
      try {
        await handle.sync()
        await handle.close()
      } catch (err) {
        console.warn(`[FileStorageManager] Error closing handle for ${stagingPath}:`, err)
      } finally {
        this.activeHandles.delete(stagingPath)
      }
    }
  }

  /**
   * Finalize download: sync file, close handle, check filename conflicts, rename .plexo to final destination
   */
  public async finalizeFile(stagingPath: string, targetPath: string): Promise<string> {
    await this.closeHandle(stagingPath)

    if (!fs.existsSync(stagingPath)) {
      throw new Error(`Staging file not found: ${stagingPath}`)
    }

    // Check conflict and generate numbered filename if needed
    const finalDest = this.getUniqueDestinationPath(targetPath)
    await fs.promises.rename(stagingPath, finalDest)
    return finalDest
  }

  private getUniqueDestinationPath(originalPath: string): string {
    if (!fs.existsSync(originalPath)) {
      return originalPath
    }

    const dir = path.dirname(originalPath)
    const ext = path.extname(originalPath)
    const baseName = path.basename(originalPath, ext)

    let counter = 1
    let candidate = path.join(dir, `${baseName} (${counter})${ext}`)
    while (fs.existsSync(candidate)) {
      counter++
      candidate = path.join(dir, `${baseName} (${counter})${ext}`)
    }

    return candidate
  }
}

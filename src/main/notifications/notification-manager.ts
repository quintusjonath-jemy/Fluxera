import { Notification } from 'electron'

export class NotificationManager {
  private enabled = true

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  public notifyDownloadComplete(fileName: string, fileSizeStr: string): void {
    if (!this.enabled || !Notification.isSupported()) return

    const notification = new Notification({
      title: 'Fluxera — Download Complete',
      body: `${fileName} (${fileSizeStr}) has completed successfully.`
    })
    notification.show()
  }

  public notifyDownloadFailed(fileName: string, errorReason: string): void {
    if (!this.enabled || !Notification.isSupported()) return

    const notification = new Notification({
      title: 'Fluxera — Download Failed',
      body: `${fileName} encountered an error: ${errorReason}`
    })
    notification.show()
  }

  public notifyGeneral(title: string, message: string): void {
    if (!this.enabled || !Notification.isSupported()) return

    const notification = new Notification({
      title: `Fluxera — ${title}`,
      body: message
    })
    notification.show()
  }
}

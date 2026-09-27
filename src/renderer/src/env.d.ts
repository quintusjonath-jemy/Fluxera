import { FluxeraAPI } from '../../preload/index'

declare global {
  interface Window {
    fluxera?: FluxeraAPI
  }
}

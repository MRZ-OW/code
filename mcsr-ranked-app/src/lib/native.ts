import { Capacitor } from '@capacitor/core'

/** Apply native-only chrome (status bar styling). No-op on the web build. */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark }) // dark theme = light icons
    await StatusBar.setBackgroundColor({ color: '#0b0f0d' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {
    /* plugin unavailable — ignore */
  }
}

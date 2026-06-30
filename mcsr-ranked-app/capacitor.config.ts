import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mcsr.explorer',
  appName: 'MCSR Ranked Explorer',
  webDir: 'dist',
  backgroundColor: '#0b0f0d',
  android: {
    backgroundColor: '#0b0f0d',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config

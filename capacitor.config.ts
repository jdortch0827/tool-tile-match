import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tooltilematch.game',
  appName: 'Tool Tile Match',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

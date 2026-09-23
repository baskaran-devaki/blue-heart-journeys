import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blueheartguys.journeys',
  appName: 'Blue Heart Guys',
  webDir: 'dist',
  server: {
    url: 'https://blue-heart-journeys.vercel.app/',
    cleartext: false
  }
};

export default config;

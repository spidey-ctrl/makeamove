import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.makeamove.app',
  appName: 'MakeAMove',
  webDir: 'dist',
  server: {
    url: 'https://makeamove-flame.vercel.app',
    cleartext: false,
    allowNavigation: ['accounts.google.com'],
  },
};

export default config;
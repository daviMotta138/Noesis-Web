import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noesis.app',
  appName: 'Noesis',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0d0f1c",
      showSpinner: true,
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;

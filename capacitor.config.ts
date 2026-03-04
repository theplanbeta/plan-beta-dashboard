import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.planbeta.app",
  appName: "Plan Beta",
  webDir: "out",
  server: {
    url: "https://theplanbeta.com",
    cleartext: false,
  },
  plugins: {
    Camera: {
      presentationStyle: "fullScreen",
    },
    Geolocation: {},
    PushNotifications: {},
    Share: {},
  },
}

export default config

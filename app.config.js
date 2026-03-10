export default {
  expo: {
    name: 'Diving Spots Map',
    slug: 'diving-spots-map',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.nicolasdiving.divingspots',
      buildNumber: '1',
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.nicolasdiving.divingspots',
      versionCode: 1,
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Diving Spots to access your location',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            kotlinVersion: '1.9.25',
          },
        },
      ],
    ],
    scheme: 'divingspots',
    userInterfaceStyle: 'light',
    platforms: ['ios', 'android', 'web'],
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/update',
      enabled: false,
      fallbackToCacheTimeout: 0,
    },
    extra: {
      eas: {
        projectId: 'cbd0bc91-5bf0-4448-a086-d0979a9f7564',
      },
    },
  },
};

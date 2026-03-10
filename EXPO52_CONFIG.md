# 🚀 Configuration Expo 52 - Compatibilité Android & iOS

## ⚠️ IMPORTANT: Expo 52 (Pas Expo 54!)

Ce projet est configuré pour **Expo 52** car:
- ✅ Toutes les librairies fonctionnent bien sur iOS et Android
- ✅ Stabilité éprouvée
- ✅ Pas de problèmes avec new architecture
- ❌ Expo 54 = new architecture = problèmes de compatibilité

## 📋 Configuration Minimale

### package.json
```json
{
  "expo": "~52.0.0",
  "react": "18.2.0",
  "react-native": "0.75.4",
  "react-native-maps": "1.10.1",
  "react-native-map-clustering": "^3.4.2"
}
```

### Dépendances Testées & Stables
- ✅ expo ~52.0.0
- ✅ react-native-maps 1.10.1 (compatible iOS + Android)
- ✅ react-native-map-clustering ^3.4.2
- ✅ geolib ^3.3.1
- ✅ expo-location ~17.0.1
- ✅ All @react-navigation packages v6

## 🔧 Installation

```bash
# Installer les dépendances
npm install

# Ou avec yarn
yarn install

# Démarrer le serveur Expo
npm start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📱 Développement

### Mode Expo Go
```bash
npm start
# Scanner le QR code avec l'app Expo Go
```

### Prévisualisation Web
```bash
npm run web
```

## 🚧 Limitations Connues (Expo 52)

- Pas de New Architecture (intentionnel)
- Pas de Hermes engine activé
- Maps fonctionnent bien sur iOS et Android

## ✅ À ÉVITER (Expo 54)

❌ **NE PAS METTRE À JOUR** à Expo 54 car:
- React Native new architecture = problèmes de libs
- react-native-maps ne fonctionne pas bien
- react-native-map-clustering = crashes
- Beaucoup d'autres libs cassées

## 🎯 Test de Compatibilité

Pour vérifier que tout fonctionne:

```bash
# Vérifier la version Expo
npm start

# Vérifier react-native-maps charge bien
npm list react-native-maps

# Vérifier react-native-map-clustering
npm list react-native-map-clustering
```

## 📦 Build Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

### Localement (expo-prebuild)
```bash
# iOS
npx expo prebuild --clean --platform ios
npx expo run:ios

# Android
npx expo prebuild --clean --platform android
npx expo run:android
```

## 🔐 Permissions (iOS + Android)

### iOS (app.json)
```json
{
  "ios": {
    "config": {
      "usesNonExemptEncryption": false
    }
  }
}
```

### Android (app.json)
```json
{
  "android": {
    "permissions": [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "INTERNET",
      "ACCESS_NETWORK_STATE"
    ]
  }
}
```

## 🐛 Troubleshooting

### Maps ne s'affiche pas sur iOS?
```bash
# Nettoyer le cache Expo
npm start -c

# Ou
expo start --clear
```

### Maps crashe sur Android?
```bash
# Vérifier que react-native-maps 1.10.1 est installé
npm list react-native-maps

# Sinon réinstaller
npm install react-native-maps@1.10.1
```

### Clustering ne fonctionne pas?
```bash
# Vérifier react-native-map-clustering
npm list react-native-map-clustering

# Compatibilité OK avec:
# react-native-map-clustering: ^3.4.2
# react-native-maps: 1.10.1
```

## 📚 Ressources

- [Expo 52 Documentation](https://docs.expo.dev/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [React Native Map Clustering](https://github.com/lfkwtz/react-native-map-clustering)

## ✅ Vérification Final

Avant de déployer:
```bash
# 1. Vérifier la version Expo
grep -A 1 '"expo"' package.json

# 2. Vérifier les libs critiques
npm list react-native-maps react-native-map-clustering

# 3. Tester sur device/emulator
npm start
# Puis scanner QR ou npm run ios/android

# 4. Vérifier les permissions
cat app.json | grep -A 10 "ios\|android"
```

---

**Maintenu pour**: Expo 52  
**Stable sur**: iOS + Android  
**Évite**: Expo 54 New Architecture  
**Date**: Février 2026

# 🚀 Setup Complet - Diving Spots Map (Expo 52)

## ✅ Prérequis

- **Node.js** >= 16 (vérifier: `node -v`)
- **npm** >= 8 (vérifier: `npm -v`)
- **Expo CLI**: `npm install -g expo-cli`
- **iOS**: Xcode 15+ (pour simulateur iOS)
- **Android**: Android Studio + Android SDK 30+ (pour émulateur)

## 📥 Installation Étape par Étape

### 1️⃣ Cloner/Ouvrir le Projet

```bash
cd /Users/nicolas/Documents/app_ios/diving_spots_map
```

### 2️⃣ Installer les Dépendances

```bash
# Nettoyer si nécessaire (première fois)
rm -rf node_modules package-lock.json

# Installer les dépendances
npm install

# Vérifier les versions
npm list expo react-native-maps react-native-map-clustering
```

### 3️⃣ Démarrer le Serveur Expo

```bash
npm start
```

Vous verrez:
```
Expo Dev Client is not installed. Would you like to use Expo Go instead? yes
```

Répondre **`y`** pour utiliser **Expo Go**.

### 4️⃣ Tester sur Device/Émulateur

#### **Option A: Via Expo Go** (Recommandé)

**iOS:**
```bash
# Depuis le terminal Expo
i

# Ou directement
npm run ios
```

**Android:**
```bash
# Depuis le terminal Expo
a

# Ou directement
npm run android
```

#### **Option B: Prévisualisation Web**

```bash
npm run web
```

Ouvrira le navigateur avec une prévisualisation (maps ne fonctionneront pas sur web, normal).

## 🔍 Vérifications

### Vérifier que Expo 52 est installé:
```bash
grep '"expo"' package.json
# Doit afficher: "expo": "~52.0.0"
```

### Vérifier react-native-maps:
```bash
npm list react-native-maps
# Doit afficher: react-native-maps@1.10.1
```

### Vérifier react-native-map-clustering:
```bash
npm list react-native-map-clustering
# Doit afficher: react-native-map-clustering@^3.4.2 (ou version supérieure compatible)
```

## 📱 Développement en Direct

### Sur iPhone (via USB ou réseau)

1. Installer **Expo Go** depuis App Store
2. `npm start`
3. Scanner le QR code avec l'app Expo Go

### Sur Android (via USB ou réseau)

1. Installer **Expo Go** depuis Google Play
2. `npm start`
3. Scanner le QR code avec l'app Expo Go

### Sur Simulateur iOS

```bash
npm start
# Puis taper: i
```

### Sur Émulateur Android

```bash
# D'abord lancer l'émulateur Android Studio, puis:
npm start
# Puis taper: a
```

## 🛠️ Dépannage

### Erreur: "Module not found: react-native-maps"

```bash
npm install react-native-maps@1.10.1 --save
```

### Erreur: "Module not found: react-native-map-clustering"

```bash
npm install react-native-map-clustering@^3.4.2 --save
```

### Erreur: Expo version incompatible

```bash
# Vérifier
npm list expo

# Réinstaller si besoin
npm install expo@~52.0.0
```

### Les maps ne s'affichent pas

```bash
# Nettoyer le cache
npm start -c

# Ou
expo start --clear
```

### Crash sur iOS après installation

```bash
# Réinstaller les pods
cd ios
rm -rf Pods
pod install
cd ..
npm start -c
```

## 🔄 Mise à Jour des Dépendances (Sûre)

⚠️ **NE PAS FAIRE** si vous voulez rester stable!

Si vraiment vous devez mettre à jour:

```bash
# Vérifier quelles mises à jour sont disponibles
npm outdated

# Mettre à jour expo seulement (rester en 52.x)
npm install expo@latest-52
```

## 🚫 À ÉVITER ABSOLUMENT

```bash
# ❌ NE PAS FAIRE CECI:
npm update expo  # Risque de monter à Expo 54!
npm upgrade      # Risque de tout casser

# ❌ NE PAS INSTALLER CES VERSIONS:
# expo@~54.0.0  (new architecture = problèmes)
# expo@latest   (risque d'aller à 54)
# react@19      (pas compatible)
```

## 📦 Build Production

### Préparation

```bash
# Vérifier app.json et app.config.js
cat app.json | head -20
cat app.config.js | head -20
```

### iOS Build

```bash
# Avec Expo Cloud
eas build --platform ios

# Ou localement
npx expo prebuild --clean --platform ios
npx expo run:ios --release
```

### Android Build

```bash
# Avec Expo Cloud
eas build --platform android

# Ou localement
npx expo prebuild --clean --platform android
npx expo run:android --release
```

## ✅ Checklist de Setup

- [ ] Node.js >= 16 installé
- [ ] `npm install` complété avec succès
- [ ] Expo 52.0.0 confirmé
- [ ] react-native-maps 1.10.1 confirmé
- [ ] react-native-map-clustering installé
- [ ] `npm start` lance sans erreur
- [ ] QR code généré pour Expo Go
- [ ] Expo Go installé sur device/émulateur
- [ ] App se lance dans Expo Go
- [ ] Carte s'affiche correctement
- [ ] Marqueurs visibles
- [ ] Recherche fonctionne
- [ ] Filtres fonctionnent
- [ ] Pas d'erreur console

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez `EXPO52_CONFIG.md`
2. Vérifiez le `package.json` (versions correctes?)
3. Essayez `npm start -c` (nettoyer le cache)
4. Réinstaller `node_modules`: `rm -rf node_modules && npm install`
5. Vérifier la version Node: `node -v` (doit être >= 16)

---

**Expo Version**: 52.0.0  
**React Native**: 0.75.4  
**Plateforme**: iOS + Android + Web  
**Date**: Février 2026

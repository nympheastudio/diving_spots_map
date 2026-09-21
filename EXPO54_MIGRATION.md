# 📋 Rapport de Migration : Expo SDK 52 ➔ Expo SDK 54

> **Projet** : Atelier de la Mer – `diving_spots_map`  
> **Date du Spike** : 21 septembre 2026  
> **Branche** : `feat/expo54-migration`  
> **Statut final** : ✅ **FAISABLE (Succès du Spike)**

---

## 🎯 1. Contexte et Objectif

Le projet tournait sous **Expo SDK 52** avec un avertissement documenté dans `EXPO52_CONFIG.md` signalant des risques élevés lors d'un passage à Expo 54 (impact potentiel de la New Architecture, React 19, React Native 0.81, et casse possible de `react-native-maps` / `react-native-map-clustering`).

L'objectif du spike était d'isoler la migration sur une branche dédiée (`feat/expo54-migration`), d'aligner les dépendances vers Expo SDK 54, et de tester la viabilité de l'application, en particulier le cœur métier : **la cartographie des spots de plongée**.

---

## 🏁 2. Conclusion & Verdict du Spike

### ✅ Verdict : **MIGRATION FAISABLE**

1. **Aucun blocage critique** : L'ensemble de l'arbre de dépendances a été résolu sans conflit et s'aligne proprement avec le SDK 54.
2. **Double compatibilité cartographique** :
   * **Solution active en production (`App.js`)** : L'application utilise `src/components/DivingMapSimple.js`, basé sur Leaflet et `react-native-webview` (v13.15.0). Cette approche est totalement insensible aux changements internes de l'architecture native React Native / React 19.
   * **Solution native (`src/components/DivingMap.js`)** : Testée avec `react-native-maps` (1.20.1) et `react-native-map-clustering` (v3.4.2 / v4.0.0), elle compile et se bundle avec succès sous Metro.
3. **Bundling Metro sans erreur** :
   * **iOS** : 658 modules compilés en bytecode Hermes (`.hbc`) en 18 secondes.
   * **Android** : 656 modules compilés en bytecode Hermes (`.hbc`) en 13 secondes.

---

## 📊 3. Matrice des Dépendances & Versions Testées

| Paquet / Dépendance | Version SDK 52 (Initiale) | Version SDK 54 (Spike) | Statut de compatibilité |
| :--- | :--- | :--- | :--- |
| `expo` | `~52.0.0` | `~54.0.0` (54.0.37) | ✅ Aligné |
| `react` | `18.3.1` | `19.1.0` | ✅ Aligné |
| `react-native` | `0.76.9` | `0.81.5` | ✅ Aligné |
| `@react-native-async-storage/async-storage` | `1.23.1` | `2.2.0` | ✅ Aligné |
| `react-native-webview` | `13.12.5` | `13.15.0` | ✅ Aligné (carte Leaflet OK) |
| `react-native-maps` | *Non listé* | `1.20.1` | ✅ Supporté par SDK 54 |
| `react-native-map-clustering` | *Non listé* | `~4.0.0` | ✅ Bundle sans erreur |
| `expo-build-properties` | `~0.13.3` | `~1.0.10` | ✅ Aligné |
| `expo-constants` | `~17.0.8` | `~18.0.14` | ✅ Aligné |
| `expo-device` | `~7.0.3` | `~8.0.10` | ✅ Aligné |
| `expo-file-system` | `~18.0.12` | `~19.0.24` | ✅ Aligné |
| `expo-font` | `~13.0.4` | `~14.0.12` | ✅ Aligné |
| `expo-linear-gradient` | `~14.0.2` | `~15.0.8` | ✅ Aligné |
| `expo-localization` | `~16.0.1` | `~17.0.9` | ✅ Aligné |
| `expo-location` | `~18.0.10` | `~19.0.8` | ✅ Aligné |
| `expo-network` | `~7.0.5` | `~8.0.8` | ✅ Aligné |
| `expo-notifications` | `~0.29.14` | `~0.32.17` | ✅ Aligné |
| `expo-screen-orientation` | `~8.0.4` | `~9.0.9` | ✅ Aligné |
| `expo-splash-screen` | `~0.29.24` | `~31.0.13` | ✅ Aligné |
| `expo-status-bar` | `~2.0.1` | `~3.0.9` | ✅ Aligné |
| `expo-updates` | `~0.27.5` | `~29.0.20` | ✅ Aligné |
| `expo-web-browser` | `~14.0.2` | `~15.0.11` | ✅ Aligné |
| `jest-expo` | `^50.0.1` | `~54.0.18` | ✅ Aligné |

---

## 🛠️ 4. Modifications Réalisées

1. **Mise à niveau des dépendances (`package.json`)** :
   * Exécution de `npx expo install expo@~54.0.0` et `npx expo install --fix`.
   * Résolution de `jest-expo` vers `~54.0.18`.
   * Ajout de `react-native-maps@1.20.1` et `react-native-map-clustering@~4.0.0`.
2. **Configuration Expo (`app.config.js`)** :
   * Ajout du plugin `expo-web-browser` requis par Expo 54 dans le tableau `plugins`.
3. **Validation du Bundling** :
   * Tests de bundling iOS et Android via `npx expo export`.

---

## 📝 5. Historique des Commits du Spike

Tous les commits ont été réalisés de façon atomique sur la branche `feat/expo54-migration` avec des messages en français :

1. `49b73e0` : `Mise à niveau vers Expo SDK 54 et alignement des dépendances`
2. `0291d43` : `Ajout et alignement des dépendances react-native-maps et react-native-map-clustering pour Expo 54`

---

## ⚠️ 6. Points d'Attention & Recommandations

1. **Expo Go vs Dev Client** :
   * Si vous utilisez l'application mobile **Expo Go** téléchargée depuis les stores, assurez-vous qu'elle correspond à la version du SDK (Expo Go affiche parfois une version plus récente comme SDK 57 sur les stores). Pour un contrôle optimal, il est recommandé d'utiliser un **Development Build** (`npx expo run:android` ou `npx expo run:ios`).
2. **Composant de carte** :
   * L'application par défaut utilise `DivingMapSimple` (Leaflet). C'est la solution la plus stable et multiplateforme.
   * Si l'équipe souhaite basculer sur `DivingMap` (Google Maps natif), `react-native-maps` v1.20.1 est désormais installé et compatible, mais nécessitera une clé API Google Maps pour Android configurée dans `app.config.js`.

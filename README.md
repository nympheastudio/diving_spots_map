# Système de Cartographie - Spots de Plongée en Méditerranée

## 📋 Vue d'ensemble

Ce projet est une **duplication du système de cartographie** de ADM adapté pour les **spots de plongée en Méditerranée près de Marseille**. Le système fonctionne de manière **entièrement déconnectée de l'API** avec des données JSON locales.

## 🗺️ Architecture du Système

### 1. **Composants Principaux**

```
src/
├── components/
│   ├── DivingMap.js          # Carte avec clustering et marqueurs
│   ├── DivingMarker.js       # Marqueur individuel
│   ├── DivingCluster.js      # Cluster de marqueurs
│   ├── DivingCallout.js      # Preview popup sur la carte
│   ├── SearchBar.js          # Barre de recherche
│   ├── ListView.js           # Liste des spots triée par distance
│   ├── DetailSheet.js        # Fiche détaillée du spot
│   ├── FilterSheet.js        # Filtres avancés
│   └── MapButtons.js         # Boutons de contrôle
├── services/
│   └── DivingDataService.js  # Service de gestion des données
├── data/
│   └── diving_spots.json     # Base de données des spots
└── App.js                     # Application principale
```

### 2. **Flux de Données**

```
diving_spots.json (JSON local)
        ↓
DivingDataService (Simulation API)
        ↓
    Filtrage/Recherche/Localisation
        ↓
DivingMap / ListView / DetailSheet
```

## 🌊 Champs Essentiels aux Plongeurs (13 champs)

Chaque spot contient ces informations critiques :

### Informations de Base
1. **id** - Identifiant unique
2. **nom** - Nom du spot
3. **description** - Description détaillée

### Localisation
4. **localite** - Ville
5. **code_postal** - Code postal
6. **latitude** - Coordonnée GPS
7. **longitude** - Coordonnée GPS

### Conditions de Plongée
8. **profondeur_min** - Profondeur minimale (m)
9. **profondeur_max** - Profondeur maximale (m)
10. **visibilite** - Visibilité moyenne (m)
11. **courant** - Intensité du courant (Faible/Modéré/Fort)

### Caractéristiques
12. **difficulte** - Niveau (Beginner/Intermediate/Advanced)
13. **type_site** - Type de site (Îlot, Grotte, Épave, etc.)

### Données Complémentaires
- **faune** - Espèces observables
- **flore** - Vie marine observée
- **meilleure_saison** - Période idéale
- **conditions_acces** - Accès et restrictions
- **prix_journee** - Tarif
- **capacite_plongeurs** - Nombre max de plongeurs
- **photo** - Image (URL Wikipedia)

## 🔍 Fonctionnalités Implémentées

### 1. **Carte avec Clustering**
- Affichage de tous les spots sur la carte
- **Clustering automatique** des marqueurs quand zoomé out
- Clusters affichent le nombre de spots (couleur rouge #FF6B6B)
- Marqueurs individuels en bleu quand zoomé in

```javascript
// Composant DivingMap
- renderCluster() : Affiche les clusters
- renderMarker() : Affiche les marqueurs individuels
- getMapBoundaries() : Filtre les spots visibles
```

### 2. **Preview Popup (Callout)**
- Affiche au clic sur un marqueur
- Image du spot
- Infos rapides : nom, localité, difficulté
- Profondeur et visibilité
- Bouton "Voir les détails"

```javascript
// Composant DivingCallout
- Image du spot
- Titre et sous-titre
- Détails condensés
- CTA vers la fiche détaillée
```

### 3. **Fiche Détaillée**
- Vue modale complète avec 3 onglets
- **Onglet Info** : Infos générales et conditions
- **Onglet Faune & Flore** : Espèces observables
- **Onglet Description** : Description + coordonnées GPS
- Boutons : "Localiser" (Google Maps/Apple Maps), "Réserver"

### 4. **Moteur de Recherche**
- Recherche en temps réel
- Normalise les accents (é → e)
- Cherche dans : nom, localité, code postal, type, difficulté
- Limite à 20 résultats
- Affichage des résultats avec highlighting du type

```javascript
// Composant SearchBar
- handleSearch() : Recherche temps réel
- filterHostsByQuery() : Filtre les résultats
- normalizeText() : Gère les accents
```

### 5. **Liste des Spots**
- Vue alternative à la carte
- **Tri par distance** depuis la position utilisateur
- Cards avec image, infos clés
- Badge de difficulté
- Distance depuis la position actuelle
- Tap pour voir les détails

```javascript
// Composant ListView
- orderByDistance() : Tri géographique
- Affichage des données essentielles
- Navigation vers DetailSheet
```

### 6. **Filtres Avancés**
- Filtre par **niveau de difficulté** (Beginner/Intermediate/Advanced)
- Filtre par **type de site** (9 types)
- Filtre par **profondeur maximale** (slider)
- Filtre par **visibilité minimale** (slider)
- Bouton réinitialiser
- Appliquer met à jour la liste automatiquement

```javascript
// Composant FilterSheet
- handleDifficultyToggle() : Toggle multi-select
- handleTypeToggle() : Toggle multi-select
- handleApply() : Appliquer les filtres
```

## 📱 Structure de Données - diving_spots.json

```json
{
  "spots": [
    {
      "id": 1,
      "nom": "Parc National des Calanques - Frioul",
      "description": "Archipel spectaculaire...",
      "localite": "Marseille",
      "code_postal": "13008",
      "latitude": 43.2138,
      "longitude": 5.3364,
      "profondeur_max": 45,
      "profondeur_min": 5,
      "difficulte": "Intermediate",
      "type_site": "Îlot / Archipel",
      "faune": ["Barracuda", "Grouper", "Murène", ...],
      "flore": ["Gorgones rouges", "Anémones", ...],
      "courant": "Modéré",
      "visibilite": 35,
      "meilleure_saison": "Mai à Octobre",
      "photo": "https://...",
      "conditions_acces": "Accès par bateau...",
      "prix_journee": 65,
      "capacite_plongeurs": 12
    }
  ]
}
```

## 🚀 Service de Données - DivingDataService.js

Simule une API REST avec délai réseau :

### Méthodes Disponibles

```javascript
// Récupérer tous les spots
await DivingDataService.getAllDivingSpots()
// Returns: Array<Spot>

// Chercher un spot par ID
await DivingDataService.getDivingSpotById(1)
// Returns: Spot | null

// Rechercher par texte
await DivingDataService.searchDivingSpots("Marseille")
// Returns: Array<Spot>

// Filtrer par critères
await DivingDataService.filterDivingSpots({
  difficulty: ['Beginner', 'Intermediate'],
  type: ['Îlot / Archipel'],
  maxDepth: 40,
  minVisibility: 30
})
// Returns: Array<Spot>

// Spots proches d'une localisation
await DivingDataService.getNearbySpots(43.2965, 5.3698, 50)
// Returns: Array<Spot with distance>
```

## 🎨 Palette de Couleurs

```
Primaire       : #4A90E2 (Bleu)
Accent         : #FF6B6B (Rouge/Corail)
Texte Sombre   : #13131D
Texte Gris     : #6C7383
Bordures       : #E8E8E8
Fond           : #F5F5F5
```

## 📊 Spots Inclus (13 spots)

1. **Parc National des Calanques - Frioul** (Marseille)
2. **Grotte de Morgiou** (Marseille)
3. **Îles d'Hyères - Parc de Porquerolles** (Hyères)
4. **Épave du Rubis** (Toulon) - Advanced
5. **Tombant de la Madrague** (La Seyne-sur-Mer)
6. **Île de Bendor** (Bandol) - Beginner
7. **Îles des Embiez** (Saint-Cyr-sur-Mer)
8. **Récifs du Levant** (Îles d'Hyères)
9. **Cap Lardier** (Rayol-Canadel-sur-Mer) - Beginner
10. **Grotte du Dramont** (Saint-Raphaël)
11. **Îlot de Bénéjean** (Saint-Tropez)
12. **Épave du Lérins** (Cannes) - Advanced
13. **Mont de la Grande Tête** (Antibes) - Advanced

## 🛠️ Technologies Utilisées

```json
{
  "expo": "~51.0.38",
  "react-native": "Latest via Expo",
  "react-native-maps": "~1.x",
  "react-native-map-clustering": "~1.x",
  "geolib": "^3.3.1",
  "axios": "^0.19.2",
  "lodash": "^4.17.21"
}
```

## 📦 Installation et Setup

### Prérequis
- Node.js >= 16
- Expo CLI : `npm install -g expo-cli`
- Un téléphone ou émulateur iOS/Android

### Installation

```bash
cd /Users/nicolas/Documents/app_ios/diving_spots_map

# Installer les dépendances
npm install

# Démarrer le serveur Expo
npm start

# Sur iOS (depuis le terminal Expo)
i

# Sur Android
a
```

### Structure des Répertoires
```
diving_spots_map/
├── App.js                      # Entry point
├── app.json                    # Config Expo
├── package.json
├── data/
│   └── diving_spots.json       # Données locales
├── src/
│   ├── components/             # Composants React Native
│   ├── services/               # Services (DivingDataService)
│   └── styles/                 # Styles (si besoin)
└── assets/                     # Images, fonts, etc.
```

## 🔄 Flux d'Utilisation

### Scénario 1 : Parcourir la Carte
1. L'utilisateur ouvre l'app
2. La carte s'affiche centrée sur Marseille
3. Les spots sont clusterisés (si zoomé out) ou affichés individuellement
4. Clic sur un marker → Popup preview
5. Clic sur "Voir les détails" → DetailSheet complet

### Scénario 2 : Rechercher un Spot
1. Utiliser la SearchBar en haut
2. Taper "Marseille" ou "Épave"
3. Résultats filtrés s'affichent
4. Clic sur un résultat → DetailSheet

### Scénario 3 : Vue Liste
1. Clic sur onglet "Liste" en bas
2. Spots triés par distance depuis la position actuelle
3. Scroll dans la liste
4. Clic sur un spot → DetailSheet

### Scénario 4 : Appliquer des Filtres
1. Clic sur onglet "Filtres" en bas
2. Sélectionner critères (difficulté, type, profondeur, etc.)
3. Clic "Appliquer"
4. Carte/Liste se met à jour automatiquement

## 🎯 Prochaines Améliorations

- [ ] Ajouter un slider réel pour profondeur/visibilité
- [ ] Implémentation du partage de spots
- [ ] Sauvegarde de favoris locaux
- [ ] Historique de recherches
- [ ] Photos réelles des spots (via API)
- [ ] Intégration calendrier de meilleure saison
- [ ] Notifications pour nouvelles sorties
- [ ] Système de notes/avis utilisateurs
- [ ] Connexion authentification utilisateur

## 📝 Notes Importantes

### Données de Test
- Les photos viennent de Wikimedia/Wikipedia (images libres)
- Les coordonnées GPS sont réelles
- Les profondeurs/visibilités sont approximatives et basées sur les données réelles

### Performance
- Clustering optimisé pour 50+ marqueurs
- Search filter <= 300ms (délai simulé)
- Gestion des permissions de localisation

### Déconnexion API
- Service complètement local
- Pas de dépendance réseau requise
- Données mockées avec délai pour simulation

---

**Auteur** : nymphea studio  
**Date** : Février 2026  
**Version** : 1.0.0

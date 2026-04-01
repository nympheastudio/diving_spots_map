# Copilot Instructions – Diving Spots Map

## Project Overview
React Native + Expo 52 app mapping Mediterranean diving spots near Marseille. **Fully offline** – no backend, no API keys. All data lives in `data/diving_spots.json`.

## Architecture

### Data Flow
```
data/diving_spots.json
  → DivingDataService.js  (simulates async API with setTimeout)
  → App.js               (single stateful orchestrator)
  → DivingMapSimple / ListView / DetailSheet / FilterSheet
```

### Two Map Implementations (important distinction)
- **`DivingMapSimple.js`** – active in `App.js`. Uses `react-native-webview` + Leaflet (OpenStreetMap). No API key needed. Communication between JS and the WebView uses `postMessage`/`injectedJavaScript`.
- **`DivingMap.js`** – alternate native implementation using `react-native-map-clustering`. Not currently wired in `App.js` but kept as an alternative.

### State Management
All state lives in `App.js` – no Redux, no Context API. Key states: `allSpots`, `currentMarkers`, `selectedSpot`, `viewMode` (`'map'` | `'list'`), `filters`, `region`.

## Key Conventions

### DivingDataService pattern
All service methods simulate network latency (200–300 ms via `setTimeout`) and return Promises. Always call with `await` or `.then()`. The service exports **both named exports and a default object**:
```js
import DivingDataService from './src/services/DivingDataService';
await DivingDataService.getAllDivingSpots();
// or named: import { filterDivingSpots } from './src/services/DivingDataService';
```

### Spot data schema
Top-level JSON keys: `default_photo`, `default_photos_fond_marin`, `spots[]`.  
`applyDefaultPhotos()` in the service overrides every spot's `photo` and `photos_fond_marin` with the shared defaults.  
Key spot fields: `id`, `nom`, `localite`, `code_postal`, `latitude`, `longitude`, `profondeur_min`, `profondeur_max`, `visibilite`, `courant`, `difficulte` (Beginner/Intermediate/Advanced), `type_site`.

### Search normalization
Text search always normalizes accents: `.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g, '')`. Apply this pattern for any new search feature.

### UI color constants – `src/theme.js`
Importer depuis `src/theme.js` (ne jamais utiliser des literals #hex directement).
- `colors.primary` = `#00D4FF` – cyan bioluminescent (actif, liens, CTA)
- `colors.accent`  = `#FF5C6A` – coral (selected markers, bouton Réserver)
- `colors.emerald` = `#00E5A0` – Beginner / flore tags
- `colors.amber`   = `#FFB830` – Intermediate
- `colors.bg`      = `#080C14` – fond principal (dark ocean)
- `shadows.glow` / `shadows.card` / `shadows.subtle` – shadow presets
- `DIFFICULTY_META` – objet `{ Beginner, Intermediate, Advanced }` avec `color`, `bg`, `label` FR

### FilterSheet option values
Difficulty: `['Beginner', 'Intermediate', 'Advanced']`  
Site types are French strings (e.g. `'Îlot / Archipel'`, `'Grotte'`, `'Épave'`) – match exactly when filtering against `spot.type_site`.

### DetailSheet tabs
Three tab keys: `'info'`, `'faune'`, `'description'`. Switch rendering happens in `renderTabContent()`.

### Language convention
Docs and comments are in **French**; code identifiers are in **English**.

## Developer Workflows

```bash
expo start            # Start Metro bundler (Expo Go)
expo run:ios          # Build & run on iOS simulator
expo run:android      # Build & run on Android emulator
npm test              # Run Jest (jest-expo preset, testEnvironment: node)
npm run test:watch    # Watch mode
```

EAS builds are configured in `eas.json`. Bundle IDs: `com.nicolasdiving.divingspots` (iOS & Android).

## Key Files
| File | Role |
|---|---|
| [App.js](../App.js) | Root orchestrator – all state, navigation, layout |
| [src/services/DivingDataService.js](../src/services/DivingDataService.js) | All data access (search, filter, nearby) |
| [data/diving_spots.json](../data/diving_spots.json) | Source of truth – 13 real spots |
| [src/components/DivingMapSimple.js](../src/components/DivingMapSimple.js) | Active map (WebView + Leaflet) |
| [src/components/DivingMap.js](../src/components/DivingMap.js) | Alternate native map (react-native-map-clustering) |
| [src/components/FilterSheet.js](../src/components/FilterSheet.js) | Multi-criteria filter modal |
| [src/components/DetailSheet.js](../src/components/DetailSheet.js) | 3-tab spot detail modal |

## Adding a New Spot
Add an entry to `data/diving_spots.json` under `spots[]` following the existing schema. The `default_photo` and `default_photos_fond_marin` fields will be applied automatically by the service.

## Distance Sorting
`ListView` uses `geolib`'s `orderByDistance(userLocation, spots)`. The custom Haversine formula in `DivingDataService.getNearbySpots()` is separate and used for proximity queries only.

# 🏠 ha-obsidian — Dashboard Home Assistant

> Dashboard Home Assistant ultra-personnalisé avec lecteur média avancé, contrôle TV/Musique multiroom, lumières et automatisations.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/lookair)

---

## 📸 Aperçu

### Vue principale
![Dashboard principal](screenshots/dashboard-00.49.12.jpeg)

### 🎵 Lecteur Musique — Tidal via Music Assistant
![Lecteur musique](screenshots/dashboard-00.46.04.jpeg)

### 📻 Recherche radio directe dans la barre de recherche
![Recherche radio Europe 2](screenshots/dashboard-00.45.35.jpeg)

### 📋 File d'attente temps réel
![File d'attente](screenshots/dashboard-00.47.59.jpeg)

### 📺 Lecteur TV — Série (Plex)
![TV Série Euphoria](screenshots/dashboard-00.42.55.jpeg)

### 🎬 Lecteur TV — Film (Plex)
![TV Film Avatar](screenshots/dashboard-00.43.58.jpeg)

### 💡 Contrôle des lumières
![Contrôle lumières Salon](screenshots/dashboard-00.54.00.jpeg)

---

## ✨ Fonctionnalités principales

### 🎵 Lecteur Média Premium V943 — `media-premium-player-v9-4-1`

Carte custom element 100 % JavaScript, sans dépendance tierce.

**Nouveautés V943 :**
- ✅ **Fix `config_entry_id` MASS 2.5+** — la lecture via Music Assistant ne rejette plus les appels `play_media`
- 🔍 **Recherche intelligente avec debounce** — saisie directe dans la barre de recherche : titres, albums, artistes, playlists, radios
- 📻 **Lancement radio en un clic** — tape directement `Skyrock`, `Europe 2`, `NRJ`… dans la barre de recherche : la suggestion *"Lancer en radio"* apparaît instantanément via Music Assistant (Radio Browser), **sans passer par un script HA**
- 🎯 **Détection d'intention automatique** — mots-clés radio FR et ambiances (chill, workout, jazz…) déclenchent une suggestion contextuelle
- 🌟 **Highlighting des résultats** — termes cherchés mis en évidence dans les résultats (couleur par catégorie)
- 📋 **File d'attente temps réel** — affichage des titres à suivre, gestion via WebSocket MASS avec fallbacks
- 🎤 **Discover artiste** — suggestions similaires via Last.fm
- 🕑 **Historique de lecture** — 10 derniers titres écoutés, persistant
- 🎨 **Ambiance dynamique** — pochette extraite, couleur dominante synchronisée avec le fond
- 🔊 **Multiroom HEOS** — sélecteur Ampli / Cuisine / Maison, groupage automatique
- 📺 **Mode TV** — télécommande Shield/Plex intégrée, infos TMDB/TiviMate

### 💡 Lumières
- Contrôle par pièce (Salon, Cuisine, Chambre)
- Sélecteur de couleur natif + presets couleurs
- Slider de luminosité par luminaire

### 🚪 Automatisations rapides (Actions)
- Portail, Garage, Mode sommeil, Film enfants, École

---

## 📁 Structure

```
ha-obsidian/
├── README.md
├── dashboard_ha-obsidian.yaml         # Configuration Lovelace
├── screenshots/                       # Captures anonymisées
└── www/
    ├── media-premium-player-v943-PUBLIC.js     # ← Carte custom V943
    ├── media-premium-player-v9-4-1-PUBLIC.js  # ← Carte custom V941
    ├── agenda.js
    ├── horloge-meteo.js
    ├── solaire.js
    └── systeme.js
```

---

## 🚀 Installation

### 1. Copier les fichiers JS

Dépose les fichiers `www/*.js` dans ton dossier `config/www/` de Home Assistant.

### 2. Déclarer les ressources

Dans **Paramètres → Tableaux de bord → Ressources**, ajoute :

```
/local/media-premium-player-v943-PUBLIC.js
```
Type : **Module JavaScript**

### 3. Configurer la carte

```yaml
type: custom:media-premium-player-v9-4-1
mode_select:          input_select.mode_media
music_player_select:  input_select.lecteur_musique
search_text:          input_text.recherche_musique
search_type:          input_select.type_de_recherche_musique
denon_player:         media_player.ampli_salon_3
cuisine_player:       media_player.enceinte_cuisine
maison_player:        media_player.groupe_maison
denon_power_player:   media_player.ampli_salon_2
script_launch:        script.media_lancer_musique
script_radio:         script.media_radio
script_transfer:      script.media_transferer
shield_player:        media_player.android_tv_shield
plex_player:          media_player.plex_shield_tv
tivi_channel:         input_text.tivimate_chaine
tivi_program:         input_text.tivimate_programme
tivi_time:            input_text.tivimate_horaire
tivi_duration:        input_text.tivimate_duree
tivi_description:     input_text.tivimate_description
tivi_logo:            input_text.tivimate_logo
vod_titre:            input_text.tmdb_titre
vod_sous_titre:       input_text.tmdb_sous_titre
vod_jaquette:         input_text.tmdb_poster
vod_description:      input_text.tmdb_description
vod_annee:            input_text.tmdb_annee
vod_note:             input_text.tmdb_note
```

> **Note :** Adapte les `entity_id` à ton installation. Les noms ci-dessus sont génériques.

---

## 📻 Recherche radio directe

La barre de recherche reconnaît automatiquement les radios françaises et lance la lecture **directement via Music Assistant → Radio Browser** :

| Ce que tu tapes | Ce qui se passe |
|---|---|
| `skyrock` | 🔴 Lancer Skyrock en radio |
| `europe 2` | 🔴 Lancer Europe 2 en radio |
| `nrj` | 🔴 Lancer NRJ en radio |
| `fip` | 🔴 Lancer FIP en radio |
| `chill` | 🎵 Playlist ambiance Chill |
| `workout` | 🎵 Playlist ambiance Workout |

---

## 🔧 Dépendances recommandées (HACS)

| Intégration / Plugin | Rôle |
|---|---|
| [Music Assistant](https://music-assistant.io) | Backend musical (Tidal, Spotify, Radio Browser…) |
| [ha-fusion](https://github.com/matt8707/ha-fusion) | Thème de dashboard utilisé |
| TiviMate Companion | Infos chaîne TV en direct |
| TMDB Integration | Métadonnées films/séries |
| Last.fm | Suggestions artistes similaires |

---

## 📝 Changelog

### V943 — Mai 2026
- Fix critique `config_entry_id` pour MASS 2.5+
- **Recherche radio directe par nom** (sans script) via Music Assistant
- Amélioration scoring/highlighting des résultats
- File d'attente multi-méthodes WebSocket + HTTP API MASS
- Historique lecture persistant (localStorage)
- Ambiance dynamique couleur pochette

### V941
- Version initiale publiée

---

## ☕ Soutenir le projet

Si ce dashboard t'a été utile, tu peux offrir un café ! ☕

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/lookair)

---

## ⚠️ Avertissement

Les `entity_id` présents dans ce dépôt sont **anonymisés**. Remplace-les par tes propres entités HA.

---

*Fait avec ❤️ sous Home Assistant · Thème [ha-fusion](https://github.com/matt8707/ha-fusion)*

# 🏠 ha-obsidian — Dashboard Home Assistant

> Dashboard Home Assistant ultra-personnalisé avec lecteur média avancé, contrôle TV/Musique multiroom, lumières et automatisations.

---

## 📸 Aperçu

| Lecteur Musique (Tidal/MASS) | Recherche Radio directe |
|:---:|:---:|
| ![Musique](screenshots/Capture-decran-2026-05-20-a-00.46.04-anon.jpeg) | ![Radio](screenshots/Capture-decran-2026-05-20-a-00.45.35-anon.jpeg) |

| File d'attente | Lecteur TV — Série |
|:---:|:---:|
| ![Queue](screenshots/Capture-decran-2026-05-20-a-00.47.59-anon.jpeg) | ![TV Série](screenshots/Capture-decran-2026-05-20-a-00.42.55-anon.jpeg) |

| Lecteur TV — Film | Contrôle lumières |
|:---:|:---:|
| ![TV Film](screenshots/Capture-decran-2026-05-20-a-00.43.58-anon.jpeg) | ![Lumières](screenshots/Capture-decran-2026-05-20-a-00.54.00-anon.jpeg) |

---

## ✨ Fonctionnalités principales

### 🎵 Lecteur Média Premium V943 — `media-premium-player-v9-4-1`

Carte custom element 100 % JavaScript, sans dépendance tierce.

**Nouveautés V943 :**
- ✅ **Fix `config_entry_id` MASS 2.5+** — la lecture via Music Assistant ne rejette plus les appels `play_media`
- 🔍 **Recherche intelligente avec debounce** — saisie directe dans la barre de recherche : titres, albums, artistes, playlists, radios
- 📻 **Lancement radio en un clic** — tape directement `Skyrock`, `Europe 2`, `NRJ`… dans la barre de recherche : la suggestion *"Lancer en radio"* apparaît instantanément via Music Assistant (Radio Browser)
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
├── screenshots/                   # Captures anonymisées
├── www/
│   └── media-premium-player-v943-anonymized.js   # ← Carte custom à déposer ici
└── lovelace/
    └── (configuration YAML à venir)
```

---

## 🚀 Installation

### 1. Copier le fichier JS

Dépose `media-premium-player-v943-anonymized.js` dans ton dossier `config/www/` de Home Assistant.

### 2. Déclarer la ressource

Dans **Paramètres → Tableaux de bord → Ressources**, ajoute :

```
/local/media-premium-player-v943-anonymized.js
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

## 🔧 Dépendances recommandées (HACS)

| Intégration / Plugin | Rôle |
|---|---|
| [Music Assistant](https://music-assistant.io) | Backend musical (Tidal, Spotify, Radio Browser…) |
| [ha-fusion](https://github.com/matt8707/ha-fusion) | Thème de dashboard utilisé |
| TiviMate Companion | Infos chaîne TV en direct |
| TMDB Integration | Métadonnées films/séries |
| Last.fm | Suggestions artistes similaires |

---

## 📻 Recherche radio directe

La barre de recherche du lecteur reconnaît automatiquement les noms de radios françaises et lance la lecture **sans passer par un script** :

```
skyrock  →  🔴 Lancer Skyrock en radio
europe 2  →  🔴 Lancer Europe 2 en radio
nrj  →  🔴 Lancer NRJ en radio
fip  →  🔴 Lancer FIP en radio
```

La résolution se fait directement via **Music Assistant → Radio Browser**. Inutile de créer une entité radio dans HA.

---

## 📝 Changelog

### V943 — Mai 2026
- Fix critique `config_entry_id` pour MASS 2.5+
- Recherche radio directe par nom (sans script)
- Amélioration scoring/highlighting des résultats
- File d'attente multi-méthodes WebSocket + HTTP API MASS
- Historique lecture persistant (localStorage)
- Ambiance dynamique couleur pochette

### V942
- Version précédente avec script Tidal

---

## ⚠️ Avertissement

Les `entity_id` présents dans ce fichier sont **anonymisés**. Remplace-les par tes propres entités HA.

---

*Fait avec ❤️ sous Home Assistant — ha-fusion theme*

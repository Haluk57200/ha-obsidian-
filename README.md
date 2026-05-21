# 🏠 ha-obsidian — Dashboard Home Assistant

> Dashboard Home Assistant ultra-personnalisé avec lecteur média avancé, contrôle TV/Musique multiroom, lumières et automatisations.

---

## 📸 Aperçu

### Vue principale
![Dashboard principal](screenshots/dashboard-00.49.12.jpeg)

### 🎵 Lecteur Musique — Tidal via Music Assistant
![Lecteur musique](screenshots/dashboard-00.46.04.jpeg)

### 📻 Recherche radio directe
![Recherche radio Europe 2](screenshots/dashboard-00.45.35.jpeg)

### 📋 File d'attente temps réel
![File d'attente](screenshots/dashboard-00.47.59.jpeg)

### 📺 Lecteur TV — Série
![TV Série](screenshots/dashboard-00.42.55.jpeg)

### 🎬 Lecteur TV — Film
![TV Film](screenshots/dashboard-00.43.58.jpeg)

### 💡 Contrôle des lumières
![Lumières](screenshots/dashboard-00.54.00.jpeg)

---

## ✨ Fonctionnalités

### 🎵 Lecteur Média Premium V943

Un lecteur tout-en-un pour la musique et la TV, intégré directement dans le dashboard.

- 📻 **Radios en un mot** — tape `skyrock`, `nrj`, `europe 2`… dans la barre de recherche → la radio démarre via Music Assistant, sans configuration supplémentaire
- 🎵 **Recherche musique** — titres, albums, artistes et playlists détectés automatiquement
- 🎨 **Ambiance dynamique** — le fond change de couleur selon la pochette de l'album en cours
- 📋 **File d'attente** — affichage des prochains titres en temps réel
- 🔊 **Multiroom** — contrôle Ampli salon / Cuisine / Toute la maison
- 📺 **Télécommande TV** — contrôle Plex/Shield avec infos du film ou de la série
- 🕑 **Historique** — 10 derniers titres mémorisés automatiquement

### 💡 Lumières
Contrôle par pièce avec sélecteur de couleur et slider de luminosité.

### 🚪 Automatisations rapides
Portail, Garage, Mode sommeil, Film enfants, École — en un seul tap.

---

## 🚀 Installation

> 💡 **Débutant ?** Suis les étapes dans l'ordre, ça prend environ 10 minutes.

---

### Étape 1 — Télécharger les fichiers

Clique sur le bouton vert **`< > Code`** en haut de cette page → **Download ZIP** → décompresse l'archive sur ton ordinateur.

---

### Étape 2 — Copier les fichiers JS dans Home Assistant

**Via l'addon File Editor** *(recommandé)*
1. Dans HA : **Paramètres → Modules complémentaires** → installe **File Editor** si besoin
2. Ouvre File Editor → navigue dans `config/www/`
3. Si le dossier `www` n'existe pas, crée-le
4. Upload tous les fichiers `.js` du dossier `www/` de ce repo

**Via accès réseau (Samba / SFTP)**
1. Monte le partage réseau de ton HA
2. Copie les fichiers `.js` dans `config/www/`

---

### Étape 3 — Déclarer les ressources JavaScript

1. Dans HA : **Paramètres → Tableaux de bord → ⋮ → Ressources**
2. Clique **+ Ajouter** pour chaque ligne :

| URL | Type |
|---|---|
| `/local/media-premium-player-v943-PUBLIC.js` | Module JavaScript |
| `/local/media-premium-player-v9-4-1-PUBLIC.js` | Module JavaScript |
| `/local/agenda.js` | Module JavaScript |
| `/local/horloge-meteo.js` | Module JavaScript |
| `/local/solaire.js` | Module JavaScript |
| `/local/systeme.js` | Module JavaScript |

3. **Vide le cache** du navigateur : `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (PC)

---

### Étape 4 — Importer le dashboard

1. Dans HA : **Paramètres → Tableaux de bord → + Ajouter**
2. Donne-lui un nom (ex : `Obsidian`)
3. Ouvre-le → clique **⋮ → Modifier** → passe en **mode YAML brut**
4. Copie-colle le contenu du fichier `dashboard_ha-obsidian.yaml`
5. Clique **Enregistrer**

---

### Étape 5 — Adapter à ton installation

> ⚠️ Les noms d'entités dans ce fichier sont **génériques**. Tu dois les remplacer par les tiens.

Pour trouver tes entités : **Paramètres → Appareils et services → Entités** → recherche par nom.

| Entité générique | Remplace par |
|---|---|
| `media_player.ampli_salon_3` | Ton ampli ou enceinte principale |
| `media_player.enceinte_cuisine` | Ton enceinte cuisine |
| `media_player.groupe_maison` | Ton groupe multiroom |
| `media_player.android_tv_shield` | Ton Android TV / Shield |
| `media_player.plex_shield_tv` | Ton lecteur Plex |
| `input_select.lecteur_musique` | Ton sélecteur de pièce |
| `input_text.recherche_musique` | Ton champ de recherche |
| `script.media_lancer_musique` | Ton script de lancement musique |

---

### Étape 6 — Dépendances requises (HACS)

Installe ces intégrations via [HACS](https://hacs.xyz) si ce n'est pas déjà fait :

| À installer | Pourquoi |
|---|---|
| [**Music Assistant**](https://music-assistant.io) | Indispensable pour la musique et les radios |
| **TiviMate Companion** | Infos TV en direct *(optionnel)* |
| **TMDB** | Pochettes films/séries *(optionnel)* |
| **Last.fm** | Suggestions d'artistes *(optionnel)* |

---

## 📻 Utiliser la recherche radio

1. Dans le lecteur, clique sur l'onglet **🎵 MUSIQUE**
2. Tape directement le nom d'une radio dans la barre de recherche :

| Ce que tu tapes | Résultat |
|---|---|
| `skyrock` | 🔴 Lancer Skyrock en radio |
| `europe 2` | 🔴 Lancer Europe 2 en radio |
| `nrj` | 🔴 Lancer NRJ en radio |
| `fip` | 🔴 Lancer FIP en radio |
| `chill` | 🎵 Playlist ambiance Chill |
| `workout` | 🎵 Playlist ambiance Workout |

3. Clique sur la suggestion → c'est parti !

> Aucun script à créer — Music Assistant gère tout via Radio Browser.

---

## ❓ Problèmes fréquents

**Les cartes n'apparaissent pas / erreur "custom element not found"**
→ Vérifie que les `.js` sont dans `config/www/` et que les ressources sont déclarées (Étape 3). Vide le cache.

**La musique ne se lance pas**
→ Vérifie que Music Assistant est installé et qu'un provider (Tidal, Spotify…) est configuré.

**Les entités sont en rouge / "unavailable"**
→ Les noms d'entités sont génériques. Remplace-les par les tiens (Étape 5).

---

## 📝 Changelog

### V943 — Mai 2026
- ✅ Fix `config_entry_id` pour Music Assistant 2.5+
- 📻 Recherche radio directe par nom, sans script
- 🌟 Highlighting des résultats de recherche
- 📋 File d'attente WebSocket + HTTP fallback
- 🕑 Historique de lecture persistant
- 🎨 Couleur de fond dynamique selon la pochette

### V941 — Mai 2026
- Version initiale publiée

---

## ☕ Soutenir le projet

Ce dashboard est entièrement gratuit. Si il t'a simplifié le quotidien, tu peux offrir un café — c'est toujours encourageant ! 😊

[![Soutenir sur Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/lookair)

---

## ⚠️ Avertissement

Les `entity_id` présents dans ce dépôt sont anonymisés.
Remplace-les par tes propres entités avant utilisation.

---

*Fait avec ❤️ sous Home Assistant · Inspiré du style [ha-fusion](https://github.com/matt8707/ha-fusion)*

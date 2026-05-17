# 🖤 ha-obsidian — Dashboard Home Assistant

> Clone inspiré du style **Mattias** ([@matt8707](https://github.com/matt8707/ha-fusion)), adapté et personnalisé avec un lecteur média avancé, des widgets JS custom et un design glassmorphism sombre.

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.x-blue?style=flat-square&logo=home-assistant)
![HACS](https://img.shields.io/badge/HACS-required-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## 📸 Aperçu

> *Dashboard sombre, full glassmorphism, grille CSS personnalisée*

---

## ✨ Fonctionnalités

- 🕐 **Widget horloge/météo** — heure, date, semaine, météo, présence, lumières allumées
- 🎵 **Lecteur média premium** — pochette, titre, artiste, play/pause, volume, multiroom
- 🏠 **Tuiles pièces** — salon, cuisine, chambre, avec état actif/inactif contrasté
- ☀️ **Widget solaire** — puissance instantanée + production journalière
- 💻 **Widget système** — CPU et RAM avec barres colorées dynamiques
- 📅 **Widget agenda** — prochain événement calendrier
- 🌙 **Mode nuit / présence** — chips bas de page
- 🎬 **Section TV** — TiviMate + TMDB (pochette VOD, programme, description)

---

## 🧩 Cartes HACS requises

Installe ces cartes via **HACS → Interface**:

| Carte | Utilisation |
|---|---|
| `button-card` | Toutes les tuiles et widgets |
| `card-mod` | Styles CSS avancés |
| `layout-card` | Grille CSS personnalisée |
| `media-premium-player` | Lecteur média avancé |
| `mushroom` | (optionnel) chips présence |

---

## ⚙️ Entités à adapter

Remplace ces entités génériques par les tiennes dans `dashboard_share.yaml` :

### 👤 Présence
```yaml
person.utilisateur       # → ta personne principale
person.utilisateur2      # → deuxième personne (optionnel)
```

### 🌤️ Météo
```yaml
weather.ma_maison        # → ton entité météo
```

### 📅 Calendrier
```yaml
calendar.mon_agenda      # → ton calendrier Google/Caldav
```

### 💡 Lumières
```yaml
light.salon_led
light.bandeaux_led
light.chambre_parents
light.chambre_enfant
light.espace_loisirs
# → remplace par tes entités lumières
```

### 🎵 Lecteur média
```yaml
media_player.ampli_hifi          # → ton ampli / enceinte principale
media_player.ampli_hifi_2        # → ampli secondaire (power off)
media_player.enceinte_cuisine    # → enceinte cuisine
media_player.multiroom           # → groupe multiroom
media_player.android_tv_...      # → ta TV / Shield
media_player.plex_...            # → Plex (optionnel)
```

### ☀️ Solaire
```yaml
sensor.onduleur_puissance        # → puissance instantanée (W)
sensor.onduleur_production       # → production journalière (kWh)
# Compatible : SolarEdge, Fronius, Huawei, Enphase, SolarMax...
```

### 💻 Système
```yaml
sensor.system_monitor_processor_use        # → CPU %
sensor.system_monitor_memory_use_percent   # → RAM %
# Nécessite l'intégration System Monitor dans HA
```

---

## 📁 Fichiers

| Fichier | Description |
|---|---|
| `dashboard_share.yaml` | Dashboard complet à coller dans HA |
| `horloge-meteo.js` | Code JS extrait du widget horloge/météo |
| `agenda.js` | Code JS extrait du widget agenda |
| `systeme.js` | Code JS extrait du widget CPU/RAM |
| `solaire.js` | Code JS extrait du widget solaire |

---

## 🚀 Installation

1. Installe toutes les cartes HACS listées ci-dessus
2. Dans HA → **Paramètres → Tableaux de bord** → Nouveau tableau de bord → Mode YAML
3. Colle le contenu de `dashboard_share.yaml`
4. Remplace les `entity_id` par les tiens (voir section ci-dessus)
5. Recharge le tableau de bord

---

## 🙏 Crédits

- Design inspiré de [matt8707/ha-fusion](https://github.com/matt8707/ha-fusion)
- Cartes : [custom-button-card](https://github.com/custom-cards/button-card), [card-mod](https://github.com/thomasloven/lovelace-card-mod), [layout-card](https://github.com/thomasloven/lovelace-layout-card)

---

*Made with ❤️ and Home Assistant*

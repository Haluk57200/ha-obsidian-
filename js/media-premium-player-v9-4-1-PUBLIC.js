// Media Premium Player V943 — FIX MASS config_entry_id obligatoire (MASS 2.5+)
// Drop-in replacement de V942 — même nom custom element

// ── Constantes moteur de recherche ──────────────────────────────
const _SRCH_DEBOUNCE = 220;
const _SRCH_MIN      = 2;
const _SRCH_MAX      = 14;
const _HIST_MAX      = 8;
const _CAT_PRIORITY  = ["tracks","playlists","albums","artists","radios"];
const _CAT_META = {
  tracks:    { fr:"Titre",    ico:"♪", c:"255,143,179" },
  albums:    { fr:"Album",    ico:"◉", c:"124,200,255" },
  artists:   { fr:"Artiste",  ico:"◎", c:"246,216,101" },
  playlists: { fr:"Playlist", ico:"≡", c:"126,224,181" },
  radios:    { fr:"Radio",    ico:"◈", c:"215,166,255" },
};

class MediaPremiumPlayerV941 extends HTMLElement {
  setConfig(config) {
    this.config = {
      mode_select:          "input_select.YOUR_MODE_SELECT",
      music_player_select:  "input_select.YOUR_MUSIC_PLAYER_SELECT",
      search_text:          "input_text.YOUR_SEARCH_TEXT",
      search_type:          "input_select.type_de_recherche_musique",
      denon_player:         "media_player.YOUR_DENON_PLAYER",
      cuisine_player:       "media_player.YOUR_CUISINE_PLAYER",
      maison_player:        "media_player.YOUR_MAISON_PLAYER",
      denon_power_player:   "media_player.YOUR_DENON_POWER_PLAYER",
      script_launch:        "script.YOUR_LAUNCH_SCRIPT",
      script_radio:         "script.YOUR_RADIO_SCRIPT",
      script_transfer:      "script.YOUR_TRANSFER_SCRIPT",
      shield_player:        "media_player.YOUR_SHIELD_PLAYER",
      plex_player:          "media_player.YOUR_PLEX_PLAYER",
      tivi_channel:         "input_text.YOUR_TIVI_CHANNEL",
      tivi_program:         "input_text.YOUR_TIVI_PROGRAM",
      tivi_time:            "input_text.YOUR_TIVI_TIME",
      tivi_duration:        "input_text.YOUR_TIVI_DURATION",
      tivi_description:     "input_text.YOUR_TIVI_DESCRIPTION",
      tivi_logo:            "input_text.YOUR_TIVI_LOGO",
      vod_titre:            "input_text.YOUR_VOD_TITLE",
      vod_sous_titre:       "input_text.YOUR_VOD_SUBTITLE",
      vod_jaquette:         "input_text.YOUR_VOD_POSTER",
      vod_description:      "input_text.YOUR_VOD_DESCRIPTION",
      vod_annee:            "input_text.YOUR_VOD_YEAR",
      vod_note:             "input_text.YOUR_VOD_RATING",
      ...config,
    };
    this._searchDraft   = null;
    this._searchTimer   = null;
    this._lastArt       = null;
    this._dynRgb        = null;
    this._raf           = false;
    this._typing        = false;
    this._srchCache     = new Map();
    this._srchReqId     = 0;
    this._srchPending   = false;
    this._massEntryId   = null;
    this._queueOpen     = false;
    this._queueItems    = [];
    this._srchIdx       = -1;
    this._colorCache    = new Map();
    this._searchHistory = [];
    this._abortCtrl     = null;
    this._lastQuery     = "";
    if (!window._vinyl) window._vinyl = { angle: 0, last: null, raf: null };
    this.attachShadow({ mode: "open" });
  }

  set hass(h) {
    this._hass = h;
    if (this._typing || this._srchPending) return;
    this._scheduleRender();
  }

  _scheduleRender() {
    if (this._raf) return;
    this._raf = true;
    requestAnimationFrame(() => { this._raf = false; this.render(); });
  }

  getCardSize() { return 6; }
  st(id)             { return this._hass?.states?.[id]; }
  state(id, fb = "") { return this.st(id)?.state ?? fb; }
  attr(id, k, fb)    { return this.st(id)?.attributes?.[k] ?? fb; }
  esc(v) {
    return String(v ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;");
  }
  call(d, s, data = {}, target) { return this._hass?.callService(d, s, data, target); }
  select(eid, opt)   { return this.call("input_select","select_option",{ option: opt },{ entity_id: eid }); }
  setSearch(v) {
    const val = String(v ?? this._searchDraft ?? this.state(this.config.search_text,"") ?? "");
    return this.call("input_text","set_value",{ entity_id: this.config.search_text, value: val });
  }
  script(eid) { return this.call("script","turn_on",{},{ entity_id: eid }); }
  mode()  { return String(this.state(this.config.mode_select,"Musique")).toLowerCase() === "tv" ? "TV" : "Musique"; }
  room()  {
    const r = this.state(this.config.music_player_select,"Denon");
    return ["Denon","Cuisine","Maison"].includes(r) ? r : "Denon";
  }
  roomInfo(room = this.room()) {
    const c = this.config;
    if (room === "Cuisine") return { id: c.cuisine_player, name: "Cuisine", rgb: "243,169,70" };
    if (room === "Maison")  return { id: c.maison_player,  name: "Maison",  rgb: "126,224,181" };
    return { id: c.denon_player, name: "Denon", rgb: "255,143,179" };
  }
  activeTv() {
    const c = this.config;
    for (const id of [c.plex_player, c.shield_player]) {
      const s = this.state(id);
      if (s && !["off","unavailable","unknown"].includes(s)) return id;
    }
    return c.shield_player;
  }
  fmt(s) {
    s = Number(s) || 0;
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  }
  progress(entityId, isPlaying = false) {
    const a = this.st(entityId)?.attributes || {};
    let dur = 0;
    for (const d of [a.media_duration, a.duration]) {
      const n = Number(d);
      if (Number.isFinite(n) && n > 0) { dur = n; break; }
    }
    let pos = Number(a.media_position) || 0;
    if (dur > 0) pos = Math.min(dur, pos);
    const pct = dur > 0 ? Math.max(0,Math.min(100,(pos/dur)*100)) : 0;
    const updatedAt = a.media_position_updated_at ? Date.parse(a.media_position_updated_at) : Date.now();
    return { dur, pos, pct, updatedAt, indeterminate: isPlaying && dur === 0 };
  }

  _resolveMassEntity(entityId) {
    const states    = this._hass?.states || {};
    const curTitle  = states[entityId]?.attributes?.media_title;
    for (const [id, s] of Object.entries(states)) {
      if (!id.startsWith("media_player.") || id === entityId) continue;
      if (s.attributes?.mass_player_id || s.attributes?.queue_id || s.attributes?.active_queue) {
        if (
          s.attributes?.mass_player_id === entityId ||
          (curTitle && curTitle !== "Url Stream" && s.attributes?.media_title === curTitle)
        ) return id;
      }
    }
    return entityId;
  }

_activePlaybackPlayer() {
  const c = this.config;
  // 1) Préférer un player en lecture
  for (const id of [c.denon_player, c.cuisine_player]) {
    if (this.state(id,"off") === "playing") return id;
  }
  // 2) Puis en pause
  for (const id of [c.denon_player, c.cuisine_player]) {
    if (this.state(id,"off") === "paused") return id;
  }
  // 3) Sinon, player de la pièce courante (si pas Maison)
  const room = this.roomInfo();
  if (room.id !== c.maison_player) return room.id;
  // 4) Défaut : Denon
  return c.denon_player;
}

// ─────────────────────────────────────────────────────────────
// 1) _playMassItem — SANS config_entry_id (service le rejette)
// ─────────────────────────────────────────────────────────────
async _playMassItem(item, entityId) {
  const uri  = item.uri || item.item_id || item.media_content_id || "";
  const type = item._cat || item.media_type || item.type || "track";
  const c    = this.config;
  const isMaison = entityId === c.maison_player;
  const targetId = isMaison ? c.denon_player : entityId;
 
  if (uri) {
    // ⚠️ PAS de config_entry_id ici — play_media le refuse
    try {
      await this._hass.callService("music_assistant", "play_media", {
        entity_id:  targetId,
        media_id:   uri,
        media_type: type
      });
      // Pour Maison : grouper la cuisine sur Denon (HEOS)
      if (isMaison && c.cuisine_player) {
        await new Promise(r => setTimeout(r, 800));
        await this._hass.callService("media_player","join",{
          entity_id: targetId,
          group_members: [c.cuisine_player]
        }).catch(()=>{});
      }
      return;
    } catch (err) {
      console.warn("[playMassItem MASS]", err?.message || err);
    }
    // Fallback : media_player.play_media standard
    try {
      await this._hass.callService("media_player","play_media",{
        entity_id:          targetId,
        media_content_id:   uri,
        media_content_type: "music"
      });
      return;
    } catch (err) {
      console.warn("[playMassItem media_player]", err?.message || err);
    }
  }
 
  // Dernier recours : script HA via input_text
  const name = item.name || item.title || "";
  if (name && c.search_text && c.script_launch) {
    await this.call("input_text","set_value",{
      entity_id: c.search_text,
      value:     name
    });
    await new Promise(r => setTimeout(r, 300));
    this.script(c.script_launch);
  }
}
 
 
// ─────────────────────────────────────────────────────────────
// PART 1 — _loadQueue corrigé : gère current_item + next_item
// ─────────────────────────────────────────────────────────────
async _loadQueue(entityId) {
  this._queueItems = [];
  this._queueTotal = 0;
  console.group("📋 Queue load");
 
  try {
    const c = this.config;
    let targetId = entityId;
    const isPlaying = id => ["playing","paused"].includes(this.state(id,"off"));
    if (entityId === c.maison_player || !isPlaying(entityId)) {
      for (const id of [c.cuisine_player, c.denon_player]) {
        if (isPlaying(id)) { targetId = id; break; }
      }
    }
    console.log("Target final:", targetId);
 
    const r = await this._hass.callService(
      "music_assistant", "get_queue", {},
      { entity_id: targetId }, false, true
    );
 
    const wrapped   = r?.response ?? r?.service_response ?? r ?? {};
    const queueData = wrapped[targetId] ?? Object.values(wrapped)[0] ?? wrapped;
    console.log("Champs queueData:", queueData ? Object.keys(queueData) : "null");
 
    // ── Total de la queue (champ "items" est un nombre dans MASS) ──
    if (queueData && typeof queueData.items === "number") {
      this._queueTotal = queueData.items;
    }
 
    let items = [];
 
    if (queueData) {
      if (Array.isArray(queueData.items) && queueData.items.length) {
        items = queueData.items;
      } else if (Array.isArray(queueData.queue_items) && queueData.queue_items.length) {
        items = queueData.queue_items;
      } else if (Array.isArray(queueData.tracks) && queueData.tracks.length) {
        items = queueData.tracks;
      }
 
      // current_item + next_item (le cas réel chez toi)
      if (items.length === 0) {
        const cur  = queueData.current_item;
        const next = queueData.next_item;
        if (cur)  items.push({ ...cur,  _current: true  });
        if (next && next.queue_item_id !== cur?.queue_item_id) {
          items.push({ ...next, _current: false });
        }
      }
    }
 
    this._queueItems = items.map(it => {
      const mi = it.media_item || it;
      return {
        name:      mi.name      || mi.title || it.name || "—",
        title:     mi.title     || mi.name  || it.title || "—",
        artist:    mi.artists?.[0]?.name || mi.artist || it.artist || "",
        artists:   mi.artists   || it.artists || [],
        duration:  mi.duration  || it.duration || 0,
        image_url: mi.image     || mi.image_url
                || mi.metadata?.images?.[0]?.url
                || it.image_url || "",
        _current:  !!it.is_current_item || !!it._current
      };
    });
 
    console.log(`✅ ${this._queueItems.length} / ${this._queueTotal} items`);
 
  } catch (err) {
    console.error("Queue erreur:", err?.message || err);
  }
 
  console.groupEnd();
  this.render();
}

_renderQueuePanel() {
  const items = this._queueItems || [];
  const total = this._queueTotal || items.length;
  const countText = (total > items.length)
    ? `${items.length} sur ${total}`
    : `${items.length} titre${items.length>1?"s":""}`;
 
  const rows = items.length === 0
    ? `<div class="q-empty">File d'attente vide ou indisponible</div>`
    : items.map((it,i) => {
        const title  = this.esc(it.name||it.title||"—");
        const artist = this.esc(it.artist||it.artists?.[0]?.name||"");
        const dur    = it.duration ? this._fmtTime(it.duration) : "";
        const thumb  = it.image_url||"";
        const img    = thumb
          ? `<img src="${thumb}" loading="lazy" onerror="this.style.display='none'" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:32px;height:32px;border-radius:6px;background:rgba(255,255,255,.07);flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:.5">${this.ico("music",14)}</div>`;
        return `<div class="q-row${it._current?" q-current":""}">
          <span class="q-num">${it._current ? "▶" : i+1}</span>
          ${img}
          <div class="q-info">
            <div class="q-title">${title}</div>
            ${artist ? `<div class="q-artist">${artist}</div>` : ""}
          </div>
          ${dur ? `<span class="q-dur">${dur}</span>` : ""}
        </div>`;
      }).join("");
 
  const hint = (total > items.length)
    ? `<div style="padding:6px 14px;font-size:9px;opacity:.4;text-align:center;border-top:1px solid rgba(255,255,255,.04)">
         API MASS limitée : seuls le titre en cours + le suivant sont exposés
       </div>` : "";
 
  return `<div class="queue-panel">
    <div class="q-header">
      <span class="q-ttl">${this.ico("queue",14)} File d'attente</span>
      <span class="q-count">${countText}</span>
    </div>
    <div class="q-list">${rows}</div>
    ${hint}
  </div>`;
}

  _fmtTime(s) {
    if (!s) return "";
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return m+":"+String(sec).padStart(2,"0");
  }

// ─────────────────────────────────────────────────────────────
// 1) _playMassItem — SANS config_entry_id (service le rejette)
// ─────────────────────────────────────────────────────────────
async _playMassItem(item, entityId) {
  const uri  = item.uri || item.item_id || item.media_content_id || "";
  const type = item._cat || item.media_type || item.type || "track";
  const c    = this.config;
  const isMaison = entityId === c.maison_player;
  const targetId = isMaison ? c.denon_player : entityId;
 
  if (uri) {
    // ⚠️ PAS de config_entry_id ici — play_media le refuse
    try {
      await this._hass.callService("music_assistant", "play_media", {
        entity_id:  targetId,
        media_id:   uri,
        media_type: type
      });
      // Pour Maison : grouper la cuisine sur Denon (HEOS)
      if (isMaison && c.cuisine_player) {
        await new Promise(r => setTimeout(r, 800));
        await this._hass.callService("media_player","join",{
          entity_id: targetId,
          group_members: [c.cuisine_player]
        }).catch(()=>{});
      }
      return;
    } catch (err) {
      console.warn("[playMassItem MASS]", err?.message || err);
    }
    // Fallback : media_player.play_media standard
    try {
      await this._hass.callService("media_player","play_media",{
        entity_id:          targetId,
        media_content_id:   uri,
        media_content_type: "music"
      });
      return;
    } catch (err) {
      console.warn("[playMassItem media_player]", err?.message || err);
    }
  }
 
  // Dernier recours : script HA via input_text
  const name = item.name || item.title || "";
  if (name && c.search_text && c.script_launch) {
    await this.call("input_text","set_value",{
      entity_id: c.search_text,
      value:     name
    });
    await new Promise(r => setTimeout(r, 300));
    this.script(c.script_launch);
  }
}

  async _playFirstResult(query) {
    const entityId = this.roomInfo().id;
    if (!query) return;
    if (this._srchPending) {
      const t0 = Date.now();
      while (this._srchPending && Date.now()-t0 < 3000)
        await new Promise(r => setTimeout(r, 100));
    }
    const cached = this._srchCache.get(query);
    if (cached && cached.length > 0) { this._playMassItem(cached[0], entityId); return; }
    // Sinon laisser triggerSearch faire son boulot puis on regarde le cache
    if (this.config.search_text && this.config.script_launch) {
      await this.call("input_text","set_value",{ entity_id: this.config.search_text, value: query });
      await new Promise(r => setTimeout(r, 300));
      this.script(this.config.script_launch);
    }
  }

  connectedCallback() {
    if (this._barRaf) return;
    const _rafBar = () => {
      this._barRaf = requestAnimationFrame(_rafBar);
      const bar = this.shadowRoot?.querySelector(".prog-bar[data-dur]");
      if (!bar || bar.dataset.playing !== "1") return;
      const dur = parseFloat(bar.dataset.dur) || 0;
      const pos = parseFloat(bar.dataset.pos) || 0;
      const updatedAt = parseFloat(bar.dataset.updated) || Date.now();
      if (dur <= 0) return;
      const elapsed = (Date.now()-updatedAt)/1000;
      bar.style.width = Math.min(100,Math.max(0,((pos+elapsed)/dur)*100)).toFixed(3)+"%";
    };
    _rafBar();
  }

  disconnectedCallback() {
    if (this._barRaf) { cancelAnimationFrame(this._barRaf); this._barRaf = null; }
    if (window._vinyl?.raf) { cancelAnimationFrame(window._vinyl.raf); window._vinyl.raf = null; }
    if (this._abortCtrl) { try { this._abortCtrl.abort(); } catch {} this._abortCtrl = null; }
  }

  _extractColor(src) {
    if (this._colorCache.has(src)) return Promise.resolve(this._colorCache.get(src));
    const _pixelRgb = (imgEl) => {
      try {
        const sz=40, cv=document.createElement("canvas");
        cv.width=cv.height=sz;
        const ctx=cv.getContext("2d");
        ctx.drawImage(imgEl,0,0,sz,sz);
        const d=ctx.getImageData(0,0,sz,sz).data;
        let r=0,g=0,b=0,n=0;
        for (let i=0;i<d.length;i+=8) {
          const br=(d[i]+d[i+1]+d[i+2])/3;
          if (br>20&&br<230){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
        }
        if (!n) return null;
        r=Math.round(r/n);g=Math.round(g/n);b=Math.round(b/n);
        const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
        if (mx-mn>12){
          const mid=(mx+mn)/2,boost=1.8;
          r=Math.min(255,Math.max(0,Math.round(mid+(r-mid)*boost)));
          g=Math.min(255,Math.max(0,Math.round(mid+(g-mid)*boost)));
          b=Math.min(255,Math.max(0,Math.round(mid+(b-mid)*boost)));
        }
        return `${r},${g},${b}`;
      } catch { return null; }
    };
    const _cache = (rgb) => {
      if (rgb) {
        while (this._colorCache.size >= 40)
          this._colorCache.delete(this._colorCache.keys().next().value);
        this._colorCache.set(src, rgb);
      }
      return rgb;
    };
    return new Promise(resolve => {
      const img1 = new Image();
      img1.crossOrigin = "anonymous";
      img1.onload  = () => resolve(_pixelRgb(img1));
      img1.onerror = () => resolve(null);
      img1.src = src;
    }).then(async (rgb) => {
      if (rgb) return _cache(rgb);
      try {
        const resp = await fetch(src,{credentials:"include"});
        if (!resp.ok) return null;
        const blob    = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const rgb2 = await new Promise(resolve => {
          const img2 = new Image();
          img2.onload  = () => { resolve(_pixelRgb(img2)); URL.revokeObjectURL(blobUrl); };
          img2.onerror = () => { resolve(null);             URL.revokeObjectURL(blobUrl); };
          img2.src = blobUrl;
        });
        return _cache(rgb2);
      } catch { return null; }
    });
  }

  _updateDyn(art, fallback, trackId = "") {
    if (!art) { this._applyDyn(fallback); return; }
    const artKey = art.split("?")[0]+"|"+trackId;
    if (artKey === this._lastArt && this._dynRgb)  { this._applyDyn(this._dynRgb); return; }
    if (artKey === this._lastArt && !this._dynRgb) return;
    this._lastArt  = artKey;
    this._dynRgb   = null;
    if (fallback) { this._dynRgb = fallback; this._scheduleRender(); }
    this._extractColor(art).then(rgb => {
      if (artKey !== this._lastArt) return;
      this._applyDyn(rgb || fallback);
    });
  }

  _applyDyn(rgb) {
    if (!rgb) return;
    const prev = this._dynRgb;
    this._dynRgb = rgb;
    if (prev !== rgb && this.shadowRoot && this._hass) this._scheduleRender();
  }

  async _hassApi(path, body = null) {
    const auth  = this._hass.auth?.data;
    const base  = (auth?.hassUrl || "").replace(/\/+$/,"");
    const token = this._hass.auth?.accessToken || auth?.access_token || "";
    const opts  = {
      method: body ? "POST" : "GET",
      headers: { Authorization:"Bearer "+token, "Content-Type":"application/json" }
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(base+path, opts);
    if (!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }

  // ════════════════════════════════════════════════════════════
  // FIX V943 : _getMassEntryId — récupère et cache l'entry_id
  // Indispensable car MASS 2.5+ exige config_entry_id partout
  // ════════════════════════════════════════════════════════════
async _getMassEntryId() {
  if (this._massEntryId) return this._massEntryId;

  // Méthode 1 : déduire l'entry_id depuis les entités MASS déjà dans les states
  try {
    const states = this._hass?.states || {};
    for (const [id, s] of Object.entries(states)) {
      const entryId = s?.attributes?.config_entry_id;
      if (entryId && (
        s?.attributes?.mass_player_id ||
        s?.attributes?.queue_id ||
        id.startsWith("media_player.mass_")
      )) {
        this._massEntryId = entryId;
        console.log("✅ MASS entry_id (states):", entryId);
        return this._massEntryId;
      }
    }
  } catch {}

  // Méthode 2 : REST API /api/config/config_entries/entry
  try {
    const data = await this._hassApi("/api/config/config_entries/entry");
    const mass = (Array.isArray(data) ? data : []).find(e => e.domain === "music_assistant");
    if (mass?.entry_id) {
      this._massEntryId = mass.entry_id;
      console.log("✅ MASS entry_id (REST):", mass.entry_id);
      return this._massEntryId;
    }
  } catch (err) {
    console.warn("REST config_entries échoué:", err?.message);
  }

  console.error("❌ Music Assistant config_entry_id introuvable");
  return null;
}

  // ════════════════════════════════════════════════════════════
  // FIX V943 : _triggerSearch avec config_entry_id + media_type
  // ════════════════════════════════════════════════════════════
  async _triggerSearch(query) {
    const dd = this.shadowRoot?.querySelector(".srch-dropdown");
    query = (query||"").trim();

    if (!query || query.length < _SRCH_MIN) {
      if (dd) { dd.innerHTML=""; dd.classList.remove("open"); }
      this._srchPending = false;
      return;
    }

    if (this._srchCache.has(query)) {
      this._srchPending = false;
      this._lastQuery = query;
      this._renderDropdown(this._srchCache.get(query));
      return;
    }

    if (this._abortCtrl) { try { this._abortCtrl.abort(); } catch {} }
    this._abortCtrl = new AbortController();
    this._srchPending = true;
    const reqId = ++this._srchReqId;

    if (dd) { dd.innerHTML = this._buildSpinner(); dd.classList.add("open"); }

    // ── Récupérer config_entry_id (OBLIGATOIRE MASS 2.5+) ──
    const entryId = await this._getMassEntryId();
    if (!entryId) {
      this._srchPending = false;
      this._abortCtrl = null;
      if (dd) {
        dd.innerHTML = `<div class="srch-empty">
          <div class="srch-empty-ico">⚠</div>
          <div>Music Assistant introuvable</div>
          <div style="font-size:9px;margin-top:6px;opacity:.5">Vérifie l'intégration MASS dans HA</div>
        </div>`;
        dd.classList.add("open");
      }
      return;
    }

    let res = null;

    // ── M1 : callService officiel HA avec config_entry_id + media_type ──
    try {
      const r = await this._hass.callService(
        "music_assistant", "search",
        {
          config_entry_id: entryId,
          name:            query,
          limit:           20,
          media_type:      ["track","album","artist","playlist","radio"]
        },
        undefined,  // target
        false,      // notifyOnError
        true        // returnResponse
      );
      const c = r?.response ?? r?.service_response ?? r;
      if (c && (c.tracks || c.albums || c.artists || c.playlists || c.radios)) {
        res = c;
      }
    } catch (err) {
      console.warn("[Search M1]", err?.message || err);
    }

    // ── M2 : REST fallback ──
    if (!res) {
      try {
        const token = this._hass?.auth?.data?.access_token
                   || this._hass?.auth?.accessToken || "";
        const resp = await fetch(
          `${window.location.origin}/api/services/music_assistant/search?return_response=true`,
          {
            method: "POST",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${token}`
            },
            credentials: "include",
            signal: this._abortCtrl.signal,
            body: JSON.stringify({
              config_entry_id: entryId,
              name:            query,
              limit:           20,
              media_type:      ["track","album","artist","playlist","radio"]
            })
          }
        );
        if (resp.ok) {
          const j = await resp.json();
          const c = j?.service_response ?? j?.response ?? j;
          if (c && (c.tracks || c.albums || c.artists || c.playlists || c.radios)) {
            res = c;
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("[Search M2]", err?.message || err);
      }
    }

    if (reqId !== this._srchReqId) return;
    this._srchPending = false;
    this._abortCtrl   = null;

    const items = this._scoreResults(res, query);

    while (this._srchCache.size >= 60)
      this._srchCache.delete(this._srchCache.keys().next().value);
    this._srchCache.set(query, items);

    if (reqId !== this._srchReqId) return;
    this._lastQuery = query;
    this._renderDropdown(items);
  }

  _scoreResults(res, query) {
    if (!res) return [];
    const q    = (query||"").toLowerCase();
    const poids = { tracks:5, playlists:4, albums:3, artists:2, radios:1 };
    const out   = [];
    for (const cat of _CAT_PRIORITY) {
      for (const raw of (res[cat]||[])) {
        const it     = {...raw, _cat:cat};
        const name   = (it.name||"").toLowerCase();
        const artist = (it.artists?.[0]?.name||"").toLowerCase();
        let score    = poids[cat]||1;
        if (name === q)              score += 30;
        else if (name.startsWith(q)) score += 20;
        else if (name.includes(q))   score += 10;
        if (artist.includes(q))      score +=  5;
        if (it.popularity)           score += Math.min(it.popularity/20, 3);
        it._score = score;
        out.push(it);
      }
    }
    out.sort((a,b) => b._score - a._score);
    const seen = new Set();
    return out.filter(it => {
      const k = (it.name||"")+"|"+(it._cat||"");
      if (seen.has(k)) return false;
      seen.add(k); return true;
    }).slice(0, _SRCH_MAX);
  }

  _renderDropdown(items) {
    const dd = this.shadowRoot?.querySelector(".srch-dropdown");
    if (!dd) return;
    this._srchIdx = -1;
    if (!items || !items.length) {
      dd.innerHTML = `
        <div class="srch-empty">
          <div class="srch-empty-ico">♪</div>
          <div>Aucun résultat trouvé</div>
        </div>`;
      dd.classList.add("open");
      return;
    }
    const q = (this._lastQuery||"").toLowerCase();
    dd.innerHTML = `
      <div class="srch-header">
        <span class="srch-count">${items.length} résultat${items.length>1?"s":""}</span>
        ${this._searchHistory.length
          ? `<span class="srch-act" data-hist-clear>Historique ✕</span>` : ""}
      </div>
      ${items.map((it,i) => {
        const meta  = _CAT_META[it._cat] || {fr:it._cat,ico:"♪",c:"255,255,255"};
        const thumb = it.image_url||it.metadata?.images?.[0]?.url||"";
        const name  = this.esc(it.name||"");
        const sub   = this.esc(it.artists?.[0]?.name||it.owner_name||it.provider||"");
        const dur   = it.duration ? this._fmtTime(it.duration) : "";
        const nameHL = this._highlight(name, q);
        const imgHtml = thumb
          ? `<img src="${this.esc(thumb)}" loading="lazy"
                 style="width:38px;height:38px;border-radius:7px;object-fit:cover;flex-shrink:0;display:block"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : "";
        const fallback = `<div class="si-fb" style="${thumb?"display:none":"display:flex"}">${meta.ico}</div>`;
        return `<div class="srch-item" data-idx="${i}"
            data-title="${this.esc(it.name||"")}"
            data-sub="${this.esc(it.artists?.[0]?.name||"")}"
            data-uri="${this.esc(it.uri||"")}"
            tabindex="-1">
          <div class="srch-thumb">${imgHtml}${fallback}</div>
          <div class="srch-meta">
            <div class="srch-title">${nameHL}</div>
            ${sub ? `<div class="srch-sub">${sub}</div>` : ""}
          </div>
          <div class="srch-right">
            <span class="srch-badge" style="--cc:${meta.c}">${meta.ico} ${meta.fr}</span>
            ${dur ? `<span class="srch-dur">${dur}</span>` : ""}
          </div>
        </div>`;
      }).join("")}`;
    dd.classList.add("open");
    this._bindDropdownItems(dd, items);
  }

  _renderHistoryDropdown() {
    const dd = this.shadowRoot?.querySelector(".srch-dropdown");
    if (!dd || !this._searchHistory.length) return;
    dd.innerHTML = `
      <div class="srch-header">
        <span class="srch-count">Recherches récentes</span>
        <span class="srch-act" data-hist-clear>Effacer ✕</span>
      </div>
      ${this._searchHistory.map((h,i) =>
        `<div class="srch-hist-item" data-idx="${i}" data-title="${this.esc(h)}" tabindex="-1">
          <span class="srch-hist-ico">⟳</span>
          <span class="srch-hist-txt">${this.esc(h)}</span>
        </div>`
      ).join("")}`;
    dd.classList.add("open");
    dd.querySelector("[data-hist-clear]")?.addEventListener("click", () => {
      this._searchHistory = [];
      dd.innerHTML=""; dd.classList.remove("open");
    });
    dd.querySelectorAll(".srch-hist-item").forEach(el => {
      el.addEventListener("mousedown", e => e.preventDefault());
      el.addEventListener("click", () => {
        const q   = el.dataset.title||"";
        const inp = this.shadowRoot?.querySelector(".sinp");
        if (inp) inp.value = q;
        this._searchDraft = q;
        dd.innerHTML = this._buildSpinner();
        this._triggerSearch(q);
      });
    });
  }

  _bindDropdownItems(dd, items) {
    dd.querySelector("[data-hist-clear]")?.addEventListener("click", () => {
      this._searchHistory = [];
      dd.querySelector(".srch-act")?.remove();
    });
    dd.querySelectorAll(".srch-item").forEach(el => {
      el.addEventListener("mousedown", e => e.preventDefault());
      el.addEventListener("click", () => {
        const uri   = el.dataset.uri||"";
        const title = el.dataset.title||"";
        const sub   = el.dataset.sub||"";
        const idx   = parseInt(el.dataset.idx??"-1");
        const item  = items[idx] || {uri, name:title, _cat:"track"};
        this._addToHistory(title);
        this._srchIdx     = -1;
        this._typing      = false;
        this._searchDraft = null;
        dd.classList.remove("open");
        const inp = this.shadowRoot?.querySelector(".sinp");
        if (inp) inp.value = [title,sub].filter(Boolean).join(" ");
        if (uri) {
          this._playMassItem(item, this.roomInfo().id)
            .finally(() => { this._searchDraft=null; this.render(); });
        } else {
          const q = [title,sub].filter(Boolean).join(" ");
          this.setSearch(q)
            .then(() => new Promise(r => setTimeout(r,300)))
            .then(() => this.script(this.config.script_launch))
            .finally(() => { this._searchDraft=null; this.render(); });
        }
      });
    });
  }

  _addToHistory(query) {
    if (!query || query.length < 2) return;
    this._searchHistory = this._searchHistory.filter(
      h => h.toLowerCase() !== query.toLowerCase()
    );
    this._searchHistory.unshift(query);
    if (this._searchHistory.length > _HIST_MAX)
      this._searchHistory = this._searchHistory.slice(0, _HIST_MAX);
  }

  _highlight(text, query) {
    if (!query || !text) return text;
    try {
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi");
      return text.replace(re,`<mark class="srch-hl">$1</mark>`);
    } catch { return text; }
  }

  _buildSpinner(msg = "Recherche…") {
    return `<div class="srch-spin-wrap">
      <div class="srch-spin"></div>
      <span>${msg}</span>
    </div>`;
  }

  _bindSearch(el) {
    ["pointerdown","mousedown","touchstart","click"].forEach(ev =>
      el.addEventListener(ev, e => e.stopPropagation())
    );
    el.addEventListener("focus", () => {
      this._typing      = true;
      this._searchDraft = el.value;
      if (!el.value && this._searchHistory.length)
        this._renderHistoryDropdown();
    });
    el.addEventListener("input", () => {
      this._typing      = true;
      this._searchDraft = el.value;
      clearTimeout(this._searchTimer);
      const v = el.value.trim();
      if (!v) {
        const dd = this.shadowRoot?.querySelector(".srch-dropdown");
        if (this._searchHistory.length) this._renderHistoryDropdown();
        else if (dd) { dd.innerHTML=""; dd.classList.remove("open"); }
        return;
      }
      if (v.length < _SRCH_MIN) {
        const dd = this.shadowRoot?.querySelector(".srch-dropdown");
        if (dd) { dd.innerHTML=""; dd.classList.remove("open"); }
        return;
      }
      if (!this._srchCache.has(v)) {
        const dd = this.shadowRoot?.querySelector(".srch-dropdown");
        if (dd) { dd.innerHTML=this._buildSpinner(); dd.classList.add("open"); }
      }
      this._searchTimer = setTimeout(() => {
        this.setSearch(v);
        this._triggerSearch(v);
      }, _SRCH_DEBOUNCE);
    });
    el.addEventListener("blur", () => {
      clearTimeout(this._searchTimer);
      setTimeout(() => {
        const dd = this.shadowRoot?.querySelector(".srch-dropdown");
        if (!this._typing) return;
        this._typing=false; this._searchDraft=null; this._srchIdx=-1;
        if (dd) { dd.innerHTML=""; dd.classList.remove("open"); }
        this.render();
      }, 230);
    });
    el.addEventListener("keydown", ev => {
      ev.stopPropagation();
      const dd    = this.shadowRoot?.querySelector(".srch-dropdown");
      const items = dd ? [...dd.querySelectorAll(".srch-item,.srch-hist-item")] : [];
      const draft = this._searchDraft||"";
      switch (ev.key) {
        case "ArrowDown":
          ev.preventDefault();
          this._srchIdx = Math.min(this._srchIdx+1, items.length-1);
          items.forEach((it,i) => it.classList.toggle("focused", i===this._srchIdx));
          if (items[this._srchIdx]?.dataset.title) el.value = items[this._srchIdx].dataset.title;
          break;
        case "ArrowUp":
          ev.preventDefault();
          this._srchIdx = Math.max(this._srchIdx-1, -1);
          items.forEach((it,i) => it.classList.toggle("focused", i===this._srchIdx));
          if (this._srchIdx === -1) el.value = draft;
          break;
        case "Enter":
          ev.preventDefault();
          clearTimeout(this._searchTimer);
          if (this._srchIdx >= 0 && items[this._srchIdx]) { items[this._srchIdx].click(); return; }
          const val = el.value.trim();
          if (val.length >= _SRCH_MIN) this._triggerSearch(val);
          break;
        case "Escape":
          this._typing=false; this._searchDraft=null; this._srchIdx=-1;
          if (dd) dd.classList.remove("open");
          el.blur(); this.render();
          break;
      }
    });
  }

  _startVinyl(isPlaying, isPaused) {
    const v = window._vinyl;
    if (v.raf) { cancelAnimationFrame(v.raf); v.raf = null; }
    const applyAngle = () => {
      const img = this.shadowRoot?.querySelector(".cover img");
      if (img) img.style.transform = `rotate(${v.angle}deg)`;
    };
    if (!isPlaying && !isPaused) { v.angle = 0; applyAngle(); return; }
    applyAngle();
    if (isPaused) return;
    v.last = performance.now();
    const spin = (now) => {
      if (!this.shadowRoot?.querySelector(".cover.playing")) { v.raf = null; return; }
      const img = this.shadowRoot?.querySelector(".cover img");
      if (!img) { v.raf = null; return; }
      const delta = now-(v.last||now);
      v.last  = now;
      v.angle = (v.angle+delta*(360/32000))%360;
      img.style.transform = `rotate(${v.angle}deg)`;
      v.raf = requestAnimationFrame(spin);
    };
    v.raf = requestAnimationFrame(spin);
  }

  _renderTrackList(tracks, artist) {
    if (!tracks||!tracks.trim()) return "";
    const items = tracks.split("||").filter(t => t.trim());
    if (!items.length) return "";
    return `<div class="lfm-panel">
      <div class="lfm-header">
        <span class="lfm-label">🎵 Top · ${this.esc(artist)}</span>
        <span class="lfm-close" data-action="clear-tracks">✕</span>
      </div>
      <div class="lfm-list">
        ${items.map((t,i) => `
          <div class="lfm-row" data-action="play-track"
            data-title="${this.esc(t.trim())}" data-artist="${this.esc(artist)}">
            <span class="lfm-n">${i+1}</span>
            <span class="lfm-t">${this.esc(t.trim())}</span>
            <span class="lfm-p">▶</span>
          </div>`).join("")}
      </div>
    </div>`;
  }

  render() {
    if (!this.shadowRoot||!this._hass) return;
    const mode = this.mode();
    const html = mode==="TV" ? this.renderTV() : this.renderMusic();
    const scrollSave = {};
    this.shadowRoot.querySelectorAll(".tt-wrap,.tracks-list,.scroll-zone,.q-list,.lfm-list").forEach(el => {
      if (el.className) scrollSave[el.className] = el.scrollTop;
    });
    this.shadowRoot.innerHTML = `${this.css(this._dynRgb)}<div class="shell${mode==="TV"?" tv":""}">${html}</div>`;
    this.bind();
    this.shadowRoot.querySelectorAll(".tt-wrap,.tracks-list,.scroll-zone,.q-list,.lfm-list").forEach(el => {
      if (scrollSave[el.className] != null) el.scrollTop = scrollSave[el.className];
    });
    if (this._typing && this._searchDraft !== null) {
      const inp = this.shadowRoot?.querySelector(".sinp");
      if (inp && document.activeElement !== inp) inp.value = this._searchDraft;
    }
    if (this._typing && this._searchDraft && this._searchDraft.length >= _SRCH_MIN) {
      const cached = this._srchCache?.get(this._searchDraft.trim());
      if (cached) {
        this._lastQuery = this._searchDraft.trim();
        this._renderDropdown(cached);
      } else if (this._srchReqId > 0) {
        const dd = this.shadowRoot?.querySelector(".srch-dropdown");
        if (dd) { dd.innerHTML = this._buildSpinner(); dd.classList.add("open"); }
      }
    }
    if (mode !== "TV") {
      const info   = this.roomInfo();
      const art    = this.attr(info.id,"entity_picture")||"";
      const title  = this.attr(info.id,"media_title")||"";
      const artist = this.attr(info.id,"media_artist")||"";
      this._updateDyn(art, info.rgb, title+"|"+artist);
    }
  }

  css(dynRgb) { return `<style>
    :host { display: block; --dyn: ${dynRgb||'255,143,179'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    button, input { font: inherit; border: 0; outline: none; }
    button { cursor: pointer; -webkit-tap-highlight-color: transparent; user-select: none; }
    .shell {
      position: relative; overflow: hidden; border-radius: 26px;
      background: rgba(8,10,14,.96);
      border: 1px solid rgba(255,255,255,.07);
      box-shadow: 0 28px 72px rgba(0,0,0,.55), 0 4px 16px rgba(0,0,0,.30);
      color: #fff;
    }
    .backdrop {
      position: absolute; inset: 0; z-index: 0;
      background-size: cover; background-position: center;
      filter: blur(80px) saturate(280%) brightness(.26);
      transform: scale(2.2); opacity: .70;
      transition: background-image 1.2s ease;
    }
    .backdrop-fade {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(105deg, rgba(8,10,14,.05) 0%, rgba(8,10,14,.40) 30%, rgba(8,10,14,.82) 58%, rgba(8,10,14,.97) 100%);
    }
    .layout { position: relative; z-index: 2; display: flex; flex-direction: column; padding: 13px 16px 14px; gap: 9px; }
    .topbar { display: flex; align-items: center; gap: 9px; }
    .segmented {
      display: inline-flex; gap: 3px; padding: 4px; border-radius: 999px;
      background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.09); flex-shrink: 0;
    }
    .tab {
      height: 28px; padding: 0 12px; border-radius: 999px; background: transparent;
      color: rgba(255,255,255,.35); display: inline-flex; align-items: center; gap: 6px;
      font-size: 9px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase;
      transition: all .16s;
    }
    .tab.active { color: #fff; background: rgba(var(--dyn),.20); box-shadow: 0 0 16px rgba(var(--dyn),.15); }
    .search-outer { flex: 1; display: flex; flex-direction: column; position: relative; min-width: 0; }
    .search-wrap {
      display: flex; align-items: center; height: 36px; border-radius: 999px;
      background: rgba(0,0,0,.30); border: 1px solid rgba(255,255,255,.10);
      transition: border-color .18s, box-shadow .18s; overflow: hidden;
    }
    .search-wrap:focus-within { border-color: rgba(var(--dyn),.50); box-shadow: 0 0 0 3px rgba(var(--dyn),.10); }
    .sico { width: 32px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.30); flex-shrink: 0; }
    .sinp { flex: 1; height: 100%; background: transparent; border: none; outline: none; color: rgba(255,255,255,.90); font-size: 12px; font-weight: 600; min-width: 0; }
    .sinp::placeholder { color: rgba(255,255,255,.22); }
    .sbtn {
      height: 22px; padding: 0 8px; margin-right: 5px; border-radius: 7px; flex-shrink: 0;
      background: rgba(0,0,0,.30); border: 1px solid rgba(255,255,255,.09);
      color: rgba(255,255,255,.35); font-size: 9px; font-weight: 850;
      display: flex; align-items: center; cursor: pointer; transition: all .14s; white-space: nowrap;
    }
    .sbtn:hover { background: rgba(var(--dyn),.20); color: rgb(var(--dyn)); }
    .sbtn.lfm { color: rgba(126,224,181,.60); border-color: rgba(126,224,181,.14); }
    .sbtn.lfm:hover { background: rgba(126,224,181,.18); color: #7ee0b5; }
    .srch-dropdown {
      position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 999;
      background: rgba(10,12,17,.97); border: 1px solid rgba(255,255,255,.12);
      border-radius: 16px; overflow-x: hidden; overflow-y: auto;
      max-height: 340px;
      box-shadow: 0 20px 60px rgba(0,0,0,.75), 0 4px 16px rgba(0,0,0,.40);
      backdrop-filter: blur(28px);
      display: none; flex-direction: column;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent;
    }
    .srch-dropdown::-webkit-scrollbar { width: 3px; }
    .srch-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
    .srch-dropdown.open { display: flex; }
    .srch-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px 6px; border-bottom: 1px solid rgba(255,255,255,.05);
      position: sticky; top: 0; background: rgba(10,12,17,.97); z-index: 1;
    }
    .srch-count { font-size: 8px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.25); }
    .srch-act {
      font-size: 8.5px; font-weight: 800; color: rgba(255,143,179,.55); cursor: pointer;
      padding: 2px 7px; border-radius: 5px; background: rgba(255,143,179,.06); transition: all .12s;
    }
    .srch-act:hover { color: rgba(255,143,179,.90); background: rgba(255,143,179,.12); }
    .srch-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,.03); transition: background .10s; position: relative;
    }
    .srch-item:last-child { border-bottom: none; }
    .srch-item:hover, .srch-item.focused { background: rgba(var(--dyn),.09); }
    .srch-item.focused::before { content:""; position:absolute; left:0; top:4px; bottom:4px; width:2.5px; background:rgb(var(--dyn)); border-radius:0 3px 3px 0; }
    .srch-thumb { flex-shrink: 0; width: 38px; height: 38px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,.05); }
    .si-fb { width: 38px; height: 38px; border-radius: 8px; background: rgba(255,255,255,.06); display: flex; align-items: center; justify-content: center; font-size: 15px; color: rgba(var(--dyn),.55); }
    .srch-meta { flex: 1; min-width: 0; }
    .srch-title { font-size: 12.5px; font-weight: 750; color: rgba(255,255,255,.90); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .srch-sub { font-size: 10px; color: rgba(255,255,255,.38); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    mark.srch-hl { background: rgba(var(--dyn),.25); color: rgb(var(--dyn)); border-radius: 3px; padding: 0 2px; font-style: normal; }
    .srch-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
    .srch-badge {
      font-size: 7.5px; font-weight: 950; letter-spacing: .10em; text-transform: uppercase;
      padding: 2px 6px; border-radius: 999px;
      background: rgba(var(--cc,var(--dyn)),.12); color: rgb(var(--cc,var(--dyn)));
      border: 1px solid rgba(var(--cc,var(--dyn)),.22); white-space: nowrap;
    }
    .srch-dur { font-size: 8.5px; font-weight: 700; color: rgba(255,255,255,.25); font-variant-numeric: tabular-nums; }
    .srch-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 16px; color: rgba(255,255,255,.25); font-size: 11px; font-weight: 600; }
    .srch-empty-ico { font-size: 30px; opacity: .2; }
    .srch-hist-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,.03); transition: background .10s; }
    .srch-hist-item:last-child { border-bottom: none; }
    .srch-hist-item:hover, .srch-hist-item.focused { background: rgba(255,255,255,.04); }
    .srch-hist-ico { font-size: 13px; color: rgba(255,255,255,.20); flex-shrink: 0; }
    .srch-hist-txt { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.60); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .srch-spin-wrap { display: flex; align-items: center; gap: 10px; padding: 14px; font-size: 10px; color: rgba(255,255,255,.28); }
    .srch-spin { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 2px solid rgba(var(--dyn),.18); border-top-color: rgb(var(--dyn)); animation: srch-rotate .7s linear infinite; }
    @keyframes srch-rotate { to { transform: rotate(360deg); } }
    .queue-panel { background: rgba(12,14,18,.95); border: 1px solid rgba(255,255,255,.10); border-radius: 14px; margin: 8px 0; overflow: hidden; }
    .q-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 8px; border-bottom: 1px solid rgba(255,255,255,.07); }
    .q-ttl { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .7; }
    .q-count { font-size: 11px; opacity: .4; }
    .q-list { max-height: 260px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
    .q-list::-webkit-scrollbar { width: 3px; }
    .q-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
    .q-row { display: flex; align-items: center; gap: 8px; padding: 7px 14px; border-bottom: 1px solid rgba(255,255,255,.04); transition: background .15s; }
    .q-row:last-child { border-bottom: none; }
    .q-row:hover { background: rgba(255,255,255,.05); }
    .q-current { background: rgba(var(--dyn),.08); }
    .q-current .q-title { color: rgb(var(--dyn)); font-weight: 600; }
    .q-num { font-size: 10px; opacity: .35; min-width: 16px; text-align: center; flex-shrink: 0; }
    .q-info { flex: 1; min-width: 0; }
    .q-title { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .q-artist { font-size: 10px; opacity: .45; margin-top: 1px; }
    .q-dur { font-size: 10px; opacity: .35; flex-shrink: 0; }
    .q-empty { padding: 20px; text-align: center; font-size: 12px; opacity: .4; }
    .t-btn.active { color: rgb(var(--dyn)); }
    .source { display: flex; align-items: center; gap: 6px; flex-shrink: 0; font-size: 8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.35); white-space: nowrap; }
    .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: rgb(var(--dyn)); box-shadow: 0 0 8px rgba(var(--dyn),.9); animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
    .hero { display: grid; grid-template-columns: 136px minmax(0,1fr); gap: 16px; align-items: center; }
    .cover-zone { position: relative; width: 136px; height: 136px; flex-shrink: 0; }
    .cover-glow { position: absolute; inset: -18px; border-radius: 999px; background: radial-gradient(circle, rgba(var(--dyn),.35), transparent 68%); filter: blur(20px); opacity: .60; pointer-events: none; transition: background 1.2s; }
    .cover {
      position: relative; width: 136px; height: 136px; border-radius: 18px; overflow: hidden;
      box-shadow: 0 16px 44px rgba(0,0,0,.65), 0 4px 14px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.10);
      border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.05);
      display: flex; align-items: center; justify-content: center;
      transition: border-radius .6s cubic-bezier(.4,0,.2,1), box-shadow .6s cubic-bezier(.4,0,.2,1);
    }
    .cover.playing { border-radius: 50%; box-shadow: 0 0 0 3px rgba(var(--dyn),.22), 0 0 0 7px rgba(var(--dyn),.08), 0 16px 44px rgba(0,0,0,.65); }
    .cover.paused { border-radius: 50%; box-shadow: 0 0 0 3px rgba(var(--dyn),.10), 0 0 0 7px rgba(var(--dyn),.04), 0 16px 44px rgba(0,0,0,.65); }
    .cover img { width: 100%; height: 100%; object-fit: cover; display: block; transform-origin: center center; will-change: transform; }
    .cover.logo img { width: 74%; height: 74%; object-fit: contain; }
    .ph { color: rgba(var(--dyn),.50); }
    .info { min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0; }
    .badges { display: flex; gap: 5px; flex-wrap: nowrap; overflow: hidden; margin-bottom: 8px; }
    .badge { height: 20px; padding: 0 8px; border-radius: 999px; flex-shrink: 0; font-size: 8px; font-weight: 950; letter-spacing: .09em; text-transform: uppercase; display: inline-flex; align-items: center; }
    .badge.acc  { background: rgba(var(--dyn),.16); border: 1px solid rgba(var(--dyn),.32); color: rgb(var(--dyn)); }
    .badge.grn  { background: rgba(126,224,181,.10); border: 1px solid rgba(126,224,181,.26); color: #7ee0b5; }
    .badge.soft { background: rgba(0,0,0,.28); border: 1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.38); }
    .badge.red  { background: rgba(255,100,100,.12); border: 1px solid rgba(255,100,100,.28); color: #ff8a80; }
    .tt-wrap { overflow: hidden; margin-bottom: 4px; position: relative; mask-image: linear-gradient(90deg, transparent 0%, #000 3%, #000 87%, transparent 100%); -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 3%, #000 87%, transparent 100%); }
    .tt { font-size: 26px; font-weight: 950; letter-spacing: -.05em; line-height: 1.04; color: rgba(255,255,255,.97); white-space: nowrap; text-shadow: 0 2px 20px rgba(0,0,0,.55); display: inline-block; will-change: transform; }
    .tt.scrolling { animation: titlescroll 14s cubic-bezier(.4,0,.6,1) infinite; }
    @keyframes titlescroll { 0% { transform: translateX(0); } 12% { transform: translateX(0); } 78% { transform: translateX(var(--sd,-50%)); } 90% { transform: translateX(var(--sd,-50%)); } 100% { transform: translateX(0); } }
    .ss { font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,.50); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
    .dd { font-size: 10px; color: rgba(255,255,255,.24); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prog-zone { padding: 0 2px; }
    .prog-times { display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 750; color: rgba(255,255,255,.30); font-variant-numeric: tabular-nums; margin-bottom: 6px; }
    .prog-hit { padding: 8px 0; margin: -8px 0; cursor: pointer; position: relative; touch-action: none; }
    .prog-rail { height: 3px; border-radius: 99px; background: rgba(255,255,255,.10); position: relative; overflow: visible; }
    .prog-bar { height: 100%; border-radius: 99px; background: linear-gradient(90deg, rgba(var(--dyn),.55), #fff 85%); position: relative; transition: none; min-width: 3px; will-change: width; }
    .prog-bar::after { content: ""; position: absolute; right: -5px; top: 50%; width: 11px; height: 11px; transform: translateY(-50%); border-radius: 50%; background: linear-gradient(135deg, rgb(var(--dyn)), #fff); box-shadow: 0 1px 5px rgba(0,0,0,.55), 0 0 10px rgba(var(--dyn),.45); transition: width .14s, height .14s, right .14s; }
    .prog-hit:hover .prog-bar::after { width: 15px; height: 15px; right: -7px; box-shadow: 0 2px 10px rgba(0,0,0,.55), 0 0 16px rgba(var(--dyn),.65); }
    .prog-rail.ind { overflow: hidden; }
    .prog-rail.ind .prog-bar { width: 35% !important; transition: none; background: linear-gradient(90deg, transparent, rgba(255,255,255,.65), #fff, rgba(255,255,255,.65), transparent); animation: indprog 1.7s ease-in-out infinite; }
    .prog-rail.ind .prog-bar::after { display: none; }
    @keyframes indprog { 0%{transform:translateX(-150%)} 100%{transform:translateX(310%)} }
    .dock {
      border-radius: 16px; padding: 10px 12px;
      background: rgba(0,0,0,.28); border: 1px solid rgba(var(--dyn),.14);
      box-shadow: inset 0 1px 0 rgba(var(--dyn),.08), 0 0 24px rgba(var(--dyn),.05);
      backdrop-filter: blur(20px);
      display: flex; flex-direction: column; gap: 9px;
      transition: border-color .8s ease, box-shadow .8s ease;
    }
    .room-vol { display: flex; align-items: center; gap: 6px; }
    .r-pill { height: 27px; padding: 0 11px; border-radius: 999px; background: rgba(0,0,0,.30); border: 1px solid rgba(255,255,255,.07); color: rgba(255,255,255,.40); font-size: 9.5px; font-weight: 850; display: inline-flex; align-items: center; gap: 5px; transition: all .14s; cursor: pointer; flex-shrink: 0; }
    .r-pill.active { color: #fff; background: rgba(var(--dyn),.18); border-color: rgba(var(--dyn),.36); box-shadow: 0 0 14px rgba(var(--dyn),.12); }
    .r-pill:active { transform: scale(.93); }
    .sep { width: 1px; height: 14px; background: rgba(255,255,255,.08); flex-shrink: 0; margin: 0 1px; }
    .vol-inline { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; }
    .v-ico { color: rgba(255,255,255,.28); flex-shrink: 0; display: flex; align-items: center; }
    .v-ico.big { color: rgba(255,255,255,.45); }
    .vol-hit { flex: 1; padding: 8px 0; margin: -8px 0; cursor: pointer; position: relative; }
    .vol-rail { height: 3px; border-radius: 99px; background: rgba(255,255,255,.10); position: relative; }
    .vol-bar { height: 100%; border-radius: 99px; background: linear-gradient(90deg, rgba(var(--dyn),.40), rgba(255,255,255,.65) 85%); position: relative; transition: width .15s; min-width: 3px; }
    .vol-bar::after { content: ""; position: absolute; right: -5px; top: 50%; width: 11px; height: 11px; transform: translateY(-50%); border-radius: 50%; background: linear-gradient(135deg, rgb(var(--dyn)), #fff); box-shadow: 0 1px 5px rgba(0,0,0,.45), 0 0 10px rgba(var(--dyn),.35); transition: width .14s, height .14s, right .14s; }
    .vol-hit:hover .vol-bar::after { width: 15px; height: 15px; right: -7px; box-shadow: 0 2px 10px rgba(0,0,0,.45), 0 0 16px rgba(var(--dyn),.55); }
    .transport { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .t-left, .t-right { display: flex; align-items: center; gap: 5px; }
    .t-btn { width: 34px; height: 34px; border-radius: 999px; background: rgba(0,0,0,.32); border: 1px solid rgba(255,255,255,.10); color: rgba(255,255,255,.60); display: flex; align-items: center; justify-content: center; transition: transform .14s, background .14s, color .14s; flex-shrink: 0; backdrop-filter: blur(8px); }
    .t-btn:hover { background: rgba(0,0,0,.50); color: #fff; }
    .t-btn:active { transform: scale(.91); }
    .t-btn.prev-next { color: rgba(var(--dyn),.85); border-color: rgba(var(--dyn),.18); background: rgba(0,0,0,.36); }
    .t-btn.prev-next:hover { color: rgb(var(--dyn)); background: rgba(0,0,0,.52); }
    .t-btn.side-ico { color: rgba(var(--dyn),.62); border-color: rgba(var(--dyn),.12); background: rgba(0,0,0,.30); }
    .t-btn.side-ico:hover { color: rgba(var(--dyn),.90); background: rgba(0,0,0,.46); }
    .t-btn.play { width: 50px; height: 50px; background: #fff; color: rgba(6,8,12,.90); border: none; backdrop-filter: none; box-shadow: 0 10px 28px rgba(0,0,0,.50), 0 0 26px rgba(var(--dyn),.22); transition: transform .14s, box-shadow .14s; }
    .t-btn.play:hover { transform: scale(1.07); box-shadow: 0 14px 36px rgba(0,0,0,.55), 0 0 30px rgba(var(--dyn),.35); }
    .t-btn.play:active { transform: scale(.93); }
    .t-btn.stop { color: #ff8a80; border-color: rgba(255,138,128,.18); background: rgba(0,0,0,.35); }
    .t-btn.pwr  { color: #ff8a80; border-color: rgba(255,138,128,.18); background: rgba(0,0,0,.35); }
    .t-btn.stop:hover, .t-btn.pwr:hover { background: rgba(255,138,128,.12); }
    .lfm-panel { border-radius: 14px; overflow: hidden; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.07); }
    .lfm-header { display: flex; align-items: center; justify-content: space-between; padding: 7px 11px; border-bottom: 1px solid rgba(255,255,255,.05); }
    .lfm-label { font-size: 8.5px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.32); }
    .lfm-close { font-size: 9.5px; color: rgba(255,255,255,.22); cursor: pointer; padding: 2px 7px; border-radius: 6px; background: rgba(255,255,255,.05); transition: all .12s; }
    .lfm-close:hover { color: rgba(255,255,255,.55); background: rgba(255,255,255,.09); }
    .lfm-list { max-height: 180px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.07) transparent; }
    .lfm-row { display: flex; align-items: center; gap: 9px; padding: 7px 11px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,.04); transition: background .11s; }
    .lfm-row:hover { background: rgba(var(--dyn),.07); }
    .lfm-row:last-child { border-bottom: none; }
    .lfm-n { width: 17px; height: 17px; border-radius: 50%; background: rgba(255,255,255,.05); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; color: rgba(255,255,255,.22); flex-shrink: 0; }
    .lfm-t { flex: 1; font-size: 12px; font-weight: 750; color: rgba(255,255,255,.82); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lfm-p { font-size: 11px; color: rgba(255,255,255,.12); transition: color .11s; }
    .lfm-row:hover .lfm-p { color: rgb(var(--dyn)); }
    .tv { --dyn: 126,224,181; }
    .tv-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; padding: 4px 0; }
    .tv-btn { height: 30px; padding: 0 13px; border-radius: 999px; background: rgba(0,0,0,.30); border: 1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.55); font-size: 9.5px; font-weight: 850; display: inline-flex; align-items: center; gap: 5px; transition: transform .14s; backdrop-filter: blur(8px); }
    .tv-btn:active { transform: scale(.93); }
    .tv-btn.ok { color: rgba(6,8,12,.92); background: linear-gradient(135deg, rgba(126,224,181,.95), rgba(124,200,255,.88)); border-color: transparent; padding: 0 18px; box-shadow: 0 6px 18px rgba(126,224,181,.18); }
    .tv-btn.warn { color: #ff8a80; border-color: rgba(255,138,128,.14); background: rgba(0,0,0,.35); }
    .tv-btn.blue { color: #7cc8ff; }
    .tv-btn.vod  { color: rgba(255,200,100,.80); border-color: rgba(255,200,100,.18); }
  </style>`; }

  ico(n, s = 18) {
    const P = {
      tv:    'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z',
      music: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
      srch:  'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      play:  'M8 5v14l11-7z',
      pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
      prev:  'M6 6h2v12H6zm3.5 6l8.5 6V6z',
      next:  'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
      stop:  'M6 6h12v12H6z',
      radio: 'M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z',
      xfer:  'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
      vols:  'M7 9v6h4l5 5V4l-5 5H7z',
      volb:  'M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z',
      back:  'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
      home:  'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
      chu:   'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
      chd:   'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
      ref:   'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
      pwr:   'M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z',
      more:  'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
      queue: 'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zm14.5-2.25L15 11v8l2.5-2.75L20 19l1.5-1.5-3-3.75z',
      film:  'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
      serie: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-10 8H8v3H6v-3H3V9h3V6h2v3h3v2zm4.5 5c-.83 0-1.5-.67-1.5-1.5S14.67 13 15.5 13s1.5.67 1.5 1.5S16.33 16 15.5 16zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 11 18.5 11s1.5.67 1.5 1.5S19.33 13 18.5 13z',
    };
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" style="display:block;flex-shrink:0"><path d="${P[n]||P.more}"/></svg>`;
  }

  renderMusic() {
    const room     = this.room();
    const info     = this.roomInfo(room);
    const masterId = info.id;
    const master   = this.st(masterId);
    const e        = this.st(info.id);
    const st       = master?.state || e?.state || "off";
    const isP      = st === "playing";
    const isPaused = st === "paused";
    const srch     = this._searchDraft !== null ? this._searchDraft : this.state(this.config.search_text,"");
    const c        = this.config;
    const denonSt  = this.st(c.denon_player);
    const mediaId  = (room === "Maison" || room === "Cuisine") && denonSt?.attributes?.media_title
      ? c.denon_player : masterId;
    const title    = this.attr(mediaId,"media_title")||this.attr(mediaId,"media_album_name")||srch||"Prêt";
    const artist   = this.attr(mediaId,"media_artist")||this.attr(mediaId,"media_channel")||"";
    const album    = this.attr(mediaId,"media_album_name")||"";
    const art      = this.attr(mediaId,"entity_picture")||this.attr(masterId,"entity_picture")||"";
    const vol      = this.attr(info.id,"volume_level") != null ? Math.round(this.attr(info.id,"volume_level")*100) : 0;
    const sub      = artist ? `${artist}${album && album !== title ? " · "+album : ""}` : "Tidal · Music Assistant";
    const status   = isP ? "EN LECTURE" : isPaused ? "PAUSE" : st==="off" ? "ÉTEINT" : st==="idle" ? "PRÊT" : String(st).toUpperCase();
    const prog     = this.progress(masterId, isP);
    const lfmTracks = this.state("input_text.YOUR_LASTFM_TRACKS","");
    const lfmArtist = this.state("input_text.YOUR_LASTFM_ARTIST","");
    const coverCls  = isP ? "playing" : isPaused ? "paused" : "";

    return `
      ${art ? `<div class="backdrop" style="background-image:url('${this.esc(art)}')"></div>` : ""}
      <div class="backdrop-fade"></div>
      <div class="layout">
        <div class="topbar">
          <div class="segmented">
            <button class="tab" data-action="mode-tv">${this.ico("tv",11)} TV</button>
            <button class="tab active" data-action="mode-music">${this.ico("music",11)} MUSIQUE</button>
          </div>
          <div class="search-outer">
            <div class="search-wrap">
              <div class="sico">${this.ico("srch",13)}</div>
              <input class="sinp" data-action="search"
                value="${this.esc(srch)}" placeholder="Titre, artiste, album, radio…"
                autocomplete="off" spellcheck="false" autocorrect="off">
              <div class="sbtn" data-action="launch">⏎</div>
              <div class="sbtn lfm" data-action="lastfm-search">🎵</div>
            </div>
            <div class="srch-dropdown"></div>
          </div>
          <div class="source"><span class="dot"></span>${this.esc(info.name)} · ${this.esc(status)}</div>
        </div>
        <div class="hero">
          <div class="cover-zone">
            <div class="cover-glow"></div>
            <div class="cover ${coverCls}">
              ${art ? `<img src="${this.esc(art)}" alt="">` : `<span class="ph">${this.ico("music",54)}</span>`}
            </div>
          </div>
          <div class="info">
            <div class="badges">
              <span class="badge acc">TIDAL</span>
              <span class="badge grn">HEOS</span>
              <span class="badge soft">${this.esc(info.name)}</span>
            </div>
            <div class="tt-wrap"><div class="tt">${this.esc(title)}</div></div>
            <div class="ss">${this.esc(sub)}</div>
            <div class="dd">${srch ? `Recherche : ${this.esc(srch)}` : "Titre, artiste, album ou radio…"}</div>
          </div>
        </div>
        <div class="prog-zone">
          <div class="prog-times"><span>${this.fmt(prog.pos)}</span><span>${prog.dur > 0 ? this.fmt(prog.dur) : "--:--"}</span></div>
          <div class="prog-hit" data-action="seek">
            <div class="prog-rail${prog.indeterminate ? " ind" : ""}">
              <div class="prog-bar" data-dur="${prog.dur}" data-pos="${prog.pos}" data-updated="${prog.updatedAt}" data-playing="${isP ? 1 : 0}" style="width:${prog.pct}%"></div>
            </div>
          </div>
        </div>
        ${this._queueOpen ? this._renderQueuePanel() : ""}
        ${this._renderTrackList(lfmTracks, lfmArtist)}
        <div class="dock">
          <div class="room-vol">
            <button class="r-pill ${room==="Denon"?"active":""}"   data-action="room-denon">${this.ico("music",10)} Denon</button>
            <button class="r-pill ${room==="Cuisine"?"active":""}" data-action="room-cuisine">${this.ico("music",10)} Cuisine</button>
            <button class="r-pill ${room==="Maison"?"active":""}"  data-action="room-maison">${this.ico("music",10)} Maison</button>
            <div class="sep"></div>
            <div class="vol-inline">
              <span class="v-ico">${this.ico("vols",15)}</span>
              <div class="vol-hit" data-action="vol-seek"><div class="vol-rail"><div class="vol-bar" style="width:${vol}%"></div></div></div>
              <span class="v-ico big">${this.ico("volb",17)}</span>
            </div>
          </div>
          <div class="transport">
            <div class="t-left">
              <button class="t-btn side-ico" data-action="radio">${this.ico("radio",17)}</button>
              <button class="t-btn side-ico" data-action="transfer">${this.ico("xfer",17)}</button>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <button class="t-btn prev-next" data-action="prev">${this.ico("prev",20)}</button>
              <button class="t-btn play" data-action="playpause">${this.ico(isP?"pause":"play",24)}</button>
              <button class="t-btn prev-next" data-action="next">${this.ico("next",20)}</button>
            </div>
            <div class="t-right">
              <button class="t-btn stop" data-action="stop">${this.ico("stop",17)}</button>
              ${room === "Denon" ? `<button class="t-btn pwr" data-action="denon-power">${this.ico("pwr",17)}</button>` : ""}
              <button class="t-btn side-ico${this._queueOpen?' active':''}" data-action="toggle-queue">${this.ico("queue",17)}</button>
              <button class="t-btn side-ico" data-action="more">${this.ico("more",17)}</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  _parseTiviContent() {
    const c        = this.config;
    const vodTitre = (this.state(c.vod_titre,"") || "").trim();
    const vodSousT = (this.state(c.vod_sous_titre,"") || "").trim();
    const adb      = (this.attr(c.shield_player,"adb_response","") || "");
    const EP_RE    = /(?:[Ss](\d{1,2})[xXeE](\d{1,2})|(\d{1,2})[xX](\d{1,2}))/;
    const mAdbFull = adb.match(/text="[|｜]?[A-Z]{2,6}[|｜]?\s*(.+?)"/);
    const adbRaw   = mAdbFull ? mAdbFull[1].trim() : "";
    if (vodTitre) {
      const searchStr = vodTitre+" "+vodSousT+" "+adbRaw;
      const mEp = searchStr.match(EP_RE);
      if (mEp) {
        const season  = (mEp[1]||mEp[3]||"01").padStart(2,"0");
        const episode = (mEp[2]||mEp[4]||"01").padStart(2,"0");
        return { type:"serie", rawTitle:vodTitre, season, episode };
      }
      return { type:"film", rawTitle:vodTitre };
    }
    if (adbRaw) {
      const mEp = adbRaw.match(EP_RE);
      if (mEp) {
        const season  = (mEp[1]||mEp[3]||"01").padStart(2,"0");
        const episode = (mEp[2]||mEp[4]||"01").padStart(2,"0");
        const rawTitle = adbRaw.replace(/\s*\d{1,2}[xXeE]\d{1,2}.*/,"").replace(/[|｜][A-Z]+[|｜]\s*/,"").trim();
        return { type:"serie", rawTitle, season, episode };
      }
    }
    return { type:"live", rawTitle:adbRaw };
  }

  renderTV() {
    const c   = this.config;
    const id  = this.activeTv();
    const e   = this.st(id);
    const app = this.attr(id,"app_id","");
    const mct = this.attr(id,"media_content_type","");
    const isTivi      = id === c.shield_player && app === "YOUR_TIVIMATE_APP_ID";
    const isPlex      = id === c.plex_player;
    const isVodMovie  = isPlex && mct === "movie";
    const isVodSeries = isPlex && (mct === "tvshow" || mct === "episode");
    const tiviContent    = isTivi ? this._parseTiviContent() : { type:"live", rawTitle:"" };
    const tiviIsVodSerie = isTivi && tiviContent.type === "serie";
    const tiviIsVodFilm  = isTivi && tiviContent.type === "film";
    const tiviIsLive     = isTivi && tiviContent.type === "live";
    const tiviIsVod      = tiviIsVodSerie || tiviIsVodFilm;
    const isVod          = isVodMovie || isVodSeries || tiviIsVod;
    const vodTitre    = this.state(c.vod_titre,"");
    const vodJaquette = this.state(c.vod_jaquette,"");
    const vodSousT    = this.state(c.vod_sous_titre,"");
    let title, sub, art, desc, badge, status, extraBadge = "";
    if (tiviIsVodSerie) {
      const rawClean = tiviContent.rawTitle.replace(/\|[A-Z]+\|\s*/g,"").replace(/[Ss]\d+[xXeE]\d+.*/,"").trim();
      title = vodTitre||rawClean||"Série";
      sub   = vodSousT||(tiviContent.season ? `Saison ${parseInt(tiviContent.season)} · Épisode ${parseInt(tiviContent.episode)}` : "");
      art   = vodJaquette||this.attr(id,"entity_picture","");
      desc  = this.state(c.vod_description,"").slice(0,200);
      badge = "SÉRIE"; status = "TIVIMATE";
      const note = this.state(c.vod_note,"");
      extraBadge = (tiviContent.season ? `<span class="badge soft">S${tiviContent.season}E${tiviContent.episode}</span>` : "") + (note ? `<span class="badge grn">${this.esc(note)}</span>` : "");
    } else if (tiviIsVodFilm) {
      const rawClean = tiviContent.rawTitle.replace(/\|[A-Z]+\|\s*/g,"").trim();
      title = vodTitre||rawClean||"Film";
      sub   = vodSousT||"";
      art   = vodJaquette||this.attr(id,"entity_picture","");
      desc  = this.state(c.vod_description,"").slice(0,200);
      badge = "FILM"; status = "TIVIMATE";
      const annee = this.state(c.vod_annee,""), note = this.state(c.vod_note,"");
      extraBadge = (annee ? `<span class="badge soft">${this.esc(annee)}</span>` : "") + (note ? `<span class="badge grn">${this.esc(note)}</span>` : "");
    } else if (tiviIsLive) {
      title = this.state(c.tivi_channel,"TiviMate");
      sub   = this.state(c.tivi_program,"") || "TV en direct";
      desc  = this.state(c.tivi_description,"");
      art   = this.state(c.tivi_logo,"") || this.attr(id,"entity_picture","");
      badge = "LIVE"; status = "TV DIRECT";
      extraBadge = (this.state(c.tivi_time,"") ? `<span class="badge soft">${this.esc(this.state(c.tivi_time))}</span>` : "") + (this.state(c.tivi_duration,"") ? `<span class="badge soft">${this.esc(this.state(c.tivi_duration))}</span>` : "");
    } else if (isVodMovie) {
      title = this.attr(id,"media_title","")||vodTitre||"Film";
      sub   = this.attr(id,"media_summary","").slice(0,60)||vodSousT;
      art   = this.attr(id,"entity_picture","")||vodJaquette;
      desc  = this.state(c.vod_description,"").slice(0,180)||this.attr(id,"media_summary","").slice(0,180);
      badge = "FILM"; status = e?.state === "playing" ? "EN LECTURE" : "PLEX";
      const annee = this.state(c.vod_annee,""), note = this.state(c.vod_note,"");
      extraBadge = (annee ? `<span class="badge soft">${this.esc(annee)}</span>` : "") + (note ? `<span class="badge grn">${this.esc(note)}</span>` : "");
    } else if (isVodSeries) {
      title = this.attr(id,"media_series_title","")||vodTitre||"Série";
      sub   = this.attr(id,"media_title","")||vodSousT;
      art   = this.attr(id,"entity_picture","")||vodJaquette;
      desc  = this.state(c.vod_description,"").slice(0,180)||this.attr(id,"media_summary","").slice(0,180);
      badge = "SÉRIE"; status = e?.state === "playing" ? "EN LECTURE" : "PLEX";
      const season = this.attr(id,"media_season",""), episode = this.attr(id,"media_episode",""), note = this.state(c.vod_note,"");
      extraBadge = (season ? `<span class="badge soft">S${this.esc(String(season).padStart(2,"0"))}E${this.esc(String(episode).padStart(2,"0"))}</span>` : "") + (note ? `<span class="badge grn">${this.esc(note)}</span>` : "");
    } else {
      title = this.attr(id,"media_title","")||this.attr(id,"app_name","")||"Shield TV";
      sub   = this.attr(id,"app_name","")||"Android TV";
      art   = this.attr(id,"entity_picture","");
      desc  = ""; badge = isPlex ? "PLEX" : "SHIELD";
      status = (e?.state||"PRÊT").toUpperCase(); extraBadge = "";
    }
    const isP  = e?.state === "playing" || tiviIsLive;
    const prog = isVod ? this.progress(id, e?.state === "playing") : null;
    const sourceLabel = tiviIsVodSerie ? "TiviMate · Série" : tiviIsVodFilm ? "TiviMate · Film" : tiviIsLive ? "TiviMate · Live" : isVodMovie ? "Plex · Film" : isVodSeries ? "Plex · Série" : this.esc(this.attr(id,"app_name","Shield"));
    return `
      ${art ? `<div class="backdrop" style="background-image:url('${this.esc(art)}')"></div>` : ""}
      <div class="backdrop-fade"></div>
      <div class="layout">
        <div class="topbar">
          <div class="segmented">
            <button class="tab active" data-action="mode-tv">${this.ico("tv",11)} TV</button>
            <button class="tab" data-action="mode-music">${this.ico("music",11)} MUSIQUE</button>
          </div>
          <div class="source"><span class="dot"></span>${sourceLabel} · ${this.esc(status)}</div>
        </div>
        <div class="hero">
          <div class="cover-zone">
            <div class="cover-glow"></div>
            <div class="cover${tiviIsLive ? " logo" : ""}">
              ${art ? `<img src="${this.esc(art)}" alt="">` : `<span class="ph">${this.ico(tiviIsVodSerie||isVodSeries?"serie":tiviIsVodFilm||isVodMovie?"film":"tv",54)}</span>`}
            </div>
          </div>
          <div class="info">
            <div class="badges">
              <span class="badge ${tiviIsLive?"red":tiviIsVod?"acc":isVod?"acc":"soft"}">${this.esc(badge)}</span>
              ${extraBadge}
            </div>
            <div class="tt-wrap"><div class="tt">${this.esc(title)}</div></div>
            <div class="ss">${this.esc(sub)}</div>
            <div class="dd">${desc && desc !== "Aucun résumé disponible." ? this.esc(desc) : tiviIsLive ? "TV en direct · TiviMate" : tiviIsVod ? "VOD via TiviMate · TMDB" : isVod ? "Lecture Plex" : "Contrôle Shield, Plex et TiviMate."}</div>
          </div>
        </div>
        ${isVod && prog ? `
        <div class="prog-zone">
          <div class="prog-times"><span>${this.fmt(prog.pos)}</span><span>${prog.dur > 0 ? this.fmt(prog.dur) : "--:--"}</span></div>
          <div class="prog-hit" data-action="seek-tv">
            <div class="prog-rail${prog.indeterminate ? " ind" : ""}"><div class="prog-bar" style="width:${prog.pct}%"></div></div>
          </div>
        </div>` : ""}
        <div class="dock">
          <div class="tv-grid">
            <button class="tv-btn ok"   data-action="tv-ok">${this.ico("play",12)} OK</button>
            <button class="tv-btn"      data-action="tv-back">${this.ico("back",12)} Retour</button>
            <button class="tv-btn"      data-action="tv-home">${this.ico("home",12)} Home</button>
            <button class="tv-btn"      data-action="tv-channel-up">${this.ico("chu",12)} CH+</button>
            <button class="tv-btn"      data-action="tv-channel-down">${this.ico("chd",12)} CH-</button>
            <button class="tv-btn blue" data-action="tv-refresh">${this.ico("ref",12)} Refresh</button>
            <button class="tv-btn"      data-action="playpause-tv">${this.ico(isP?"pause":"play",12)} ${isP?"Pause":"Lecture"}</button>
            <button class="tv-btn warn" data-action="tv-power">${this.ico("pwr",12)} Power</button>
            <button class="tv-btn"      data-action="more-tv">${this.ico("more",12)} Infos</button>
            ${isVod ? `<button class="tv-btn vod" data-action="prev-tv">${this.ico("prev",12)} Précédent</button>` : ""}
            ${isVod ? `<button class="tv-btn vod" data-action="next-tv">${this.ico("next",12)} Suivant</button>` : ""}
          </div>
        </div>
      </div>`;
  }

  bind() {
    this.shadowRoot.querySelectorAll("[data-action]").forEach(el => {
      const a = el.getAttribute("data-action");
      if (a === "search") { this._bindSearch(el); return; }
      if (a === "vol-seek") {
        el.addEventListener("click", ev => {
          const r  = el.getBoundingClientRect();
          const p  = Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));
          const ri = this.roomInfo();
          if (ri.name === "Maison") {
            this.call("media_player","volume_set",{volume_level:p},{entity_id:this.config.denon_player});
            this.call("media_player","volume_set",{volume_level:p},{entity_id:this.config.cuisine_player});
          } else {
            this.call("media_player","volume_set",{volume_level:p},{entity_id:ri.id});
          }
        });
        return;
      }
      if (a === "seek") {
        let _seeking = false;
        const _getMid = () => this.roomInfo().id;
        const _getDur = () => this.attr(_getMid(),"media_duration") || 0;
        const _getP   = (ev) => {
          const r = el.getBoundingClientRect();
          const clientX = (ev.changedTouches||ev.touches)
            ? (ev.changedTouches?.[0]||ev.touches?.[0])?.clientX ?? ev.clientX
            : ev.clientX;
          return Math.max(0,Math.min(1,(clientX-r.left)/r.width));
        };
        const _updateBar = (p) => {
          const dur = _getDur(); if (!dur) return;
          const bar = el.querySelector(".prog-bar"); if (!bar) return;
          bar.style.width = (p*100).toFixed(2)+"%";
          bar.dataset.pos     = String(p*dur);
          bar.dataset.updated = String(Date.now());
        };
        const _commit = (p) => {
          const dur = _getDur(); if (!dur) return;
          _updateBar(p);
          this.call("media_player","media_seek",{seek_position:p*dur},{entity_id:_getMid()});
        };
        el.addEventListener("pointerdown", ev => { ev.stopPropagation(); _seeking=true; try { el.setPointerCapture(ev.pointerId); } catch {} _updateBar(_getP(ev)); });
        el.addEventListener("pointermove", ev => { if (_seeking) { ev.stopPropagation(); _updateBar(_getP(ev)); } });
        el.addEventListener("pointerup",   ev => { if (_seeking) { ev.stopPropagation(); _seeking=false; _commit(_getP(ev)); } });
        el.addEventListener("pointercancel", () => { _seeking=false; });
        el.addEventListener("touchstart", ev => { ev.preventDefault(); ev.stopPropagation(); _seeking=true; _updateBar(_getP(ev)); },{ passive:false });
        el.addEventListener("touchmove",  ev => { if (_seeking) { ev.preventDefault(); ev.stopPropagation(); _updateBar(_getP(ev)); } },{ passive:false });
        el.addEventListener("touchend",   ev => { if (_seeking) { ev.preventDefault(); _seeking=false; _commit(_getP(ev)); } },{ passive:false });
        el.addEventListener("touchcancel", () => { _seeking=false; });
        return;
      }
      if (a === "seek-tv") {
        el.addEventListener("click", ev => {
          const r   = el.getBoundingClientRect();
          const p   = Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));
          const tv  = this.activeTv();
          const dur = this.attr(tv,"media_duration") || 0;
          if (dur > 0) this.call("media_player","media_seek",{seek_position:p*dur},{entity_id:tv});
        });
        return;
      }
      el.addEventListener("click", () => this.handle(a, el));
    });

    const coverEl   = this.shadowRoot?.querySelector(".cover");
    const isPlaying = coverEl?.classList.contains("playing") ?? false;
    const isPaused  = coverEl?.classList.contains("paused")  ?? false;
    this._startVinyl(isPlaying, isPaused);

    requestAnimationFrame(() => {
      const wrap = this.shadowRoot?.querySelector(".tt-wrap");
      const el   = this.shadowRoot?.querySelector(".tt");
      if (!wrap||!el) return;
      el.classList.remove("scrolling");
      void el.offsetWidth;
      if (el.scrollWidth > wrap.clientWidth+6) {
        const dist = el.scrollWidth-wrap.clientWidth+12;
        el.style.setProperty("--sd",`-${dist}px`);
        setTimeout(() => el?.classList.add("scrolling"), 600);
      }
    });
  }

  handle(a, el) {
    const c = this.config, room = this.roomInfo(), masterId = room.id, tv = this.activeTv();
    if (a === "mode-tv")    return this.select(c.mode_select,"TV");
    if (a === "mode-music") return this.select(c.mode_select,"Musique");
    if (a === "room-denon" || a === "room-cuisine" || a === "room-maison") {
      const roomName = a==="room-denon" ? "Denon"
                     : a==="room-cuisine" ? "Cuisine" : "Maison";
      const currentRoom = this.room();

      this._lastArt = null;
      this._dynRgb  = null;

      if (currentRoom === roomName) {
        return this.select(c.music_player_select, roomName);
      }

      // Détecter si quelque chose joue
      const playingId = this._activePlaybackPlayer();
      const isPlaying = ["playing","paused"].includes(this.state(playingId,"off"));

      // Mettre à jour le sélecteur
      const pSelect = this.select(c.music_player_select, roomName);

      // Si lecture en cours → déclencher le script HEOS legacy
      if (isPlaying && c.script_transfer) {
        return Promise.resolve(pSelect)
          .then(() => new Promise(r => setTimeout(r, 350)))
          .then(() => this.script(c.script_transfer));
      }
      return pSelect;
    }

    if (a === "launch") {
      const v = String(this.shadowRoot.querySelector(".sinp")?.value ?? this.state(c.search_text,"") ?? "");
      return this.setSearch(v)
        .then(() => new Promise(r => setTimeout(r,350)))
        .then(() => this.script(c.script_launch));
    }
    if (a === "lastfm-search") {
      const artist = String(this.shadowRoot.querySelector(".sinp")?.value ?? this.state(c.search_text,"") ?? "").trim();
      if (!artist) return;
      return this.call("script","turn_on",{entity_id:"script.last_fm_top_tracks_artiste",variables:{artiste:artist}});
    }
    if (a === "play-track" && el) {
      const q = ((el.dataset.title||"")+" "+(el.dataset.artist||"")).trim();
      this._searchDraft = null;
      return this.setSearch(q)
        .then(() => new Promise(r => setTimeout(r,350)))
        .then(() => this.script(c.script_launch));
    }
    if (a === "clear-tracks") {
      this.call("input_text","set_value",{entity_id:"input_text.YOUR_LASTFM_TRACKS",value:""});
      this.call("input_text","set_value",{entity_id:"input_text.YOUR_LASTFM_ARTIST",value:""});
      return;
    }
    if (a === "radio")    return this.script(c.script_radio);
    if (a === "transfer") return this.script(c.script_transfer);

    const activeId = this._activePlaybackPlayer();

    if (a === "prev") return this.call("media_player","media_previous_track",{},{entity_id:activeId});
    if (a === "playpause") {
      const _st = this.state(activeId,"off");
      if (_st === "playing") return this.call("media_player","media_pause",{},{entity_id:activeId});
      if (_st === "paused")  return this.call("media_player","media_play", {},{entity_id:activeId});
      return this.script(c.script_launch);
    }
    if (a === "next")  return this.call("media_player","media_next_track",{},{entity_id:activeId});
    if (a === "stop")  return this.call("media_player","media_stop",      {},{entity_id:activeId});
    if (a === "more")  return this.more(activeId);
    if (a === "toggle-queue") {
      this._queueOpen = !this._queueOpen;
      if (this._queueOpen) this._loadQueue(activeId);
      else this.render();
      return;
    }

    if (a === "denon-power") {
      const s = this.state(c.denon_power_player,"off");
      return ["off","unavailable","unknown"].includes(s)
        ? this.call("media_player","turn_on", {},{entity_id:c.denon_power_player})
        : this.call("media_player","turn_off",{},{entity_id:c.denon_power_player});
    }
    if (a === "playpause-tv") return this.call("media_player","media_play_pause",    {},{entity_id:tv});
    if (a === "prev-tv")      return this.call("media_player","media_previous_track",{},{entity_id:tv});
    if (a === "next-tv")      return this.call("media_player","media_next_track",    {},{entity_id:tv});
    if (a === "more-tv")      return this.more(tv);
    if (a === "tv-power")     return this.call("media_player","turn_off",{},{entity_id:c.shield_player});
    const adb = {
      "tv-ok":           "input keyevent KEYCODE_DPAD_CENTER",
      "tv-back":         "input keyevent KEYCODE_BACK",
      "tv-home":         "input keyevent KEYCODE_HOME",
      "tv-channel-down": "input keyevent KEYCODE_CHANNEL_DOWN",
      "tv-channel-up":   "input keyevent KEYCODE_CHANNEL_UP",
      "tv-refresh":      "uiautomator dump /sdcard/window.xml 2>/dev/null && grep -oE 'text=\"[^\"]+\" resource-id=\"ar\\.tvplayer\\.tv:id/(75c|2md|3b3|3ng|5te)\"[^>]*/>' /sdcard/window.xml || echo no_content",
      "tv-left":         "input keyevent KEYCODE_DPAD_LEFT",
      "tv-right":        "input keyevent KEYCODE_DPAD_RIGHT",
      "tv-up":           "input keyevent KEYCODE_DPAD_UP",
      "tv-down":         "input keyevent KEYCODE_DPAD_DOWN",
    };
    if (adb[a]) return this.call("androidtv","adb_command",{command:adb[a]},{entity_id:c.shield_player});
  }

  more(entityId) {
    const ev = new Event("hass-more-info",{bubbles:true,composed:true});
    ev.detail = {entityId};
    this.dispatchEvent(ev);
  }
}

if (!customElements.get("media-premium-player-v9-4-1")) {
  customElements.define("media-premium-player-v9-4-1", MediaPremiumPlayerV941);
}
window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === "media-premium-player-v9-4-1")) {
  window.customCards.push({
    type:        "media-premium-player-v9-4-1",
    name:        "Media Premium Player V943",
    description: "V943 · Fix config_entry_id MASS 2.5+ · Recherche intelligente · Scoring · Highlights · Historique",
  });
}
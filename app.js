(() => {
  const APP_VERSION = 'v1008';
  const STORAGE_KEY = 'tourmap_points_v1';
  const PROXIMITY_RADIUS_KEY = 'tourmap_proximity_radius_v1';
  const ALERT_HISTORY_KEY = 'tourmap_alert_history_v1';
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const OSM_MIN_ZOOM = 10;
  const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
  const NEARBY_FETCH_MIN_RADIUS = 12000;
  const NEARBY_REFRESH_DISTANCE = 2500;
  const NEARBY_REFRESH_TIME = 8 * 60 * 1000;
  const AUTO_FOLLOW_RESUME_MS = 8000;
  const AUTO_FOLLOW_TARGET_PAUSE_MS = 12000;

  const CATEGORY_INFO = {
    castle: { label: 'Zamek', icon: 'assets/markers/castle.png?v=1007' },
    ruins: { label: 'Ruiny', icon: 'assets/markers/ruins.png?v=1007' },
    museum: { label: 'Muzeum', icon: 'assets/markers/museum.png?v=1007' },
    nature: { label: 'Pomnik przyrody', icon: 'assets/markers/nature.png?v=1007' },
    pttk: { label: 'Schronisko PTTK', icon: 'assets/markers/pttk.png?v=1007' }
  };

  const startScreen = document.querySelector('.start-screen');
  const addButton = document.getElementById('addButton');
  const mapButton = document.getElementById('mapButton');
  const versionElement = document.getElementById('appVersion');

  const addScreen = document.getElementById('addScreen');
  const addBackButton = document.getElementById('addBackButton');
  const placeName = document.getElementById('placeName');
  const manualMethodButton = document.getElementById('manualMethodButton');
  const autoMethodButton = document.getElementById('autoMethodButton');
  const coordinatesBox = document.getElementById('coordinatesBox');
  const autoLocationBox = document.getElementById('autoLocationBox');
  const latitudeInput = document.getElementById('latitudeInput');
  const longitudeInput = document.getElementById('longitudeInput');
  const gpsAddButton = document.getElementById('gpsAddButton');
  const gpsResult = document.getElementById('gpsResult');
  const categoryGrid = document.getElementById('categoryGrid');
  const dateInput = document.getElementById('dateInput');
  const addMessage = document.getElementById('addMessage');
  const savePlaceButton = document.getElementById('savePlaceButton');

  const editScreen = document.getElementById('editScreen');
  const editBackButton = document.getElementById('editBackButton');
  const editPlaceName = document.getElementById('editPlaceName');
  const editLatitudeInput = document.getElementById('editLatitudeInput');
  const editLongitudeInput = document.getElementById('editLongitudeInput');
  const editCategoryGrid = document.getElementById('editCategoryGrid');
  const editDateInput = document.getElementById('editDateInput');
  const editNoteInput = document.getElementById('editNoteInput');
  const editMessage = document.getElementById('editMessage');
  const saveEditButton = document.getElementById('saveEditButton');
  const deletePlaceButton = document.getElementById('deletePlaceButton');

  const mapScreen = document.getElementById('mapScreen');
  const mapBackButton = document.getElementById('mapBackButton');
  const mapLocationButton = document.getElementById('mapLocationButton');
  const locationMessage = document.getElementById('locationMessage');
  const proximityButton = document.getElementById('proximityButton');
  const proximityRadius = document.getElementById('proximityRadius');
  const proximityRadiusWrap = document.getElementById('proximityRadiusWrap');
  const osmStatus = document.getElementById('osmStatus');

  const nearbyAlert = document.getElementById('nearbyAlert');
  const nearbyAlertIcon = document.getElementById('nearbyAlertIcon');
  const nearbyAlertTitle = document.getElementById('nearbyAlertTitle');
  const nearbyAlertMeta = document.getElementById('nearbyAlertMeta');
  const nearbyAlertShow = document.getElementById('nearbyAlertShow');
  const nearbyAlertAdd = document.getElementById('nearbyAlertAdd');
  const nearbyAlertDismiss = document.getElementById('nearbyAlertDismiss');

  let map = null;
  let userLocationMarker = null;
  let userAccuracyCircle = null;
  let locationMessageTimer = null;
  let addMessageTimer = null;
  let editMessageTimer = null;
  let currentMethod = 'manual';
  let currentCategory = 'castle';
  let editCategory = 'castle';
  let autoCoords = null;
  let pointLayer = null;
  let pointMarkerById = new Map();
  let editingPointId = null;

  let externalLayer = null;
  let osmAttractions = new Map();
  let osmMarkerById = new Map();
  let viewportFetchTimer = null;
  let viewportFetchSequence = 0;
  const viewportCache = new Map();

  let proximityWatchId = null;
  let proximityActive = false;
  let nearbyAttractions = [];
  let nearbyFetchInFlight = false;
  let lastMonitorPosition = null;
  let lastNearbyFetchPosition = null;
  let lastNearbyFetchAt = 0;
  let currentNearbyAlertId = null;
  let autoFollowPausedUntil = 0;
  let autoFollowResumeTimer = null;
  let lastFollowPosition = null;

  if (versionElement) versionElement.textContent = APP_VERSION;

  function localDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(value) {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function noteHtml(value) {
    return escapeHtml(value || '').replaceAll('\n', '<br>');
  }

  function loadPoints() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Nie udało się odczytać zapisanych punktów:', error);
      return [];
    }
  }

  function savePoints(points) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
  }

  function findPoint(id) {
    return loadPoints().find((point) => String(point.id) === String(id)) || null;
  }

  function createCategoryIcon(category) {
    const info = CATEGORY_INFO[category] || CATEGORY_INFO.castle;
    return L.icon({
      iconUrl: info.icon,
      iconSize: [54, 54],
      iconAnchor: [27, 51],
      popupAnchor: [0, -47],
      tooltipAnchor: [0, -44],
      className: 'tourism-marker-icon'
    });
  }


  function createExternalCategoryIcon(category) {
    const info = CATEGORY_INFO[category] || CATEGORY_INFO.castle;
    return L.icon({
      iconUrl: info.icon,
      iconSize: [40, 40],
      iconAnchor: [20, 38],
      popupAnchor: [0, -34],
      tooltipAnchor: [0, -31],
      className: 'tourism-marker-icon osm-marker-icon'
    });
  }

  function loadAlertHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ALERT_HISTORY_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveAlertHistory(history) {
    try {
      localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Nie udało się zapisać historii alertów:', error);
    }
  }

  function markAttractionAlerted(osmId) {
    if (!osmId) return;
    const history = loadAlertHistory();
    history[String(osmId)] = Date.now();

    const oldestAllowed = Date.now() - (7 * 24 * 60 * 60 * 1000);
    Object.keys(history).forEach((key) => {
      if (Number(history[key]) < oldestAllowed) delete history[key];
    });

    saveAlertHistory(history);
  }

  function wasAttractionAlertedRecently(osmId) {
    const history = loadAlertHistory();
    const timestamp = Number(history[String(osmId)] || 0);
    return timestamp > 0 && (Date.now() - timestamp) < ALERT_COOLDOWN_MS;
  }

  function isOsmSaved(osmId) {
    if (!osmId) return false;
    return loadPoints().some((point) => String(point.osmId || '') === String(osmId));
  }

  function getProximityRadiusMeters() {
    const selected = Number(proximityRadius?.value || localStorage.getItem(PROXIMITY_RADIUS_KEY) || 2000);
    return [500, 1000, 2000, 5000].includes(selected) ? selected : 2000;
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return '';
    if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
  }

  function distanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (value) => value * Math.PI / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function updateOsmStatus(text, isError = false) {
    if (!osmStatus) return;
    osmStatus.textContent = text;
    osmStatus.classList.toggle('is-error', isError);
    osmStatus.hidden = !text;
  }

  function buildOverpassQuery(scope) {
    return `[out:json][timeout:25];
(
  nwr["historic"="castle"]${scope};
  nwr["historic"="manor"]${scope};
  nwr["historic"="ruins"]${scope};
  nwr["ruins"="yes"]["historic"]${scope};
  nwr["tourism"="museum"]${scope};
  nwr["denotation"="natural_monument"]${scope};
  nwr["tourism"~"^(alpine_hut|wilderness_hut)$"]["operator"~"PTTK",i]${scope};
  nwr["tourism"~"^(alpine_hut|wilderness_hut)$"]["name"~"PTTK",i]${scope};
);
out center tags;`;
  }

  async function fetchOverpassAttractions(scope) {
    const query = buildOverpassQuery(scope);
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = new Map();

    (data.elements || []).forEach((element) => {
      const tags = element.tags || {};
      const lat = Number.isFinite(Number(element.lat)) ? Number(element.lat) : Number(element.center?.lat);
      const lon = Number.isFinite(Number(element.lon)) ? Number(element.lon) : Number(element.center?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const pttkText = `${tags.operator || ''} ${tags.name || ''} ${tags['name:pl'] || ''}`.toUpperCase();
      let category = null;

      if (
        (tags.tourism === 'alpine_hut' || tags.tourism === 'wilderness_hut') &&
        pttkText.includes('PTTK')
      ) {
        category = 'pttk';
      } else if (tags.historic === 'ruins' || tags.ruins === 'yes') {
        category = 'ruins';
      } else if (tags.tourism === 'museum') {
        category = 'museum';
      } else if (tags.denotation === 'natural_monument') {
        category = 'nature';
      } else if (tags.historic === 'castle' || tags.historic === 'manor') {
        category = 'castle';
      }

      if (!category) return;

      const osmId = `${element.type}/${element.id}`;
      const info = CATEGORY_INFO[category] || CATEGORY_INFO.castle;
      const fallbackName =
        category === 'castle' && tags.historic === 'manor'
          ? 'Pałac / dwór'
          : info.label;

      result.set(osmId, {
        osmId,
        type: element.type,
        osmNumericId: element.id,
        category,
        name: tags['name:pl'] || tags.name || tags.official_name || fallbackName,
        lat,
        lon,
        tags
      });
    });

    return [...result.values()];
  }

  function externalPopupHtml(attraction) {
    const info = CATEGORY_INFO[attraction.category] || CATEGORY_INFO.castle;
    const saved = isOsmSaved(attraction.osmId);
    const sublabel =
      attraction.category === 'castle' && attraction.tags?.historic === 'manor'
        ? 'Pałac / dwór'
        : info.label;

    return `
      <div class="place-popup osm-place-popup">
        <div class="place-popup-head">
          <img src="${info.icon}" alt="" />
          <div>
            <strong>${escapeHtml(attraction.name)}</strong>
            <span>${escapeHtml(sublabel)} · OpenStreetMap</span>
          </div>
        </div>
        <div class="place-popup-coords">${Number(attraction.lat).toFixed(6)}, ${Number(attraction.lon).toFixed(6)}</div>
        ${
          saved
            ? '<div class="osm-saved-badge">TEN PUNKT JEST JUŻ W TWOICH MIEJSCACH</div>'
            : `<button class="place-popup-add-osm" type="button" data-add-osm-id="${escapeHtml(attraction.osmId)}">DODAJ DO MOICH</button>`
        }
      </div>
    `;
  }

  function renderExternalAttractions(attractions) {
    if (!map || !window.L) return;
    if (!externalLayer) externalLayer = L.layerGroup().addTo(map);

    externalLayer.clearLayers();
    osmMarkerById = new Map();

    attractions.forEach((attraction) => {
      if (isOsmSaved(attraction.osmId)) return;

      const marker = L.marker([attraction.lat, attraction.lon], {
        icon: createExternalCategoryIcon(attraction.category),
        title: attraction.name,
        riseOnHover: true,
        opacity: 0.86
      }).addTo(externalLayer);

      marker.bindPopup(externalPopupHtml(attraction), { maxWidth: 320, minWidth: 210 });
      osmMarkerById.set(String(attraction.osmId), marker);
    });
  }

  function viewportCacheKey() {
    if (!map) return '';
    const bounds = map.getBounds();
    const z = map.getZoom();
    return [
      z,
      bounds.getSouth().toFixed(2),
      bounds.getWest().toFixed(2),
      bounds.getNorth().toFixed(2),
      bounds.getEast().toFixed(2)
    ].join(':');
  }

  async function loadViewportAttractions() {
    if (!map || mapScreen?.hidden) return;

    if (map.getZoom() < OSM_MIN_ZOOM) {
      osmAttractions = new Map();
      externalLayer?.clearLayers();
      osmMarkerById = new Map();
      updateOsmStatus(`Atrakcje OSM: powiększ mapę do poziomu ${OSM_MIN_ZOOM}.`);
      return;
    }

    const key = viewportCacheKey();
    const cached = viewportCache.get(key);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      osmAttractions = new Map(cached.items.map((item) => [item.osmId, item]));
      renderExternalAttractions(cached.items);
      updateOsmStatus(`Atrakcje OSM: ${cached.items.length}`);
      return;
    }

    const bounds = map.getBounds();
    const scope = `(${bounds.getSouth().toFixed(6)},${bounds.getWest().toFixed(6)},${bounds.getNorth().toFixed(6)},${bounds.getEast().toFixed(6)})`;
    const sequence = ++viewportFetchSequence;
    updateOsmStatus('Atrakcje OSM: pobieranie…');

    try {
      const attractions = await fetchOverpassAttractions(scope);
      if (sequence !== viewportFetchSequence) return;

      osmAttractions = new Map(attractions.map((item) => [item.osmId, item]));
      viewportCache.set(key, { time: Date.now(), items: attractions });
      while (viewportCache.size > 8) {
        viewportCache.delete(viewportCache.keys().next().value);
      }

      renderExternalAttractions(attractions);
      updateOsmStatus(`Atrakcje OSM: ${attractions.length}`);
    } catch (error) {
      console.warn('Nie udało się pobrać atrakcji z OpenStreetMap:', error);
      updateOsmStatus('Atrakcje OSM: chwilowo niedostępne', true);
    }
  }

  function scheduleViewportAttractions(delay = 650) {
    clearTimeout(viewportFetchTimer);
    viewportFetchTimer = setTimeout(loadViewportAttractions, delay);
  }

  function addOsmAttractionToMine(attraction, openAfter = true) {
    if (!attraction) return null;

    const existing = loadPoints().find((point) => String(point.osmId || '') === String(attraction.osmId));
    if (existing) {
      if (openAfter) {
        showMap({
          lat: Number(existing.lat),
          lon: Number(existing.lon),
          zoom: 16,
          openPointId: existing.id
        });
      }
      return existing;
    }

    const info = CATEGORY_INFO[attraction.category] || CATEGORY_INFO.castle;
    const point = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: attraction.name || info.label,
      category: attraction.category,
      date: localDateString(),
      note: '',
      lat: Number(attraction.lat),
      lon: Number(attraction.lon),
      source: 'osm',
      osmId: attraction.osmId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const points = loadPoints();
    points.push(point);
    savePoints(points);
    renderStoredPoints();
    renderExternalAttractions([...osmAttractions.values()]);
    showLocationMessage('Punkt został dodany do Twoich miejsc.');

    if (openAfter) {
      showMap({ lat: point.lat, lon: point.lon, zoom: 16, openPointId: point.id });
    }

    return point;
  }

  function getOsmAttractionById(osmId) {
    return (
      osmAttractions.get(String(osmId)) ||
      nearbyAttractions.find((item) => String(item.osmId) === String(osmId)) ||
      null
    );
  }

  function focusOsmAttraction(attraction) {
    if (!attraction) return;

    showMap({ lat: attraction.lat, lon: attraction.lon, zoom: 16 });

    setTimeout(() => {
      let marker = osmMarkerById.get(String(attraction.osmId));
      if (!marker && map && externalLayer) {
        osmAttractions.set(attraction.osmId, attraction);
        marker = L.marker([attraction.lat, attraction.lon], {
          icon: createExternalCategoryIcon(attraction.category),
          title: attraction.name,
          riseOnHover: true,
          opacity: 0.9
        }).addTo(externalLayer);
        marker.bindPopup(externalPopupHtml(attraction), { maxWidth: 320, minWidth: 210 });
        osmMarkerById.set(String(attraction.osmId), marker);
      }
      marker?.openPopup();
    }, 280);
  }

  function setProximityUi(active) {
    proximityActive = Boolean(active);
    proximityButton?.classList.toggle('is-active', proximityActive);
    proximityButton?.setAttribute('aria-pressed', proximityActive ? 'true' : 'false');
    if (proximityButton) {
      proximityButton.title = proximityActive
        ? 'Śledzenie i alerty działają automatycznie – kliknij, aby wrócić do swojej pozycji'
        : 'Automatyczne śledzenie lokalizacji';
      proximityButton.setAttribute(
        'aria-label',
        proximityActive
          ? 'Automatyczne śledzenie aktywne. Kliknij, aby wrócić do swojej pozycji'
          : 'Automatyczne śledzenie lokalizacji'
      );
    }
    if (proximityRadiusWrap) proximityRadiusWrap.classList.toggle('is-active', proximityActive);
  }

  function isAutoFollowPaused() {
    return Date.now() < autoFollowPausedUntil;
  }

  function clearAutoFollowResumeTimer() {
    if (autoFollowResumeTimer != null) {
      clearTimeout(autoFollowResumeTimer);
      autoFollowResumeTimer = null;
    }
  }

  function scheduleAutoFollowResume(delay = AUTO_FOLLOW_RESUME_MS) {
    clearAutoFollowResumeTimer();
    autoFollowPausedUntil = Date.now() + delay;
    autoFollowResumeTimer = setTimeout(() => {
      autoFollowResumeTimer = null;
      autoFollowPausedUntil = 0;
      if (!mapScreen?.hidden && lastMonitorPosition?.coords) {
        followMonitoredPosition(lastMonitorPosition, true);
        showLocationMessage('Automatyczne śledzenie wznowione.');
      }
    }, delay);
  }

  function pauseAutoFollowForMapBrowsing(delay = AUTO_FOLLOW_RESUME_MS) {
    if (!proximityActive || mapScreen?.hidden) return;
    scheduleAutoFollowResume(delay);
  }

  function followMonitoredPosition(position, force = false) {
    if (!map || mapScreen?.hidden || !position?.coords || isAutoFollowPaused()) return;

    const { latitude, longitude, accuracy } = position.coords;
    const latlng = [latitude, longitude];
    const minMove = Math.max(7, Math.min(25, Number(accuracy || 0) * 0.18));
    const moved = lastFollowPosition
      ? distanceMeters(latitude, longitude, lastFollowPosition.lat, lastFollowPosition.lon)
      : Infinity;

    if (!force && moved < minMove) return;

    lastFollowPosition = { lat: latitude, lon: longitude };
    if (map.getZoom() < 14) {
      map.setView(latlng, 15, { animate: true });
    } else {
      map.panTo(latlng, { animate: true, duration: 0.35 });
    }
  }

  function resumeAutoFollow(showMessage = true) {
    clearAutoFollowResumeTimer();
    autoFollowPausedUntil = 0;

    if (proximityWatchId == null) {
      startProximityMonitoring(false);
      if (showMessage) showLocationMessage('Uruchamiam automatyczne śledzenie…');
      return;
    }

    if (lastMonitorPosition?.coords) {
      followMonitoredPosition(lastMonitorPosition, true);
      setLocationButtonState('active');
      if (showMessage) showLocationMessage('Automatyczne śledzenie aktywne.');
    } else if (showMessage) {
      showLocationMessage('Ustalam Twoją lokalizację…');
    }
  }

  function updateMonitoredLocationVisual(position) {
    if (!map || !position?.coords) return;
    const { latitude, longitude, accuracy } = position.coords;
    const latlng = [latitude, longitude];

    if (userAccuracyCircle) {
      userAccuracyCircle.setLatLng(latlng).setRadius(Math.max(accuracy || 5, 5));
    } else {
      userAccuracyCircle = L.circle(latlng, {
        radius: Math.max(accuracy || 5, 5),
        color: '#2f80ed',
        weight: 1,
        opacity: 0.55,
        fillColor: '#2f80ed',
        fillOpacity: 0.12,
        interactive: false
      }).addTo(map);
    }

    if (userLocationMarker) {
      userLocationMarker.setLatLng(latlng);
    } else {
      userLocationMarker = L.circleMarker(latlng, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#1677ff',
        fillOpacity: 1
      }).addTo(map);
      userLocationMarker.bindTooltip('Twoja lokalizacja', { direction: 'top', offset: [0, -8] });
    }
  }

  function hideNearbyAlert() {
    if (nearbyAlert) nearbyAlert.hidden = true;
    currentNearbyAlertId = null;
  }

  function showNearbyAttractionAlert(attraction, distance) {
    if (!nearbyAlert || !attraction) return;

    const info = CATEGORY_INFO[attraction.category] || CATEGORY_INFO.castle;
    currentNearbyAlertId = attraction.osmId;

    if (nearbyAlertIcon) nearbyAlertIcon.src = info.icon;
    if (nearbyAlertTitle) nearbyAlertTitle.textContent = attraction.name;
    if (nearbyAlertMeta) {
      nearbyAlertMeta.textContent = `${info.label} · około ${formatDistance(distance)} od Ciebie`;
    }

    markAttractionAlerted(attraction.osmId);
    nearbyAlert.hidden = false;
  }

  function checkProximity(position) {
    if (!proximityActive || !position?.coords || !nearbyAttractions.length) return;
    if (currentNearbyAlertId && nearbyAlert && !nearbyAlert.hidden) return;

    const radius = getProximityRadiusMeters();
    const { latitude, longitude } = position.coords;

    const candidate = nearbyAttractions
      .filter((attraction) => !isOsmSaved(attraction.osmId))
      .map((attraction) => ({
        attraction,
        distance: distanceMeters(latitude, longitude, attraction.lat, attraction.lon)
      }))
      .filter((item) => item.distance <= radius && !wasAttractionAlertedRecently(item.attraction.osmId))
      .sort((a, b) => a.distance - b.distance)[0];

    if (candidate) {
      showNearbyAttractionAlert(candidate.attraction, candidate.distance);
    }
  }

  async function refreshNearbyAttractions(position) {
    if (!position?.coords || nearbyFetchInFlight) return;
    nearbyFetchInFlight = true;

    const { latitude, longitude } = position.coords;
    const radius = Math.max(NEARBY_FETCH_MIN_RADIUS, getProximityRadiusMeters() + 5000);
    const scope = `(around:${Math.round(radius)},${latitude.toFixed(6)},${longitude.toFixed(6)})`;

    try {
      nearbyAttractions = await fetchOverpassAttractions(scope);
      lastNearbyFetchPosition = { lat: latitude, lon: longitude };
      lastNearbyFetchAt = Date.now();
      checkProximity(position);
    } catch (error) {
      console.warn('Nie udało się pobrać atrakcji w pobliżu:', error);
      showLocationMessage('Nie udało się teraz pobrać atrakcji w pobliżu.', true);
    } finally {
      nearbyFetchInFlight = false;
    }
  }

  function handleMonitoredPosition(position) {
    lastMonitorPosition = position;
    updateMonitoredLocationVisual(position);
    setLocationButtonState('active');
    followMonitoredPosition(position);

    const { latitude, longitude } = position.coords;
    const movedSinceFetch = lastNearbyFetchPosition
      ? distanceMeters(
          latitude,
          longitude,
          lastNearbyFetchPosition.lat,
          lastNearbyFetchPosition.lon
        )
      : Infinity;
    const fetchExpired = Date.now() - lastNearbyFetchAt > NEARBY_REFRESH_TIME;

    if (movedSinceFetch >= NEARBY_REFRESH_DISTANCE || fetchExpired || !nearbyAttractions.length) {
      refreshNearbyAttractions(position);
    } else {
      checkProximity(position);
    }
  }

  function handleMonitoredLocationError(error) {
    setLocationButtonState('idle');
    showLocationMessage(geolocationErrorText(error), true);
    if (error?.code === 1) stopProximityMonitoring(false);
  }

  function startProximityMonitoring(showMessage = true) {
    if (!navigator.geolocation) {
      showLocationMessage('To urządzenie nie obsługuje geolokalizacji.', true);
      return;
    }
    if (proximityWatchId != null) {
      setProximityUi(true);
      return;
    }

    setProximityUi(true);
    setLocationButtonState('locating');
    if (showMessage) {
      showLocationMessage(`Automatyczne śledzenie włączone · alert ${formatDistance(getProximityRadiusMeters())}.`);
    }

    proximityWatchId = navigator.geolocation.watchPosition(
      handleMonitoredPosition,
      handleMonitoredLocationError,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000
      }
    );
  }

  function stopProximityMonitoring(showMessage = false) {
    if (proximityWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(proximityWatchId);
    }
    proximityWatchId = null;
    setProximityUi(false);
    setLocationButtonState('idle');
    clearAutoFollowResumeTimer();
    autoFollowPausedUntil = 0;
    lastFollowPosition = null;
    hideNearbyAlert();
    if (showMessage) showLocationMessage('Automatyczne śledzenie zostało zatrzymane.');
  }

  function popupHtml(point) {
    const info = CATEGORY_INFO[point.category] || CATEGORY_INFO.castle;
    const title = point.name?.trim() || info.label;
    const note = point.note?.trim();
    return `
      <div class="place-popup">
        <div class="place-popup-head">
          <img src="${info.icon}" alt="" />
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(info.label)}</span>
          </div>
        </div>
        <div class="place-popup-date">Dodano: ${escapeHtml(formatDisplayDate(point.date))}</div>
        <div class="place-popup-coords">${Number(point.lat).toFixed(6)}, ${Number(point.lon).toFixed(6)}</div>
        ${note ? `<div class="place-popup-note">${noteHtml(note)}</div>` : ''}
        <button class="place-popup-edit" type="button" data-edit-point-id="${escapeHtml(point.id)}">EDYTUJ</button>
      </div>
    `;
  }

  function renderStoredPoints() {
    if (!map || !window.L) return;

    if (!pointLayer) pointLayer = L.layerGroup().addTo(map);
    pointLayer.clearLayers();
    pointMarkerById = new Map();

    loadPoints().forEach((point) => {
      if (!Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) return;
      const marker = L.marker([Number(point.lat), Number(point.lon)], {
        icon: createCategoryIcon(point.category),
        title: point.name || (CATEGORY_INFO[point.category]?.label ?? 'Miejsce'),
        riseOnHover: true
      }).addTo(pointLayer);
      marker.bindPopup(popupHtml(point), { maxWidth: 320, minWidth: 210 });
      pointMarkerById.set(String(point.id), marker);
    });

    if (osmAttractions.size) {
      renderExternalAttractions([...osmAttractions.values()]);
    }
  }

  function createMap() {
    if (map || !window.L) return;

    map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      minZoom: 3,
      maxZoom: 19
    }).setView([52.05, 19.15], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    }).addTo(map);

    L.control.scale({
      imperial: false,
      metric: true,
      position: 'bottomleft'
    }).addTo(map);

    externalLayer = L.layerGroup().addTo(map);
    renderStoredPoints();

    map.on('moveend zoomend', () => scheduleViewportAttractions());
    map.on('dragstart', () => pauseAutoFollowForMapBrowsing());
    scheduleViewportAttractions(250);
  }

  function showLocationMessage(text, isError = false) {
    if (!locationMessage) return;
    clearTimeout(locationMessageTimer);
    locationMessage.textContent = text;
    locationMessage.classList.toggle('is-error', isError);
    locationMessage.hidden = false;
    locationMessageTimer = setTimeout(() => {
      locationMessage.hidden = true;
    }, 3500);
  }

  function showAddMessage(text, isError = false) {
    if (!addMessage) return;
    clearTimeout(addMessageTimer);
    addMessage.textContent = text;
    addMessage.classList.toggle('is-error', isError);
    addMessage.hidden = false;
    addMessageTimer = setTimeout(() => {
      addMessage.hidden = true;
    }, 4000);
  }

  function showEditMessage(text, isError = false) {
    if (!editMessage) return;
    clearTimeout(editMessageTimer);
    editMessage.textContent = text;
    editMessage.classList.toggle('is-error', isError);
    editMessage.hidden = false;
    editMessageTimer = setTimeout(() => {
      editMessage.hidden = true;
    }, 4000);
  }

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ code: 0, message: 'Geolokalizacja nie jest obsługiwana.' });
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      });
    });
  }

  function geolocationErrorText(error) {
    if (error?.code === 1) return 'Brak zgody na dostęp do lokalizacji.';
    if (error?.code === 2) return 'Lokalizacja jest teraz niedostępna.';
    if (error?.code === 3) return 'Przekroczono czas ustalania lokalizacji.';
    return 'Nie udało się ustalić lokalizacji.';
  }

  function setLocationButtonState(state) {
    if (!mapLocationButton) return;
    mapLocationButton.classList.toggle('is-locating', state === 'locating');
    mapLocationButton.classList.toggle('is-active', state === 'active');
    mapLocationButton.disabled = state === 'locating';
  }

  async function locateUser() {
    if (!map) return;
    setLocationButtonState('locating');
    showLocationMessage('Ustalam Twoją lokalizację…');

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;
      const latlng = [latitude, longitude];

      if (userAccuracyCircle) {
        userAccuracyCircle.setLatLng(latlng).setRadius(Math.max(accuracy, 5));
      } else {
        userAccuracyCircle = L.circle(latlng, {
          radius: Math.max(accuracy, 5),
          color: '#2f80ed',
          weight: 1,
          opacity: 0.55,
          fillColor: '#2f80ed',
          fillOpacity: 0.12,
          interactive: false
        }).addTo(map);
      }

      if (userLocationMarker) {
        userLocationMarker.setLatLng(latlng);
      } else {
        userLocationMarker = L.circleMarker(latlng, {
          radius: 8,
          color: '#ffffff',
          weight: 3,
          fillColor: '#1677ff',
          fillOpacity: 1
        }).addTo(map);
        userLocationMarker.bindTooltip('Twoja lokalizacja', { direction: 'top', offset: [0, -8] });
      }

      map.setView(latlng, Math.max(map.getZoom(), 15), { animate: true });
      setLocationButtonState('active');
      showLocationMessage(`Lokalizacja znaleziona (dokładność ok. ${Math.round(accuracy)} m).`);
    } catch (error) {
      setLocationButtonState('idle');
      showLocationMessage(geolocationErrorText(error), true);
    }
  }

  function setMethod(method, shouldLocate = false) {
    currentMethod = method === 'auto' ? 'auto' : 'manual';
    manualMethodButton?.classList.toggle('is-active', currentMethod === 'manual');
    autoMethodButton?.classList.toggle('is-active', currentMethod === 'auto');
    if (coordinatesBox) coordinatesBox.hidden = currentMethod !== 'manual';
    if (autoLocationBox) autoLocationBox.hidden = currentMethod !== 'auto';

    if (currentMethod === 'auto' && shouldLocate) {
      fetchAddLocation();
    }
  }

  function setCategory(category) {
    if (!CATEGORY_INFO[category]) return;
    currentCategory = category;
    categoryGrid?.querySelectorAll('.category-button').forEach((button) => {
      const active = button.dataset.category === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setEditCategory(category) {
    if (!CATEGORY_INFO[category]) return;
    editCategory = category;
    editCategoryGrid?.querySelectorAll('.edit-category-button').forEach((button) => {
      const active = button.dataset.category === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  async function fetchAddLocation() {
    if (!gpsAddButton || !gpsResult) return;
    gpsAddButton.disabled = true;
    gpsAddButton.classList.add('is-locating');
    gpsResult.classList.remove('is-error');
    gpsResult.textContent = 'Ustalam Twoją lokalizację…';
    autoCoords = null;

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;
      autoCoords = { lat: latitude, lon: longitude, accuracy };
      gpsResult.textContent = `Gotowe: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} · dokładność ok. ${Math.round(accuracy)} m`;
    } catch (error) {
      gpsResult.classList.add('is-error');
      gpsResult.textContent = geolocationErrorText(error);
    } finally {
      gpsAddButton.disabled = false;
      gpsAddButton.classList.remove('is-locating');
    }
  }

  function parseCoordinate(value) {
    const normalized = String(value ?? '').trim().replace(',', '.');
    if (!normalized) return NaN;
    return Number(normalized);
  }

  function resetAddForm() {
    if (placeName) placeName.value = '';
    if (latitudeInput) latitudeInput.value = '';
    if (longitudeInput) longitudeInput.value = '';
    if (dateInput) dateInput.value = localDateString();
    if (gpsResult) {
      gpsResult.classList.remove('is-error');
      gpsResult.textContent = 'Lokalizacja nie została jeszcze pobrana.';
    }
    autoCoords = null;
    setMethod('manual');
    setCategory('castle');
    if (addMessage) addMessage.hidden = true;
  }

  function showAddScreen() {
    if (!addScreen || !startScreen) return;
    resetAddForm();
    startScreen.hidden = true;
    if (mapScreen) mapScreen.hidden = true;
    if (editScreen) editScreen.hidden = true;
    addScreen.hidden = false;
    requestAnimationFrame(() => placeName?.focus({ preventScroll: true }));
  }

  function hideAddScreen() {
    if (!addScreen || !startScreen) return;
    addScreen.hidden = true;
    startScreen.hidden = false;
  }

  function showMap(options = {}) {
    if (!mapScreen || !startScreen) return;
    startScreen.hidden = true;
    if (addScreen) addScreen.hidden = true;
    if (editScreen) editScreen.hidden = true;
    mapScreen.hidden = false;
    createMap();
    renderStoredPoints();

    const showingRequestedPoint = Number.isFinite(options.lat) && Number.isFinite(options.lon);
    if (showingRequestedPoint) {
      scheduleAutoFollowResume(AUTO_FOLLOW_TARGET_PAUSE_MS);
    } else {
      clearAutoFollowResumeTimer();
      autoFollowPausedUntil = 0;
    }

    requestAnimationFrame(() => {
      map?.invalidateSize();
      if (showingRequestedPoint) {
        map?.setView([options.lat, options.lon], options.zoom || 16, { animate: true });
      }
      if (options.openPointId != null) {
        setTimeout(() => pointMarkerById.get(String(options.openPointId))?.openPopup(), 250);
      }
      scheduleViewportAttractions(300);
      startProximityMonitoring(true);
      if (!showingRequestedPoint && lastMonitorPosition?.coords) {
        followMonitoredPosition(lastMonitorPosition, true);
      }
    });
  }

  function hideMap() {
    if (!mapScreen || !startScreen) return;
    stopProximityMonitoring(false);
    mapScreen.hidden = true;
    startScreen.hidden = false;
  }

  function saveNewPlace() {
    let lat;
    let lon;

    if (currentMethod === 'manual') {
      lat = parseCoordinate(latitudeInput?.value);
      lon = parseCoordinate(longitudeInput?.value);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        showAddMessage('Podaj prawidłową szerokość geograficzną od -90 do 90.', true);
        latitudeInput?.focus();
        return;
      }
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        showAddMessage('Podaj prawidłową długość geograficzną od -180 do 180.', true);
        longitudeInput?.focus();
        return;
      }
    } else {
      if (!autoCoords) {
        showAddMessage('Najpierw pobierz swoją lokalizację.', true);
        return;
      }
      lat = autoCoords.lat;
      lon = autoCoords.lon;
    }

    const date = dateInput?.value || localDateString();
    const info = CATEGORY_INFO[currentCategory] || CATEGORY_INFO.castle;
    const point = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: placeName?.value.trim() || info.label,
      category: currentCategory,
      date,
      note: '',
      lat,
      lon,
      source: currentMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const points = loadPoints();
    points.push(point);
    savePoints(points);
    showAddMessage('Punkt został zapisany.');

    setTimeout(() => {
      showMap({ lat, lon, zoom: 16, openPointId: point.id });
    }, 250);
  }

  function showEditScreen(pointId) {
    const point = findPoint(pointId);
    if (!point || !editScreen) return;

    editingPointId = String(point.id);
    if (editPlaceName) editPlaceName.value = point.name || '';
    if (editLatitudeInput) editLatitudeInput.value = Number(point.lat).toFixed(6);
    if (editLongitudeInput) editLongitudeInput.value = Number(point.lon).toFixed(6);
    if (editDateInput) editDateInput.value = point.date || localDateString();
    if (editNoteInput) editNoteInput.value = point.note || '';
    setEditCategory(point.category || 'castle');
    if (editMessage) editMessage.hidden = true;

    stopProximityMonitoring(false);
    if (startScreen) startScreen.hidden = true;
    if (addScreen) addScreen.hidden = true;
    if (mapScreen) mapScreen.hidden = true;
    editScreen.hidden = false;

    requestAnimationFrame(() => editPlaceName?.focus({ preventScroll: true }));
  }

  function closeEditToMap(openPoint = true) {
    const point = editingPointId ? findPoint(editingPointId) : null;
    if (editScreen) editScreen.hidden = true;
    editingPointId = null;
    if (point && openPoint) {
      showMap({ lat: Number(point.lat), lon: Number(point.lon), zoom: Math.max(map?.getZoom() || 15, 15), openPointId: point.id });
    } else {
      showMap();
    }
  }

  function saveEditedPoint() {
    if (!editingPointId) return;
    const lat = parseCoordinate(editLatitudeInput?.value);
    const lon = parseCoordinate(editLongitudeInput?.value);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      showEditMessage('Podaj prawidłową szerokość geograficzną od -90 do 90.', true);
      editLatitudeInput?.focus();
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      showEditMessage('Podaj prawidłową długość geograficzną od -180 do 180.', true);
      editLongitudeInput?.focus();
      return;
    }

    const points = loadPoints();
    const index = points.findIndex((point) => String(point.id) === String(editingPointId));
    if (index < 0) {
      showEditMessage('Nie znaleziono tego punktu.', true);
      return;
    }

    const info = CATEGORY_INFO[editCategory] || CATEGORY_INFO.castle;
    points[index] = {
      ...points[index],
      name: editPlaceName?.value.trim() || info.label,
      category: editCategory,
      date: editDateInput?.value || localDateString(),
      note: editNoteInput?.value.trim() || '',
      lat,
      lon,
      updatedAt: new Date().toISOString()
    };

    const saved = points[index];
    savePoints(points);
    renderStoredPoints();
    showEditMessage('Zmiany zostały zapisane.');

    setTimeout(() => {
      if (editScreen) editScreen.hidden = true;
      editingPointId = null;
      showMap({ lat, lon, zoom: 16, openPointId: saved.id });
    }, 250);
  }

  function deleteEditedPoint() {
    if (!editingPointId) return;
    const point = findPoint(editingPointId);
    if (!point) return;

    const title = point.name?.trim() || (CATEGORY_INFO[point.category]?.label ?? 'ten punkt');
    const confirmed = window.confirm(`Czy na pewno usunąć punkt „${title}”?\n\nTej operacji nie można cofnąć.`);
    if (!confirmed) return;

    const points = loadPoints().filter((item) => String(item.id) !== String(editingPointId));
    savePoints(points);
    editingPointId = null;
    if (editScreen) editScreen.hidden = true;
    renderStoredPoints();
    showMap();
    setTimeout(() => showLocationMessage('Punkt został usunięty.'), 150);
  }

  addButton?.addEventListener('click', showAddScreen);
  addBackButton?.addEventListener('click', hideAddScreen);
  manualMethodButton?.addEventListener('click', () => setMethod('manual'));
  autoMethodButton?.addEventListener('click', () => setMethod('auto', true));
  gpsAddButton?.addEventListener('click', fetchAddLocation);
  savePlaceButton?.addEventListener('click', saveNewPlace);

  categoryGrid?.querySelectorAll('.category-button').forEach((button) => {
    button.addEventListener('click', () => setCategory(button.dataset.category));
  });

  editCategoryGrid?.querySelectorAll('.edit-category-button').forEach((button) => {
    button.addEventListener('click', () => setEditCategory(button.dataset.category));
  });

  editBackButton?.addEventListener('click', () => closeEditToMap(true));
  saveEditButton?.addEventListener('click', saveEditedPoint);
  deletePlaceButton?.addEventListener('click', deleteEditedPoint);

  document.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-point-id]');
    if (editButton) {
      event.preventDefault();
      event.stopPropagation();
      map?.closePopup();
      showEditScreen(editButton.dataset.editPointId);
      return;
    }

    const addOsmButton = event.target.closest('[data-add-osm-id]');
    if (addOsmButton) {
      event.preventDefault();
      event.stopPropagation();
      const attraction = getOsmAttractionById(addOsmButton.dataset.addOsmId);
      if (attraction) {
        map?.closePopup();
        addOsmAttractionToMine(attraction, true);
      }
    }
  });

  proximityButton?.addEventListener('click', () => resumeAutoFollow(true));

  proximityRadius?.addEventListener('change', () => {
    const radius = getProximityRadiusMeters();
    localStorage.setItem(PROXIMITY_RADIUS_KEY, String(radius));

    if (proximityActive) {
      showLocationMessage(`Odległość alertu: ${formatDistance(radius)}.`);
      lastNearbyFetchAt = 0;
      if (lastMonitorPosition) refreshNearbyAttractions(lastMonitorPosition);
    }
  });

  nearbyAlertShow?.addEventListener('click', () => {
    const attraction = getOsmAttractionById(currentNearbyAlertId);
    hideNearbyAlert();
    if (attraction) focusOsmAttraction(attraction);
  });

  nearbyAlertAdd?.addEventListener('click', () => {
    const attraction = getOsmAttractionById(currentNearbyAlertId);
    hideNearbyAlert();
    if (attraction) addOsmAttractionToMine(attraction, true);
  });

  nearbyAlertDismiss?.addEventListener('click', hideNearbyAlert);

  mapButton?.addEventListener('click', () => showMap());
  mapBackButton?.addEventListener('click', hideMap);
  mapLocationButton?.addEventListener('click', () => resumeAutoFollow(true));

  window.addEventListener('resize', () => {
    if (mapScreen && !mapScreen.hidden) map?.invalidateSize();
  });

  if (dateInput && !dateInput.value) dateInput.value = localDateString();

  if (proximityRadius) {
    const savedRadius = Number(localStorage.getItem(PROXIMITY_RADIUS_KEY) || 2000);
    proximityRadius.value = String([500, 1000, 2000, 5000].includes(savedRadius) ? savedRadius : 2000);
  }

  setCategory(currentCategory);
  setEditCategory(editCategory);
  setProximityUi(false);

  // PWA: rejestracja Service Workera i szybkie wykrywanie nowej wersji.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js?v=1008', {
          scope: './',
          updateViaCache: 'none'
        });
        await registration.update();
      } catch (error) {
        console.warn('Nie udało się zarejestrować Service Workera:', error);
      }
    });
  }
})();

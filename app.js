(() => {
  const APP_VERSION = 'v1032';
  const STORAGE_KEY = 'tourmap_points_v1';
  const PROXIMITY_RADIUS_KEY = 'tourmap_proximity_radius_v1';
  const ALERT_HISTORY_KEY = 'tourmap_alert_history_v1';
  const OSM_ENABLED_KEY = 'tourmap_osm_enabled_v1';
  const USER_DB_KEY = 'tourmap_user_attraction_db_v1';
  const ATTRACTION_DB_URL = 'data/atrakcje-polska.json?v=1032';
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';
  const FOLLOW_EDGE_MARGIN_PX = 92;
  const ROUTE_DISPLAY_RADIUS = 20000;
  const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
  const NEARBY_FETCH_MIN_RADIUS = 12000;
  const NEARBY_REFRESH_DISTANCE = 2500;
  const NEARBY_REFRESH_TIME = 8 * 60 * 1000;
  
  const CATEGORY_INFO = {
    castle: { label: 'Zamek', icon: 'assets/markers/castle.png?v=1007' },
    ruins: { label: 'Ruiny', icon: 'assets/markers/ruins.png?v=1007' },
    museum: { label: 'Muzeum', icon: 'assets/markers/museum.png?v=1007' },
    nature: { label: 'Pomnik przyrody', icon: 'assets/markers/nature.png?v=1007' },
    pttk: { label: 'Schronisko PTTK', icon: 'assets/markers/pttk.png?v=1007' },
    cave: { label: 'Jaskinia', icon: 'assets/markers/cave.png?v=1024' },
    reserve: { label: 'Rezerwat przyrody', icon: 'assets/markers/reserve.png?v=1024' },
    historic: { label: 'Zabytkowe miejsce', icon: 'assets/markers/historic.png?v=1024' },
    water: { label: 'Atrakcja wodna', icon: 'assets/markers/water.png?v=1024' }
  };

  const startScreen = document.querySelector('.start-screen');
  const addButton = document.getElementById('addButton');
  const mapButton = document.getElementById('mapButton');
  const myPlacesButton = document.getElementById('myPlacesButton');
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
  const osmRefreshButton = document.getElementById('osmRefreshButton');
  const osmButtonState = document.getElementById('osmButtonState');
  const routeButton = document.getElementById('routeButton');
  const routePanel = document.getElementById('routePanel');
  const routePanelClose = document.getElementById('routePanelClose');
  const routeDestinationInput = document.getElementById('routeDestinationInput');
  const routeSearchButton = document.getElementById('routeSearchButton');
  const routeResults = document.getElementById('routeResults');
  const routeInfo = document.getElementById('routeInfo');
  const routeClearButton = document.getElementById('routeClearButton');
  const osmStatus = document.getElementById('osmStatus');
  const mapModeBadge = document.getElementById('mapModeBadge');
  const mapLegend = document.getElementById('mapLegend');
  const attractionPreviewButton = document.getElementById('attractionPreviewButton');
  const attractionPreviewCount = document.getElementById('attractionPreviewCount');
  const attractionPreviewOverlay = document.getElementById('attractionPreviewOverlay');
  const attractionPreviewClose = document.getElementById('attractionPreviewClose');
  const attractionPreviewSummary = document.getElementById('attractionPreviewSummary');
  const attractionPreviewList = document.getElementById('attractionPreviewList');

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
  let currentMapMode = 'all';
  let editReturnMapMode = 'all';
  // v1030: legenda pozwala zaznaczyć kilka kategorii jednocześnie.
  const CATEGORY_KEYS = Object.keys(CATEGORY_INFO);
  let activeAttractionFilters = new Set(CATEGORY_KEYS);

  // v1031: aktywny podgląd wszystkich atrakcji w ustawionym promieniu od GPS.
  let attractionPreviewItems = [];
  let attractionPreviewUpdateSequence = 0;

  let externalLayer = null;
  let osmAttractions = new Map();
  let viewportAttractions = [];
  let osmMarkerById = new Map();
  let viewportFetchTimer = null;
  let viewportFetchSequence = 0;
  let viewportRetryUsed = false;
  const viewportCache = new Map();
  let osmEnabled = loadOsmEnabled();
  let attractionDatabase = [];
  let attractionDatabaseLoaded = false;
  let attractionDatabasePromise = null;

  let proximityWatchId = null;
  let proximityActive = false;
  let nearbyAttractions = [];
  let nearbyFetchInFlight = false;
  let lastMonitorPosition = null;
  let lastNearbyFetchPosition = null;
  let lastNearbyFetchAt = 0;
  let currentNearbyAlertId = null;

  // v1022: automatyczne przesuwanie mapy działa tylko po świadomym użyciu WYCENTRUJ.
  // Każde ręczne przesunięcie lub zoom natychmiast je wyłącza.
  let mapAutoFollowEnabled = false;
  let mapProgrammaticMove = false;

  let routeLayer = null;
  let routeDestinationMarker = null;
  let routeActive = false;
  let routeDestination = null;
  let routeAttractions = [];
  let routeCoordinates = [];
  let routeSearchSequence = 0;
  let routeAlertedIds = new Set();

  if (versionElement) versionElement.textContent = APP_VERSION;
  updateOsmButtonUi();
  migrateSavedPointsIntoUserDatabase();

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
    const selected = Number(proximityRadius?.value || localStorage.getItem(PROXIMITY_RADIUS_KEY) || 5000);
    return [5000, 10000, 15000, 20000].includes(selected) ? selected : 5000;
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

  function loadOsmEnabled() {
    try {
      return localStorage.getItem(OSM_ENABLED_KEY) !== '0';
    } catch (_) {
      return true;
    }
  }

  function saveOsmEnabled() {
    try {
      localStorage.setItem(OSM_ENABLED_KEY, osmEnabled ? '1' : '0');
    } catch (_) {}
  }

  function updateOsmButtonUi() {
    if (!osmRefreshButton) return;
    osmRefreshButton.classList.toggle('is-active', osmEnabled);
    osmRefreshButton.setAttribute('aria-pressed', String(osmEnabled));
    osmRefreshButton.setAttribute('aria-label', osmEnabled ? 'Baza atrakcji włączona' : 'Baza atrakcji wyłączona');
    osmRefreshButton.title = osmEnabled ? 'Baza atrakcji: włączona' : 'Baza atrakcji: wyłączona';
    if (osmButtonState) osmButtonState.textContent = osmEnabled ? 'ON' : 'OFF';
  }

  function clearOsmAttractions() {
    clearTimeout(viewportFetchTimer);
    viewportFetchSequence += 1;
    viewportAttractions = [];
    nearbyAttractions = [];
    osmAttractions = new Map();
    externalLayer?.clearLayers();
    osmMarkerById = new Map();
    hideNearbyAlert();
  }

  function setOsmEnabled(enabled, { fetchNow = true } = {}) {
    osmEnabled = Boolean(enabled);
    saveOsmEnabled();
    updateOsmButtonUi();

    if (!osmEnabled) {
      clearOsmAttractions();
      hideAttractionPreview();
      attractionPreviewItems = [];
      setAttractionPreviewButton(null);
      updateOsmStatus('Baza atrakcji: wyłączona');
      return;
    }

    updateOsmStatus('Baza atrakcji: włączona');
    if (lastMonitorPosition?.coords) updateAttractionPreview(lastMonitorPosition);
    if (fetchNow && currentMapMode === 'all' && !mapScreen?.hidden) {
      refreshOsmManually();
    }
  }

  function updateOsmStatus(text, isError = false) {
    if (!osmStatus) return;
    osmStatus.textContent = text;
    osmStatus.classList.toggle('is-error', isError);
    // v1031: bieżący licznik atrakcji jest w górnym przycisku „Podgląd atrakcji”.
    // Dolny status zostawiamy wyłącznie dla rzeczywistych błędów.
    osmStatus.hidden = !text || !isError;
  }

  function loadUserAttractionDb() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Nie udało się odczytać lokalnego rozszerzenia bazy atrakcji:', error);
      return [];
    }
  }

  function saveUserAttractionDb(items) {
    try {
      localStorage.setItem(USER_DB_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Nie udało się zapisać lokalnego rozszerzenia bazy atrakcji:', error);
    }
  }

  function normalizeDatabaseAttraction(item) {
    if (!item) return null;
    const id = String(item.id || item.osmId || '').trim();
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    const category = CATEGORY_INFO[item.category] ? item.category : null;
    if (!id || !category || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
      osmId: id,
      category,
      name: String(item.name || CATEGORY_INFO[category].label),
      lat,
      lon,
      tags: item.tags && typeof item.tags === 'object' ? item.tags : {},
      source: item.source || 'Baza lokalna',
      sourceUrl: item.sourceUrl || '',
      userAdded: Boolean(item.userAdded)
    };
  }

  function rebuildAttractionDatabase(baseItems = null) {
    const merged = new Map();
    const base = Array.isArray(baseItems) ? baseItems : attractionDatabase.filter((item) => !item.userAdded);

    base.forEach((item) => {
      const normalized = normalizeDatabaseAttraction(item);
      if (normalized) merged.set(normalized.osmId, normalized);
    });

    loadUserAttractionDb().forEach((item) => {
      const normalized = normalizeDatabaseAttraction({ ...item, userAdded: true });
      if (normalized) merged.set(normalized.osmId, normalized);
    });

    attractionDatabase = [...merged.values()];
    attractionDatabaseLoaded = true;
    return attractionDatabase;
  }

  async function ensureAttractionDatabase(force = false) {
    if (attractionDatabaseLoaded && !force) return attractionDatabase;
    if (attractionDatabasePromise && !force) return attractionDatabasePromise;

    attractionDatabasePromise = (async () => {
      let baseItems = [];
      try {
        const response = await fetch(ATTRACTION_DB_URL, { cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Baza HTTP ${response.status}`);
        const data = await response.json();
        baseItems = Array.isArray(data) ? data : (Array.isArray(data?.attractions) ? data.attractions : []);
      } catch (error) {
        console.warn('Nie udało się wczytać pliku bazy atrakcji:', error);
        // Jeśli baza była już wcześniej wczytana, zachowaj ją. Dzięki temu ręczne
        // odświeżenie nie może wyczyścić znaczników przy chwilowym błędzie pliku/cache.
        baseItems = attractionDatabase.filter((item) => !item.userAdded);
      }

      return rebuildAttractionDatabase(baseItems);
    })();

    try {
      return await attractionDatabasePromise;
    } finally {
      attractionDatabasePromise = null;
    }
  }

  function upsertUserAttractionFromPoint(point) {
    if (!point) return;
    const attractionId = String(point.osmId || `user/${point.id}`);
    point.osmId = attractionId;

    const items = loadUserAttractionDb();
    const index = items.findIndex((item) => String(item.id) === attractionId);
    const dbItem = {
      id: attractionId,
      name: point.name || CATEGORY_INFO[point.category]?.label || 'Atrakcja',
      category: point.category,
      lat: Number(point.lat),
      lon: Number(point.lon),
      source: 'Dodane przez użytkownika',
      userAdded: true,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) items[index] = { ...items[index], ...dbItem };
    else items.push({ ...dbItem, createdAt: point.createdAt || new Date().toISOString() });
    saveUserAttractionDb(items);

    if (attractionDatabaseLoaded) rebuildAttractionDatabase();
  }

  function removeUserAttractionForPoint(point) {
    const id = String(point?.osmId || '');
    if (!id) return;
    const current = loadUserAttractionDb();
    if (!current.some((item) => String(item.id) === id)) return;
    saveUserAttractionDb(current.filter((item) => String(item.id) !== id));
    if (attractionDatabaseLoaded) rebuildAttractionDatabase();
  }

  function migrateSavedPointsIntoUserDatabase() {
    const points = loadPoints();
    let pointsChanged = false;
    let userItems = loadUserAttractionDb();
    const byId = new Map(userItems.map((item) => [String(item.id), item]));

    points.forEach((point) => {
      // Obiekty z nowej bazy statycznej już są w pliku JSON i nie trzeba ich dublować.
      if (String(point.osmId || '').startsWith('base/')) return;
      if (!point.osmId) {
        point.osmId = `user/${point.id}`;
        pointsChanged = true;
      }
      const id = String(point.osmId);
      byId.set(id, {
        ...(byId.get(id) || {}),
        id,
        name: point.name || CATEGORY_INFO[point.category]?.label || 'Atrakcja',
        category: point.category,
        lat: Number(point.lat),
        lon: Number(point.lon),
        source: 'Dodane przez użytkownika',
        userAdded: true,
        createdAt: point.createdAt || new Date().toISOString(),
        updatedAt: point.updatedAt || new Date().toISOString()
      });
    });

    userItems = [...byId.values()].filter((item) => CATEGORY_INFO[item.category] && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)));
    saveUserAttractionDb(userItems);
    if (pointsChanged) savePoints(points);
  }

  async function getDatabaseAttractions() {
    await ensureAttractionDatabase();
    return attractionDatabase;
  }

  async function getAttractionsInBounds(bounds) {
    const attractions = await getDatabaseAttractions();
    if (!bounds) return attractions;
    return attractions.filter((item) => bounds.contains([item.lat, item.lon]));
  }

  async function getAttractionsNear(lat, lon, radius) {
    const attractions = await getDatabaseAttractions();
    return attractions.filter((item) => distanceMeters(lat, lon, item.lat, item.lon) <= radius);
  }

  function formatPreviewDistanceKm(meters) {
    if (!Number.isFinite(Number(meters))) return '—';
    const km = Math.max(0, Number(meters)) / 1000;
    return `${km.toFixed(km < 10 ? 1 : 0)} km`;
  }

  function setAttractionPreviewButton(count = null) {
    if (!attractionPreviewButton || !attractionPreviewCount) return;
    const available = Number.isInteger(count) && count >= 0 && osmEnabled && currentMapMode === 'all';
    attractionPreviewCount.textContent = available ? String(count) : '—';
    // v1032: przycisk zawsze daje się otworzyć na głównej mapie. Gdy GPS jeszcze
    // nie ma pozycji, okno pokaże czytelny komunikat zamiast wyglądać jak zepsute.
    attractionPreviewButton.disabled = currentMapMode !== 'all';
    attractionPreviewButton.classList.toggle('has-attractions', available && count > 0);
    attractionPreviewButton.setAttribute(
      'aria-label',
      available
        ? `Podgląd atrakcji: ${count}. Otwórz listę atrakcji w promieniu ${formatDistance(getProximityRadiusMeters())}.`
        : 'Podgląd atrakcji. Otwórz okno podglądu.'
    );
    attractionPreviewButton.title = available
      ? `Atrakcje do ${formatDistance(getProximityRadiusMeters())} od Ciebie: ${count}`
      : 'Otwórz podgląd atrakcji';
  }

  function renderAttractionPreviewList() {
    if (!attractionPreviewList || !attractionPreviewSummary) return;
    const radius = getProximityRadiusMeters();

    if (!lastMonitorPosition?.coords) {
      attractionPreviewSummary.textContent = `Promień: ${formatDistance(radius)} · czekam na GPS`;
      attractionPreviewList.innerHTML = `
        <div class="attraction-preview-empty">
          Ustalam Twoją aktualną pozycję. Gdy GPS ją poda, tutaj pojawią się atrakcje znajdujące się w wybranym promieniu.
        </div>
      `;
      return;
    }

    attractionPreviewSummary.textContent = `Promień: ${formatDistance(radius)} · znaleziono: ${attractionPreviewItems.length}`;

    if (!attractionPreviewItems.length) {
      attractionPreviewList.innerHTML = `
        <div class="attraction-preview-empty">
          W promieniu ${escapeHtml(formatDistance(radius))} nie ma obecnie atrakcji zapisanych w bazie.
        </div>
      `;
      return;
    }

    attractionPreviewList.innerHTML = attractionPreviewItems.map(({ attraction, distance }) => {
      const info = CATEGORY_INFO[attraction.category] || CATEGORY_INFO.castle;
      return `
        <article class="attraction-preview-row">
          <img class="attraction-preview-icon" src="${info.icon}" alt="" aria-hidden="true" />
          <div class="attraction-preview-copy">
            <strong>${escapeHtml(attraction.name || info.label)}</strong>
            <span>${escapeHtml(info.label)}</span>
          </div>
          <div class="attraction-preview-distance">${escapeHtml(formatPreviewDistanceKm(distance))}</div>
          <button class="attraction-preview-route" type="button" data-preview-route-id="${escapeHtml(attraction.osmId)}">PROWADŹ</button>
        </article>
      `;
    }).join('');
  }

  async function updateAttractionPreview(position = lastMonitorPosition) {
    const sequence = ++attractionPreviewUpdateSequence;

    if (!osmEnabled || currentMapMode !== 'all' || !position?.coords) {
      attractionPreviewItems = [];
      setAttractionPreviewButton(null);
      if (attractionPreviewOverlay && !attractionPreviewOverlay.hidden) renderAttractionPreviewList();
      return;
    }

    const latitude = Number(position.coords.latitude);
    const longitude = Number(position.coords.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      attractionPreviewItems = [];
      setAttractionPreviewButton(null);
      return;
    }

    try {
      const radius = getProximityRadiusMeters();
      const attractions = await getDatabaseAttractions();
      if (sequence !== attractionPreviewUpdateSequence) return;

      attractionPreviewItems = attractions
        .map((attraction) => ({
          attraction,
          distance: distanceMeters(latitude, longitude, Number(attraction.lat), Number(attraction.lon))
        }))
        .filter((item) => item.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      setAttractionPreviewButton(attractionPreviewItems.length);
      if (attractionPreviewOverlay && !attractionPreviewOverlay.hidden) renderAttractionPreviewList();
    } catch (error) {
      console.warn('Nie udało się zaktualizować podglądu atrakcji:', error);
      attractionPreviewItems = [];
      setAttractionPreviewButton(null);
    }
  }

  function showAttractionPreview() {
    if (!attractionPreviewOverlay || currentMapMode !== 'all') return;
    attractionPreviewOverlay.hidden = false;
    renderAttractionPreviewList();
    updateAttractionPreview(lastMonitorPosition).catch(() => {});
    attractionPreviewClose?.focus({ preventScroll: true });
  }

  function hideAttractionPreview() {
    if (attractionPreviewOverlay) attractionPreviewOverlay.hidden = true;
  }

  function allAttractionFiltersActive() {
    return CATEGORY_KEYS.every((key) => activeAttractionFilters.has(key));
  }

  function attractionMatchesActiveFilter(category) {
    return activeAttractionFilters.has(category);
  }

  function updateMapLegendUi() {
    if (!mapLegend) return;
    const allActive = allAttractionFiltersActive();
    mapLegend.querySelectorAll('[data-map-filter]').forEach((button) => {
      const value = button.dataset.mapFilter;
      const active = value === 'all' ? allActive : activeAttractionFilters.has(value);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function refreshMarkersForActiveFilter() {
    updateMapLegendUi();
    renderStoredPoints();
    // Filtr legendy zmienia tylko to, co widać na mapie. Alerty i obliczanie
    // atrakcji przy trasie nadal korzystają z pełnej bazy, żeby niczego nie przegapić.
    if (currentMapMode === 'all') {
      renderExternalAttractions([...osmAttractions.values()]);
      const visibleExternal = [...osmAttractions.values()].filter((item) =>
        !isOsmSaved(item.osmId) && attractionMatchesActiveFilter(item.category)
      ).length;
      const visibleMine = loadPoints().filter((point) => attractionMatchesActiveFilter(point.category)).length;
      const selectedCount = activeAttractionFilters.size;
      if (allAttractionFiltersActive()) {
        updateOsmStatus(`Baza atrakcji: ${osmAttractions.size} · moje: ${visibleMine}`);
      } else if (selectedCount === 0) {
        updateOsmStatus('Filtr atrakcji: widok wyłączony');
      } else {
        updateOsmStatus(`Wybrane kategorie: ${selectedCount} · ${visibleExternal + visibleMine} widocznych`);
      }
    }
  }

  function toggleAttractionFilter(value) {
    if (value === 'all') {
      activeAttractionFilters = allAttractionFiltersActive() ? new Set() : new Set(CATEGORY_KEYS);
      refreshMarkersForActiveFilter();
      return;
    }
    if (!CATEGORY_INFO[value]) return;

    // Gdy aktualnie włączone są WSZYSTKIE, pierwszy wybór kategorii przełącza
    // mapę na samą tę kategorię. Następne kliknięcia dodają/odejmują kolejne.
    if (allAttractionFiltersActive()) {
      activeAttractionFilters = new Set([value]);
    } else if (activeAttractionFilters.has(value)) {
      activeAttractionFilters.delete(value);
    } else {
      activeAttractionFilters.add(value);
    }
    refreshMarkersForActiveFilter();
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
            <span>${escapeHtml(sublabel)} · Baza atrakcji</span>
          </div>
        </div>
        <div class="place-popup-coords">${Number(attraction.lat).toFixed(6)}, ${Number(attraction.lon).toFixed(6)}</div>
        ${routeActive && Number.isFinite(Number(attraction.routeDistanceMeters))
          ? `<div class="place-popup-date">Od trasy: ${escapeHtml(formatDistance(Number(attraction.routeDistanceMeters)))}</div>`
          : ''}
        <button class="place-popup-add-osm" type="button" data-route-osm-id="${escapeHtml(attraction.osmId)}">USTAW TRASĘ DO TEJ ATRAKCJI</button>
        <button class="place-popup-add-osm" type="button" data-wikipedia-query="${escapeHtml(attraction.name)}">WIKIPEDIA</button>
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
      if (!attractionMatchesActiveFilter(attraction.category)) return;

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

  function updateMainAttractionLayer(statusText = '') {
    if (!map || currentMapMode !== 'all') return;
    if (!osmEnabled) {
      clearOsmAttractions();
      updateOsmStatus('Baza atrakcji: wyłączona');
      return;
    }

    if (routeActive) {
      osmAttractions = new Map(routeAttractions.map((item) => [item.osmId, item]));
      renderExternalAttractions(routeAttractions);
      if (statusText) updateOsmStatus(statusText);
      return;
    }

    const merged = new Map();
    [...nearbyAttractions, ...viewportAttractions].forEach((item) => {
      if (item?.osmId) merged.set(item.osmId, item);
    });

    osmAttractions = merged;
    renderExternalAttractions([...merged.values()]);

    if (statusText) {
      updateOsmStatus(statusText);
    } else if (merged.size) {
      updateOsmStatus(`Baza atrakcji: ${merged.size}`);
    }
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
    if (!map || mapScreen?.hidden || currentMapMode !== 'all' || !osmEnabled) return;
    if (routeActive) {
      updateMainAttractionLayer(`Atrakcje do ${formatDistance(getProximityRadiusMeters())} od trasy: ${routeAttractions.length} · alert aktywny`);
      return;
    }

    const key = viewportCacheKey();
    const cached = viewportCache.get(key);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      viewportAttractions = cached.items;
      updateMainAttractionLayer(`Baza atrakcji: ${new Set([...nearbyAttractions, ...viewportAttractions].map((item) => item.osmId)).size}`);
      return;
    }

    const sequence = ++viewportFetchSequence;
    updateOsmStatus('Baza atrakcji: wczytywanie…');

    try {
      const attractions = await getAttractionsInBounds(map.getBounds());
      if (sequence !== viewportFetchSequence) return;

      viewportAttractions = attractions;
      viewportRetryUsed = false;
      viewportCache.set(key, { time: Date.now(), items: attractions });
      while (viewportCache.size > 8) viewportCache.delete(viewportCache.keys().next().value);

      const total = new Set([...nearbyAttractions, ...viewportAttractions].map((item) => item.osmId)).size;
      updateMainAttractionLayer(`Baza atrakcji: ${total}`);
    } catch (error) {
      console.warn('Nie udało się wczytać lokalnej bazy atrakcji:', error);
      updateMainAttractionLayer();
      const keptCount = new Set(
        [...nearbyAttractions, ...viewportAttractions]
          .filter((item) => item?.osmId)
          .map((item) => item.osmId)
      ).size;
      updateOsmStatus(
        keptCount
          ? `Baza atrakcji: ${keptCount} · zachowano wcześniej wczytane punkty`
          : 'Nie udało się wczytać pliku data/atrakcje-polska.json',
        !keptCount
      );
    }
  }

  function scheduleViewportAttractions(delay = 650, resetRetry = true) {
    clearTimeout(viewportFetchTimer);
    if (resetRetry) viewportRetryUsed = false;
    if (currentMapMode !== 'all' || routeActive || !osmEnabled) return;
    viewportFetchTimer = setTimeout(loadViewportAttractions, delay);
  }

  async function refreshOsmManually() {
    if (!map || currentMapMode !== 'all' || !osmEnabled) return;

    osmRefreshButton?.classList.add('is-loading');
    if (osmRefreshButton) osmRefreshButton.disabled = true;
    viewportCache.clear();
    updateOsmStatus('Baza atrakcji: odświeżam…');

    try {
      await ensureAttractionDatabase(true);
      if (routeActive && routeCoordinates.length) {
        routeAttractions = await fetchRouteAttractions(routeCoordinates, getProximityRadiusMeters());
        nearbyAttractions = routeAttractions;
        updateMainAttractionLayer(`Atrakcje do ${formatDistance(getProximityRadiusMeters())} od trasy: ${routeAttractions.length} · alert aktywny`);
        return;
      }

      if (lastMonitorPosition?.coords) {
        lastNearbyFetchAt = 0;
        lastNearbyFetchPosition = null;
        await refreshNearbyAttractions(lastMonitorPosition);
      }

      await loadViewportAttractions();
    } finally {
      osmRefreshButton?.classList.remove('is-loading');
      if (osmRefreshButton) osmRefreshButton.disabled = false;
    }
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
      source: 'database',
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

    const savedPoint = loadPoints().find((point) => String(point.osmId || '') === String(attraction.osmId));
    if (savedPoint) {
      showMap({ lat: Number(savedPoint.lat), lon: Number(savedPoint.lon), zoom: 16, openPointId: savedPoint.id });
      return;
    }

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

  function formatRouteDuration(seconds) {
    if (!Number.isFinite(Number(seconds))) return '';
    const totalMinutes = Math.max(1, Math.round(Number(seconds) / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
  }

  function routeDistanceToPointMeters(routeCoordinates, pointLat, pointLon) {
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return Infinity;

    const earthRadius = 6371000;
    const toRad = (value) => value * Math.PI / 180;
    const refLat = toRad(Number(pointLat));
    const cosLat = Math.cos(refLat);
    let minimum = Infinity;

    for (let index = 1; index < routeCoordinates.length; index += 1) {
      const a = routeCoordinates[index - 1];
      const b = routeCoordinates[index];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;

      const ax = toRad(Number(a[0]) - Number(pointLon)) * earthRadius * cosLat;
      const ay = toRad(Number(a[1]) - Number(pointLat)) * earthRadius;
      const bx = toRad(Number(b[0]) - Number(pointLon)) * earthRadius * cosLat;
      const by = toRad(Number(b[1]) - Number(pointLat)) * earthRadius;
      const vx = bx - ax;
      const vy = by - ay;
      const lengthSquared = vx * vx + vy * vy;
      const t = lengthSquared > 0
        ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / lengthSquared))
        : 0;
      const closestX = ax + t * vx;
      const closestY = ay + t * vy;
      const distance = Math.hypot(closestX, closestY);
      if (distance < minimum) minimum = distance;
      if (minimum < 1) return minimum;
    }

    return minimum;
  }

  async function fetchRouteAttractions(routeCoordinates, radiusMeters = getProximityRadiusMeters()) {
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return [];
    const radius = Math.max(1000, Number(radiusMeters) || getProximityRadiusMeters());
    const attractions = await getDatabaseAttractions();

    return attractions
      .map((attraction) => ({
        ...attraction,
        routeDistanceMeters: routeDistanceToPointMeters(
          routeCoordinates,
          Number(attraction.lat),
          Number(attraction.lon)
        )
      }))
      .filter((attraction) => attraction.routeDistanceMeters <= radius)
      .sort((a, b) => a.routeDistanceMeters - b.routeDistanceMeters);
  }

  async function refreshRouteAttractionsForRadius({ showStatus = true } = {}) {
    if (!routeActive || !routeCoordinates.length) return;
    const radius = getProximityRadiusMeters();
    if (showStatus) updateOsmStatus(`Atrakcje w pasie ${formatDistance(radius)} od trasy: wczytywanie…`);

    try {
      routeAttractions = await fetchRouteAttractions(routeCoordinates, radius);
      nearbyAttractions = routeAttractions;
      osmAttractions = new Map(routeAttractions.map((item) => [item.osmId, item]));
      renderExternalAttractions(routeAttractions);
      updateOsmStatus(`Atrakcje w pasie ${formatDistance(radius)} od trasy: ${routeAttractions.length} · alert ${formatDistance(getProximityRadiusMeters())}`);
      if (mapModeBadge) mapModeBadge.textContent = `TRASA · ALERT ${formatDistance(radius).toUpperCase()}`;
      showLocationMessage(`Na trasie: ${routeAttractions.length} atrakcji w odległości do ${formatDistance(radius)} od przebiegu trasy.`);
      if (lastMonitorPosition) checkProximity(lastMonitorPosition);
    } catch (error) {
      console.warn('Nie udało się odczytać atrakcji przy trasie:', error);
      updateOsmStatus('Atrakcje przy trasie: nie udało się odczytać bazy', true);
    }
  }

  function setRouteInfo(text, isError = false) {
    if (!routeInfo) return;
    routeInfo.textContent = text || '';
    routeInfo.classList.toggle('is-error', Boolean(isError));
    routeInfo.hidden = !text;
  }

  function showRoutePanel() {
    if (!routePanel || currentMapMode !== 'all') return;
    routePanel.hidden = false;
    if (routeDestinationInput && !routeActive) {
      setTimeout(() => routeDestinationInput.focus({ preventScroll: true }), 30);
    }
    if (!lastMonitorPosition?.coords) {
      startProximityMonitoring(false);
      setRouteInfo('Ustalam Twoją lokalizację startową…');
    } else if (!routeActive) {
      setRouteInfo('Wpisz cel podróży i wybierz go z listy.');
    }
  }

  function hideRoutePanel() {
    if (routePanel) routePanel.hidden = true;
    if (routeResults) routeResults.replaceChildren();
  }

  function renderRouteSearchResults(results) {
    if (!routeResults) return;
    routeResults.replaceChildren();

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'route-result-empty';
      empty.textContent = 'Nie znaleziono takiego celu w Polsce.';
      routeResults.append(empty);
      return;
    }

    results.forEach((result) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'route-result-button';
      button.setAttribute('role', 'listitem');
      button.textContent = result.display_name || result.name || 'Wybrany cel';
      button.addEventListener('click', () => planRouteToDestination({
        name: result.display_name || result.name || 'Cel podróży',
        lat: Number(result.lat),
        lon: Number(result.lon)
      }));
      routeResults.append(button);
    });
  }

  async function searchRouteDestination() {
    const query = routeDestinationInput?.value.trim() || '';
    if (query.length < 2) {
      setRouteInfo('Wpisz nazwę miejscowości, obiektu lub adres celu.', true);
      return;
    }

    const sequence = ++routeSearchSequence;
    if (routeSearchButton) routeSearchButton.disabled = true;
    setRouteInfo('Szukam celu podróży…');
    if (routeResults) routeResults.replaceChildren();

    try {
      const url = `${NOMINATIM_URL}?format=jsonv2&limit=5&countrycodes=pl&accept-language=pl&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
      const results = await response.json();
      if (sequence !== routeSearchSequence) return;
      renderRouteSearchResults(Array.isArray(results) ? results : []);
      setRouteInfo(results?.length ? 'Wybierz właściwy cel z listy.' : 'Nie znaleziono celu.', !results?.length);
    } catch (error) {
      console.warn('Nie udało się wyszukać celu:', error);
      setRouteInfo('Wyszukiwanie celu jest chwilowo niedostępne.', true);
    } finally {
      if (routeSearchButton) routeSearchButton.disabled = false;
    }
  }

  function clearRoute({ refreshMap = true } = {}) {
    routeActive = false;
    routeDestination = null;
    routeAttractions = [];
    routeCoordinates = [];
    nearbyAttractions = [];
    routeAlertedIds = new Set();

    if (map && routeLayer) map.removeLayer(routeLayer);
    routeLayer = null;
    if (map && routeDestinationMarker) map.removeLayer(routeDestinationMarker);
    routeDestinationMarker = null;

    if (routeClearButton) routeClearButton.hidden = true;
    if (routeDestinationInput) routeDestinationInput.value = '';
    if (routeResults) routeResults.replaceChildren();
    setRouteInfo('Wpisz cel podróży i wybierz go z listy.');

    if (refreshMap && currentMapMode === 'all') {
      scheduleViewportAttractions(150);
      if (lastMonitorPosition?.coords) {
        lastNearbyFetchAt = 0;
        refreshNearbyAttractions(lastMonitorPosition);
      }
    }
  }

  async function planRouteToDestination(destination) {
    if (!map || !destination || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lon)) return;

    let position = lastMonitorPosition;
    if (!position?.coords) {
      setRouteInfo('Ustalam Twoją lokalizację startową…');
      try {
        position = await getCurrentPosition();
        handleMonitoredPosition(position);
      } catch (error) {
        setRouteInfo(geolocationErrorText(error), true);
        return;
      }
    }

    const startLat = Number(position.coords.latitude);
    const startLon = Number(position.coords.longitude);
    setRouteInfo('Wyznaczam trasę…');
    if (routeResults) routeResults.replaceChildren();

    try {
      const url = `${OSRM_ROUTE_URL}/${startLon.toFixed(6)},${startLat.toFixed(6)};${destination.lon.toFixed(6)},${destination.lat.toFixed(6)}?overview=full&geometries=geojson&steps=false`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
      const data = await response.json();
      const route = data?.routes?.[0];
      const coordinates = route?.geometry?.coordinates;
      if (!route || !Array.isArray(coordinates) || coordinates.length < 2) throw new Error('Brak trasy');

      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.geoJSON(route.geometry, {
        style: {
          color: '#1f6fd5',
          weight: 6,
          opacity: 0.86
        }
      }).addTo(map);

      if (routeDestinationMarker) map.removeLayer(routeDestinationMarker);
      routeDestinationMarker = L.marker([destination.lat, destination.lon], {
        title: destination.name || 'Cel podróży'
      }).addTo(map).bindPopup(`<strong>${escapeHtml(destination.name || 'Cel podróży')}</strong><br>Cel podróży`);

      routeActive = true;
      routeDestination = destination;
      routeCoordinates = coordinates;
      routeAlertedIds = new Set();
      if (routeClearButton) routeClearButton.hidden = false;

      clearTimeout(viewportFetchTimer);
      externalLayer?.clearLayers();
      osmMarkerById = new Map();
      if (mapModeBadge) mapModeBadge.textContent = `TRASA · ALERT ${formatDistance(getProximityRadiusMeters()).toUpperCase()}`;

      const distance = formatDistance(Number(route.distance));
      const duration = formatRouteDuration(Number(route.duration));
      const routeRadius = getProximityRadiusMeters();
      setRouteInfo(`${destination.name} · ${distance} · około ${duration}. Szukam atrakcji do ${formatDistance(routeRadius)} od przebiegu trasy…`);

      // v1021: wyznaczenie trasy nie może samoczynnie zmieniać skali ani środka mapy.
      // Tylko przycisk WYCENTRUJ ustawia jednorazowo zoom na bieżącej pozycji.

      try {
        routeAttractions = await fetchRouteAttractions(coordinates, routeRadius);
        nearbyAttractions = routeAttractions;
        osmAttractions = new Map(routeAttractions.map((item) => [item.osmId, item]));
        renderExternalAttractions(routeAttractions);
        updateOsmStatus(`Atrakcje do ${formatDistance(getProximityRadiusMeters())} od trasy: ${routeAttractions.length} · alert aktywny`);
        setRouteInfo(`${destination.name} · ${distance} · około ${duration} · atrakcji do ${formatDistance(routeRadius)} od trasy: ${routeAttractions.length}. Alert podczas jazdy: ${formatDistance(routeRadius)}.`);
        showLocationMessage(`Trasa gotowa · ${routeAttractions.length} atrakcji w zasięgu do ${formatDistance(routeRadius)} od trasy. Alerty podczas jazdy są aktywne.`);
        // Po wyznaczeniu trasy odsłaniamy mapę i znaczniki atrakcji.
        // Nie zmieniamy zoomu ani środka — użytkownik steruje skalą ręcznie.
        hideRoutePanel();
        startProximityMonitoring(false);
        checkProximity(position);
      } catch (error) {
        console.warn('Nie udało się odczytać atrakcji przy trasie:', error);
        routeAttractions = [];
        nearbyAttractions = [];
        updateOsmStatus('Atrakcje przy trasie: brak danych z bazy', true);
        setRouteInfo(`${destination.name} · ${distance} · około ${duration}. Trasa działa, ale atrakcji nie udało się odczytać z bazy.`, true);
      }
    } catch (error) {
      console.warn('Nie udało się wyznaczyć trasy:', error);
      setRouteInfo('Nie udało się wyznaczyć trasy do tego celu.', true);
    }
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

    if (routeActive) {
      routeAlertedIds.add(String(attraction.osmId));
    } else {
      markAttractionAlerted(attraction.osmId);
    }
    nearbyAlert.hidden = false;
  }

  function checkProximity(position) {
    if (!osmEnabled || !proximityActive || !position?.coords || !nearbyAttractions.length) return;
    if (currentNearbyAlertId && nearbyAlert && !nearbyAlert.hidden) return;

    const radius = getProximityRadiusMeters();
    const { latitude, longitude } = position.coords;

    const candidate = nearbyAttractions
      .map((attraction) => ({
        attraction,
        distance: distanceMeters(latitude, longitude, attraction.lat, attraction.lon)
      }))
      .filter((item) => {
        if (item.distance > radius) return false;
        if (routeActive) return !routeAlertedIds.has(String(item.attraction.osmId));
        return !wasAttractionAlertedRecently(item.attraction.osmId);
      })
      .sort((a, b) => a.distance - b.distance)[0];

    if (candidate) {
      showNearbyAttractionAlert(candidate.attraction, candidate.distance);
    }
  }

  async function refreshNearbyAttractions(position) {
    if (!osmEnabled || !position?.coords || nearbyFetchInFlight) return;
    nearbyFetchInFlight = true;

    const { latitude, longitude } = position.coords;
    const radius = Math.max(NEARBY_FETCH_MIN_RADIUS, getProximityRadiusMeters() + 5000);
    try {
      nearbyAttractions = await getAttractionsNear(latitude, longitude, radius);
      lastNearbyFetchPosition = { lat: latitude, lon: longitude };
      lastNearbyFetchAt = Date.now();
      if (currentMapMode === 'all' && !routeActive) {
        updateMainAttractionLayer(`Atrakcje w pobliżu GPS: ${nearbyAttractions.length}`);
      }
      checkProximity(position);
    } catch (error) {
      console.warn('Nie udało się odczytać atrakcji w pobliżu:', error);
      // Nie usuwamy poprzedniej listy nearbyAttractions przy chwilowym błędzie.
      // Dzięki temu istniejące znaczniki i alerty pozostają dostępne.
      const keptCount = new Set(
        [...nearbyAttractions, ...viewportAttractions]
          .filter((item) => item?.osmId)
          .map((item) => item.osmId)
      ).size;
      if (currentMapMode === 'all' && !routeActive) updateMainAttractionLayer();
      showLocationMessage(
        keptCount
          ? `Nie udało się odświeżyć bazy. Zachowuję ${keptCount} wcześniej wczytanych punktów.`
          : 'Nie udało się odczytać bazy atrakcji. Naciśnij BAZA, aby spróbować ponownie.',
        !keptCount
      );
    } finally {
      nearbyFetchInFlight = false;
    }
  }

  function keepMonitoredPositionVisible(position) {
    if (!map || mapScreen?.hidden || currentMapMode !== 'all' || !position?.coords || !mapAutoFollowEnabled) return;

    const lat = Number(position.coords.latitude);
    const lon = Number(position.coords.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    // Podczas jazdy nie zmieniamy samoczynnie skali mapy. Przesuwamy ją tylko
    // wtedy, gdy niebieski punkt zbliża się do krawędzi, aby pozostawał widoczny.
    const point = map.latLngToContainerPoint([lat, lon]);
    const size = map.getSize();
    const marginX = Math.min(FOLLOW_EDGE_MARGIN_PX, Math.max(48, size.x * 0.22));
    const marginY = Math.min(FOLLOW_EDGE_MARGIN_PX, Math.max(48, size.y * 0.22));
    const outsideSafeArea =
      point.x < marginX ||
      point.x > size.x - marginX ||
      point.y < marginY ||
      point.y > size.y - marginY;

    if (outsideSafeArea) {
      mapProgrammaticMove = true;
      map.panTo([lat, lon], { animate: true, duration: 0.35, noMoveStart: true });
      mapProgrammaticMove = false;
    }
  }

  function handleMonitoredPosition(position) {
    lastMonitorPosition = position;
    updateMonitoredLocationVisual(position);
    setLocationButtonState('active');
    keepMonitoredPositionVisible(position);
    updateAttractionPreview(position);

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

    if (routeActive) {
      checkProximity(position);
    } else if (movedSinceFetch >= NEARBY_REFRESH_DISTANCE || fetchExpired || !nearbyAttractions.length) {
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
      showLocationMessage(`Monitoring GPS włączony · alert ${formatDistance(getProximityRadiusMeters())}.`);
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
    hideNearbyAlert();
    if (showMessage) showLocationMessage('Monitoring GPS został zatrzymany.');
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
        <button class="place-popup-edit" type="button" data-route-point-id="${escapeHtml(point.id)}">USTAW TRASĘ DO TEGO MIEJSCA</button>
        <button class="place-popup-edit" type="button" data-wikipedia-query="${escapeHtml(title)}">WIKIPEDIA</button>
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
      if (!attractionMatchesActiveFilter(point.category)) return;
      const marker = L.marker([Number(point.lat), Number(point.lon)], {
        icon: createCategoryIcon(point.category),
        title: point.name || (CATEGORY_INFO[point.category]?.label ?? 'Miejsce'),
        riseOnHover: true
      }).addTo(pointLayer);
      marker.bindPopup(popupHtml(point), { maxWidth: 320, minWidth: 210 });
      pointMarkerById.set(String(point.id), marker);
    });

    if (currentMapMode === 'all' && osmAttractions.size) {
      renderExternalAttractions([...osmAttractions.values()]);
    } else if (currentMapMode === 'mine') {
      externalLayer?.clearLayers();
      osmMarkerById = new Map();
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

    // Ręczne ruszenie mapy oznacza: użytkownik chce oglądać inne miejsce.
    // GPS nadal działa i alerty nadal są liczone, ale mapa nie wraca sama do pozycji.
    const pauseAutoFollowFromUser = () => {
      if (mapProgrammaticMove) return;
      mapAutoFollowEnabled = false;
    };
    map.on('dragstart', pauseAutoFollowFromUser);
    map.on('zoomstart', pauseAutoFollowFromUser);

    map.on('moveend zoomend', () => scheduleViewportAttractions());
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

  async function centerOnCurrentLocation() {
    if (!map) return;
    setLocationButtonState('locating');
    showLocationMessage('Ustalam Twoją lokalizację…');

    try {
      let position = lastMonitorPosition;
      if (!position?.coords) {
        position = await getCurrentPosition();
        lastMonitorPosition = position;
        updateMonitoredLocationVisual(position);
        updateAttractionPreview(position);
        if (!routeActive) {
          lastNearbyFetchAt = 0;
          refreshNearbyAttractions(position);
        }
      }

      const { latitude, longitude, accuracy } = position.coords;
      mapAutoFollowEnabled = true;
      mapProgrammaticMove = true;
      map.setView([latitude, longitude], 15, { animate: true });
      mapProgrammaticMove = false;
      setLocationButtonState('active');
      showLocationMessage(`Wycentrowano na Twojej pozycji (dokładność ok. ${Math.round(accuracy || 0)} m).`);
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

  function applyMapMode(mode) {
    currentMapMode = mode === 'mine' ? 'mine' : 'all';
    const mineOnly = currentMapMode === 'mine';

    if (mapModeBadge) {
      mapModeBadge.textContent = mineOnly ? `MOJE MIEJSCA · ${loadPoints().length}` : 'MAPA';
      mapModeBadge.classList.toggle('is-my-places', mineOnly);
    }

    if (mapLocationButton) mapLocationButton.hidden = mineOnly;
    if (routeButton) routeButton.hidden = mineOnly;
    if (proximityButton) proximityButton.hidden = true;
    if (osmRefreshButton) osmRefreshButton.hidden = mineOnly;
    if (attractionPreviewButton) attractionPreviewButton.hidden = mineOnly;
    updateOsmButtonUi();
    if (proximityRadiusWrap) proximityRadiusWrap.hidden = mineOnly;
    if (osmStatus) osmStatus.hidden = true;

    if (mineOnly) {
      hideRoutePanel();
      hideAttractionPreview();
      attractionPreviewItems = [];
      setAttractionPreviewButton(null);
      clearTimeout(viewportFetchTimer);
      viewportFetchSequence += 1;
      osmAttractions = new Map();
      viewportAttractions = [];
      externalLayer?.clearLayers();
      osmMarkerById = new Map();
      hideNearbyAlert();
      stopProximityMonitoring(false);
      setProximityUi(false);

      if (map && userLocationMarker) {
        map.removeLayer(userLocationMarker);
        userLocationMarker = null;
      }
      if (map && userAccuracyCircle) {
        map.removeLayer(userAccuracyCircle);
        userAccuracyCircle = null;
      }
    }
  }

  function showMyPlacesMap() {
    showMap({ mode: 'mine' });
  }

  function showMap(options = {}) {
    if (!mapScreen || !startScreen) return;
    // Wejście na mapę nie odbiera użytkownikowi kontroli. Śledzenie widoku
    // zostanie włączone dopiero po naciśnięciu WYCENTRUJ.
    mapAutoFollowEnabled = false;
    applyMapMode(options.mode || 'all');
    startScreen.hidden = true;
    if (addScreen) addScreen.hidden = true;
    if (editScreen) editScreen.hidden = true;
    mapScreen.hidden = false;
    createMap();
    renderStoredPoints();

    const showingRequestedPoint = Number.isFinite(options.lat) && Number.isFinite(options.lon);
    const mineOnly = currentMapMode === 'mine';


    requestAnimationFrame(() => {
      map?.invalidateSize();

      if (showingRequestedPoint) {
        map?.setView([options.lat, options.lon], options.zoom || 16, { animate: true });
      } else if (mineOnly) {
        map?.setView([52.05, 19.15], 6, { animate: false });
      }

      if (options.openPointId != null) {
        setTimeout(() => pointMarkerById.get(String(options.openPointId))?.openPopup(), 250);
      }

      if (mineOnly) {
        externalLayer?.clearLayers();
        updateOsmStatus('');
        if (loadPoints().length === 0) {
          showLocationMessage('Nie masz jeszcze zapisanych miejsc. Dodaj pierwszy punkt przyciskiem DODAJ.');
        }
        return;
      }

      updateOsmButtonUi();
      if (routeActive && osmEnabled) {
        renderExternalAttractions(routeAttractions);
        updateOsmStatus(`Atrakcje do ${formatDistance(getProximityRadiusMeters())} od trasy: ${routeAttractions.length} · alert aktywny`);
        if (mapModeBadge) mapModeBadge.textContent = `TRASA · ALERT ${formatDistance(getProximityRadiusMeters()).toUpperCase()}`;
      } else if (osmEnabled) {
        // Baza jest lokalna, więc od razu pokaż atrakcje z aktualnie widocznego obszaru.
        // GPS niezależnie od tego będzie później aktualizował listę atrakcji w pobliżu.
        scheduleViewportAttractions(0);
      } else {
        clearOsmAttractions();
        updateOsmStatus('Baza atrakcji: wyłączona');
      }
      startProximityMonitoring(true);
      if (osmEnabled && lastMonitorPosition?.coords) {
        updateAttractionPreview(lastMonitorPosition);
      }
      if (osmEnabled && lastMonitorPosition?.coords && !routeActive) {
        lastNearbyFetchAt = 0;
        refreshNearbyAttractions(lastMonitorPosition);
      }
    });
  }

  function hideMap() {
    if (!mapScreen || !startScreen) return;
    stopProximityMonitoring(false);
    hideRoutePanel();
    hideAttractionPreview();
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
    const pointId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const point = {
      id: pointId,
      osmId: `user/${pointId}`,
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
    upsertUserAttractionFromPoint(point);
    showAddMessage('Punkt został zapisany i dopisany do Twojej lokalnej bazy atrakcji.');

    setTimeout(() => {
      showMap({ lat, lon, zoom: 16, openPointId: point.id });
    }, 250);
  }

  function showEditScreen(pointId) {
    const point = findPoint(pointId);
    if (!point || !editScreen) return;

    editingPointId = String(point.id);
    editReturnMapMode = currentMapMode;
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
      showMap({ mode: editReturnMapMode, lat: Number(point.lat), lon: Number(point.lon), zoom: Math.max(map?.getZoom() || 15, 15), openPointId: point.id });
    } else {
      showMap({ mode: editReturnMapMode });
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
    if (loadUserAttractionDb().some((item) => String(item.id) === String(saved.osmId || ''))) {
      upsertUserAttractionFromPoint(saved);
    }
    renderStoredPoints();
    showEditMessage('Zmiany zostały zapisane.');

    setTimeout(() => {
      if (editScreen) editScreen.hidden = true;
      editingPointId = null;
      showMap({ mode: editReturnMapMode, lat, lon, zoom: 16, openPointId: saved.id });
    }, 250);
  }

  function deleteEditedPoint() {
    if (!editingPointId) return;
    const point = findPoint(editingPointId);
    if (!point) return;

    const title = point.name?.trim() || (CATEGORY_INFO[point.category]?.label ?? 'ten punkt');
    const confirmed = window.confirm(`Czy na pewno usunąć punkt „${title}”?\n\nTej operacji nie można cofnąć.`);
    if (!confirmed) return;

    removeUserAttractionForPoint(point);
    const points = loadPoints().filter((item) => String(item.id) !== String(editingPointId));
    savePoints(points);
    editingPointId = null;
    if (editScreen) editScreen.hidden = true;
    renderStoredPoints();
    showMap({ mode: editReturnMapMode });
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
    const wikipediaButton = event.target.closest('[data-wikipedia-query]');
    if (wikipediaButton) {
      event.preventDefault();
      event.stopPropagation();
      const query = String(wikipediaButton.dataset.wikipediaQuery || '').trim();
      if (query) {
        const url = `https://pl.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
        const wikipediaWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (wikipediaWindow) wikipediaWindow.opener = null;
      }
      return;
    }

    const routeOsmButton = event.target.closest('[data-route-osm-id]');
    if (routeOsmButton) {
      event.preventDefault();
      event.stopPropagation();
      const attraction = getOsmAttractionById(routeOsmButton.dataset.routeOsmId);
      if (attraction) {
        map?.closePopup();
        if (routeDestinationInput) routeDestinationInput.value = attraction.name || '';
        planRouteToDestination({
          name: attraction.name || 'Atrakcja',
          lat: Number(attraction.lat),
          lon: Number(attraction.lon)
        });
      }
      return;
    }

    const routePointButton = event.target.closest('[data-route-point-id]');
    if (routePointButton) {
      event.preventDefault();
      event.stopPropagation();
      const point = findPoint(routePointButton.dataset.routePointId);
      if (point) {
        map?.closePopup();
        if (routeDestinationInput) routeDestinationInput.value = point.name || '';
        planRouteToDestination({
          name: point.name || (CATEGORY_INFO[point.category]?.label ?? 'Moje miejsce'),
          lat: Number(point.lat),
          lon: Number(point.lon)
        });
      }
      return;
    }

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

  mapLegend?.querySelectorAll('[data-map-filter]').forEach((button) => {
    button.addEventListener('click', () => toggleAttractionFilter(button.dataset.mapFilter));
  });
  updateMapLegendUi();

  routeButton?.addEventListener('click', showRoutePanel);
  routePanelClose?.addEventListener('click', hideRoutePanel);
  routeSearchButton?.addEventListener('click', searchRouteDestination);
  routeDestinationInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchRouteDestination();
    }
  });
  routeClearButton?.addEventListener('click', () => clearRoute({ refreshMap: true }));

  osmRefreshButton?.addEventListener('click', () => {
    if (osmRefreshButton?.classList.contains('is-loading')) return;
    if (osmEnabled) {
      setOsmEnabled(false, { fetchNow: false });
    } else {
      setOsmEnabled(true, { fetchNow: true });
    }
  });

  proximityButton?.addEventListener('click', () => startProximityMonitoring(true));

  proximityRadius?.addEventListener('change', () => {
    const radius = getProximityRadiusMeters();
    localStorage.setItem(PROXIMITY_RADIUS_KEY, String(radius));
    if (lastMonitorPosition?.coords) updateAttractionPreview(lastMonitorPosition);

    if (proximityActive) {
      showLocationMessage(`Odległość alertu: ${formatDistance(radius)}.`);
      lastNearbyFetchAt = 0;
      if (routeActive && routeCoordinates.length) {
        refreshRouteAttractionsForRadius();
      } else if (lastMonitorPosition) {
        refreshNearbyAttractions(lastMonitorPosition);
      }
    }
  });

  attractionPreviewButton?.addEventListener('click', showAttractionPreview);
  attractionPreviewClose?.addEventListener('click', hideAttractionPreview);
  attractionPreviewOverlay?.addEventListener('click', (event) => {
    if (event.target === attractionPreviewOverlay) hideAttractionPreview();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && attractionPreviewOverlay && !attractionPreviewOverlay.hidden) {
      hideAttractionPreview();
      attractionPreviewButton?.focus({ preventScroll: true });
    }
  });
  attractionPreviewList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preview-route-id]');
    if (!button) return;
    const item = attractionPreviewItems.find(
      (entry) => String(entry.attraction.osmId) === String(button.dataset.previewRouteId)
    );
    if (!item) return;

    hideAttractionPreview();
    if (routeDestinationInput) routeDestinationInput.value = item.attraction.name || '';
    planRouteToDestination({
      name: item.attraction.name || (CATEGORY_INFO[item.attraction.category]?.label ?? 'Atrakcja'),
      lat: Number(item.attraction.lat),
      lon: Number(item.attraction.lon)
    });
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

  mapButton?.addEventListener('click', () => showMap({ mode: 'all' }));
  myPlacesButton?.addEventListener('click', showMyPlacesMap);
  mapBackButton?.addEventListener('click', hideMap);
  mapLocationButton?.addEventListener('click', centerOnCurrentLocation);

  window.addEventListener('resize', () => {
    if (mapScreen && !mapScreen.hidden) map?.invalidateSize();
  });

  if (dateInput && !dateInput.value) dateInput.value = localDateString();

  if (proximityRadius) {
    const savedRadius = Number(localStorage.getItem(PROXIMITY_RADIUS_KEY) || 5000);
    proximityRadius.value = String([5000, 10000, 15000, 20000].includes(savedRadius) ? savedRadius : 5000);
  }

  setCategory(currentCategory);
  setEditCategory(editCategory);
  setProximityUi(false);
  setAttractionPreviewButton(null);

  // PWA: rejestracja Service Workera i szybkie wykrywanie nowej wersji.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js?v=1031', {
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

(() => {
  const APP_VERSION = 'v1062';
  const STORAGE_KEY = 'tourmap_points_v1';
  const PROXIMITY_RADIUS_KEY = 'tourmap_proximity_radius_v1';
  const ALERT_HISTORY_KEY = 'tourmap_alert_history_v1';
  const OSM_ENABLED_KEY = 'tourmap_osm_enabled_v1';
  const USER_DB_KEY = 'tourmap_user_attraction_db_v1';
  const ATTRACTION_DB_URL = 'data/atrakcje-polska.json?v=1062';
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const ROUTE_MODE_KEY = 'tourmap_route_mode_v1';
  const ROUTE_MODES = {
    car: {
      label: 'AUTO', icon: '🚗',
      endpoint: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
      activity: 'jazda samochodem'
    },
    foot: {
      label: 'PIESZO', icon: '🚶',
      endpoint: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
      activity: 'trasa piesza'
    },
    hiking: {
      label: 'GÓRY', icon: '🥾',
      endpoint: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
      activity: 'trasa piesza / górska'
    },
    bike: {
      label: 'ROWER', icon: '🚲',
      endpoint: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
      activity: 'trasa rowerowa'
    }
  };
  const FOLLOW_EDGE_MARGIN_PX = 92;
  const NAVIGATION_CAR_ZOOM = 17;
  const NAVIGATION_OTHER_ZOOM = 17;
  const ROUTE_DISPLAY_RADIUS = 20000;
  const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
  const NEARBY_FETCH_MIN_RADIUS = 12000;
  const NEARBY_REFRESH_DISTANCE = 2500;
  const NEARBY_REFRESH_TIME = 8 * 60 * 1000;
  // v1050: lekki indeks przestrzenny ogranicza liczbę punktów sprawdzanych przez telefon.
  const SPATIAL_CELL_DEGREES = 0.25;
  const PREVIEW_MIN_MOVE_METERS = 250;
  const PREVIEW_MIN_INTERVAL_MS = 30 * 1000;
  const ROUTE_SAMPLE_STEP_METERS = 450;
  const CLUSTER_MAX_ZOOM = 8;
  const CLUSTER_CELL_PX = 76;
  
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
  const mapTopPanel = document.getElementById('mapTopPanel');
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
  const routeModeButtons = [...document.querySelectorAll('[data-route-mode]')];
  const routeModeOverlay = document.getElementById('routeModeOverlay');
  const routeModeClose = document.getElementById('routeModeClose');
  const routeModeDestinationName = document.getElementById('routeModeDestinationName');
  const routeSource = document.getElementById('routeSource');
  const osmStatus = document.getElementById('osmStatus');
  const mapModeBadge = document.getElementById('mapModeBadge');
  const myPlacesTransfer = document.getElementById('myPlacesTransfer');
  const exportMyPlacesButton = document.getElementById('exportMyPlacesButton');
  const importMyPlacesButton = document.getElementById('importMyPlacesButton');
  const importMyPlacesInput = document.getElementById('importMyPlacesInput');
  const mapLegend = document.getElementById('mapLegend');
  const navigationAttractionsWrap = document.getElementById('navigationAttractionsWrap');
  const navigationAttractionsButton = document.getElementById('navigationAttractionsButton');
  const navigationAttractionsOverlay = document.getElementById('navigationAttractionsOverlay');
  const navigationAttractionsClose = document.getElementById('navigationAttractionsClose');
  const navigationAttractionsGrid = document.getElementById('navigationAttractionsGrid');
  const attractionPreviewButton = document.getElementById('attractionPreviewButton');
  const attractionPreviewCount = document.getElementById('attractionPreviewCount');
  const attractionPreviewOverlay = document.getElementById('attractionPreviewOverlay');
  const attractionPreviewClose = document.getElementById('attractionPreviewClose');
  const attractionPreviewSummary = document.getElementById('attractionPreviewSummary');
  const attractionPreviewList = document.getElementById('attractionPreviewList');

  const navigationPanel = document.getElementById('navigationPanel');
  const navigationKicker = document.getElementById('navigationKicker');
  const navigationArrow = document.getElementById('navigationArrow');
  const navigationInstruction = document.getElementById('navigationInstruction');
  const navigationRoad = document.getElementById('navigationRoad');
  const navigationTurnDistance = document.getElementById('navigationTurnDistance');
  const navigationRemainingDistance = document.getElementById('navigationRemainingDistance');
  const navigationRemainingTime = document.getElementById('navigationRemainingTime');
  const navigationVoiceButton = document.getElementById('navigationVoiceButton');
  const navigationStopButton = document.getElementById('navigationStopButton');
  const navigationDestination = document.getElementById('navigationDestination');
  const navigationMode = document.getElementById('navigationMode');
  const mapManeuverOverlay = document.getElementById('mapManeuverOverlay');
  const mapManeuverArrow = document.getElementById('mapManeuverArrow');
  const mapManeuverDistance = document.getElementById('mapManeuverDistance');
  const mapManeuverInstruction = document.getElementById('mapManeuverInstruction');
  const mapManeuverRoadRef = document.getElementById('mapManeuverRoadRef');
  const mapManeuverRoad = document.getElementById('mapManeuverRoad');
  const mapLanes = document.getElementById('mapLanes');
  const routeAttractionsMiniControls = document.getElementById('routeAttractionsMiniControls');
  const routeAttractionsRadarButton = document.getElementById('routeAttractionsRadarButton');
  const routeAttractionsRadarCount = document.getElementById('routeAttractionsRadarCount');
  const nearestAttractionButton = document.getElementById('nearestAttractionButton');
  const nearestAttractionIcon = document.getElementById('nearestAttractionIcon');
  const nearestAttractionDistance = document.getElementById('nearestAttractionDistance');
  const routeAttractionsStatusPanel = document.getElementById('routeAttractionsStatusPanel');
  const routeAttractionsStatusClose = document.getElementById('routeAttractionsStatusClose');
  const routeAttractionsStatusCount = document.getElementById('routeAttractionsStatusCount');
  const routeAttractionsStatusRadius = document.getElementById('routeAttractionsStatusRadius');
  const routeAttractionsStatusSummary = document.getElementById('routeAttractionsStatusSummary');
  const routeAttractionsStatusList = document.getElementById('routeAttractionsStatusList');
  const routeAttractionInfoOverlay = document.getElementById('routeAttractionInfoOverlay');
  const routeAttractionInfoClose = document.getElementById('routeAttractionInfoClose');
  const routeAttractionInfoCancel = document.getElementById('routeAttractionInfoCancel');
  const routeAttractionInfoLead = document.getElementById('routeAttractionInfoLead');
  const routeAttractionInfoIcon = document.getElementById('routeAttractionInfoIcon');
  const routeAttractionInfoName = document.getElementById('routeAttractionInfoName');
  const routeAttractionInfoType = document.getElementById('routeAttractionInfoType');
  const routeAttractionInfoDistance = document.getElementById('routeAttractionInfoDistance');
  const routeAttractionInfoMeta = document.getElementById('routeAttractionInfoMeta');

  const nearbyAlert = document.getElementById('nearbyAlert');
  const nearbyAlertIcon = document.getElementById('nearbyAlertIcon');
  const nearbyAlertTitle = document.getElementById('nearbyAlertTitle');
  const nearbyAlertMeta = document.getElementById('nearbyAlertMeta');
  const nearbyAlertShow = document.getElementById('nearbyAlertShow');
  const nearbyAlertAdd = document.getElementById('nearbyAlertAdd');
  const nearbyAlertDismiss = document.getElementById('nearbyAlertDismiss');

  let map = null;
  let userLocationMarker = null;
  let userLocationMarkerMode = 'dot';
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
  let osmEnabled = true;
  let attractionDatabase = [];
  let attractionDatabaseLoaded = false;
  let attractionDatabasePromise = null;
  let attractionSpatialIndex = new Map();
  let lastPreviewPosition = null;
  let lastPreviewUpdateAt = 0;
  const externalIconCache = new Map();

  let proximityWatchId = null;
  let proximityActive = false;
  let nearbyAttractions = [];
  let nearbyFetchInFlight = false;
  let lastMonitorPosition = null;
  let lastNearbyFetchPosition = null;
  let lastNearbyFetchAt = 0;
  let currentNearbyAlertId = null;
  let nearbyAlertTimer = null;

  // v1035: WYCENTRUJ włącza śledzenie widoku. Ręczne przesunięcie mapy je wyłącza,
  // ale ręczna zmiana zoomu NIE wyłącza śledzenia. Dzięki temu użytkownik może
  // oddalić mapę, a pozycja wróci do środka dopiero przy dojściu do krawędzi.
  let mapAutoFollowEnabled = false;
  let mapProgrammaticMove = false;
  let mapAutoRecenterInProgress = false;

  let routeOutlineLayer = null;
  let routeLayer = null;
  let routeDestinationMarker = null;
  let routeActive = false;
  let routeDestination = null;
  let routeAttractions = [];
  let routeCoordinates = [];
  let routeSearchSequence = 0;
  let routeAlertedIds = new Set();
  // v1040: tryb wybierany po wskazaniu celu; aktywna nawigacja zachowuje profil przy przeliczaniu.
  let routeTravelMode = 'car';
  let activeRouteMode = 'car';
  // v1040: cel oczekuje na wybór trybu dopiero po kliknięciu PROWADŹ / wskazaniu celu.
  let pendingRouteDestination = null;

  // v1040: nawigacja zintegrowana z panelem mapy + profile AUTO / PIESZO / GÓRY / ROWER.
  let navigationActive = false;
  let navigationVoiceEnabled = true;
  let navigationSteps = [];
  let navigationRouteCumulative = [];
  let navigationRouteDistance = 0;
  let navigationRouteDuration = 0;
  let navigationLastRouteIndex = 0;
  let navigationLastStepIndex = -1;
  let navigationLastVoiceBucket = '';
  let navigationLastSpokenKey = '';
  let navigationRerouteInFlight = false;
  let navigationLastRerouteAt = 0;
  let navigationOffRouteFixes = 0;
  let navigationArrived = false;
  let navigationVisibleRouteIndex = 0;
  let navigationLastRoutePaintPosition = null;
  let navigationHeadingDegrees = 0;
  let routeAttractionRefreshSequence = 0;
  let navigationCurrentProgress = 0;
  let routeAttractionsPanelSignature = '';
  let routeAttractionsPanelExpanded = false;
  let nearestRouteAttractionForMini = null;
  let navigationMatchedLatLng = null;
  let navigationCurrentManeuverDistance = Infinity;
  let navigationLastMapBearing = null;
  let routeAttractionInfoCurrent = null;
  let routeAttractionInfoById = new Map();
  const ROUTE_ATTRACTION_PASSED_TOLERANCE_METERS = 35;

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

  function normalizeImportedPoint(raw, fallbackIndex = 0) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const lat = Number(raw.lat);
    const lon = Number(raw.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return null;

    const category = CATEGORY_INFO[raw.category] ? raw.category : 'historic';
    const sourceId = String(raw.id || '').trim();
    const id = sourceId || `import-${Date.now()}-${fallbackIndex}-${Math.random().toString(16).slice(2)}`;
    const osmId = String(raw.osmId || '').trim();
    const name = String(raw.name || CATEGORY_INFO[category].label).trim().slice(0, 100) || CATEGORY_INFO[category].label;
    const note = String(raw.note || '').slice(0, 2000);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? String(raw.date) : localDateString();
    const createdAt = String(raw.createdAt || '').trim() || new Date().toISOString();
    const updatedAt = String(raw.updatedAt || '').trim() || createdAt;

    return {
      id,
      ...(osmId ? { osmId } : {}),
      name,
      category,
      date,
      note,
      lat,
      lon,
      source: String(raw.source || 'import').slice(0, 40),
      createdAt,
      updatedAt
    };
  }

  function backupPointKey(point) {
    if (point?.osmId) return `osm:${String(point.osmId)}`;
    if (point?.id) return `id:${String(point.id)}`;
    return `geo:${Number(point?.lat).toFixed(6)}:${Number(point?.lon).toFixed(6)}:${String(point?.name || '').trim().toLowerCase()}`;
  }

  function pointTimestamp(point) {
    const value = Date.parse(String(point?.updatedAt || point?.createdAt || ''));
    return Number.isFinite(value) ? value : 0;
  }

  function exportMyPlaces() {
    const places = loadPoints();
    if (!places.length) {
      showLocationMessage('Nie masz jeszcze miejsc do zapisania.');
      return;
    }

    const payload = {
      format: 'turystyczna-mapa-polski-my-places',
      formatVersion: 1,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      count: places.length,
      places
    };
    const json = JSON.stringify(payload, null, 2);
    const filename = `atrakcje polski ${localDateString(new Date())}.json`;

    try {
      // Najbardziej przewidywalna metoda dla PWA na Androidzie/PC:
      // zwykłe pobranie pliku do folderu Pobrane/Downloads.
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showLocationMessage(`Zapisano ${places.length} miejsc. Plik: ${filename}`);
    } catch (error) {
      console.error('Nie udało się zapisać kopii miejsc:', error);
      showLocationMessage('Nie udało się rozpocząć zapisu pliku. Spróbuj ponownie.');
    }
  }

  function readBackupFileText(file) {
    if (file && typeof file.text === 'function') return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Nie udało się odczytać pliku'));
      reader.readAsText(file, 'utf-8');
    });
  }

  async function importMyPlacesFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showLocationMessage('Wybrany plik jest zbyt duży.');
      return;
    }

    if (importMyPlacesButton) importMyPlacesButton.disabled = true;
    try {
      const text = await readBackupFileText(file);
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) && parsed?.format && parsed.format !== 'turystyczna-mapa-polski-my-places') {
        throw new Error('To nie jest plik kopii Moich miejsc');
      }
      const rawPlaces = Array.isArray(parsed) ? parsed : parsed?.places;
      if (!Array.isArray(rawPlaces)) throw new Error('Nieprawidłowy format kopii');

      const imported = rawPlaces
        .map((point, index) => normalizeImportedPoint(point, index))
        .filter(Boolean);
      if (!imported.length) throw new Error('Brak poprawnych miejsc w pliku');

      const existing = loadPoints().map((point, index) => normalizeImportedPoint(point, index)).filter(Boolean);
      const merged = new Map();
      existing.forEach((point) => merged.set(backupPointKey(point), point));

      let added = 0;
      let updated = 0;
      let skipped = 0;
      imported.forEach((point) => {
        const key = backupPointKey(point);
        const current = merged.get(key);
        if (!current) {
          merged.set(key, point);
          added += 1;
          return;
        }
        if (pointTimestamp(point) > pointTimestamp(current)) {
          merged.set(key, { ...current, ...point, id: current.id || point.id });
          updated += 1;
        } else {
          skipped += 1;
        }
      });

      const result = [...merged.values()];
      savePoints(result);
      migrateSavedPointsIntoUserDatabase();
      if (attractionDatabaseLoaded) rebuildAttractionDatabase();
      renderStoredPoints();

      if (mapModeBadge) mapModeBadge.textContent = `MOJE MIEJSCA · ${result.length}`;
      if (currentMapMode === 'mine' && map && result.length) {
        const coords = result
          .filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)))
          .map((point) => [Number(point.lat), Number(point.lon)]);
        if (coords.length === 1) map.setView(coords[0], 15, { animate: true });
        else if (coords.length > 1) map.fitBounds(coords, { padding: [28, 28], maxZoom: 13 });
      }

      showLocationMessage(`Wczytano kopię: dodano ${added}, zaktualizowano ${updated}, bez zmian ${skipped}. Razem: ${result.length}.`);
    } catch (error) {
      console.error('Nie udało się wczytać kopii miejsc:', error);
      showLocationMessage('Nie udało się wczytać tego pliku. Wybierz plik atrakcje polski YYYY-MM-DD.json zapisany przez aplikację.');
    } finally {
      if (importMyPlacesInput) importMyPlacesInput.value = '';
      if (importMyPlacesButton) importMyPlacesButton.disabled = false;
    }
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
    const key = CATEGORY_INFO[category] ? category : 'castle';
    if (externalIconCache.has(key)) return externalIconCache.get(key);
    const info = CATEGORY_INFO[key];
    const icon = L.icon({
      iconUrl: info.icon,
      iconSize: [40, 40],
      iconAnchor: [20, 38],
      popupAnchor: [0, -34],
      tooltipAnchor: [0, -31],
      className: 'tourism-marker-icon osm-marker-icon'
    });
    externalIconCache.set(key, icon);
    return icon;
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
    return true;
  }

  function saveOsmEnabled() {
    try {
      localStorage.setItem(OSM_ENABLED_KEY, '1');
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
    // v1038: baza atrakcji jest zawsze aktywna — nie ma już przełącznika BAZA ON/OFF.
    osmEnabled = true;
    saveOsmEnabled();
    updateOsmButtonUi();
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

  function spatialCellKey(lat, lon) {
    return `${Math.floor(Number(lat) / SPATIAL_CELL_DEGREES)}:${Math.floor(Number(lon) / SPATIAL_CELL_DEGREES)}`;
  }

  function rebuildAttractionSpatialIndex() {
    attractionSpatialIndex = new Map();
    attractionDatabase.forEach((item) => {
      const key = spatialCellKey(item.lat, item.lon);
      if (!attractionSpatialIndex.has(key)) attractionSpatialIndex.set(key, []);
      attractionSpatialIndex.get(key).push(item);
    });
  }

  function getIndexedAttractionsForBox(south, west, north, east) {
    if (!attractionSpatialIndex.size) return attractionDatabase;
    const minLatCell = Math.floor(Number(south) / SPATIAL_CELL_DEGREES);
    const maxLatCell = Math.floor(Number(north) / SPATIAL_CELL_DEGREES);
    const minLonCell = Math.floor(Number(west) / SPATIAL_CELL_DEGREES);
    const maxLonCell = Math.floor(Number(east) / SPATIAL_CELL_DEGREES);
    const result = [];
    for (let latCell = minLatCell; latCell <= maxLatCell; latCell += 1) {
      for (let lonCell = minLonCell; lonCell <= maxLonCell; lonCell += 1) {
        const items = attractionSpatialIndex.get(`${latCell}:${lonCell}`);
        if (items?.length) result.push(...items);
      }
    }
    return result;
  }

  function getSavedOsmIdSet() {
    return new Set(loadPoints().map((point) => String(point.osmId || '')).filter(Boolean));
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
    rebuildAttractionSpatialIndex();
    return attractionDatabase;
  }

  async function ensureAttractionDatabase(force = false) {
    if (attractionDatabaseLoaded && !force) return attractionDatabase;
    if (attractionDatabasePromise && !force) return attractionDatabasePromise;

    attractionDatabasePromise = (async () => {
      let baseItems = [];
      try {
        const response = await fetch(ATTRACTION_DB_URL, { cache: 'default', headers: { Accept: 'application/json' } });
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
    await getDatabaseAttractions();
    if (!bounds) return attractionDatabase;
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    return getIndexedAttractionsForBox(south, west, north, east)
      .filter((item) => item.lat >= south && item.lat <= north && item.lon >= west && item.lon <= east);
  }

  async function getAttractionsNear(lat, lon, radius) {
    await getDatabaseAttractions();
    const radiusMeters = Math.max(0, Number(radius) || 0);
    const latDelta = radiusMeters / 111320;
    const lonScale = Math.max(0.2, Math.cos(Number(lat) * Math.PI / 180));
    const lonDelta = radiusMeters / (111320 * lonScale);
    const candidates = getIndexedAttractionsForBox(
      Number(lat) - latDelta,
      Number(lon) - lonDelta,
      Number(lat) + latDelta,
      Number(lon) + lonDelta
    );
    return candidates.filter((item) => distanceMeters(lat, lon, item.lat, item.lon) <= radiusMeters);
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
      updateRouteAttractionsStatusPanel(position);
      return;
    }

    const latitude = Number(position.coords.latitude);
    const longitude = Number(position.coords.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      attractionPreviewItems = [];
      setAttractionPreviewButton(null);
      return;
    }

    const now = Date.now();
    const moved = lastPreviewPosition
      ? distanceMeters(latitude, longitude, lastPreviewPosition.lat, lastPreviewPosition.lon)
      : Infinity;
    const overlayOpen = attractionPreviewOverlay && !attractionPreviewOverlay.hidden;
    const previewMoveThreshold = routeActive ? 35 : PREVIEW_MIN_MOVE_METERS;
    const previewTimeThreshold = routeActive ? 3000 : PREVIEW_MIN_INTERVAL_MS;
    if (!overlayOpen && moved < previewMoveThreshold && now - lastPreviewUpdateAt < previewTimeThreshold) return;

    try {
      const radius = getProximityRadiusMeters();
      const attractions = await getAttractionsNear(latitude, longitude, radius);
      if (sequence !== attractionPreviewUpdateSequence) return;

      attractionPreviewItems = attractions
        .map((attraction) => ({
          attraction,
          distance: distanceMeters(latitude, longitude, Number(attraction.lat), Number(attraction.lon))
        }))
        .sort((a, b) => a.distance - b.distance);
      lastPreviewPosition = { lat: latitude, lon: longitude };
      lastPreviewUpdateAt = now;

      setAttractionPreviewButton(attractionPreviewItems.length);
      if (attractionPreviewOverlay && !attractionPreviewOverlay.hidden) renderAttractionPreviewList();
      updateRouteAttractionsStatusPanel(position);
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
    const allActive = allAttractionFiltersActive();
    mapLegend?.querySelectorAll('[data-map-filter]').forEach((button) => {
      const value = button.dataset.mapFilter;
      const active = value === 'all' ? allActive : activeAttractionFilters.has(value);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    navigationAttractionsGrid?.querySelectorAll('[data-navigation-filter]').forEach((button) => {
      const value = button.dataset.navigationFilter;
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

  function externalPopupHtml(attraction, savedOverride = null) {
    const info = CATEGORY_INFO[attraction.category] || CATEGORY_INFO.castle;
    const saved = savedOverride == null ? isOsmSaved(attraction.osmId) : Boolean(savedOverride);
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
        <button class="place-popup-add-osm" type="button" data-route-osm-id="${escapeHtml(attraction.osmId)}">PROWADŹ</button>
        <button class="place-popup-add-osm" type="button" data-wikipedia-query="${escapeHtml(attraction.name)}">WIKIPEDIA</button>
        ${
          saved
            ? '<div class="osm-saved-badge">TEN PUNKT JEST JUŻ W TWOICH MIEJSCACH</div>'
            : `<button class="place-popup-add-osm" type="button" data-add-osm-id="${escapeHtml(attraction.osmId)}">DODAJ DO MOICH</button>`
        }
      </div>
    `;
  }

  function clusterAttractionsForCurrentZoom(attractions) {
    if (!map || map.getZoom() > CLUSTER_MAX_ZOOM || attractions.length < 2) {
      return attractions.map((attraction) => ({ type: 'attraction', key: String(attraction.osmId), attraction }));
    }

    const zoom = map.getZoom();
    const groups = new Map();
    attractions.forEach((attraction) => {
      const projected = map.project([attraction.lat, attraction.lon], zoom);
      const key = `${Math.floor(projected.x / CLUSTER_CELL_PX)}:${Math.floor(projected.y / CLUSTER_CELL_PX)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(attraction);
    });

    const result = [];
    groups.forEach((items, cellKey) => {
      if (items.length === 1) {
        const attraction = items[0];
        result.push({ type: 'attraction', key: String(attraction.osmId), attraction });
        return;
      }
      const lat = items.reduce((sum, item) => sum + Number(item.lat), 0) / items.length;
      const lon = items.reduce((sum, item) => sum + Number(item.lon), 0) / items.length;
      result.push({
        type: 'cluster',
        key: `cluster:${zoom}:${cellKey}`,
        count: items.length,
        lat,
        lon,
        items
      });
    });
    return result;
  }

  function createClusterIcon(count) {
    const size = count >= 100 ? 48 : count >= 20 ? 44 : 40;
    return L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(25,91,169,.92);color:#fff;border:3px solid rgba(255,255,255,.95);box-shadow:0 2px 8px rgba(0,0,0,.35);font:bold ${count >= 100 ? 12 : 13}px system-ui,sans-serif;">${count}</div>`
    });
  }

  function renderExternalAttractions(attractions) {
    if (!map || !window.L) return;
    if (!externalLayer) externalLayer = L.layerGroup().addTo(map);

    const savedIds = getSavedOsmIdSet();
    const filtered = attractions.filter((attraction) =>
      attraction?.osmId &&
      !savedIds.has(String(attraction.osmId)) &&
      attractionMatchesActiveFilter(attraction.category)
    );
    const renderItems = clusterAttractionsForCurrentZoom(filtered);
    const desiredKeys = new Set(renderItems.map((item) => item.key));

    // Grupy są bardzo lekkie, więc przy zmianie widoku odtwarzamy tylko je.
    // Zwykłe markery są zachowywane i aktualizowane przyrostowo.
    for (const [key, marker] of osmMarkerById.entries()) {
      if (key.startsWith('cluster:')) {
        externalLayer.removeLayer(marker);
        osmMarkerById.delete(key);
      }
    }

    for (const [key, marker] of osmMarkerById.entries()) {
      if (!desiredKeys.has(key)) {
        externalLayer.removeLayer(marker);
        osmMarkerById.delete(key);
      }
    }

    renderItems.forEach((item) => {
      let marker = osmMarkerById.get(item.key);
      if (item.type === 'cluster') {
        if (!marker) {
          marker = L.marker([item.lat, item.lon], {
            icon: createClusterIcon(item.count),
            title: `${item.count} atrakcji`,
            riseOnHover: true
          }).addTo(externalLayer);
          marker.on('click', () => {
            if (!map) return;
            const latLngs = item.items.map((attraction) => [Number(attraction.lat), Number(attraction.lon)]);
            const bounds = L.latLngBounds(latLngs);
            const targetZoom = Math.min(CLUSTER_MAX_ZOOM + 1, map.getZoom() + 2);
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: targetZoom, animate: true });
          });
          osmMarkerById.set(item.key, marker);
        }
        return;
      }

      const attraction = item.attraction;
      if (!marker) {
        marker = L.marker([attraction.lat, attraction.lon], {
          icon: createExternalCategoryIcon(attraction.category),
          title: attraction.name,
          riseOnHover: true,
          opacity: 0.86
        }).addTo(externalLayer);
        osmMarkerById.set(item.key, marker);
      }
      marker.bindPopup(externalPopupHtml(attraction, false), { maxWidth: 320, minWidth: 210 });
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

  function routeProjectionToPoint(routeCoordinates, pointLat, pointLon) {
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
      return { distanceMeters: Infinity, progressMeters: 0, totalMeters: 0, progressRatio: 0 };
    }

    const earthRadius = 6371000;
    const toRad = (value) => value * Math.PI / 180;
    const refLat = toRad(Number(pointLat));
    const cosLat = Math.cos(refLat);
    let minimum = Infinity;
    let bestProgress = 0;
    let cumulative = 0;

    for (let index = 1; index < routeCoordinates.length; index += 1) {
      const a = routeCoordinates[index - 1];
      const b = routeCoordinates[index];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;

      const segmentMeters = distanceMeters(Number(a[1]), Number(a[0]), Number(b[1]), Number(b[0]));
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
      if (distance < minimum) {
        minimum = distance;
        bestProgress = cumulative + segmentMeters * t;
      }
      cumulative += segmentMeters;
    }

    return {
      distanceMeters: minimum,
      progressMeters: bestProgress,
      totalMeters: cumulative,
      progressRatio: cumulative > 0 ? Math.max(0, Math.min(1, bestProgress / cumulative)) : 0
    };
  }

  function routeDistanceToPointMeters(routeCoordinates, pointLat, pointLon) {
    return routeProjectionToPoint(routeCoordinates, pointLat, pointLon).distanceMeters;
  }

  function simplifyRouteForAttractionSearch(routeCoordinates) {
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length <= 2) return routeCoordinates || [];
    const result = [routeCoordinates[0]];
    let last = routeCoordinates[0];
    for (let index = 1; index < routeCoordinates.length - 1; index += 1) {
      const current = routeCoordinates[index];
      if (!Array.isArray(current) || !Array.isArray(last)) continue;
      const moved = distanceMeters(Number(last[1]), Number(last[0]), Number(current[1]), Number(current[0]));
      if (moved >= ROUTE_SAMPLE_STEP_METERS) {
        result.push(current);
        last = current;
      }
    }
    result.push(routeCoordinates[routeCoordinates.length - 1]);
    return result;
  }

  async function getRouteCandidateAttractions(routeCoordinates, radiusMeters) {
    await getDatabaseAttractions();
    const candidates = new Map();
    const latDelta = radiusMeters / 111320;

    routeCoordinates.forEach((coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return;
      const lon = Number(coord[0]);
      const lat = Number(coord[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const lonDelta = radiusMeters / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
      getIndexedAttractionsForBox(
        lat - latDelta,
        lon - lonDelta,
        lat + latDelta,
        lon + lonDelta
      ).forEach((attraction) => candidates.set(String(attraction.osmId), attraction));
    });

    return [...candidates.values()];
  }

  async function fetchRouteAttractions(routeCoordinates, radiusMeters = getProximityRadiusMeters()) {
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return [];
    const radius = Math.max(1000, Number(radiusMeters) || getProximityRadiusMeters());
    const simplifiedRoute = simplifyRouteForAttractionSearch(routeCoordinates);
    const attractions = await getRouteCandidateAttractions(simplifiedRoute, radius);

    return attractions
      .map((attraction) => {
        const projection = routeProjectionToPoint(
          simplifiedRoute,
          Number(attraction.lat),
          Number(attraction.lon)
        );
        return {
          ...attraction,
          routeDistanceMeters: projection.distanceMeters,
          routeProgressRatio: projection.progressRatio
        };
      })
      .filter((attraction) => attraction.routeDistanceMeters <= radius)
      .sort((a, b) => a.routeDistanceMeters - b.routeDistanceMeters);
  }

  function hideRouteAttractionsStatusPanel() {
    routeAttractionsPanelExpanded = false;
    if (routeAttractionsStatusPanel) routeAttractionsStatusPanel.hidden = true;
    if (routeAttractionsMiniControls) routeAttractionsMiniControls.hidden = true;
    nearestRouteAttractionForMini = null;
    routeAttractionInfoById.clear();
    hideRouteAttractionInfo();
    routeAttractionsPanelSignature = '';
  }

  function routeAttractionProjectedMeters(attraction) {
    const ratio = Number(attraction?.routeProgressRatio);
    if (!Number.isFinite(ratio) || navigationRouteDistance <= 0) return null;
    return Math.max(0, Math.min(navigationRouteDistance, ratio * navigationRouteDistance));
  }

  function setRouteAttractionsPanelExpanded(expanded) {
    routeAttractionsPanelExpanded = Boolean(expanded) && routeActive && currentMapMode === 'all';
    if (routeAttractionsStatusPanel) routeAttractionsStatusPanel.hidden = !routeAttractionsPanelExpanded;
    routeAttractionsRadarButton?.setAttribute('aria-expanded', routeAttractionsPanelExpanded ? 'true' : 'false');
    if (routeAttractionsPanelExpanded) updateRouteAttractionsStatusPanel(lastMonitorPosition, { force: true });
  }

  function toggleRouteAttractionsPanel() {
    setRouteAttractionsPanelExpanded(!routeAttractionsPanelExpanded);
  }

  function hideRouteAttractionInfo() {
    routeAttractionInfoCurrent = null;
    if (routeAttractionInfoOverlay) routeAttractionInfoOverlay.hidden = true;
  }

  function attractionCurrentDistance(attraction) {
    const direct = Number(attraction?.currentDistance);
    if (Number.isFinite(direct)) return direct;
    const lat = Number(lastMonitorPosition?.coords?.latitude);
    const lon = Number(lastMonitorPosition?.coords?.longitude);
    const aLat = Number(attraction?.lat);
    const aLon = Number(attraction?.lon);
    if (![lat, lon, aLat, aLon].every(Number.isFinite)) return null;
    return distanceMeters(lat, lon, aLat, aLon);
  }

  function showRouteAttractionInfo(attraction) {
    if (!attraction) return;
    routeAttractionInfoCurrent = attraction;
    const info = CATEGORY_INFO[attraction.category] || CATEGORY_INFO.castle;
    const currentDistance = attractionCurrentDistance(attraction);
    const routeOffset = Number(attraction.routeDistanceMeters);

    if (routeAttractionInfoIcon) routeAttractionInfoIcon.src = info.icon;
    if (routeAttractionInfoName) routeAttractionInfoName.textContent = attraction.name || info.label;
    if (routeAttractionInfoType) routeAttractionInfoType.textContent = info.label;
    if (routeAttractionInfoDistance) {
      routeAttractionInfoDistance.textContent = Number.isFinite(currentDistance)
        ? `Od Ciebie: ${formatDistance(currentDistance)}`
        : 'Od Ciebie: brak aktualnej pozycji GPS';
    }
    if (routeAttractionInfoMeta) {
      const parts = [];
      if (Number.isFinite(routeOffset)) parts.push(`${formatDistance(routeOffset)} od przebiegu trasy`);
      if (attraction.onRoute === false) parts.push('aktualnie w Twoim promieniu');
      routeAttractionInfoMeta.textContent = parts.join(' · ');
    }
    if (routeAttractionInfoOverlay) routeAttractionInfoOverlay.hidden = false;
  }

  function showRouteAttractionInfoById(id) {
    const attraction = routeAttractionInfoById.get(String(id)) || getOsmAttractionById(id);
    if (!attraction) return;
    setRouteAttractionsPanelExpanded(false);
    showRouteAttractionInfo(attraction);
  }

  function leadToRouteAttractionInfo() {
    const attraction = routeAttractionInfoCurrent;
    if (!attraction) return;
    hideRouteAttractionInfo();
    navigateDirectlyTo({
      name: attraction.name || (CATEGORY_INFO[attraction.category]?.label ?? 'Atrakcja'),
      lat: Number(attraction.lat),
      lon: Number(attraction.lon)
    });
  }

  function focusNearestRouteAttraction() {
    const attraction = nearestRouteAttractionForMini;
    if (!attraction) {
      showLocationMessage(`Brak atrakcji w promieniu ${formatDistance(getProximityRadiusMeters())}.`);
      return;
    }
    showRouteAttractionInfo(attraction);
  }

  function updateRouteAttractionsMiniUi(items, radius) {
    if (!routeAttractionsMiniControls) return;
    routeAttractionsMiniControls.hidden = false;

    if (routeAttractionsRadarCount) routeAttractionsRadarCount.textContent = String(routeAttractions.length);
    routeAttractionsRadarButton?.setAttribute(
      'aria-label',
      `Atrakcje na trasie: ${routeAttractions.length}. Kliknij, aby ${routeAttractionsPanelExpanded ? 'zwinąć' : 'rozwinąć'} listę.`
    );
    routeAttractionsRadarButton?.setAttribute('aria-expanded', routeAttractionsPanelExpanded ? 'true' : 'false');

    const nearestItem = items
      .filter(({ attraction }) => Number.isFinite(Number(attraction.currentDistance)) && Number(attraction.currentDistance) <= radius)
      .sort((a, b) => Number(a.attraction.currentDistance) - Number(b.attraction.currentDistance))[0] || null;

    nearestRouteAttractionForMini = nearestItem?.attraction || null;
    if (nearestAttractionButton) {
      nearestAttractionButton.disabled = !nearestRouteAttractionForMini;
      nearestAttractionButton.classList.toggle('is-empty', !nearestRouteAttractionForMini);
    }

    if (nearestRouteAttractionForMini) {
      const info = CATEGORY_INFO[nearestRouteAttractionForMini.category] || CATEGORY_INFO.castle;
      const distance = Number(nearestRouteAttractionForMini.currentDistance);
      if (nearestAttractionIcon) nearestAttractionIcon.src = info.icon;
      if (nearestAttractionDistance) nearestAttractionDistance.textContent = formatDistance(distance);
      if (nearestAttractionButton) {
        nearestAttractionButton.title = `${nearestRouteAttractionForMini.name || info.label} · ${formatDistance(distance)}`;
        nearestAttractionButton.setAttribute(
          'aria-label',
          `Najbliższa atrakcja: ${nearestRouteAttractionForMini.name || info.label}, ${formatDistance(distance)}`
        );
      }
    } else {
      if (nearestAttractionIcon) nearestAttractionIcon.src = CATEGORY_INFO.castle.icon;
      if (nearestAttractionDistance) nearestAttractionDistance.textContent = `>${formatDistance(radius)}`;
      if (nearestAttractionButton) {
        nearestAttractionButton.title = 'Brak atrakcji w ustawionym promieniu';
        nearestAttractionButton.setAttribute('aria-label', 'Brak atrakcji w ustawionym promieniu');
      }
    }
  }

  function updateRouteAttractionsStatusPanel(position = lastMonitorPosition, { force = false } = {}) {
    if (!routeAttractionsStatusPanel || !routeAttractionsStatusList) return;
    if (currentMapMode !== 'all' || !routeActive) {
      hideRouteAttractionsStatusPanel();
      return;
    }

    const radius = getProximityRadiusMeters();
    const routeById = new Map();
    const posLat = Number(position?.coords?.latitude);
    const posLon = Number(position?.coords?.longitude);
    const hasPosition = Number.isFinite(posLat) && Number.isFinite(posLon);

    routeAttractions.forEach((attraction) => {
      if (!attraction?.osmId) return;
      const currentDistance = hasPosition
        ? distanceMeters(posLat, posLon, Number(attraction.lat), Number(attraction.lon))
        : null;
      routeById.set(String(attraction.osmId), {
        ...attraction,
        onRoute: true,
        currentDistance: Number.isFinite(currentDistance) ? currentDistance : null
      });
    });

    attractionPreviewItems.forEach((item) => {
      const attraction = item?.attraction;
      if (!attraction?.osmId) return;
      const id = String(attraction.osmId);
      const existing = routeById.get(id);
      if (existing) {
        existing.currentDistance = Number(item.distance);
      } else {
        routeById.set(id, { ...attraction, onRoute: false, currentDistance: Number(item.distance) });
      }
    });

    const currentProgress = navigationActive ? navigationCurrentProgress : 0;
    const items = [...routeById.values()].map((attraction) => {
      const projected = attraction.onRoute ? routeAttractionProjectedMeters(attraction) : null;
      const passed = Boolean(
        attraction.onRoute &&
        navigationActive &&
        Number.isFinite(projected) &&
        projected < currentProgress - ROUTE_ATTRACTION_PASSED_TOLERANCE_METERS
      );
      return { attraction, projected, passed };
    });

    items.sort((a, b) => {
      if (a.passed !== b.passed) return a.passed ? 1 : -1;
      const aNear = Number.isFinite(a.attraction.currentDistance) && a.attraction.currentDistance <= radius;
      const bNear = Number.isFinite(b.attraction.currentDistance) && b.attraction.currentDistance <= radius;
      if (aNear !== bNear) return aNear ? -1 : 1;
      if (aNear && bNear) return a.attraction.currentDistance - b.attraction.currentDistance;
      if (Number.isFinite(a.projected) && Number.isFinite(b.projected)) {
        return a.passed ? b.projected - a.projected : a.projected - b.projected;
      }
      return String(a.attraction.name || '').localeCompare(String(b.attraction.name || ''), 'pl');
    });

    const nearbyCount = items.filter(
      ({ attraction }) => Number.isFinite(Number(attraction.currentDistance)) && Number(attraction.currentDistance) <= radius
    ).length;

    updateRouteAttractionsMiniUi(items, radius);
    routeAttractionInfoById = new Map(items.map(({ attraction }) => [String(attraction.osmId), attraction]));

    if (routeAttractionsStatusCount) routeAttractionsStatusCount.textContent = String(routeAttractions.length);
    if (routeAttractionsStatusRadius) routeAttractionsStatusRadius.textContent = formatDistance(radius);
    if (routeAttractionsStatusSummary) {
      routeAttractionsStatusSummary.textContent = `W pobliżu teraz: ${nearbyCount} · razem w panelu: ${items.length}`;
    }
    routeAttractionsStatusPanel.hidden = !routeAttractionsPanelExpanded;

    const signature = items.map(({ attraction, passed }) => {
      const nearBucket = Number.isFinite(attraction.currentDistance) ? Math.round(attraction.currentDistance / 100) : -1;
      return `${attraction.osmId}:${passed ? 1 : 0}:${nearBucket}:${attraction.onRoute ? 1 : 0}`;
    }).join('|') + `#${routeAttractions.length}:${nearbyCount}:${radius}:${routeAttractionsPanelExpanded ? 1 : 0}`;
    if (!force && signature === routeAttractionsPanelSignature) return;
    routeAttractionsPanelSignature = signature;

    if (!items.length) {
      routeAttractionsStatusList.innerHTML = `<div class="route-attractions-status-empty">Brak atrakcji w ustawionym promieniu.</div>`;
      return;
    }

    routeAttractionsStatusList.innerHTML = items.map(({ attraction, passed }) => {
      const info = CATEGORY_INFO[attraction.category] || CATEGORY_INFO.castle;
      const meta = [];
      if (Number.isFinite(attraction.currentDistance) && attraction.currentDistance <= radius) {
        meta.push(`teraz ${formatDistance(attraction.currentDistance)}`);
      }
      if (attraction.onRoute && Number.isFinite(Number(attraction.routeDistanceMeters))) {
        meta.push(`${formatDistance(Number(attraction.routeDistanceMeters))} od trasy`);
      }
      if (!meta.length) meta.push(attraction.onRoute ? 'przy trasie' : 'w pobliżu');
      const statusLabel = passed ? 'MINIĘTA' : (attraction.onRoute ? 'PRZED TOBĄ' : 'BLISKO');
      return `
        <button class="route-attraction-status-row ${passed ? 'is-passed' : 'is-ahead'}" type="button" data-route-attraction-info-id="${escapeHtml(attraction.osmId)}" aria-label="${escapeHtml(attraction.name || info.label)}. ${escapeHtml(statusLabel)}. Otwórz informacje.">
          <img src="${info.icon}" alt="" aria-hidden="true" />
          <span class="route-attraction-status-copy">
            <strong>${escapeHtml(attraction.name || info.label)}</strong>
            <span>${escapeHtml(info.label)} · ${escapeHtml(meta.join(' · '))}</span>
          </span>
          <span class="route-attraction-status-state">${statusLabel}</span>
        </button>
      `;
    }).join('');
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
      showLocationMessage(`Na trasie: ${routeAttractions.length} atrakcji w odległości do ${formatDistance(radius)} od przebiegu trasy.`);
      if (lastMonitorPosition) checkProximity(lastMonitorPosition);
      updateRouteAttractionsStatusPanel(lastMonitorPosition, { force: true });
    } catch (error) {
      console.warn('Nie udało się odczytać atrakcji przy trasie:', error);
      updateOsmStatus('Atrakcje przy trasie: nie udało się odczytać bazy', true);
    }
  }

  function normalizeRouteMode(mode) {
    return Object.prototype.hasOwnProperty.call(ROUTE_MODES, mode) ? mode : 'car';
  }

  function routeModeMeta(mode = routeTravelMode) {
    return ROUTE_MODES[normalizeRouteMode(mode)] || ROUTE_MODES.car;
  }

  function isWalkingRouteMode(mode = activeRouteMode) {
    const value = normalizeRouteMode(mode);
    return value === 'foot' || value === 'hiking';
  }

  function routeOffRouteThreshold(mode = activeRouteMode) {
    const value = normalizeRouteMode(mode);
    // v1053: szybsza reakcja na zjazd z trasy. Próg i tak jest później
    // powiększany o bieżącą dokładność GPS, aby nie przeliczać trasy od szumu lokalizacji.
    if (value === 'hiking') return 25;
    if (value === 'foot') return 35;
    if (value === 'bike') return 55;
    return 70;
  }

  function routeArrivalThreshold(mode = activeRouteMode) {
    return isWalkingRouteMode(mode) ? 20 : 35;
  }

  function updateRouteModeUi() {
    routeModeButtons.forEach((button) => {
      const active = normalizeRouteMode(button.dataset.routeMode) === routeTravelMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (routeSource) {
      routeSource.textContent = 'Routing: OpenStreetMap.de / OSRM · sposób poruszania wybierzesz po wskazaniu celu';
    }
  }

  function setRouteTravelMode(mode, { persist = true } = {}) {
    routeTravelMode = normalizeRouteMode(mode);
    if (persist) localStorage.setItem(ROUTE_MODE_KEY, routeTravelMode);
    updateRouteModeUi();
  }

  function showRouteModeChooser(destination) {
    if (!destination || !Number.isFinite(Number(destination.lat)) || !Number.isFinite(Number(destination.lon))) return;
    pendingRouteDestination = {
      name: String(destination.name || 'Cel podróży'),
      fullName: String(destination.fullName || destination.name || 'Cel podróży'),
      lat: Number(destination.lat),
      lon: Number(destination.lon)
    };
    updateRouteModeUi();
    if (routeModeDestinationName) routeModeDestinationName.textContent = pendingRouteDestination.name;
    if (routeModeOverlay) routeModeOverlay.hidden = false;
    const activeButton = routeModeButtons.find((button) => normalizeRouteMode(button.dataset.routeMode) === routeTravelMode) || routeModeButtons[0];
    requestAnimationFrame(() => activeButton?.focus({ preventScroll: true }));
  }

  function hideRouteModeChooser({ clearPending = true } = {}) {
    if (routeModeOverlay) routeModeOverlay.hidden = true;
    if (clearPending) pendingRouteDestination = null;
  }

  function startPendingRouteWithMode(mode) {
    if (!pendingRouteDestination) return;
    const destination = { ...pendingRouteDestination };
    setRouteTravelMode(mode);
    hideRouteModeChooser();
    if (routeDestinationInput) routeDestinationInput.value = destination.name || '';
    planRouteToDestination(destination, { startNavigation: true, mode: routeTravelMode });
  }

  function updateNavigationModeUi() {
    const meta = routeModeMeta(activeRouteMode);
    if (navigationMode) navigationMode.textContent = `${meta.icon} ${meta.label}`;
    navigationPanel?.setAttribute('data-route-mode', activeRouteMode);
  }

  function setRouteInfo(text, isError = false) {
    if (!routeInfo) return;
    routeInfo.textContent = text || '';
    routeInfo.classList.toggle('is-error', Boolean(isError));
    routeInfo.hidden = !text;
  }

  function showRoutePanel() {
    if (!routePanel || currentMapMode !== 'all') return;
    updateRouteModeUi();
    routePanel.hidden = false;
    if (routeDestinationInput && !routeActive) {
      setTimeout(() => routeDestinationInput.focus({ preventScroll: true }), 30);
    }
    if (!lastMonitorPosition?.coords) {
      startProximityMonitoring(false);
      setRouteInfo('Ustalam Twoją lokalizację startową…');
    } else if (!routeActive) {
      setRouteInfo('Wpisz dokładny adres albo nazwę miejsca i wybierz wynik z listy.');
    }
  }

  function hideRoutePanel() {
    if (routePanel) routePanel.hidden = true;
    if (routeResults) routeResults.replaceChildren();
  }

  function conciseRouteResultName(result) {
    const address = result?.address && typeof result.address === 'object' ? result.address : {};
    const road = String(
      address.road ||
      address.pedestrian ||
      address.residential ||
      address.living_street ||
      address.footway ||
      ''
    ).trim();
    const houseNumber = String(address.house_number || '').trim();
    const locality = String(
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.hamlet ||
      ''
    ).trim();
    const objectName = String(result?.name || '').trim();

    if (road) {
      const street = `${road}${houseNumber ? ` ${houseNumber}` : ''}`.trim();
      return locality && !street.toLowerCase().includes(locality.toLowerCase())
        ? `${street}, ${locality}`
        : street;
    }
    if (objectName) {
      return locality && !objectName.toLowerCase().includes(locality.toLowerCase())
        ? `${objectName}, ${locality}`
        : objectName;
    }
    return String(result?.display_name || 'Cel podróży').trim();
  }

  function renderRouteSearchResults(results) {
    if (!routeResults) return;
    routeResults.replaceChildren();

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'route-result-empty';
      empty.textContent = 'Nie znaleziono takiego miejsca lub adresu w Polsce.';
      routeResults.append(empty);
      return;
    }

    results.forEach((result) => {
      const shortName = conciseRouteResultName(result);
      const fullName = String(result.display_name || shortName || 'Cel podróży').trim();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'route-result-button';
      button.setAttribute('role', 'listitem');
      button.innerHTML = `<strong>${escapeHtml(shortName)}</strong><span>${escapeHtml(fullName)}</span>`;
      button.addEventListener('click', () => showRouteModeChooser({
        name: shortName || fullName || 'Cel podróży',
        fullName,
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
      const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&dedupe=1&limit=6&countrycodes=pl&accept-language=pl&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
      const results = await response.json();
      if (sequence !== routeSearchSequence) return;
      renderRouteSearchResults(Array.isArray(results) ? results : []);
      setRouteInfo(results?.length ? 'Wybierz właściwy adres lub miejsce z listy.' : 'Nie znaleziono celu.', !results?.length);
    } catch (error) {
      console.warn('Nie udało się wyszukać celu:', error);
      setRouteInfo('Wyszukiwanie celu jest chwilowo niedostępne.', true);
    } finally {
      if (routeSearchButton) routeSearchButton.disabled = false;
    }
  }


  function formatNavigationDistance(meters) {
    const value = Math.max(0, Number(meters) || 0);
    if (value < 1000) return `${Math.max(10, Math.round(value / 10) * 10)} m`;
    if (value < 10000) return `${(value / 1000).toFixed(1).replace('.', ',')} km`;
    return `${Math.round(value / 1000)} km`;
  }

  function signedBearingDelta(fromBearing, toBearing) {
    const from = Number(fromBearing);
    const to = Number(toBearing);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    return ((to - from + 540) % 360) - 180;
  }

  function inferMiniRoundaboutExit(step) {
    const intersection = Array.isArray(step?.intersections) ? step.intersections[0] : null;
    const bearings = Array.isArray(intersection?.bearings) ? intersection.bearings.map(Number) : [];
    const entries = Array.isArray(intersection?.entry) ? intersection.entry : [];
    const outIndex = Number(intersection?.out);
    const inIndex = Number(intersection?.in);
    const bearingBefore = Number(step?.maneuver?.bearing_before);

    if (!bearings.length || !Number.isInteger(outIndex) || outIndex < 0 || outIndex >= bearings.length || !Number.isFinite(bearingBefore)) {
      return null;
    }

    const candidates = bearings
      .map((bearing, index) => {
        const delta = signedBearingDelta(bearingBefore, bearing);
        const canUse = entries.length ? entries[index] !== false : true;
        const isIncoming = Number.isInteger(inIndex) && index === inIndex;
        const isUTurn = Number.isFinite(delta) && Math.abs(Math.abs(delta) - 180) < 24;
        const orderScore = Number.isFinite(delta) ? (90 - delta + 360) % 360 : 999;
        return { index, canUse, isIncoming, isUTurn, orderScore };
      })
      .filter((item) => item.canUse && !item.isIncoming && !item.isUTurn)
      .sort((a, b) => a.orderScore - b.orderScore);

    const selectedIndex = candidates.findIndex((item) => item.index === outIndex);
    return selectedIndex >= 0 ? selectedIndex + 1 : null;
  }

  function roundaboutExitNumber(step) {
    const explicit = Number(step?.maneuver?.exit ?? step?._roundaboutExit);
    if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
    const type = String(step?.maneuver?.type || '').toLowerCase();
    if (type === 'roundabout turn') return inferMiniRoundaboutExit(step);
    return null;
  }

  function isRoundaboutManeuver(step) {
    const type = String(step?.maneuver?.type || '').toLowerCase();
    return type === 'roundabout' ||
      type === 'rotary' ||
      type === 'roundabout turn' ||
      type === 'exit roundabout' ||
      type === 'exit rotary';
  }

  function navigationArrowForStep(step) {
    const type = String(step?.maneuver?.type || '').toLowerCase();
    const modifier = String(step?.maneuver?.modifier || '').toLowerCase();
    const exit = roundaboutExitNumber(step);
    if (isRoundaboutManeuver(step)) {
      return Number.isFinite(exit) && exit > 0 ? `↻ ${exit}` : '↻';
    }
    if (type === 'arrive') return '●';
    const arrows = {
      'sharp left': '↙',
      'left': '←',
      'slight left': '↖',
      'straight': '↑',
      'slight right': '↗',
      'right': '→',
      'sharp right': '↘',
      'uturn': '↶'
    };
    return arrows[modifier] || '↑';
  }

  function maneuverIconSvg(step) {
    if (isRoundaboutManeuver(step)) return roundaboutManeuverSvg(step);
    const type = String(step?.maneuver?.type || '').toLowerCase();
    const modifier = String(step?.maneuver?.modifier || '').toLowerCase();

    if (type === 'arrive') {
      return `<svg class="maneuver-nav-svg" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="17" fill="currentColor"/></svg>`;
    }

    if (modifier === 'uturn') {
      return `<svg class="maneuver-nav-svg" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M64 90 V54 C64 32 36 31 36 53 V65"/>
        <path d="M20 51 L36 67 L52 51"/>
      </svg>`;
    }

    const left = modifier.includes('left');
    const right = modifier.includes('right');
    if (left || right) {
      const mirror = right ? 'translate(100 0) scale(-1 1)' : '';
      const slight = modifier.includes('slight');
      const sharp = modifier.includes('sharp');
      const turnPath = slight
        ? 'M62 91 V58 C62 46 55 38 44 33 L18 21'
        : sharp
          ? 'M62 91 V57 C62 39 52 28 34 28 H14'
          : 'M62 91 V56 C62 39 52 29 35 29 H14';
      const headPath = slight
        ? 'M30 15 L15 21 L23 35'
        : 'M29 14 L14 29 L29 44';
      return `<svg class="maneuver-nav-svg" viewBox="0 0 100 100" aria-hidden="true">
        <g transform="${mirror}">
          <path d="${turnPath}"/>
          <path d="${headPath}"/>
        </g>
      </svg>`;
    }

    return `<svg class="maneuver-nav-svg" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 91 V18"/>
      <path d="M35 34 L50 18 L65 34"/>
    </svg>`;
  }

  function stepFinalBearing(step) {
    const coords = Array.isArray(step?.geometry?.coordinates) ? step.geometry.coordinates : [];
    for (let i = coords.length - 1; i > 0; i -= 1) {
      const a = coords[i - 1];
      const b = coords[i];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;
      const lon1 = Number(a[0]);
      const lat1 = Number(a[1]);
      const lon2 = Number(b[0]);
      const lat2 = Number(b[1]);
      if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) continue;
      if (Math.abs(lat1 - lat2) < 1e-8 && Math.abs(lon1 - lon2) < 1e-8) continue;
      return bearingDegrees(lat1, lon1, lat2, lon2);
    }
    return null;
  }

  function roundaboutManeuverSvg(step) {
    const exit = roundaboutExitNumber(step);
    const before = Number(step?.maneuver?.bearing_before);
    const geometryExitBearing = stepFinalBearing(step);
    const after = Number.isFinite(geometryExitBearing) ? geometryExitBearing : Number(step?.maneuver?.bearing_after);
    const modifier = String(step?.maneuver?.modifier || '').toLowerCase();
    let delta = signedBearingDelta(before, after);
    if (!Number.isFinite(delta)) {
      delta = modifier.includes('right') ? 90 : modifier.includes('left') ? -90 : 0;
    }

    const angle = (delta - 90) * Math.PI / 180;
    const innerRadius = 25;
    const outerRadius = 39;
    const x1 = 50 + Math.cos(angle) * innerRadius;
    const y1 = 49 + Math.sin(angle) * innerRadius;
    const x2 = 50 + Math.cos(angle) * outerRadius;
    const y2 = 49 + Math.sin(angle) * outerRadius;
    const arrowAngle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 11;
    const headSpread = 0.7;
    const hx1 = x2 - Math.cos(arrowAngle - headSpread) * headLen;
    const hy1 = y2 - Math.sin(arrowAngle - headSpread) * headLen;
    const hx2 = x2 - Math.cos(arrowAngle + headSpread) * headLen;
    const hy2 = y2 - Math.sin(arrowAngle + headSpread) * headLen;
    const exitLabel = Number.isFinite(exit) && exit > 0
      ? `<text x="50" y="56" text-anchor="middle" font-size="24" font-weight="900" fill="currentColor">${exit}</text>`
      : '';

    return `
      <svg class="maneuver-nav-svg roundabout-nav-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <path d="M50 94 V74"/>
        <circle cx="50" cy="49" r="25"/>
        <path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}"/>
        <path d="M${hx1.toFixed(1)} ${hy1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${hx2.toFixed(1)} ${hy2.toFixed(1)}"/>
        ${exitLabel}
      </svg>
    `;
  }

  function navigationInstructionForStep(step) {
    const maneuver = step?.maneuver || {};
    const type = String(maneuver.type || '').toLowerCase();
    const modifier = String(maneuver.modifier || '').toLowerCase();
    const exit = roundaboutExitNumber(step);
    const walking = isWalkingRouteMode(activeRouteMode);
    const continueText = walking ? 'idź dalej' : 'jedź dalej';
    const direction = {
      'sharp left': 'skręć ostro w lewo',
      'left': 'skręć w lewo',
      'slight left': 'skręć lekko w lewo',
      'straight': walking ? 'idź prosto' : 'jedź prosto',
      'slight right': 'skręć lekko w prawo',
      'right': 'skręć w prawo',
      'sharp right': 'skręć ostro w prawo',
      'uturn': 'zawróć'
    }[modifier] || continueText;

    if (type === 'arrive') return 'Dotrzesz do celu';
    if (type === 'depart') {
      if (direction === continueText) return walking ? 'Ruszaj pieszo zgodnie z trasą' : 'Ruszaj zgodnie z trasą';
      return direction;
    }
    if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') {
      if (Number.isFinite(exit) && exit > 0) return `Na rondzie wybierz ${exit}. zjazd`;
      return direction === continueText ? 'Przejedź przez rondo zgodnie z trasą' : `Na rondzie ${direction}`;
    }
    if (type === 'exit roundabout' || type === 'exit rotary') {
      if (Number.isFinite(exit) && exit > 0) return `Na rondzie wybierz ${exit}. zjazd`;
      if (modifier && modifier !== 'straight') return `Zjedź z ronda i ${direction}`;
      return 'Zjedź z ronda';
    }
    if (type === 'merge') return modifier.includes('left') ? 'Włącz się do ruchu z lewej strony' : modifier.includes('right') ? 'Włącz się do ruchu z prawej strony' : 'Włącz się do ruchu';
    if (type === 'fork') return modifier.includes('left') ? 'Na rozwidleniu trzymaj się lewej strony' : modifier.includes('right') ? 'Na rozwidleniu trzymaj się prawej strony' : 'Na rozwidleniu poruszaj się zgodnie z trasą';
    if (type === 'on ramp' || type === 'ramp') return modifier.includes('left') ? 'Wjedź na łącznicę w lewo' : modifier.includes('right') ? 'Wjedź na łącznicę w prawo' : 'Wjedź na łącznicę';
    if (type === 'off ramp') return modifier.includes('left') ? 'Zjedź z drogi w lewo' : modifier.includes('right') ? 'Zjedź z drogi w prawo' : 'Zjedź z drogi';
    if (type === 'end of road') return modifier.includes('left') ? 'Na końcu drogi skręć w lewo' : modifier.includes('right') ? 'Na końcu drogi skręć w prawo' : direction;
    if (type === 'new name' || type === 'continue' || type === 'notification') {
      return direction === continueText ? (walking ? 'Kontynuuj marsz' : 'Kontynuuj jazdę') : direction;
    }
    return direction.charAt(0).toUpperCase() + direction.slice(1);
  }

  function navigationRoadTextForStep(step) {
    const ref = String(step?.ref || '').trim();
    const name = String(step?.name || step?.rotary_name || '').trim();
    const destinations = String(step?.destinations || '').trim();
    if (ref) return ref.split(';')[0].trim();
    if (name) return name;
    if (destinations) return destinations.split(';')[0].trim();
    return '';
  }

  function navigationVoiceRoadRefForStep(step) {
    const ref = String(step?.ref || '').trim();
    if (!ref) return '';
    return ref.split(';')[0].trim();
  }

  function laneArrowForIndications(indications) {
    const values = Array.isArray(indications) ? indications.map((item) => String(item).toLowerCase()) : [];
    const priority = ['uturn', 'sharp left', 'left', 'slight left', 'straight', 'slight right', 'right', 'sharp right'];
    const value = priority.find((candidate) => values.includes(candidate)) || values[0] || 'straight';
    return {
      'uturn': '↶',
      'sharp left': '↙',
      'left': '←',
      'slight left': '↖',
      'straight': '↑',
      'slight right': '↗',
      'right': '→',
      'sharp right': '↘'
    }[value] || '↑';
  }

  function laneGuidanceForStep(stepIndex) {
    const current = navigationSteps[stepIndex];
    const previous = navigationSteps[Math.max(0, stepIndex - 1)];
    const next = navigationSteps[Math.min(navigationSteps.length - 1, stepIndex + 1)];
    const candidates = [current, previous, next].filter(Boolean);
    let firstLaneSet = null;

    for (const step of candidates) {
      const intersections = Array.isArray(step?.intersections) ? step.intersections : [];
      const ordered = step === previous ? [...intersections].reverse() : intersections;
      for (const intersection of ordered) {
        const lanes = Array.isArray(intersection?.lanes) ? intersection.lanes : [];
        if (!lanes.length) continue;
        if (!firstLaneSet) firstLaneSet = lanes;
        if (lanes.some((lane) => lane?.valid === true)) return lanes;
      }
    }
    return firstLaneSet || [];
  }

  function hideManeuverOverlay() {
    if (mapManeuverOverlay) mapManeuverOverlay.hidden = true;
    if (mapManeuverDistance) mapManeuverDistance.textContent = '0 m';
    if (mapManeuverInstruction) mapManeuverInstruction.textContent = '';
    if (mapManeuverRoad) mapManeuverRoad.textContent = '';
    if (mapManeuverRoadRef) {
      mapManeuverRoadRef.textContent = '';
      mapManeuverRoadRef.hidden = true;
      mapManeuverRoadRef.className = 'map-maneuver-road-ref';
    }
    if (mapLanes) {
      mapLanes.hidden = true;
      mapLanes.replaceChildren();
      mapLanes.classList.remove('is-direction-only');
      mapLanes.removeAttribute('title');
    }
  }

  function updateManeuverOverlay(stepIndex, step, distanceToStep) {
    if (!mapManeuverOverlay || !mapManeuverArrow || !navigationActive || navigationArrived) {
      hideManeuverOverlay();
      return;
    }
    const type = String(step?.maneuver?.type || '').toLowerCase();
    const distance = Number(distanceToStep);
    if (!Number.isFinite(distance) || distance > 400 || type === 'arrive') {
      hideManeuverOverlay();
      return;
    }

    mapManeuverArrow.innerHTML = maneuverIconSvg(step);
    if (mapManeuverDistance) mapManeuverDistance.textContent = formatNavigationDistance(distance);
    if (mapManeuverInstruction) mapManeuverInstruction.textContent = navigationInstructionForStep(step);

    const roadName = String(step?.name || step?.rotary_name || '').trim();
    const roadRef = String(step?.ref || '').trim();
    const destinations = String(step?.destinations || '').trim();
    if (mapManeuverRoadRef) {
      mapManeuverRoadRef.hidden = !roadRef;
      mapManeuverRoadRef.textContent = roadRef;
      mapManeuverRoadRef.className = `map-maneuver-road-ref${/^A\d+/i.test(roadRef) ? ' is-motorway' : ''}`;
    }
    if (mapManeuverRoad) {
      mapManeuverRoad.textContent = roadName || (destinations ? `kierunek ${destinations}` : '');
    }

    if (mapLanes) {
      mapLanes.replaceChildren();
      mapLanes.classList.remove('is-direction-only');
      const lanes = isWalkingRouteMode(activeRouteMode) ? [] : laneGuidanceForStep(stepIndex);

      if (lanes.length) {
        lanes.forEach((lane) => {
          const laneEl = document.createElement('span');
          laneEl.className = `map-lane${lane?.valid ? ' is-valid' : ' is-invalid'}`;
          laneEl.textContent = laneArrowForIndications(lane?.indications);
          mapLanes.append(laneEl);
        });
        mapLanes.title = 'Pasy ruchu z danych OSM/OSRM. Wyróżniony pas jest zalecany.';
        mapLanes.hidden = false;
      } else {
        // v1061: gdy OSM nie ma danych o pasach nie pokazujemy dodatkowego pola
        // „KIERUNEK”. Kierunek jest już czytelny z głównej ikony manewru.
        mapLanes.hidden = true;
        mapLanes.removeAttribute('title');
      }
    }
    // v1061: główna informacja o manewrze jest tylko raz — w lewym panelu nawigacji.
    mapManeuverOverlay.hidden = true;
  }


  function buildNavigationRouteMetrics(coordinates, steps, routeDistance, routeDuration) {
    navigationRouteCumulative = [];
    let cumulative = 0;
    coordinates.forEach((coord, index) => {
      if (index > 0) {
        const prev = coordinates[index - 1];
        cumulative += distanceMeters(Number(prev[1]), Number(prev[0]), Number(coord[1]), Number(coord[0]));
      }
      navigationRouteCumulative.push(cumulative);
    });
    navigationRouteDistance = Number(routeDistance) || cumulative;
    navigationRouteDuration = Number(routeDuration) || 0;
    navigationLastRouteIndex = 0;
    navigationVisibleRouteIndex = 0;
    navigationLastRoutePaintPosition = null;
    navigationCurrentProgress = 0;

    navigationSteps = (Array.isArray(steps) ? steps : []).map((step, stepIndex) => {
      const location = step?.maneuver?.location;
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      if (Array.isArray(location) && location.length >= 2) {
        const lon = Number(location[0]);
        const lat = Number(location[1]);
        coordinates.forEach((coord, index) => {
          const d = distanceMeters(lat, lon, Number(coord[1]), Number(coord[0]));
          if (d < nearestDistance) {
            nearestDistance = d;
            nearestIndex = index;
          }
        });
      }
      return {
        ...step,
        _stepIndex: stepIndex,
        _routeIndex: nearestIndex,
        _routeMeters: navigationRouteCumulative[nearestIndex] || 0
      };
    });

    // Zachowujemy numer zjazdu także dla osobnego kroku "exit roundabout".
    let lastRoundaboutExit = null;
    navigationSteps.forEach((step) => {
      const type = String(step?.maneuver?.type || '').toLowerCase();
      if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') {
        const exit = roundaboutExitNumber(step);
        step._roundaboutExit = Number.isFinite(exit) ? exit : null;
        lastRoundaboutExit = step._roundaboutExit;
      } else if (type === 'exit roundabout' || type === 'exit rotary') {
        step._roundaboutExit = lastRoundaboutExit;
        lastRoundaboutExit = null;
      } else if (type !== 'notification' && type !== 'new name') {
        lastRoundaboutExit = null;
      }
    });
  }

  function findNearestNavigationRoutePosition(lat, lon) {
    if (!routeCoordinates.length) return { index: 0, distance: Infinity, progress: 0, segmentT: 0 };

    const earthRadius = 6371000;
    const toRad = (value) => value * Math.PI / 180;
    const refLat = toRad(Number(lat));
    const cosLat = Math.cos(refLat);

    const testSegments = (startIndex, endIndex) => {
      let bestIndex = Math.max(0, startIndex);
      let bestDistance = Infinity;
      let bestProgress = navigationRouteCumulative[bestIndex] || 0;
      let bestT = 0;

      const safeStart = Math.max(0, startIndex);
      const safeEnd = Math.min(routeCoordinates.length - 2, endIndex);
      for (let i = safeStart; i <= safeEnd; i += 1) {
        const a = routeCoordinates[i];
        const b = routeCoordinates[i + 1];
        if (!a || !b) continue;

        const ax = toRad(Number(a[0]) - Number(lon)) * earthRadius * cosLat;
        const ay = toRad(Number(a[1]) - Number(lat)) * earthRadius;
        const bx = toRad(Number(b[0]) - Number(lon)) * earthRadius * cosLat;
        const by = toRad(Number(b[1]) - Number(lat)) * earthRadius;
        const vx = bx - ax;
        const vy = by - ay;
        const lengthSquared = vx * vx + vy * vy;
        const t = lengthSquared > 0
          ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / lengthSquared))
          : 0;
        const closestX = ax + t * vx;
        const closestY = ay + t * vy;
        const distance = Math.hypot(closestX, closestY);

        if (distance < bestDistance) {
          const segmentMeters = Math.max(
            0,
            Number(navigationRouteCumulative[i + 1] || 0) - Number(navigationRouteCumulative[i] || 0)
          );
          bestDistance = distance;
          bestIndex = i;
          bestT = t;
          bestProgress = Number(navigationRouteCumulative[i] || 0) + segmentMeters * t;
        }
      }

      return { index: bestIndex, distance: bestDistance, progress: bestProgress, segmentT: bestT };
    };

    const start = Math.max(0, navigationLastRouteIndex - 70);
    const end = Math.min(routeCoordinates.length - 2, navigationLastRouteIndex + 500);
    let best = testSegments(start, end);

    if (best.distance > 500 && routeCoordinates.length > 2) {
      let sampledIndex = 0;
      let sampledDistance = Infinity;
      const stride = Math.max(1, Math.floor(routeCoordinates.length / 500));
      for (let i = 0; i < routeCoordinates.length; i += stride) {
        const coord = routeCoordinates[i];
        const d = distanceMeters(lat, lon, Number(coord[1]), Number(coord[0]));
        if (d < sampledDistance) {
          sampledDistance = d;
          sampledIndex = i;
        }
      }
      best = testSegments(Math.max(0, sampledIndex - 35), Math.min(routeCoordinates.length - 2, sampledIndex + 35));
    }

    navigationLastRouteIndex = Math.max(0, best.index);
    return best;
  }

  function navigationSnappedLatLng(nearest) {
    if (!nearest || !routeCoordinates.length) return null;
    const segmentIndex = Math.max(0, Math.min(routeCoordinates.length - 2, Number(nearest.index) || 0));
    const a = routeCoordinates[segmentIndex];
    const b = routeCoordinates[Math.min(routeCoordinates.length - 1, segmentIndex + 1)] || a;
    if (!a || !b) return null;
    const t = Math.max(0, Math.min(1, Number(nearest.segmentT) || 0));
    return [
      Number(a[1]) + (Number(b[1]) - Number(a[1])) * t,
      Number(a[0]) + (Number(b[0]) - Number(a[0])) * t
    ];
  }

  function updateVisibleRouteProgress(lat, lon, nearest, force = false) {
    if (!routeLayer || typeof routeLayer.setLatLngs !== 'function' || !routeCoordinates.length || !nearest) return;

    const lastPaint = navigationLastRoutePaintPosition;
    const movedSincePaint = lastPaint
      ? distanceMeters(lat, lon, lastPaint.lat, lastPaint.lon)
      : Infinity;
    const progressed = Number(nearest.index) > navigationVisibleRouteIndex;

    if (!force && !progressed && movedSincePaint < 10) return;

    const segmentIndex = Math.max(0, Math.min(routeCoordinates.length - 2, Number(nearest.index) || 0));
    const a = routeCoordinates[segmentIndex];
    const b = routeCoordinates[Math.min(routeCoordinates.length - 1, segmentIndex + 1)] || a;
    const t = Math.max(0, Math.min(1, Number(nearest.segmentT) || 0));
    const snappedLon = Number(a?.[0]) + (Number(b?.[0]) - Number(a?.[0])) * t;
    const snappedLat = Number(a?.[1]) + (Number(b?.[1]) - Number(a?.[1])) * t;

    // v1058: linia zaczyna się w punkcie trasy najbliższym pozycji, a nie w surowym GPS.
    // Dzięki temu nie powstaje niebieski łącznik/ogon od strzałki do drogi.
    const futureIndex = Math.min(
      routeCoordinates.length - 1,
      Math.max(navigationVisibleRouteIndex, segmentIndex + 1)
    );
    const remaining = [[snappedLat, snappedLon]];
    for (let i = futureIndex; i < routeCoordinates.length; i += 1) {
      const coord = routeCoordinates[i];
      remaining.push([Number(coord[1]), Number(coord[0])]);
    }

    if (remaining.length < 2 && routeDestination) {
      remaining.push([Number(routeDestination.lat), Number(routeDestination.lon)]);
    }

    routeOutlineLayer?.setLatLngs?.(remaining);
    routeLayer.setLatLngs(remaining);
    navigationVisibleRouteIndex = futureIndex;
    navigationLastRoutePaintPosition = { lat, lon };
  }


  function navigationVoiceBucket(distance) {
    if (distance <= 70) return '70';
    if (distance <= 180) return '180';
    if (distance <= 450) return '450';
    if (distance <= 1000) return '1000';
    return 'far';
  }

  function speakNavigation(text) {
    if (!navigationVoiceEnabled || !text || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('Synteza mowy jest niedostępna:', error);
    }
  }

  function setNavigationVoiceUi() {
    if (!navigationVoiceButton) return;
    navigationVoiceButton.textContent = navigationVoiceEnabled ? 'GŁOS ON' : 'GŁOS OFF';
    navigationVoiceButton.classList.toggle('is-muted', !navigationVoiceEnabled);
    navigationVoiceButton.setAttribute('aria-pressed', navigationVoiceEnabled ? 'true' : 'false');
  }

  function setNavigationLayout(active) {
    mapScreen?.classList.toggle('is-navigating', Boolean(active));
    // v1058: ATRAKCJE są dostępne stale, nie tylko podczas aktywnej nawigacji.
    if (navigationAttractionsWrap) navigationAttractionsWrap.hidden = false;
    if (!active) hideNavigationAttractions();
    syncMapContentTop();
    requestAnimationFrame(() => map?.invalidateSize?.());
  }

  function showNavigationAttractions() {
    if (!navigationAttractionsOverlay || mapScreen?.hidden) return;
    updateMapLegendUi();
    navigationAttractionsOverlay.hidden = false;
    requestAnimationFrame(() => navigationAttractionsClose?.focus({ preventScroll: true }));
  }

  function hideNavigationAttractions() {
    if (navigationAttractionsOverlay) navigationAttractionsOverlay.hidden = true;
  }

  function navigateDirectlyTo(destination) {
    if (!destination || !Number.isFinite(Number(destination.lat)) || !Number.isFinite(Number(destination.lon))) return;
    const target = {
      name: String(destination.name || 'Atrakcja'),
      lat: Number(destination.lat),
      lon: Number(destination.lon)
    };
    map?.closePopup();
    hideAttractionPreview();
    hideNavigationAttractions();
    if (routeDestinationInput) routeDestinationInput.value = target.name;
    planRouteToDestination(target, { startNavigation: true, mode: routeTravelMode });
  }

  function stopNavigation({ keepRoute = false } = {}) {
    navigationActive = false;
    navigationArrived = false;
    navigationRerouteInFlight = false;
    navigationLastSpokenKey = '';
    navigationLastVoiceBucket = '';
    navigationLastStepIndex = -1;
    navigationOffRouteFixes = 0;
    navigationVisibleRouteIndex = 0;
    navigationLastRoutePaintPosition = null;
    navigationCurrentManeuverDistance = Infinity;
    resetNavigationMapBearing();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (navigationPanel) navigationPanel.hidden = true;
    setNavigationLayout(false);
    if (navigationDestination) navigationDestination.textContent = '—';
    hideManeuverOverlay();
    if (lastMonitorPosition?.coords) updateMonitoredLocationVisual(lastMonitorPosition);
    if (!keepRoute) clearRoute({ refreshMap: true });
  }

  function startNavigation() {
    if (!routeActive || !routeDestination || !routeCoordinates.length) return;
    const wasAlreadyNavigating = navigationActive;
    navigationActive = true;
    navigationArrived = false;
    navigationLastRouteIndex = 0;
    navigationLastStepIndex = -1;
    navigationLastVoiceBucket = '';
    navigationLastSpokenKey = '';
    navigationOffRouteFixes = 0;
    navigationVisibleRouteIndex = 0;
    navigationLastRoutePaintPosition = null;
    navigationCurrentManeuverDistance = Infinity;
    navigationLastMapBearing = null;
    if (!wasAlreadyNavigating) navigationVoiceEnabled = true;
    mapAutoFollowEnabled = true;
    if (navigationPanel) navigationPanel.hidden = false;
    setNavigationLayout(true);
    if (navigationDestination) navigationDestination.textContent = routeDestination.name || 'Cel podróży';
    updateNavigationModeUi();
    if (navigationKicker) navigationKicker.textContent = `NAWIGACJA · ${routeModeMeta(activeRouteMode).label}`;
    if (lastMonitorPosition?.coords) {
      const { latitude, longitude } = lastMonitorPosition.coords;
      if (!wasAlreadyNavigating) {
        mapProgrammaticMove = true;
        map?.setView([latitude, longitude], navigationZoomForMode(activeRouteMode), { animate: true });
        mapProgrammaticMove = false;
      }
      // Przy przeliczeniu od razu aktualizujemy nową trasę, pozycję dopasowaną do drogi i manewr.
      updateNavigationFromPosition(lastMonitorPosition, true);
    }
  }


  async function maybeRerouteNavigation(position, offRouteDistance) {
    if (!navigationActive || navigationArrived || !routeDestination || !position?.coords) return;

    const accuracy = Math.max(0, Number(position.coords.accuracy) || 0);
    const baseThreshold = routeOffRouteThreshold(activeRouteMode);
    const effectiveThreshold = Math.max(baseThreshold, accuracy * 1.35);

    if (offRouteDistance < effectiveThreshold) {
      navigationOffRouteFixes = 0;
      return;
    }

    navigationOffRouteFixes += 1;
    if (navigationRerouteInFlight) return;

    const farOffRoute = offRouteDistance >= effectiveThreshold * 1.8;
    if (!farOffRoute && navigationOffRouteFixes < 2) return;

    // v1053: po realnym zjechaniu z trasy reagujemy po 2 pewnych odczytach GPS
    // (lub natychmiast przy dużym odchyleniu), zamiast czekać 20 sekund.
    if (Date.now() - navigationLastRerouteAt < 4500) return;

    navigationRerouteInFlight = true;
    navigationOffRouteFixes = 0;
    navigationLastRerouteAt = Date.now();
    if (navigationKicker) navigationKicker.textContent = 'PRZELICZAM TRASĘ…';

    try {
      await planRouteToDestination(routeDestination, {
        startNavigation: true,
        recalculating: true,
        mode: activeRouteMode
      });
    } finally {
      navigationRerouteInFlight = false;
      if (navigationActive && !navigationArrived && navigationKicker?.textContent === 'PRZELICZAM TRASĘ…') {
        navigationKicker.textContent = `NAWIGACJA · ${routeModeMeta(activeRouteMode).label}`;
      }
    }
  }

  function updateNavigationFromPosition(position, forceSpeak = false) {
    if (!navigationActive || !position?.coords || !routeCoordinates.length || !routeDestination) return;

    const lat = Number(position.coords.latitude);
    const lon = Number(position.coords.longitude);
    const nearest = findNearestNavigationRoutePosition(lat, lon);
    navigationCurrentProgress = Math.max(0, Number(nearest.progress) || 0);
    updateMonitoredLocationVisual(position, nearest);
    const remaining = Math.max(0, navigationRouteDistance - nearest.progress);
    const destinationDistance = distanceMeters(lat, lon, Number(routeDestination.lat), Number(routeDestination.lon));

    if (destinationDistance <= routeArrivalThreshold(activeRouteMode) || remaining <= 20) {
      navigationArrived = true;
      if (navigationKicker) navigationKicker.textContent = `CEL OSIĄGNIĘTY · ${routeModeMeta(activeRouteMode).label}`;
      if (navigationArrow) navigationArrow.textContent = '●';
      if (navigationInstruction) navigationInstruction.textContent = 'Jesteś na miejscu';
      if (navigationRoad) navigationRoad.textContent = routeDestination.name || 'Cel podróży';
      if (navigationDestination) navigationDestination.textContent = routeDestination.name || 'Cel podróży';
      hideManeuverOverlay();
      if (navigationTurnDistance) navigationTurnDistance.textContent = '0 m';
      if (navigationRemainingDistance) navigationRemainingDistance.textContent = '0 m';
      if (navigationRemainingTime) navigationRemainingTime.textContent = '0 min';
      if (navigationLastSpokenKey !== 'arrived') {
        navigationLastSpokenKey = 'arrived';
        speakNavigation(`Jesteś na miejscu. ${routeDestination.name || ''}`.trim());
      }
      updateRouteAttractionsStatusPanel(position, { force: true });
      return;
    }

    let stepIndex = navigationSteps.findIndex((step) => {
      if (step?.maneuver?.type === 'depart') return false;
      return Number(step._routeMeters) > nearest.progress + 12;
    });
    if (stepIndex < 0) stepIndex = Math.max(0, navigationSteps.length - 1);
    const step = navigationSteps[stepIndex];
    const distanceToStep = Math.max(0, Number(step?._routeMeters || navigationRouteDistance) - nearest.progress);
    navigationCurrentManeuverDistance = distanceToStep;
    const instruction = navigationInstructionForStep(step);
    const road = navigationRoadTextForStep(step);
    applyNavigationMarkerHeading(position, nearest, forceSpeak);
    updateVisibleRouteProgress(lat, lon, nearest, forceSpeak);
    const remainingTimeSeconds = navigationRouteDistance > 0
      ? navigationRouteDuration * (remaining / navigationRouteDistance)
      : 0;

    const currentOffRouteThreshold = Math.max(
      routeOffRouteThreshold(activeRouteMode),
      Math.max(0, Number(position.coords.accuracy) || 0) * 1.35
    );
    if (navigationKicker) navigationKicker.textContent = nearest.distance >= currentOffRouteThreshold ? `POZA TRASĄ · ${routeModeMeta(activeRouteMode).label}` : `NAWIGACJA · ${routeModeMeta(activeRouteMode).label}`;
    if (navigationArrow) navigationArrow.innerHTML = maneuverIconSvg(step);
    if (navigationInstruction) navigationInstruction.textContent = instruction;
    if (navigationRoad) navigationRoad.textContent = road || '';
    if (navigationTurnDistance) navigationTurnDistance.textContent = formatNavigationDistance(distanceToStep);
    if (navigationRemainingDistance) navigationRemainingDistance.textContent = formatNavigationDistance(remaining);
    if (navigationRemainingTime) navigationRemainingTime.textContent = formatRouteDuration(remainingTimeSeconds);
    if (navigationDestination) navigationDestination.textContent = routeDestination.name || 'Cel podróży';
    updateManeuverOverlay(stepIndex, step, distanceToStep);
    updateRouteAttractionsStatusPanel(position);

    const voiceBucket = navigationVoiceBucket(distanceToStep);
    const voiceKey = `${stepIndex}:${voiceBucket}`;
    const shouldSpeak =
      forceSpeak ||
      stepIndex !== navigationLastStepIndex ||
      (voiceBucket !== 'far' && voiceKey !== navigationLastSpokenKey && voiceBucket !== navigationLastVoiceBucket);

    if (shouldSpeak) {
      navigationLastSpokenKey = voiceKey;
      navigationLastVoiceBucket = voiceBucket;
      const distancePhrase = distanceToStep > 90 ? `Za ${formatNavigationDistance(distanceToStep)}, ` : '';
      const voiceRoadRef = navigationVoiceRoadRefForStep(step);
      speakNavigation(`${distancePhrase}${instruction}${voiceRoadRef ? `, droga ${voiceRoadRef}` : ''}.`);
    }
    navigationLastStepIndex = stepIndex;

    maybeRerouteNavigation(position, nearest.distance);
  }

  function clearRoute({ refreshMap = true } = {}) {
    if (navigationActive || (navigationPanel && !navigationPanel.hidden)) {
      navigationActive = false;
      navigationArrived = false;
      navigationRerouteInFlight = false;
      navigationCurrentManeuverDistance = Infinity;
      resetNavigationMapBearing();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (navigationPanel) navigationPanel.hidden = true;
      setNavigationLayout(false);
      if (navigationDestination) navigationDestination.textContent = '—';
      hideManeuverOverlay();
      if (lastMonitorPosition?.coords) updateMonitoredLocationVisual(lastMonitorPosition);
    }
    routeActive = false;
    routeDestination = null;
    routeAttractions = [];
    routeCoordinates = [];
    nearbyAttractions = [];
    routeAlertedIds = new Set();
    routeAttractionRefreshSequence += 1;
    navigationVisibleRouteIndex = 0;
    navigationLastRoutePaintPosition = null;
    navigationOffRouteFixes = 0;
    navigationCurrentProgress = 0;
    hideRouteAttractionsStatusPanel();

    if (map && routeOutlineLayer) map.removeLayer(routeOutlineLayer);
    routeOutlineLayer = null;
    if (map && routeLayer) map.removeLayer(routeLayer);
    routeLayer = null;
    if (map && routeDestinationMarker) map.removeLayer(routeDestinationMarker);
    routeDestinationMarker = null;

    if (routeClearButton) routeClearButton.hidden = true;
    if (routeDestinationInput) routeDestinationInput.value = '';
    if (routeResults) routeResults.replaceChildren();
    setRouteInfo('Wpisz dokładny adres albo nazwę miejsca i wybierz wynik z listy.');

    if (refreshMap && currentMapMode === 'all') {
      scheduleViewportAttractions(150);
      if (lastMonitorPosition?.coords) {
        lastNearbyFetchAt = 0;
        refreshNearbyAttractions(lastMonitorPosition);
      }
    }
  }

  async function refreshActiveRouteAttractions(coordinates, radius, context) {
    const sequence = ++routeAttractionRefreshSequence;
    try {
      const attractions = await fetchRouteAttractions(coordinates, radius);
      if (
        sequence !== routeAttractionRefreshSequence ||
        !routeActive ||
        routeCoordinates !== coordinates
      ) return;

      routeAttractions = attractions;
      nearbyAttractions = attractions;
      osmAttractions = new Map(attractions.map((item) => [item.osmId, item]));
      renderExternalAttractions(attractions);
      updateOsmStatus(`Atrakcje do ${formatDistance(radius)} od trasy: ${attractions.length} · alert aktywny`);
      setRouteInfo(
        `${context.icon} ${context.label} · ${context.destinationName} · ${context.distance} · około ${context.duration} · atrakcji do ${formatDistance(radius)} od trasy: ${attractions.length}. Alert: ${formatDistance(radius)}.`
      );
      if (lastMonitorPosition?.coords) checkProximity(lastMonitorPosition);
      updateRouteAttractionsStatusPanel(lastMonitorPosition, { force: true });
    } catch (error) {
      if (sequence !== routeAttractionRefreshSequence || routeCoordinates !== coordinates) return;
      console.warn('Nie udało się odczytać atrakcji przy trasie:', error);
      routeAttractions = [];
      nearbyAttractions = [];
      updateRouteAttractionsStatusPanel(lastMonitorPosition, { force: true });
      updateOsmStatus('Atrakcje przy trasie: brak danych z bazy', true);
      setRouteInfo(
        `${context.icon} ${context.label} · ${context.destinationName} · ${context.distance} · około ${context.duration}. Trasa działa, ale atrakcji nie udało się odczytać z bazy.`,
        true
      );
    }
  }

  async function planRouteToDestination(destination, { startNavigation: shouldStartNavigation = false, recalculating = false, mode = null } = {}) {
    if (!map || !destination || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lon)) return;

    const requestedMode = normalizeRouteMode(recalculating ? activeRouteMode : (mode || routeTravelMode));
    const requestedModeMeta = routeModeMeta(requestedMode);
    if (!recalculating) setRouteTravelMode(requestedMode);

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
    setRouteInfo(recalculating
      ? 'Przeliczam trasę…'
      : `Wyznaczam trasę · ${requestedModeMeta.icon} ${requestedModeMeta.label}…`
    );
    if (routeResults) routeResults.replaceChildren();

    try {
      const url = `${requestedModeMeta.endpoint}/${startLon.toFixed(6)},${startLat.toFixed(6)};${destination.lon.toFixed(6)},${destination.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true&annotations=false`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
      const data = await response.json();
      const route = data?.routes?.[0];
      const coordinates = route?.geometry?.coordinates;
      if (!route || !Array.isArray(coordinates) || coordinates.length < 2) throw new Error('Brak trasy');

      // v1053: zwykła polilinia może być błyskawicznie skracana w czasie jazdy.
      // Przejechany fragment znika zamiast pozostawać za znacznikiem GPS.
      if (routeOutlineLayer) map.removeLayer(routeOutlineLayer);
      if (routeLayer) map.removeLayer(routeLayer);
      const routeLatLngs = coordinates.map((coord) => [Number(coord[1]), Number(coord[0])]);
      routeOutlineLayer = L.polyline(routeLatLngs, {
        color: '#ffffff',
        weight: 10,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      }).addTo(map);
      routeLayer = L.polyline(routeLatLngs, {
        color: '#1f6fd5',
        weight: 6,
        opacity: 0.96,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      }).addTo(map);

      if (!recalculating || !routeDestinationMarker) {
        if (routeDestinationMarker) map.removeLayer(routeDestinationMarker);
        routeDestinationMarker = L.marker([destination.lat, destination.lon], {
          title: destination.name || 'Cel podróży'
        }).addTo(map).bindPopup(`<strong>${escapeHtml(destination.name || 'Cel podróży')}</strong><br>Cel podróży`);
      }

      routeActive = true;
      routeDestination = destination;
      activeRouteMode = requestedMode;
      updateNavigationModeUi();
      routeCoordinates = coordinates;
      routeAttractions = [];
      nearbyAttractions = [];
      routeAttractionsPanelSignature = '';
      if (!recalculating) routeAlertedIds = new Set();

      const routeSteps = (Array.isArray(route.legs) ? route.legs : [])
        .flatMap((leg) => Array.isArray(leg?.steps) ? leg.steps : []);
      buildNavigationRouteMetrics(coordinates, routeSteps, Number(route.distance), Number(route.duration));
      updateRouteAttractionsStatusPanel(position, { force: true });
      if (routeClearButton) routeClearButton.hidden = false;

      clearTimeout(viewportFetchTimer);
      if (!recalculating) {
        externalLayer?.clearLayers();
        osmMarkerById = new Map();
      }

      const distance = formatDistance(Number(route.distance));
      const duration = formatRouteDuration(Number(route.duration));
      const routeRadius = getProximityRadiusMeters();

      // Najważniejsze przy przeliczeniu: nowa geometria i wskazówki mają wejść natychmiast.
      // Szukanie atrakcji przy trasie wykonujemy dopiero w tle i nie blokujemy nawigacji.
      setRouteInfo(`${requestedModeMeta.icon} ${requestedModeMeta.label} · ${destination.name} · ${distance} · około ${duration}. Aktualizuję atrakcje w tle…`);
      hideRoutePanel();
      startProximityMonitoring(false);

      if (shouldStartNavigation || recalculating) {
        startNavigation();
      } else if (position?.coords) {
        const nearest = findNearestNavigationRoutePosition(startLat, startLon);
        updateVisibleRouteProgress(startLat, startLon, nearest, true);
      }

      refreshActiveRouteAttractions(coordinates, routeRadius, {
        icon: requestedModeMeta.icon,
        label: requestedModeMeta.label,
        destinationName: destination.name,
        distance,
        duration
      });

      if (!recalculating) {
        showLocationMessage('Trasa gotowa. Nawigacja działa, a atrakcje przy trasie są aktualizowane w tle.');
      }
    } catch (error) {
      console.warn('Nie udało się wyznaczyć trasy:', error);
      setRouteInfo(`Nie udało się wyznaczyć trasy w trybie ${requestedModeMeta.label}.`, true);
      if (recalculating && navigationActive && navigationKicker) {
        navigationKicker.textContent = `NAWIGACJA · ${routeModeMeta(activeRouteMode).label}`;
      }
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

  function navigationZoomForMode(mode = activeRouteMode) {
    return mode === 'car' ? NAVIGATION_CAR_ZOOM : NAVIGATION_OTHER_ZOOM;
  }

  function bearingDegrees(lat1, lon1, lat2, lon2) {
    const toRad = (value) => Number(value) * Math.PI / 180;
    const toDeg = (value) => value * 180 / Math.PI;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const dLon = toRad(Number(lon2) - Number(lon1));
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function routePointAtProgress(progressMeters) {
    if (!routeCoordinates.length || !navigationRouteCumulative.length) return null;
    const target = Math.max(0, Math.min(Number(progressMeters) || 0, navigationRouteCumulative[navigationRouteCumulative.length - 1] || 0));

    let low = 0;
    let high = navigationRouteCumulative.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (Number(navigationRouteCumulative[mid] || 0) < target) low = mid + 1;
      else high = mid;
    }

    const endIndex = Math.max(1, low);
    const startIndex = Math.max(0, endIndex - 1);
    const a = routeCoordinates[startIndex];
    const b = routeCoordinates[endIndex] || a;
    if (!a || !b) return null;
    const startMeters = Number(navigationRouteCumulative[startIndex] || 0);
    const endMeters = Number(navigationRouteCumulative[endIndex] || startMeters);
    const span = Math.max(0.01, endMeters - startMeters);
    const ratio = Math.max(0, Math.min(1, (target - startMeters) / span));
    return [
      Number(a[1]) + (Number(b[1]) - Number(a[1])) * ratio,
      Number(a[0]) + (Number(b[0]) - Number(a[0])) * ratio
    ];
  }

  function routeHeadingFromNearest(nearest) {
    if (!routeCoordinates.length || !nearest) return null;
    const snapped = navigationSnappedLatLng(nearest);
    if (!snapped) return null;

    // Kierunek wyliczamy z punktu przed samochodem, a nie z jednego krótkiego
    // segmentu geometrii. To usuwa drobne, szybkie skoki kierunku na mapie.
    const currentProgress = Math.max(0, Number(nearest.progress) || 0);
    const maneuverClose = Number.isFinite(navigationCurrentManeuverDistance) && navigationCurrentManeuverDistance < 180;
    const lookAhead = maneuverClose ? 24 : 48;
    const ahead = routePointAtProgress(currentProgress + lookAhead);
    if (!ahead) return null;
    const distanceAhead = distanceMeters(Number(snapped[0]), Number(snapped[1]), Number(ahead[0]), Number(ahead[1]));
    if (distanceAhead < 4) return null;
    return bearingDegrees(Number(snapped[0]), Number(snapped[1]), Number(ahead[0]), Number(ahead[1]));
  }

  function smoothHeading(nextHeading, force = false) {
    const next = ((Number(nextHeading) % 360) + 360) % 360;
    if (!Number.isFinite(next)) return navigationHeadingDegrees;
    if (force || !Number.isFinite(navigationHeadingDegrees)) {
      navigationHeadingDegrees = next;
      return next;
    }

    const delta = ((next - navigationHeadingDegrees + 540) % 360) - 180;
    // Profesjonalniejszy efekt: mniejsza reakcja na pojedynczy skok GPS/geometrii,
    // ale bez opóźniania prawdziwego zakrętu. Maksymalny obrót na jeden fix GPS
    // ograniczamy, dzięki czemu mapa nie przeskakuje o 90/180 stopni naraz.
    const gain = Math.abs(delta) > 55 ? 0.18 : 0.24;
    const maxStep = force ? 32 : 12;
    const step = Math.max(-maxStep, Math.min(maxStep, delta * gain));
    navigationHeadingDegrees = (navigationHeadingDegrees + step + 360) % 360;
    return navigationHeadingDegrees;
  }

  function navigationPositionIcon() {
    return L.divIcon({
      className: 'navigation-position-icon',
      html: `<div class="navigation-position-arrow">
        <svg viewBox="0 0 52 52" aria-hidden="true">
          <path class="navigation-position-arrow-outline" d="M26 3 C28 3 29.4 4.2 30.4 6.4 L47.4 42 C49.2 45.8 45.2 49.2 41.7 47.3 L26 39.2 L10.3 47.3 C6.8 49.2 2.8 45.8 4.6 42 L21.6 6.4 C22.6 4.2 24 3 26 3 Z"/>
          <path class="navigation-position-arrow-fill" d="M26 8 L43.2 43.8 L26 34.9 L8.8 43.8 Z"/>
          <path class="navigation-position-arrow-highlight" d="M26 8 L26 34.9 L8.8 43.8 Z"/>
        </svg>
      </div>`,
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });
  }

  function navigationHeadingForPosition(position, nearest = null) {
    const routeHeading = routeHeadingFromNearest(nearest);
    const gpsHeading = Number(position?.coords?.heading);
    const speed = Number(position?.coords?.speed);
    const nearRoute = Number.isFinite(Number(nearest?.distance)) && Number(nearest.distance) <= 45;

    // Podczas jazdy po wyznaczonej linii pierwszeństwo ma kierunek geometrii trasy.
    // Na rondach i wielopasmowych skrzyżowaniach jest stabilniejszy niż chwilowe skoki kompasu GPS.
    if (nearRoute && Number.isFinite(routeHeading)) return routeHeading;
    if (Number.isFinite(gpsHeading) && gpsHeading >= 0 && (!Number.isFinite(speed) || speed > 0.6)) return gpsHeading;
    if (Number.isFinite(routeHeading)) return routeHeading;
    return navigationHeadingDegrees || 0;
  }

  function resetNavigationMapBearing() {
    navigationLastMapBearing = null;
    if (map && typeof map.setBearing === 'function') {
      try { map.setBearing(0); } catch (error) { console.warn('Nie udało się wyzerować obrotu mapy:', error); }
    }
  }

  function applyNavigationMarkerHeading(position, nearest = null, force = false) {
    if (!navigationActive) return navigationHeadingDegrees || 0;
    const heading = navigationHeadingForPosition(position, nearest);
    const smoothed = smoothHeading(heading, force);
    let mapRotated = false;

    if (map && typeof map.setBearing === 'function') {
      try {
        // leaflet-rotate obraca pane mapy o podany kąt. Aby kierunek jazdy
        // (np. 90° = wschód) znalazł się na górze ekranu, mapa musi zostać
        // obrócona przeciwnie: -heading, czyli 360-heading.
        const targetBearing = (360 - smoothed) % 360;
        const previous = Number.isFinite(navigationLastMapBearing)
          ? navigationLastMapBearing
          : Number(map.getBearing?.() || 0);
        const delta = signedBearingDelta(previous, targetBearing);
        if (force || !Number.isFinite(delta) || Math.abs(delta) >= 0.45) {
          map.setBearing(targetBearing);
          navigationLastMapBearing = targetBearing;
        }
        mapRotated = true;
      } catch (error) {
        console.warn('Obrót mapy jest chwilowo niedostępny:', error);
      }
    }

    if (userLocationMarkerMode === 'arrow' && userLocationMarker) {
      const element = userLocationMarker.getElement?.()?.querySelector('.navigation-position-arrow');
      // Przy obróconej mapie strzałka zawsze wskazuje idealnie w górę.
      if (element) element.style.transform = `rotate(${mapRotated ? 0 : smoothed.toFixed(1)}deg)`;
    }
    return smoothed;
  }

  function updateMonitoredLocationVisual(position, nearest = null) {
    if (!map || !position?.coords) return;
    const { latitude, longitude, accuracy } = position.coords;
    const rawLatLng = [Number(latitude), Number(longitude)];

    // Podczas aktywnej nawigacji strzałka jest przyciągana do wyznaczonej drogi,
    // jeżeli GPS pozostaje w rozsądnej odległości od trasy. Dzięki temu na rondach
    // i równoległych jezdniach strzałka nie "pływa" obok niebieskiej linii.
    let markerLatLng = rawLatLng;
    navigationMatchedLatLng = null;
    if (navigationActive && nearest) {
      const snapLimit = Math.max(45, Math.min(85, routeOffRouteThreshold(activeRouteMode) * 0.95));
      const snapped = navigationSnappedLatLng(nearest);
      if (snapped && Number(nearest.distance) <= snapLimit) {
        markerLatLng = snapped;
        navigationMatchedLatLng = snapped;
      }
    }

    if (userAccuracyCircle) {
      userAccuracyCircle.setLatLng(rawLatLng).setRadius(Math.max(accuracy || 5, 5));
      userAccuracyCircle.setStyle({ opacity: navigationActive ? 0.18 : 0.55, fillOpacity: navigationActive ? 0.025 : 0.12 });
    } else {
      userAccuracyCircle = L.circle(rawLatLng, {
        radius: Math.max(accuracy || 5, 5),
        color: '#2f80ed',
        weight: 1,
        opacity: navigationActive ? 0.18 : 0.55,
        fillColor: '#2f80ed',
        fillOpacity: navigationActive ? 0.025 : 0.12,
        interactive: false
      }).addTo(map);
    }

    const desiredMode = navigationActive ? 'arrow' : 'dot';
    if (userLocationMarker && userLocationMarkerMode !== desiredMode) {
      map.removeLayer(userLocationMarker);
      userLocationMarker = null;
    }

    if (userLocationMarker) {
      userLocationMarker.setLatLng(markerLatLng);
    } else if (desiredMode === 'arrow') {
      userLocationMarker = L.marker(markerLatLng, {
        icon: navigationPositionIcon(),
        keyboard: false,
        interactive: false,
        zIndexOffset: 1400,
        rotateWithView: false
      }).addTo(map);
      userLocationMarkerMode = 'arrow';
    } else {
      userLocationMarker = L.circleMarker(markerLatLng, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#1677ff',
        fillOpacity: 1
      }).addTo(map);
      userLocationMarkerMode = 'dot';
      userLocationMarker.bindTooltip('Twoja lokalizacja', { direction: 'top', offset: [0, -8] });
    }

  }

  function hideNearbyAlert() {
    clearTimeout(nearbyAlertTimer);
    nearbyAlertTimer = null;
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
    clearTimeout(nearbyAlertTimer);
    nearbyAlertTimer = setTimeout(() => hideNearbyAlert(), 5000);
  }

  function checkProximity(position) {
    if (!osmEnabled || !proximityActive || !position?.coords || !nearbyAttractions.length) return;
    if (currentNearbyAlertId && nearbyAlert && !nearbyAlert.hidden) return;

    const radius = getProximityRadiusMeters();
    const { latitude, longitude } = position.coords;

    let candidate = null;
    let candidateDistance = Infinity;
    for (const attraction of nearbyAttractions) {
      if (routeActive && routeAlertedIds.has(String(attraction.osmId))) continue;
      if (!routeActive && wasAttractionAlertedRecently(attraction.osmId)) continue;
      const distance = distanceMeters(latitude, longitude, attraction.lat, attraction.lon);
      if (distance <= radius && distance < candidateDistance) {
        candidate = attraction;
        candidateDistance = distance;
      }
    }

    if (candidate) {
      showNearbyAttractionAlert(candidate, candidateDistance);
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
          : 'Nie udało się odczytać bazy atrakcji. Spróbuję ponownie automatycznie.',
        !keptCount
      );
    } finally {
      nearbyFetchInFlight = false;
    }
  }

  function navigationStepLaneCount(stepIndex) {
    const candidates = [navigationSteps[stepIndex], navigationSteps[stepIndex - 1], navigationSteps[stepIndex + 1]].filter(Boolean);
    let maxCount = 0;
    candidates.forEach((step) => {
      (Array.isArray(step?.intersections) ? step.intersections : []).forEach((intersection) => {
        const lanes = Array.isArray(intersection?.lanes) ? intersection.lanes : [];
        maxCount = Math.max(maxCount, lanes.length);
      });
    });
    return maxCount;
  }

  function navigationStepRoadChoices(step) {
    let maxChoices = 0;
    (Array.isArray(step?.intersections) ? step.intersections : []).forEach((intersection) => {
      const bearings = Array.isArray(intersection?.bearings) ? intersection.bearings : [];
      maxChoices = Math.max(maxChoices, bearings.length);
    });
    return maxChoices;
  }

  function navigationNeedsDetailZoom(stepIndex, step, distanceToStep) {
    if (activeRouteMode !== 'car' || !step || !Number.isFinite(Number(distanceToStep))) return false;
    if (Number(distanceToStep) > 260) return false;
    if (isRoundaboutManeuver(step)) return true;
    if (navigationStepLaneCount(stepIndex) >= 2) return true;
    if (navigationStepRoadChoices(step) >= 4) return true;
    const type = String(step?.maneuver?.type || '').toLowerCase();
    return Number(distanceToStep) <= 170 && ['fork', 'merge', 'on ramp', 'off ramp', 'end of road'].includes(type);
  }

  function navigationFollowZoom() {
    const base = navigationZoomForMode(activeRouteMode);
    if (!navigationActive || navigationArrived) return base;
    const index = navigationLastStepIndex >= 0 ? navigationLastStepIndex : 0;
    const step = navigationSteps[index];
    return navigationNeedsDetailZoom(index, step, navigationCurrentManeuverDistance)
      ? Math.min(18.5, map?.getMaxZoom?.() || 18.5)
      : base;
  }

  function keepMonitoredPositionVisible(position) {
    if (!map || mapScreen?.hidden || currentMapMode !== 'all' || !position?.coords || !mapAutoFollowEnabled) return;

    const rawLat = Number(position.coords.latitude);
    const rawLon = Number(position.coords.longitude);
    const followed = navigationActive && userLocationMarker?.getLatLng
      ? userLocationMarker.getLatLng()
      : null;
    const lat = Number(followed?.lat ?? rawLat);
    const lon = Number(followed?.lng ?? rawLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    // W trybie nawigacji jedziemy zawsze "do góry". Kamera jest lekko przesunięta
    // przed pojazd, aby na ekranie było więcej drogi przed nami, a ruch mapy jest
    // animowany zamiast wykonywać twardy setView przy każdym odczycie GPS.
    if (navigationActive) {
      if (mapAutoRecenterInProgress) return;
      const targetZoom = navigationFollowZoom();
      const detailView = targetZoom > navigationZoomForMode(activeRouteMode) + 0.2;
      const cameraAheadMeters = detailView ? 18 : 42;
      const ahead = routePointAtProgress(navigationCurrentProgress + cameraAheadMeters);
      const cameraLat = Number(ahead?.[0] ?? lat);
      const cameraLon = Number(ahead?.[1] ?? lon);
      const currentZoom = Number(map.getZoom?.() ?? targetZoom);
      const zoomChanged = Math.abs(currentZoom - targetZoom) >= 0.25;

      mapAutoRecenterInProgress = true;
      const releaseRecenter = () => { mapAutoRecenterInProgress = false; };
      map.once('moveend', releaseRecenter);
      mapProgrammaticMove = true;
      if (zoomChanged) {
        map.setView([cameraLat, cameraLon], targetZoom, { animate: true, duration: 0.28, noMoveStart: true });
      } else {
        map.panTo([cameraLat, cameraLon], { animate: true, duration: 0.34, easeLinearity: 0.22, noMoveStart: true });
      }
      mapProgrammaticMove = false;
      setTimeout(releaseRecenter, 520);
      return;
    }

    const point = map.latLngToContainerPoint([lat, lon]);
    const size = map.getSize();
    const marginX = Math.min(FOLLOW_EDGE_MARGIN_PX, Math.max(40, size.x * 0.14));
    const marginY = Math.min(FOLLOW_EDGE_MARGIN_PX, Math.max(40, size.y * 0.14));
    const reachedEdgeZone =
      point.x <= marginX ||
      point.x >= size.x - marginX ||
      point.y <= marginY ||
      point.y >= size.y - marginY;

    if (!reachedEdgeZone || mapAutoRecenterInProgress) return;

    mapAutoRecenterInProgress = true;
    const releaseRecenter = () => { mapAutoRecenterInProgress = false; };
    map.once('moveend', releaseRecenter);
    mapProgrammaticMove = true;
    map.panTo([lat, lon], { animate: true, duration: 0.4, noMoveStart: true });
    mapProgrammaticMove = false;
    setTimeout(releaseRecenter, 700);
  }


  function handleMonitoredPosition(position) {
    lastMonitorPosition = position;
    setLocationButtonState('active');

    if (navigationActive) {
      updateNavigationFromPosition(position);
    } else {
      updateMonitoredLocationVisual(position);
      if (routeActive) updateRouteAttractionsStatusPanel(position);
    }

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
        timeout: 12000,
        maximumAge: 1000
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
        <button class="place-popup-edit" type="button" data-route-point-id="${escapeHtml(point.id)}">PROWADŹ</button>
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

  // v1034: w pionie mapa zaczyna się pod całym panelem. Na telefonie w poziomie
  // panel staje po lewej (ok. 1/4 ekranu), a mapa zajmuje prawą część (ok. 3/4).
  function syncMapContentTop() {
    if (!mapScreen || !mapTopPanel || mapScreen.hidden) return;
    const screenRect = mapScreen.getBoundingClientRect();
    const panelRect = mapTopPanel.getBoundingClientRect();
    const sidePanelLayout = window.matchMedia('(orientation: landscape) and (max-height: 650px)').matches;

    if (sidePanelLayout) {
      const left = Math.max(0, Math.ceil(panelRect.right - screenRect.left + 6));
      mapScreen.style.setProperty('--map-content-top', '0px');
      mapScreen.style.setProperty('--map-content-left', `${left}px`);
    } else {
      const top = Math.max(0, Math.ceil(panelRect.bottom - screenRect.top + 6));
      mapScreen.style.setProperty('--map-content-top', `${top}px`);
      mapScreen.style.setProperty('--map-content-left', '0px');
    }
    requestAnimationFrame(() => map?.invalidateSize());
  }

  function createMap() {
    if (map || !window.L) return;

    map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      minZoom: 3,
      maxZoom: 20,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      rotate: true,
      rotateControl: false,
      touchRotate: false,
      shiftKeyRotate: false
    }).setView([52.05, 19.15], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    }).addTo(map);

    L.control.scale({
      imperial: false,
      metric: true,
      position: 'bottomleft'
    }).addTo(map);

    const signatureControl = L.control({ position: 'bottomleft' });
    signatureControl.onAdd = () => {
      const element = L.DomUtil.create('div', 'rn-app-signature');
      element.textContent = 'Mariusz Gębka - RN APP 2026.';
      element.setAttribute('aria-label', 'Mariusz Gębka - RN APP 2026.');
      return element;
    };
    signatureControl.addTo(map);

    externalLayer = L.layerGroup().addTo(map);
    renderStoredPoints();

    // Ręczne PRZESUNIĘCIE mapy oznacza: użytkownik chce oglądać inne miejsce.
    // Wtedy śledzenie widoku wyłączamy do kolejnego WYCENTRUJ. Sam zoom nie wyłącza
    // śledzenia — można oddalić mapę i nadal jechać z kropką wracającą ze skraju do środka.
    const pauseAutoFollowFromUser = () => {
      if (mapProgrammaticMove) return;
      mapAutoFollowEnabled = false;
      mapAutoRecenterInProgress = false;
    };
    map.on('dragstart', pauseAutoFollowFromUser);

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
    }, 5000);
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
      const matched = navigationActive && userLocationMarker?.getLatLng ? userLocationMarker.getLatLng() : null;
      const centerLat = Number(matched?.lat ?? latitude);
      const centerLon = Number(matched?.lng ?? longitude);
      mapAutoFollowEnabled = true;
      mapProgrammaticMove = true;
      map.setView([centerLat, centerLon], navigationActive ? navigationFollowZoom() : 15, { animate: true });
      mapProgrammaticMove = false;
      setLocationButtonState('active');
      showLocationMessage(navigationActive
        ? `Widok nawigacji wycentrowany blisko drogi (dokładność GPS ok. ${Math.round(accuracy || 0)} m).`
        : `Wycentrowano na Twojej pozycji (dokładność ok. ${Math.round(accuracy || 0)} m).`
      );
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
      mapModeBadge.textContent = `MOJE MIEJSCA · ${loadPoints().length}`;
      mapModeBadge.classList.add('is-my-places');
      mapModeBadge.hidden = !mineOnly;
    }

    if (myPlacesTransfer) myPlacesTransfer.hidden = !mineOnly;

    if (mapLocationButton) mapLocationButton.hidden = mineOnly;
    if (routeButton) routeButton.hidden = mineOnly;
    if (proximityButton) proximityButton.hidden = true;
    if (osmRefreshButton) osmRefreshButton.hidden = true;
    if (attractionPreviewButton) attractionPreviewButton.hidden = mineOnly;
    updateOsmButtonUi();
    if (proximityRadiusWrap) proximityRadiusWrap.hidden = mineOnly;
    if (osmStatus) osmStatus.hidden = true;
    if (mineOnly) hideRouteAttractionsStatusPanel();
    else if (routeActive) updateRouteAttractionsStatusPanel(lastMonitorPosition, { force: true });

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
        userLocationMarkerMode = 'dot';
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
    syncMapContentTop();
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
        updateRouteAttractionsStatusPanel(lastMonitorPosition, { force: true });
        updateOsmStatus(`Atrakcje do ${formatDistance(getProximityRadiusMeters())} od trasy: ${routeAttractions.length} · alert aktywny`);
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
        navigateDirectlyTo({
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
        navigateDirectlyTo({
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
  navigationAttractionsGrid?.querySelectorAll('[data-navigation-filter]').forEach((button) => {
    button.addEventListener('click', () => toggleAttractionFilter(button.dataset.navigationFilter));
  });
  navigationAttractionsButton?.addEventListener('click', showNavigationAttractions);
  navigationAttractionsClose?.addEventListener('click', hideNavigationAttractions);
  routeAttractionsRadarButton?.addEventListener('click', toggleRouteAttractionsPanel);
  routeAttractionsStatusClose?.addEventListener('click', () => setRouteAttractionsPanelExpanded(false));
  nearestAttractionButton?.addEventListener('click', focusNearestRouteAttraction);
  routeAttractionsStatusList?.addEventListener('click', (event) => {
    const row = event.target.closest('[data-route-attraction-info-id]');
    if (!row) return;
    showRouteAttractionInfoById(row.dataset.routeAttractionInfoId);
  });
  routeAttractionInfoClose?.addEventListener('click', hideRouteAttractionInfo);
  routeAttractionInfoCancel?.addEventListener('click', hideRouteAttractionInfo);
  routeAttractionInfoLead?.addEventListener('click', leadToRouteAttractionInfo);
  routeAttractionInfoOverlay?.addEventListener('click', (event) => {
    if (event.target === routeAttractionInfoOverlay) hideRouteAttractionInfo();
  });
  navigationAttractionsOverlay?.addEventListener('click', (event) => {
    if (event.target === navigationAttractionsOverlay) hideNavigationAttractions();
  });

  routeModeButtons.forEach((button) => {
    button.addEventListener('click', () => startPendingRouteWithMode(button.dataset.routeMode));
  });
  routeModeClose?.addEventListener('click', () => hideRouteModeChooser());
  routeModeOverlay?.addEventListener('click', (event) => {
    if (event.target === routeModeOverlay) hideRouteModeChooser();
  });

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
  navigationStopButton?.addEventListener('click', () => {
    stopNavigation({ keepRoute: false });
    showLocationMessage('Nawigacja zakończona. Trasa usunięta z mapy.');
  });


  proximityButton?.addEventListener('click', () => startProximityMonitoring(true));

  proximityRadius?.addEventListener('change', () => {
    const radius = getProximityRadiusMeters();
    localStorage.setItem(PROXIMITY_RADIUS_KEY, String(radius));
    if (lastMonitorPosition?.coords) updateAttractionPreview(lastMonitorPosition);
    if (routeActive) updateRouteAttractionsStatusPanel(lastMonitorPosition, { force: true });

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
    if (event.key !== 'Escape') return;
    if (routeAttractionInfoOverlay && !routeAttractionInfoOverlay.hidden) {
      hideRouteAttractionInfo();
      return;
    }
    if (routeModeOverlay && !routeModeOverlay.hidden) {
      hideRouteModeChooser();
      return;
    }
    if (navigationAttractionsOverlay && !navigationAttractionsOverlay.hidden) {
      hideNavigationAttractions();
      navigationAttractionsButton?.focus({ preventScroll: true });
      return;
    }
    if (attractionPreviewOverlay && !attractionPreviewOverlay.hidden) {
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

    navigateDirectlyTo({
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
  exportMyPlacesButton?.addEventListener('click', () => exportMyPlaces());
  importMyPlacesButton?.addEventListener('click', () => importMyPlacesInput?.click());
  importMyPlacesInput?.addEventListener('change', () => importMyPlacesFile(importMyPlacesInput.files?.[0]));
  mapBackButton?.addEventListener('click', hideMap);
  mapLocationButton?.addEventListener('click', centerOnCurrentLocation);

  window.addEventListener('resize', () => {
    if (mapScreen && !mapScreen.hidden) {
      syncMapContentTop();
      map?.invalidateSize();
    }
  });

  if (mapTopPanel && typeof ResizeObserver !== 'undefined') {
    const mapTopPanelObserver = new ResizeObserver(() => {
      if (mapScreen && !mapScreen.hidden) syncMapContentTop();
    });
    mapTopPanelObserver.observe(mapTopPanel);
  }

  if (dateInput && !dateInput.value) dateInput.value = localDateString();

  if (proximityRadius) {
    const savedRadius = Number(localStorage.getItem(PROXIMITY_RADIUS_KEY) || 5000);
    proximityRadius.value = String([5000, 10000, 15000, 20000].includes(savedRadius) ? savedRadius : 5000);
  }

  osmEnabled = true;
  saveOsmEnabled();

  setRouteTravelMode(localStorage.getItem(ROUTE_MODE_KEY) || 'car', { persist: false });
  activeRouteMode = routeTravelMode;
  updateNavigationModeUi();

  setCategory(currentCategory);
  setEditCategory(editCategory);
  setProximityUi(false);
  setAttractionPreviewButton(null);

  // PWA: rejestracja Service Workera i szybkie wykrywanie nowej wersji.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js?v=1062', {
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

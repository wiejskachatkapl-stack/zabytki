(() => {
  const APP_VERSION = 'v1006';
  const STORAGE_KEY = 'tourmap_points_v1';

  const CATEGORY_INFO = {
    castle: { label: 'Zamek', icon: 'assets/markers/castle.png?v=1006' },
    ruins: { label: 'Ruiny', icon: 'assets/markers/ruins.png?v=1006' },
    museum: { label: 'Muzeum', icon: 'assets/markers/museum.png?v=1006' },
    nature: { label: 'Pomnik przyrody', icon: 'assets/markers/nature.png?v=1006' },
    pttk: { label: 'Schronisko PTTK', icon: 'assets/markers/pttk.png?v=1006' }
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

    renderStoredPoints();
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

    requestAnimationFrame(() => {
      map?.invalidateSize();
      if (Number.isFinite(options.lat) && Number.isFinite(options.lon)) {
        map?.setView([options.lat, options.lon], options.zoom || 16, { animate: true });
      }
      if (options.openPointId != null) {
        setTimeout(() => pointMarkerById.get(String(options.openPointId))?.openPopup(), 250);
      }
    });
  }

  function hideMap() {
    if (!mapScreen || !startScreen) return;
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
    const button = event.target.closest('[data-edit-point-id]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    map?.closePopup();
    showEditScreen(button.dataset.editPointId);
  });

  mapButton?.addEventListener('click', () => showMap());
  mapBackButton?.addEventListener('click', hideMap);
  mapLocationButton?.addEventListener('click', locateUser);

  window.addEventListener('resize', () => {
    if (mapScreen && !mapScreen.hidden) map?.invalidateSize();
  });

  if (dateInput && !dateInput.value) dateInput.value = localDateString();
  setCategory(currentCategory);
  setEditCategory(editCategory);

  // PWA: rejestracja Service Workera i szybkie wykrywanie nowej wersji.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js?v=1006', {
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

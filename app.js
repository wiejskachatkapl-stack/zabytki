(() => {
  const APP_VERSION = 'v1004';

  const startScreen = document.querySelector('.start-screen');
  const addButton = document.getElementById('addButton');
  const mapButton = document.getElementById('mapButton');
  const mapScreen = document.getElementById('mapScreen');
  const mapBackButton = document.getElementById('mapBackButton');
  const mapLocationButton = document.getElementById('mapLocationButton');
  const locationMessage = document.getElementById('locationMessage');
  const versionElement = document.getElementById('appVersion');

  let map = null;
  let userLocationMarker = null;
  let userAccuracyCircle = null;
  let locationMessageTimer = null;

  if (versionElement) {
    versionElement.textContent = APP_VERSION;
  }

  addButton?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('tourmap:add'));
  });

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

  function setLocationButtonState(state) {
    if (!mapLocationButton) return;
    mapLocationButton.classList.toggle('is-locating', state === 'locating');
    mapLocationButton.classList.toggle('is-active', state === 'active');
    mapLocationButton.disabled = state === 'locating';
  }

  function locateUser() {
    if (!map) return;

    if (!navigator.geolocation) {
      showLocationMessage('To urządzenie nie udostępnia lokalizacji.', true);
      return;
    }

    setLocationButtonState('locating');
    showLocationMessage('Ustalam Twoją lokalizację…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
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
      },
      (error) => {
        setLocationButtonState('idle');

        let message = 'Nie udało się ustalić lokalizacji.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Brak zgody na dostęp do lokalizacji.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Lokalizacja jest teraz niedostępna.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Przekroczono czas ustalania lokalizacji.';
        }

        showLocationMessage(message, true);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000
      }
    );
  }

  function showMap() {
    if (!mapScreen || !startScreen) return;

    startScreen.hidden = true;
    mapScreen.hidden = false;
    createMap();

    // Leaflet musi przeliczyć rozmiar po odsłonięciu kontenera.
    requestAnimationFrame(() => {
      map?.invalidateSize();
    });
  }

  function hideMap() {
    if (!mapScreen || !startScreen) return;
    mapScreen.hidden = true;
    startScreen.hidden = false;
  }

  mapButton?.addEventListener('click', showMap);
  mapBackButton?.addEventListener('click', hideMap);
  mapLocationButton?.addEventListener('click', locateUser);

  window.addEventListener('resize', () => {
    if (mapScreen && !mapScreen.hidden) {
      map?.invalidateSize();
    }
  });

  // PWA: rejestracja Service Workera i szybkie wykrywanie nowej wersji.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js?v=1004', {
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

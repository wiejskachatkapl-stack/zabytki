(() => {
  const APP_VERSION = 'v1003';

  const startScreen = document.querySelector('.start-screen');
  const addButton = document.getElementById('addButton');
  const mapButton = document.getElementById('mapButton');
  const mapScreen = document.getElementById('mapScreen');
  const mapBackButton = document.getElementById('mapBackButton');
  const versionElement = document.getElementById('appVersion');

  let map = null;

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

  window.addEventListener('resize', () => {
    if (mapScreen && !mapScreen.hidden) {
      map?.invalidateSize();
    }
  });

  // PWA: rejestracja Service Workera i szybkie wykrywanie nowej wersji.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js?v=1003', {
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

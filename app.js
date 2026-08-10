(() => {
  const APP_VERSION = 'v1002';
  const addButton = document.getElementById('addButton');
  const mapButton = document.getElementById('mapButton');
  const versionElement = document.getElementById('appVersion');

  if (versionElement) {
    versionElement.textContent = APP_VERSION;
  }

  // v1002: ekran startowy. Funkcje modułów DODAJ i MAPA
  // zostaną podpięte w kolejnych wersjach.
  addButton?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('tourmap:add'));
  });

  mapButton?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('tourmap:map'));
  });

  // PWA: rejestracja Service Workera. updateViaCache="none" oraz reg.update()
  // pomagają szybko wykryć nową wersję po aktualizacji plików na GitHub Pages.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js?v=1002', {
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

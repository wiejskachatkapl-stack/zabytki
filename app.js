(() => {
  const addButton = document.getElementById('addButton');
  const mapButton = document.getElementById('mapButton');

  // v1000: ekran startowy. Funkcje modułów DODAJ i MAPA
  // zostaną podpięte w kolejnych wersjach.
  addButton.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('tourmap:add'));
  });

  mapButton.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('tourmap:map'));
  });
})();

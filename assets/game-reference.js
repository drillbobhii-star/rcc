/* Static public Roblox metadata; never loads or runs remote script content. */
(() => {
  let images = {};
  fetch('assets/game-images.json').then(response => response.ok ? response.json() : {}).then(data => { images = data; document.querySelectorAll('[data-game-image]').forEach(element => fillImage(element, element.dataset.gameImage)); }).catch(() => {});
  function fillImage(container, id) {
    const src = images[id];
    if (!src || !/^https:\/\/[^/]*rbxcdn\.com\//.test(src)) return;
    const image = document.createElement('img'); image.src = src; image.alt = 'Imagen de referencia de ' + container.dataset.gameName; image.loading = 'lazy'; image.decoding = 'async';
    image.onerror = () => { image.remove(); container.classList.add('game-cover-fallback'); container.textContent = container.dataset.gameName; };
    container.replaceChildren(image); container.classList.remove('game-cover-fallback');
    if (container.classList.contains('game-cover')) { image.style.width='100%'; image.style.height='100%'; image.style.objectFit='cover'; }
  }
  function cover(s) {
    const element = document.createElement('div'); element.className = 'game-cover game-cover-fallback'; element.dataset.gameImage = s.game_id; element.dataset.gameName = s.game; element.textContent = s.game;
    fillImage(element, s.game_id); return element;
  }
  window.enhanceGameCard = (s, card) => { if (s.game && /^[1-9]\d*$/.test(s.game_id)) card.prepend(cover(s)); };
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; } };
  window.enhanceGameDetail = (s, body) => {
    if (!s.game) return;
    const panel = document.createElement('section'); panel.className = 'game-reference';
    if (/^[1-9]\d*$/.test(s.game_id)) { const artwork = cover(s); artwork.style.cssText='width:112px;height:112px;flex-shrink:0'; panel.append(artwork); }
    const text = document.createElement('div'), title = document.createElement('h4'); title.textContent = s.game; text.append(title);
    const status = document.createElement('p'); status.className = 'key-status';
    const tags = s.tags || [];
    status.textContent = tags.includes('Con clave') ? 'Requiere llave ; consulta los requisitos del código.' : tags.includes('Sin clave') ? 'Sin llave indicada; puede cambiar con las actualizaciones.' : s.type === 'source' ? 'Receta RCC: no necesita llave. Se utiliza en tu propio proyecto de Studio.' : 'Estado de llave sin confirmar. Consulta los requisitos del código.';
    text.append(status);
    const links = document.createElement('div'); links.className = 'game-links';
    function link(label, url) { if (!safeUrl(url)) return; const a = document.createElement('a'); a.href = safeUrl(url); a.textContent = label; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.append(a); }
    if (/^[1-9]\d*$/.test(s.game_id)) link('Jugar en Roblox ↗', 'https://www.roblox.com/games/' + s.game_id);
    if (s.key_url) link('Obtener llave ↗', s.key_url);
    text.append(links); panel.append(text); body.prepend(panel);
  };
})();

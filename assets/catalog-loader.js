/* Resilient static catalog loader for Cloudflare Pages.
   Each JSON part is isolated: one failed request never discards successful parts. */
(() => {
  const partPath = /^catalog\/part-\d{3,}-[a-f0-9]{16}\.json$/;
  const partCache = new Map();

  async function request(file, cache) {
    const response = await fetch('/' + file.replace(/^\/+/, ''), {
      cache,
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' al cargar ' + file);
    return response.json();
  }

  async function fetchJson(file, cache = 'no-cache', validate = () => true) {
    let firstError;
    try {
      const data = await request(file, cache);
      if (validate(data)) return data;
      firstError = new Error('Respuesta JSON con formato o cantidad inesperada: ' + file);
    } catch (error) {
      firstError = error;
    }

    try {
      const data = await request(file, 'reload');
      if (validate(data)) return data;
      throw new Error('Respuesta JSON con formato o cantidad inesperada: ' + file);
    } catch (retryError) {
      throw new Error((retryError && retryError.message) || (firstError && firstError.message));
    }
  }

  function loadPart(part) {
    if (partCache.has(part.file)) return partCache.get(part.file);

    const promise = (async () => {
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const rows = await fetchJson(
            part.file,
            attempt === 0 ? 'force-cache' : 'reload',
            data => Array.isArray(data) && data.length === part.count
          );

          if (rows.some(row =>
            !row ||
            typeof row.id !== 'string' ||
            typeof row.code !== 'string'
          )) {
            throw new Error('Registros inválidos en ' + part.file);
          }
          return rows;
        } catch (error) {
          lastError = error;
        }
      }
      throw new Error('No se pudo cargar ' + part.file + ': ' +
        ((lastError && lastError.message) || 'error desconocido'));
    })();

    partCache.set(part.file, promise);
    promise.catch(() => {
      if (partCache.get(part.file) === promise) partCache.delete(part.file);
    });
    return promise;
  }

  async function load({ onProgress = () => {}, onPart = () => {} } = {}) {
    const manifest = await fetchJson(
      'scripts.json',
      'no-cache',
      data => Array.isArray(data) ||
        (data?.format === 'rcc-catalog-v1' &&
         Number.isSafeInteger(data.total) &&
         data.total >= 0 &&
         Array.isArray(data.parts) &&
         data.parts.length <= 1000)
    );

    // Compatibility with the original single-file catalog format.
    if (Array.isArray(manifest)) {
      try { onPart({ rows: manifest, index: 0, totalParts: 1, file: 'scripts.json' }); } catch (error) { console.error(error); }
      manifest.failedParts = [];
      manifest.expectedTotal = manifest.length;
      return manifest;
    }

    const seenFiles = new Set();
    for (const part of manifest.parts) {
      if (!part ||
          typeof part.file !== 'string' ||
          !partPath.test(part.file) ||
          seenFiles.has(part.file) ||
          !Number.isSafeInteger(part.count) ||
          part.count < 1 ||
          !Number.isSafeInteger(part.bytes) ||
          part.bytes < 2 ||
          part.bytes > 5 * 1024 * 1024) {
        throw new Error('Parte de catálogo inválida: ' + (part?.file || 'sin nombre'));
      }
      seenFiles.add(part.file);
    }

    if (manifest.parts.reduce((sum, part) => sum + part.count, 0) !== manifest.total) {
      throw new Error('El recuento del manifiesto no coincide con sus partes');
    }

    const results = new Array(manifest.parts.length);
    const failedParts = [];
    let cursor = 0;
    let loaded = 0;
    onProgress({ loaded, total: manifest.total, completedParts: 0, totalParts: manifest.parts.length });

    async function worker() {
      while (cursor < manifest.parts.length) {
        const index = cursor++;
        const part = manifest.parts[index];
        try {
          const rows = await loadPart(part);
          results[index] = rows;
          loaded += rows.length;
          try {
            onPart({ rows, index, totalParts: manifest.parts.length, file: part.file });
          } catch (callbackError) {
            console.error('Error en callback onPart:', callbackError);
          }
        } catch (error) {
          failedParts.push({ index, file: part.file, message: error.message || String(error) });
          console.error('Falló una parte del catálogo:', part.file, error);
        }
        onProgress({
          loaded,
          total: manifest.total,
          completedParts: index + 1,
          totalParts: manifest.parts.length,
          failedParts: failedParts.length
        });
      }
    }

    // A small fixed pool avoids flooding mobile connections.
    await Promise.all(
      Array.from({ length: Math.min(2, manifest.parts.length) }, () => worker())
    );

    const rows = results.flatMap(partRows => partRows || []);
    if (rows.length > manifest.total) {
      throw new Error('El catálogo contiene más registros que los declarados');
    }
    if (new Set(rows.map(row => row.id)).size !== rows.length) {
      throw new Error('Hay identificadores duplicados entre las partes cargadas');
    }

    rows.failedParts = failedParts.sort((a, b) => a.index - b.index);
    rows.expectedTotal = manifest.total;
    rows.loadedTotal = rows.length;
    return rows;
  }

  window.RCCCatalogLoader = { load };
})();

// assets/catalog-loader.js
window.RCCCatalogLoader = {
  async load({ onProgress } = {}) {
    let allScripts = [];
    let totalLoaded = 0;

    try {
      // 1. Descargar el manifiesto principal
      const manifestResponse = await fetch('/scripts.json');
      if (!manifestResponse.ok) throw new Error(`Error ${manifestResponse.status} al cargar el manifiesto`);
      const manifest = await manifestResponse.json();
      const totalScripts = manifest.total;

      // 2. Descargar las 20 partes una por una (secuencial)
      for (const part of manifest.parts) {
        try {
          const partResponse = await fetch('/' + part.file);
          if (!partResponse.ok) throw new Error(`Error ${partResponse.status} en ${part.file}`);
          
          const partData = await partResponse.json();
          // A veces viene como array directo, a veces dentro de un objeto
          const scripts = Array.isArray(partData) ? partData : (partData.scripts || []);
          
          allScripts = allScripts.concat(scripts);
          totalLoaded += scripts.length;

          // Actualizar el contador en la pantalla
          if (onProgress) {
            onProgress({ loaded: totalLoaded, total: totalScripts });
          }
        } catch (err) {
          console.warn(`⚠️ No se pudo cargar la parte: ${part.file}`, err);
          // Si una parte falla, NO cancelamos todo. Solo lo saltamos y seguimos.
        }
      }

      return allScripts;
    } catch (error) {
      console.error('❌ Error crítico cargando el catálogo:', error);
      throw error;
    }
  }
};

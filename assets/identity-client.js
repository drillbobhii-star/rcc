// Cliente oficial sin una herramienta de compilación para este catálogo estático.
window.rccIdentityReady = import('https://esm.sh/@netlify/identity@2.0.0?bundle');
// Evita un rechazo sin manejar si el CDN no está disponible antes de abrir el acceso.
window.rccIdentityReady.catch(() => {});

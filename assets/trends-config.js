/* Public endpoint only. Cloudflare serves the UI; Netlify hosts the shared API. */
(() => {
  const localApi=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.hostname.endsWith('.netlify.app');
  window.RCCTrendsConfig=Object.freeze({
    apiUrl:localApi?'/api/trends':'https://cosmic-cucurucho-6280c8.netlify.app/api/trends',
    refreshMs:60000
  });
})();

(() => {
  let copied = '';
  const notice = document.createElement('aside');
  notice.setAttribute('aria-label', 'Analizar código copiado');
  notice.hidden = true;
  notice.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:10010;max-width:calc(100vw - 48px);width:360px;padding:22px;border:1px solid #658071;border-radius:18px;background:#1a2927;color:#edf3eb;box-shadow:0 14px 50px #10191880;font:14px/1.6 inherit';
  notice.innerHTML = '<div role="status" style="font-weight:700;margin-bottom:12px">¿Para qué sirve este código?</div><p style="margin:0 0 16px">Descubre sus funciones y posibles usos. Al pulsar «Para qué sirve», el código se envía al servicio de IA.</p><button type="button" data-analyze style="padding:10px 14px;border:0;border-radius:8px;background:#bbd4a6;color:#172519;cursor:pointer">Para qué sirve ↗</button> <button type="button" data-dismiss style="padding:10px;border:1px solid #658071;border-radius:8px;background:transparent;color:inherit;cursor:pointer">Cerrar</button>';
  document.body.append(notice);
  window.offerCodeAnalysis = code => { copied = code; notice.hidden = false; };
  notice.querySelector('[data-dismiss]').onclick = () => { notice.hidden = true; };
  notice.querySelector('[data-analyze]').onclick = () => {
    try { sessionStorage.setItem('rcc_lab_code', copied); }
    catch { notice.querySelector('p').textContent = 'No se pudo transferir el código. Pégalo en la sección de prueba desde el portapapeles.'; }
    location.href = 'laboratorio.html#analysis';
  };
  document.addEventListener('copy', () => {
    const selection = window.getSelection();
    if (selection?.toString().trim() && selection.anchorNode?.parentElement?.closest('pre, code')) window.offerCodeAnalysis(selection.toString());
  });
})();

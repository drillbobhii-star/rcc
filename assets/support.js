const form = document.getElementById('supportForm');
const status = document.getElementById('formStatus');
const button = document.getElementById('sendSupport');
const mode = document.getElementById('reportMode');
const image = document.getElementById('screenshot');
let previewURL;
let submitting = false;
const reference = new URLSearchParams(location.search).get('script');
if (reference) document.getElementById('scriptReference').value = reference.slice(0, 1000);
function setMode(value) {
  if (submitting) return;
  mode.value = value;
  document.getElementById('supportMode').setAttribute('aria-pressed', value === 'support');
  document.getElementById('errorMode').setAttribute('aria-pressed', value === 'error');
  document.getElementById('contactEmail').required = false;
  document.getElementById('reportHeading').textContent = value === 'error' ? 'Notificar un error' : 'Solicitar soporte';
  document.getElementById('destinationNotice').textContent = value === 'error'
    ? 'El informe, su análisis y la captura se publicarán en el canal de errores de Discord. Tu correo no se publica en Discord.'
    : 'Tu consulta y captura se publicarán en el mismo canal de Discord, identificadas como soporte. Tu correo no se publica.';
  button.textContent = value === 'error' ? 'Enviar informe' : 'Enviar consulta';
  status.textContent = '';
}
document.getElementById('supportMode').onclick = () => setMode('support');
document.getElementById('errorMode').onclick = () => setMode('error');
function preview() {
  if (previewURL) URL.revokeObjectURL(previewURL);
  const file = image.files[0];
  const invalid = file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024);
  image.setCustomValidity(invalid ? 'Elige una imagen PNG, JPG o WebP de hasta 3 MB.' : '');
  document.getElementById('imagePreview').hidden = !file || !!invalid;
  if (file && !invalid) document.getElementById('previewImage').src = previewURL = URL.createObjectURL(file);
  if (invalid) image.reportValidity();
}
image.onchange = preview;
document.getElementById('removeImage').onclick = () => { image.value = ''; preview(); };
setMode(new URLSearchParams(location.search).get('mode') === 'support' ? 'support' : 'error');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !form.reportValidity()) return;
  submitting = true;
  const isError = mode.value === 'error';
  const data = new FormData(form);
  button.disabled = true;
  button.textContent = 'Enviando…';
  status.textContent = isError ? 'Analizando el informe y enviándolo a Discord…' : 'Enviando tu consulta…';
  status.dataset.state = 'pending';
  try {
    const response = await fetch('/api/send-error', { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo enviar. Vuelve a intentarlo.');
    form.reset();
    mode.value = isError ? 'error' : 'support';
    preview();
    status.dataset.state = 'success';
    status.textContent = isError ? `Informe enviado a Discord. ${result.analysis}` : 'Consulta de soporte enviada a Discord.';
  } catch (error) {
    status.dataset.state = 'error';
    status.textContent = `${error.message} Conservamos lo que escribiste.`;
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = isError ? 'Enviar informe' : 'Enviar consulta';
  }
});

/* RCC AI assistant */
(() => {
  const chatForm = document.getElementById('rccAiForm');
  if (!chatForm) return;
  const input = document.getElementById('rccAiInput');
  const messages = document.getElementById('rccAiMessages');
  const send = document.getElementById('rccAiSend');
  const chatStatus = document.getElementById('rccAiStatus');
  const welcome = document.getElementById('rccAiWelcome');
  const NAME_KEY = 'rcc_ai_display_name';
  const HISTORY_KEY = 'rcc_ai_history';
  let history = [];
  let busy = false;

  const safeRead = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const copiedScript = () => {
    const value = safeRead('rcc_ai_last_copied');
    if (!value || typeof value !== 'object') return null;
    return { id: String(value.id || '').slice(0,80), name: String(value.name || 'Script RCC').slice(0,160), code: String(value.code || '').slice(0,9000), copiedAt: String(value.copiedAt || '').slice(0,40) };
  };
  let displayName = '';
  try { displayName = String(localStorage.getItem(NAME_KEY) || '').trim().slice(0,80); } catch {}
  if (!displayName) {
    const entered = window.prompt('¡Bienvenido a RCC! ¿Cómo te llamas?');
    displayName = String(entered || 'Invitado').trim().slice(0,80) || 'Invitado';
    try { localStorage.setItem(NAME_KEY, displayName); } catch {}
  }
  welcome.textContent = `¡Hola, ${displayName}! Soy el asistente de RCC. Puedes preguntarme por los scripts del catálogo.`;
  try { history = (safeRead(HISTORY_KEY) || []).filter(item => item && ['user','assistant'].includes(item.role)).slice(-8); } catch { history = []; }

  function addMessage(role, content) {
    const bubble = document.createElement('div');
    bubble.className = 'rcc-ai-message ' + role;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? displayName : 'RCC AI';
    const body = document.createElement('p');
    body.textContent = content;
    bubble.append(label, body);
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }
  history.forEach(item => addMessage(item.role, item.content));
  if (!history.length) {
    const copied = copiedScript();
    if (copied) {
      const hello = `Vi que copiaste el script ${copied.name}. ¿Quieres que te explique cómo ejecutarlo en Delta o necesitas ayuda con algo más?`;
      addMessage('assistant', hello);
      history.push({ role:'assistant', content:hello });
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-8))); } catch {}
    } else {
      addMessage('assistant', `¡Hola, ${displayName}! ¿Qué necesitas resolver hoy en RCC?`);
    }
  }
  const threshold = 100;
  input.addEventListener('input', () => input.classList.toggle('is-zoomed', input.value.length > threshold));
  input.addEventListener('blur', () => input.classList.remove('is-zoomed'));

  chatForm.addEventListener('submit', async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || busy) return;
    busy = true;
    send.disabled = true;
    chatStatus.textContent = 'RCC está pensando…';
    addMessage('user', message);
    history.push({ role:'user', content:message });
    input.value = '';
    input.classList.remove('is-zoomed');
    try {
      const copied = copiedScript();
      let authorization = '';
      try {
        if (window.rccSupabaseReady) {
          const client = await window.rccSupabaseReady;
          const { data } = await client.auth.getSession();
          const token = data?.session?.access_token;
          if (token) authorization = 'Bearer ' + token;
          const user = data?.session?.user;
          const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
          if (metadataName) displayName = String(metadataName).slice(0,80);
        }
      } catch {}
      const headers = { 'Content-Type':'application/json' };
      if (authorization) headers.Authorization = authorization;
      const response = await fetch('/api/support-ai', {
        method:'POST',
        headers,
        body:JSON.stringify({
          message,
          displayName,
          copiedScript:copied,
          history:history.slice(-8)
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo conectar con RCC AI.');
      const answer = String(result.reply || 'Estoy aquí para ayudarte con RCC.');
      addMessage('assistant', answer);
      history.push({ role:'assistant', content:answer });
      history = history.slice(-8);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
      if (result.penalty_seconds > 0 && !result.owner && window.RCCPenalty) {
        window.RCCPenalty.apply(result.penalty_seconds, result.penalty_reason);
      }
      chatStatus.textContent = '';
    } catch (error) {
      chatStatus.textContent = error.message || 'Error al contactar con el asistente.';
    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  });
})();

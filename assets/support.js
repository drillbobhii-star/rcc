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

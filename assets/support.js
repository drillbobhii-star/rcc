const form = document.getElementById('supportForm');
const status = document.getElementById('formStatus');
const button = document.getElementById('sendSupport');
const reference = new URLSearchParams(location.search).get('script');
if (reference) document.getElementById('scriptReference').value = reference.slice(0,1000);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  button.disabled = true;
  button.textContent = 'Enviando…';
  status.textContent = 'Enviando tu consulta.';
  status.dataset.state = 'pending';
  try {
    const response = await fetch('/', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(new FormData(form)).toString()});
    if (!response.ok) throw new Error('Submission failed');
    form.reset();
    status.dataset.state = 'success';
    status.textContent = 'Consulta enviada. También puedes unirte a Discord para compartir el error con la comunidad.';
  } catch {
    status.dataset.state = 'error';
    status.textContent = 'No se pudo enviar. Conservamos lo que escribiste: vuelve a intentarlo o notifica el error en Discord.';
  } finally {
    button.disabled = false;
    button.textContent = 'Enviar consulta';
  }
});

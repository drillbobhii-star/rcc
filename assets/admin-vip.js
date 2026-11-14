(() => {
  const $ = id => document.getElementById(id);
  const loginForm = $('vipAdminLogin');
  if (!loginForm) return;
  const notice = $('vipAdminNotice');
  const consolePanel = $('vipAdminConsole');
  const resultPanel = $('vipMemberResult');
  let clientPromise = window.rccAdminSupabaseReady;
  let session = null;
  let member = null;
  let busy = false;

  async function client() {
    if (!clientPromise) throw new Error('Supabase no está configurado.');
    return clientPromise;
  }
  async function request(path, options = {}) {
    const current = session || (await (await client()).auth.getSession()).data.session;
    const headers = { ...(options.headers || {}) };
    if (current?.access_token) headers.Authorization = 'Bearer ' + current.access_token;
    if (options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(path, { ...options, headers, cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
  }
  function status(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle('error', error);
  }
  function showLogin(message = '') {
    session = null;
    consolePanel.hidden = true;
    loginForm.hidden = false;
    resultPanel.hidden = true;
    if (message) status(message, true);
  }
  async function verifySession(nextSession) {
    session = nextSession;
    if (!session?.access_token) { showLogin(); return; }
    try {
      const data = await request('/api/vip-membership');
      if (!data.isAdmin) {
        await (await client()).auth.signOut();
        showLogin('Esta cuenta no tiene permisos de administración RCC.');
        return;
      }
      loginForm.hidden = true;
      consolePanel.hidden = false;
      $('vipAdminIdentity').textContent = 'Administrador autenticado: ' + (session.user?.email || '');
      status('Panel VIP conectado. Las modificaciones se guardan en Supabase y se notifican a Discord cuando el webhook está configurado.');
    } catch (error) {
      showLogin(error.message);
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    status('Verificando administrador…');
    try {
      const sb = await client();
      const { data, error } = await sb.auth.signInWithPassword({
        email: $('vipAdminEmail').value.trim(),
        password: $('vipAdminPassword').value,
      });
      if (error) throw error;
      await verifySession(data.session);
      $('vipAdminPassword').value = '';
    } catch (error) {
      showLogin(error.message || 'No se pudo iniciar sesión.');
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });

  $('vipMemberSearch').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    status('Buscando cuenta RCC…');
    try {
      const data = await request('/api/vip-membership', {
        method: 'POST',
        body: JSON.stringify({ action: 'lookup', email: $('vipMemberEmail').value.trim() }),
      });
      member = data.user;
      $('vipMemberIdentity').textContent = member.email;
      $('vipIsVip').checked = member.isVip === true;
      resultPanel.hidden = false;
      $('vipAdminStatus').textContent = member.isVip ? 'La membresía tiene acceso VIP activo.' : 'La membresía no tiene acceso VIP.';
      status('Cuenta encontrada.');
    } catch (error) {
      member = null;
      resultPanel.hidden = true;
      status(error.message, true);
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });

  $('vipIsVip').addEventListener('change', async event => {
    if (!member || busy) return;
    busy = true;
    const checkbox = event.currentTarget;
    const nextValue = checkbox.checked;
    checkbox.disabled = true;
    $('vipAdminStatus').textContent = nextValue ? 'Activando acceso VIP…' : 'Retirando acceso VIP…';
    try {
      const data = await request('/api/vip-membership', {
        method: 'POST',
        body: JSON.stringify({ action: 'set', userId: member.id, isVip: nextValue }),
      });
      member.isVip = data.isVip === true;
      $('vipAdminStatus').textContent = member.isVip
        ? 'VIP activado. ' + (data.discordNotified ? 'Discord recibió la notificación.' : 'No se pudo enviar el aviso de Discord.')
        : 'VIP desactivado. ' + (data.discordNotified ? 'Discord recibió la notificación.' : 'No se pudo enviar el aviso de Discord.');
      status('Cambio guardado.');
    } catch (error) {
      checkbox.checked = !nextValue;
      status(error.message, true);
      $('vipAdminStatus').textContent = 'No se guardó el cambio; el estado anterior se mantiene.';
    } finally {
      busy = false;
      checkbox.disabled = false;
    }
  });

  $('vipAdminLogout').addEventListener('click', async () => {
    try { await (await client()).auth.signOut(); } catch {}
    showLogin('Sesión cerrada.');
  });

  (async () => {
    try {
      const sb = await client();
      sb.auth.onAuthStateChange((_event, nextSession) => { void verifySession(nextSession); });
      const { data } = await sb.auth.getSession();
      if (data.session) await verifySession(data.session);
    } catch (error) {
      showLogin(error.message || 'No se pudo inicializar Supabase.');
    }
  })();
})();
/* A profile shortcut delegates to the existing account editor. */
(() => {
  const email = document.getElementById('authEmail');
  if (!email) return;
  const shortcut = document.createElement('button');
  shortcut.type = 'button';
  shortcut.className = 'profile-nudge';
  shortcut.textContent = 'Cambia tu nombre de perfil';
  shortcut.setAttribute('aria-haspopup', 'dialog');
  shortcut.hidden = true;
  email.after(shortcut);
  shortcut.addEventListener('click', () => email.click());
  const sync = () => { shortcut.hidden = email.hidden || !email.textContent.trim(); };
  new MutationObserver(sync).observe(email, {attributes:true, attributeFilter:['hidden'], childList:true, subtree:true, characterData:true});
  sync();
})();

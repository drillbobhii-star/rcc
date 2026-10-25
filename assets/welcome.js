/* The guide appears on entry and can always be reopened from the header. */
(() => {
  const dialog = document.getElementById('welcomeDialog');
  const search = document.getElementById('search');
  let returnFocus = null;
  function openGuide() {
    if (dialog.open) return;
    returnFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('welcome-open');
    dialog.scrollTop = 0;
  }
  document.getElementById('welcomeHelp').addEventListener('click', openGuide);
  dialog.addEventListener('close', () => {
    document.body.classList.remove('welcome-open');
    if (dialog.returnValue === 'understood') search.focus({preventScroll:true});
    else returnFocus?.focus({preventScroll:true});
    dialog.returnValue = '';
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !dialog.open && !document.querySelector('#modal.open')) {
      event.preventDefault();
      search.focus();
      search.select();
    }
  });
  openGuide();
})();

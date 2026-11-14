/* Studenthouse install helper. No personal or authentication data is cached. */
(() => {
  'use strict';
  const button = document.getElementById('installStudenthouse');
  const help = document.getElementById('studenthouseInstallHelp');
  if (!button || !help) return;
  let installPrompt = null;
  const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isInstalled()) button.hidden = true;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (!isInstalled()) button.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
    help.hidden = true;
  });
  button.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      prompt.prompt();
      try {
        const choice = await prompt.userChoice;
        if (choice?.outcome === 'accepted') {
          button.hidden = true;
          help.hidden = true;
          return;
        }
      } catch (_) {}
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    help.textContent = ios
      ? 'Na iPhone otvor Studenthouse v Safari, klikni na Zdieľať a vyber Pridať na plochu.'
      : 'Na Androide otvor Studenthouse v Chrome, klikni na menu ⋮ a zvoľ Inštalovať aplikáciu alebo Pridať na plochu.';
    help.hidden = false;
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/student-house-portal/sw.js', {scope:'/student-house-portal/'})
        .catch(() => { /* Installation is optional; the online portal keeps working. */ });
    });
  }
})();

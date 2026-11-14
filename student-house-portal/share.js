/* Studenthouse app sharing: never share resident data, private routes or URLs. */
(() => {
  'use strict';
  const button = document.getElementById('shareStudenthouse');
  const status = document.getElementById('studenthouseShareStatus');
  if (!button || !status) return;
  const publicUrl = 'https://www.webu.sk/student-house-portal/';
  const shareData = {
    title: 'Student House Bratislava',
    text: 'Student House Bratislava – študentská aplikácia a služby.',
    url: publicUrl
  };
  const show = message => {
    status.textContent = message;
    status.hidden = false;
  };
  const showLink = () => {
    const link = document.createElement('a');
    link.href = publicUrl;
    link.textContent = publicUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    status.replaceChildren(document.createTextNode('Zdieľaj tento verejný odkaz: '), link);
    status.hidden = false;
  };
  button.addEventListener('click', async () => {
    status.hidden = true;
    // The Android test shell opens the native Android share sheet, using a fixed public URL.
    if (navigator.userAgent.includes('StudenthouseAndroid/')) {
      window.location.href = 'studenthouse-share://app';
      return;
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(publicUrl);
        show('Odkaz na aplikáciu Student House Bratislava bol skopírovaný. Môžeš ho poslať ďalej.');
        return;
      } catch (_) {}
    }
    showLink();
  });
})();

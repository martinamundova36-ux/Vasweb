/* Share only the public Student House website, never a login or resident URL. */
(() => {
  'use strict';
  const button = document.getElementById('shareStudenthouse');
  const status = document.getElementById('studenthouseShareStatus');
  if (!button || !status) return;
  const publicUrl = 'https://studenthousebratislavanew.wordpress.com/';
  const shareData = { title: 'Student House Bratislava', url: publicUrl };
  const show = message => {
    status.textContent = message;
    status.hidden = false;
  };
  const showOptions = () => {
    const encoded = encodeURIComponent(publicUrl);
    const links = [
      ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encoded],
      ['WhatsApp', 'https://wa.me/?text=' + encoded],
      ['Telegram', 'https://t.me/share/url?url=' + encoded],
      ['E-mail', 'mailto:?subject=Student%20House%20Bratislava&body=' + encoded],
      ['Otvoriť verejný web', publicUrl]
    ];
    status.replaceChildren(document.createTextNode('Zdieľať verejný web Student House Bratislava: '));
    for (const [label, href] of links) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      link.rel = 'noopener noreferrer';
      link.style.marginRight = '14px';
      link.style.display = 'inline-block';
      status.append(link);
    }
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Kopírovať odkaz';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(publicUrl); show('Verejný odkaz bol skopírovaný.'); }
      catch (_) { const field = document.createElement('input'); field.value = publicUrl; field.readOnly = true; status.append(field); field.select(); }
    });
    status.append(copy);
    status.hidden = false;
  };
  button.addEventListener('click', async () => {
    status.hidden = true;
    // Older Android wrappers hard-code the login URL in the native share bridge.
    // Use explicit public-site share links instead, which also work in old APKs.
    if (navigator.userAgent.includes('StudenthouseAndroid/')) {
      showOptions();
      return;
    }
    if (typeof navigator.share === 'function') {
      try { await navigator.share(shareData); return; }
      catch (error) { if (error && error.name === 'AbortError') return; }
    }
    showOptions();
  });
})();

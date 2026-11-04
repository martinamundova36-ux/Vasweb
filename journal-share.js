/* Article-specific, bilingual sharing. No Meta App ID is required. */
(()=>{
 const en=document.documentElement.lang==='en';
 const url=document.querySelector('link[rel="canonical"]')?.href||location.href.split('#')[0];
 const title=document.querySelector('h1')?.textContent||document.title;
 const box=document.createElement('section');box.className='webu-article-share';
 box.setAttribute('aria-label',en?'Share this article':'Zdieľať článok');
 const heading=document.createElement('h2');heading.textContent=en?'Share this article':'Zdieľať článok';box.append(heading);
 const links=document.createElement('div');links.className='webu-share-links';box.append(links);
 for(const [name,href] of [
  ['Facebook','https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url)],
  ['LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url)],
  ['WhatsApp','https://wa.me/?text='+encodeURIComponent(title+' '+url)]
 ]){const a=document.createElement('a');a.textContent=name;a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a)}
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 async function copy(){
  try{await navigator.clipboard.writeText(url);return true}catch(_){
   const input=document.createElement('textarea');input.value=url;input.style.position='fixed';input.style.opacity='0';box.append(input);input.select();const ok=document.execCommand('copy');input.remove();return ok;
  }
 }
 const messenger=document.createElement('button');messenger.type='button';messenger.textContent=en?'Messenger (share / copy link)':'Messenger (zdieľať / kopírovať odkaz)';
 messenger.addEventListener('click',async()=>{
  if(navigator.share){try{await navigator.share({title,url});return}catch(e){if(e.name==='AbortError')return}}
  status.textContent=await copy()?(en?'Link copied. Paste it into a Messenger conversation.':'Odkaz je skopírovaný. Vložte ho do konverzácie v Messengeri.'):(en?'Copy this link: ':'Skopírujte tento odkaz: ')+url;
 });links.append(messenger);
 const button=document.createElement('button');button.type='button';button.textContent=en?'Copy link':'Kopírovať odkaz';button.addEventListener('click',async()=>{status.textContent=await copy()?(en?'Link copied.':'Odkaz je skopírovaný.'):(en?'Copy this link: ':'Skopírujte tento odkaz: ')+url});links.append(button);
 const note=document.createElement('p');note.textContent=en?'Messenger: choose the app in the device share menu, or paste the copied link into a conversation.':'Messenger: vyberte aplikáciu v ponuke zdieľania zariadenia alebo vložte skopírovaný odkaz do konverzácie.';box.append(note,status);
 const style=document.createElement('style');style.textContent='.webu-article-share{max-width:820px;margin:32px auto;padding:24px;box-sizing:border-box;border-top:1px solid #cbd5e3;color:#17233a;font:16px/1.6 system-ui}.webu-article-share h2{font-size:24px}.webu-share-links{display:flex;flex-wrap:wrap;gap:10px}.webu-share-links a,.webu-share-links button{font:600 15px system-ui;display:inline-block;padding:11px 15px;border:1px solid #b6c3d6;border-radius:12px;background:#fff;color:#17233a;text-decoration:none;cursor:pointer}.webu-share-links :focus-visible{outline:3px solid #194f85;outline-offset:3px}.webu-article-share p{font-size:14px;overflow-wrap:anywhere}';document.head.append(style);
 const article=document.querySelector('article')||document.querySelector('main');if(article)article.append(box);
})();

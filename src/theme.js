let theme;
try { theme=localStorage.getItem('docsense:theme'); } catch { /* Storage is optional. */ }
if(!['light','dark'].includes(theme))theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
document.documentElement.dataset.theme=theme;
export function themeSwitcher() {
  return `<button type="button" class="button small theme-toggle" data-theme-toggle aria-label="Chế độ tối" aria-pressed="${theme==='dark'}"><svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 13.2A8.6 8.6 0 0 1 10.8 3.5 8.7 8.7 0 1 0 20.5 13.2Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><span>Chế độ tối</span></button>`;
}
document.addEventListener('click',event=>{
  if(!event.target.closest('[data-theme-toggle]'))return;
  theme=theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=theme;
  try {localStorage.setItem('docsense:theme',theme);} catch { /* Keep theme for this page. */ }
  document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.setAttribute('aria-pressed',String(theme==='dark')));
});

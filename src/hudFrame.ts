// Decorative HUD chrome (static, aria-hidden) shared by the shared screen's text panels; style.css draws and positions it.
export function addHudChrome(panel: HTMLElement) {
  const status = document.createElement('div'), deco = document.createElement('div');
  status.className = 'hud-status';
  status.innerHTML = '<span class="hud-live"><svg viewBox="0 0 16 12"><path d="M1 4.5a10 10 0 0 1 14 0M3.5 7a6.4 6.4 0 0 1 9 0M6 9.4a3 3 0 0 1 4 0"/><circle cx="8" cy="11" r="1"/></svg>ライブ</span>'
    + '<span>状態：接続中</span><span>接続番号 64228</span><span>北緯35°37′ 東経139°46′</span>';
  deco.className = 'hud-deco';
  deco.innerHTML = '<i class="hud-tabs"><b></b><b></b><b></b></i><i class="hud-node"></i><i class="hud-bars"><b></b><b></b><b></b><b></b></i>'
    + '<svg class="hud-ring" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22"/><circle cx="26" cy="26" r="15"/><circle cx="26" cy="26" r="4"/></svg>'
    + '<span class="hud-micro">研究 № 023 — 北緯35°37′ 東経139°46′ — お台場</span>';
  for (const node of [status, deco]) node.setAttribute('aria-hidden', 'true');
  panel.append(status, deco);
}

import { isExhibitionView, parseSurveyEvent, type ExhibitionView } from './surveyView';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PerspectiveCamera } from 'three';
import './personalCity.css';

export async function loadPersonalCity(id: string): Promise<ExhibitionView> {
  document.body.classList.add('personal-city');
  const loading = document.createElement('p');
  loading.className = 'personal-loading';
  loading.textContent = 'あなたの3D都市を読み込んでいます…';
  document.body.appendChild(loading);
  try {
    const response = await fetch(`/api/archives/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 404 ? 'この都市の記録が見つかりません。' : '都市の記録を取得できません。');
    const record = await response.json();
    const parsed = parseSurveyEvent({ type: 'city-state-snapshot', view: record.view });
    if (!parsed || !('view' in parsed) || !isExhibitionView(parsed.view) || parsed.view.latestProposal?.id !== id)
      throw new Error('都市の記録を確認できません。スタッフにお知らせください。');
    return parsed.view;
  } catch (error) {
    loading.remove();
    throw error;
  }
}

export function personalCityControls(view: ExhibitionView, camera: PerspectiveCamera, controls: OrbitControls) {
  document.title = `2127 — あなたの街 / 提案 ${view.guestCount}`;
  const host = document.createElement('section');
  host.className = 'personal-hud';
  host.innerHTML = `<header class="personal-heading"><span>2127 / CIVIC ARCHIVE</span><h1>あなたが変えた、未来の街。</h1><p></p></header>
    <div class="personal-toolbar"><p>1本指で回転 · 2本指で拡大・縮小</p><div><button type="button" data-action="in" aria-label="拡大">＋</button><button type="button" data-action="out" aria-label="縮小">−</button><button type="button" data-action="reset">最初の視点</button></div><small>回答完了時の街を保存しています。次の回答では変わりません。</small></div>`;
  host.querySelector('.personal-heading p')!.textContent = `提案 No. ${view.guestCount} · あなたの回答を反映した3D都市`;
  document.body.appendChild(host);
  controls.saveState();
  const initialPosition = camera.position.clone();
  host.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.action === 'reset') { controls.reset(); camera.position.copy(initialPosition); }
    else {
      const offset = camera.position.clone().sub(controls.target);
      const distance = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * (button.dataset.action === 'in' ? .8 : 1.25)));
      camera.position.copy(controls.target).add(offset.setLength(distance));
    }
    controls.update();
  }));
  // Removed only after the first actual render, not merely after downloading JSON.
  return () => document.querySelector('.personal-loading')?.remove();
}

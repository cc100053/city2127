import { Box3, Vector3 } from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { ModuleManager } from "./placement/moduleManager";
import type { SceneContext } from "./scene/createScene";
import type { LotSocketId } from "./state/cityLayoutState";
import { connectSurvey, slotLabels, supersedes, type SurveyView } from "./state/surveyView.ts";
import { CausalPanel } from "./ui/causalPanel";

/**
 * `?survey` mode: the survey server is the only source of the layout. Every (re)connect delivers a full
 * snapshot, so a reload or reconnect rebuilds the same city; updates animate only the changed slots.
 */
export function startSurveyMode(
  context: SceneContext,
  manager: ModuleManager,
  viewport: HTMLElement,
  panelElement: HTMLElement,
  url: string,
): { render(): void; current(): SurveyView | undefined } {
  const panel = new CausalPanel(panelElement);
  // Higher, south-west view: a tall SE tower no longer hides the NW automation hub behind it.
  context.camera.position.set(-38, 105, 88);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "slot-labels";
  viewport.append(labelRenderer.domElement);
  const resize = (): void => labelRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
  resize();
  window.addEventListener("resize", resize);

  const labels = new Map<LotSocketId, CSS2DObject>();
  for (const id of manager.getSockets().keys()) {
    const element = document.createElement("div");
    element.className = "slot-label";
    const label = new CSS2DObject(element);
    label.visible = false;
    context.scene.add(label);
    labels.set(id, label);
  }
  const placeLabels = (view: SurveyView): void => {
    const texts = slotLabels(view);
    for (const [id, socket] of manager.getSockets()) {
      const label = labels.get(id);
      const text = texts[id];
      if (!label) continue;
      label.visible = text !== undefined;
      if (text === undefined) continue;
      label.element.textContent = `${id.toUpperCase()} ${text}`;
      const box = new Box3().setFromObject(socket);
      const center = box.getCenter(new Vector3());
      label.position.set(center.x, box.max.y + 2, center.z);
    }
  };

  let current: SurveyView | undefined;
  let target: SurveyView | undefined;
  let applying = false;
  const apply = async (): Promise<void> => {
    if (applying) return;
    applying = true;
    try {
      // Newer views that arrive during an animation are picked up by the next iteration.
      while (target && target !== current) {
        const next = target;
        if (!(await manager.transitionTo(next.layout))) break;
        current = next;
        placeLabels(next);
      }
    } finally {
      applying = false;
    }
  };

  connectSurvey(
    url,
    (_kind, view) => {
      if (!supersedes(target, view)) return;
      target = view;
      panel.render(view);
      void apply();
    },
    (status) => panel.setStatus(status),
  );

  return {
    render: () => labelRenderer.render(context.scene, context.camera),
    current: () => current,
  };
}

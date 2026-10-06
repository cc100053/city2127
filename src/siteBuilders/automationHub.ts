import * as T from 'three';
import { AutomationDistrict } from '../districtMeters.ts';
import { arc, bake, box, cream, faces, futureLight, glass, publicLight, sign, solar, teal, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import { remapCityMaterials, type SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import type { Band } from '../surveyView.ts';
import { conversationPose, pedestrians, servicePose } from '../mobility.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';

const SERVICE_SLOTS = 6;
const HIDDEN = 1e-3;
const smoothstep = (value: number) => value * value * (3 - 2 * value);

export interface AutomationHubTarget {
  readonly band: Band;
  readonly automatedPorts: number;
}

export interface AutomationHubDiagnostics {
  readonly band: Band;
  readonly targetAutomatedPorts: number;
  readonly visibleAutomatedPorts: number;
  readonly targetHumanCounters: number;
  readonly visibleHumanCounters: number;
}

export interface AutomationHubRuntime {
  setTarget(target: AutomationHubTarget, now: number, immediate: boolean): boolean;
  update(now: number): void;
  restoreLegacy(): void;
  getDiagnostics(): AutomationHubDiagnostics;
}

export type AutomationHubBuiltSite = BuiltSite & { readonly automationHub: AutomationHubRuntime };

type ServiceSlot = {
  readonly automated: T.Group;
  readonly human: T.Group;
  level: number;
  from: number;
  to: number;
};

function createAutomationHubRuntime(slots: ServiceSlot[], root:T.Group, base:T.Group, props:T.Group): AutomationHubRuntime {
  let target: AutomationHubTarget = { band: 'mixed', automatedPorts: 3 };
  let applied = false;
  let active = false;
  let start = 0;
  // Two opposite frontage pilots, in site coordinates; people stay human-sized on the existing 1.2-unit podium.
  const people=pedestrians(root,4,'hub-service-people'),pose=new T.Object3D(),pilots=[0,5];
  const writePeople=(now:number)=>{
    const shown=base.visible&&props.visible&&base.scale.y>.999&&props.scale.y>.999;
    people.show(shown);
    pilots.forEach((slotIndex,i)=>{
      const slot=slots[slotIndex],sign=i?-1:1,x=(slotIndex-2.5)*1.02,from=i?3.8:-3.8,length=Math.abs(x-from)*root.scale.x;
      const w=servicePose(now,i,length),automatic=slot.level>.999,ready=automatic||slot.level<.001;
      const staffed=!automatic||slots.some(s=>s.level<.001),c=conversationPose(now,2000+i,0);
      const walkingYaw=(i?-1:1)*Math.PI/2+Math.PI*w.turn,serviceYaw=automatic?i?0:Math.PI:(i?-1:1)*Math.PI/2;
      const facing=automatic&&staffed?serviceYaw+Math.atan2(Math.sin((i?-1:1)*Math.PI/2-serviceYaw),Math.cos((i?-1:1)*Math.PI/2-serviceYaw))*w.help:serviceYaw;
      pose.position.set(T.MathUtils.lerp(from,x,w.u),1.2,sign*3.6);
      pose.rotation.set(0,walkingYaw+Math.atan2(Math.sin(facing-walkingYaw),Math.cos(facing-walkingYaw))*w.dwell,0);
      pose.scale.setScalar((ready?1:HIDDEN)/root.scale.x);people.set(i*2,pose);people.gait(i*2,w.phase,w.walking?.4:0);
      people.social(i*2,0,w.dwell*(automatic?.65*(1-w.help*Number(staffed)):c.gesture));
      pose.position.set(x+(i?-.55:.55),1.2,sign*3.6);pose.rotation.set(0,(i?1:-1)*Math.PI/2,0);
      pose.scale.setScalar((ready&&staffed?1:HIDDEN)/root.scale.x);people.set(i*2+1,pose);people.gait(i*2+1,0,0);
      people.social(i*2+1,0,conversationPose(now,2000+i,1).gesture*w.dwell*(automatic?w.help:1));
    });people.flush();
  };

  const apply = () => {
    for (const slot of slots) {
      const humanLevel = 1 - slot.level;
      slot.automated.visible = slot.level > HIDDEN;
      slot.automated.scale.y = Math.max(HIDDEN, slot.level);
      slot.human.visible = humanLevel > HIDDEN;
      slot.human.scale.y = Math.max(HIDDEN, humanLevel);
    }
  };
  const settle = (ports: number) => {
    for (let i = 0; i < slots.length; i++) {
      slots[i].level = slots[i].from = slots[i].to = i < ports ? 1 : 0;
    }
    active = false;
    apply();
    writePeople(start);
  };

  settle(3);
  return {
    setTarget(next, now, immediate) {
      this.update(now);
      const changed = !applied || next.band !== target.band || next.automatedPorts !== target.automatedPorts;
      target = next;
      applied = true;
      if (!changed && !immediate) return false;
      for (let i = 0; i < slots.length; i++) {
        slots[i].from = slots[i].level;
        slots[i].to = i < next.automatedPorts ? 1 : 0;
      }
      start = now;
      if (immediate) settle(next.automatedPorts);
      else active = true;
      return changed;
    },
    update(now) {
      if (active) {
        const raw = Math.min(1, Math.max(0, (now - start) / SITE_TRANSITION_SECONDS));
        const progress = smoothstep(raw);
        for (const slot of slots) slot.level = slot.from + (slot.to - slot.from) * progress;
        active = raw < 1;
        apply();
      }
      writePeople(now);
    },
    restoreLegacy() {
      target = { band: 'mixed', automatedPorts: 3 };
      applied = false;
      settle(3);
    },
    getDiagnostics() {
      return {
        band: target.band,
        targetAutomatedPorts: target.automatedPorts,
        visibleAutomatedPorts: slots.filter(slot => slot.level > HIDDEN).length,
        targetHumanCounters: SERVICE_SLOTS - target.automatedPorts,
        visibleHumanCounters: slots.filter(slot => 1 - slot.level > HIDDEN).length,
      };
    },
  };
}

export function buildAutomationHub(scene: T.Scene, kit: Kit, assets: SiteAssetLoaderCache): AutomationHubBuiltSite {
  const root = createSiteRoot(scene, 'nw');
  const hubBaseLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubBase'));
  const hubUpperLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubUpper'), 12);
  const neutralPropsLayer = createSiteLayer(root, siteLayerDefinition('magnetEast', 'hubNeutralProps'));
  const hubBase = hubBaseLayer.group;
  const hubUpper = hubUpperLayer.group;
  box(hubBase, [8.4, .8, 7.4], [0, .8, 0], cream, .05); // flat footing reaches the two service-frontage pilots
  box(hubBase, [7, 10, 6], [0, 6.2, 0], teal, .3);
  for (const y of [4, 7, 10]) faces(hubBase, 7, 6, (face, across, out) => {
    box(face, [across - .2, .9, .1], [0, y, out + .03], glass, .03);
    box(face, [across, .08, .4], [0, y + .55, out + .2], trim, .02);
  });
  box(hubBase, [7.6, .35, 6.6], [0, 11.4, 0], trim, .1);
  faces(hubBase, 7.6, 6.6, (face, across, out) => box(face, [across - .3, .07, .08], [0, 11.25, out + .04], publicLight, .02));
  arc(hubBase, 0, 3.9, .25, [0, 11.55, 0], trim);
  arc(hubBase, 2.3, 2.45, .03, [0, 11.8, 0], futureLight);
  arc(hubBase, 0, .6, .03, [0, 11.8, 0], futureLight);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    box(hubBase, [.12, .7, .12], [Math.cos(angle) * 3.7, 12.15, -Math.sin(angle) * 3.7], solar, .02);
  }
  sign(hubBase, kit, '自動サービス / AUTO HUB', 0, 2.2, 3.2, 6.2, .8, '#46676e');

  const slots: ServiceSlot[] = [];
  for (let i = 0; i < SERVICE_SLOTS; i++) {
    const slot = new T.Group();
    slot.name = `hub-service-slot-${i}`;
    slot.position.set((i - 2.5) * 1.02, 1.2, i % 2 === 0 ? 3.2 : -3.2);
    if (i % 2) slot.rotation.y = Math.PI;
    neutralPropsLayer.group.add(slot);

    const automated = new T.Group();
    automated.name = `hub-automated-port-${i}`;
    box(automated, [.74, .94, .5], [0, .47, 0], cream, .06);
    box(automated, [.16, .16, .05], [0, .72, .27], futureLight, .02);
    box(automated, [.18, .12, .05], [0, .42, .27], futureLight, .02); // reachable from the podium at the site's 3× scale
    automated.add(...bake(automated));
    slot.add(automated);

    const human = new T.Group();
    human.name = `hub-human-counter-${i}`;
    box(human, [.54, .42, .42], [0, .22, 0], trim, .05);
    box(human, [.92, .12, .5], [0, .49, 0], cream, .04);
    human.add(...bake(human));
    slot.add(human);
    slots.push({ automated, human, level: 0, from: 0, to: 0 });
  }
  const automationHub = createAutomationHubRuntime(slots,root,hubBase,neutralPropsLayer.group);
  const automationDistrict = new AutomationDistrict(scene);

  const hubUpperFallback = new T.Group();
  hubUpperFallback.name = 'automation-hub-upper-procedural-fallback';
  hubUpper.add(hubUpperFallback);
  const shaft = new T.Mesh(new T.CylinderGeometry(2.3, 2.3, 19, 40), glass);
  shaft.position.y = 9.5;
  hubUpperFallback.add(shaft);
  for (let y = 1.5; y < 19; y += 3) arc(hubUpperFallback, 0, 2.6, .25, [0, y, 0], trim);
  arc(hubUpperFallback, 0, 2.9, .3, [0, 19, 0], trim);
  arc(hubUpperFallback, 1.6, 1.75, .03, [0, 19.3, 0], futureLight);
  for (let i = 0; i < 3; i++) box(hubUpperFallback, [.12, 1, 2.4], [-1 + i, 19.8, 0], solar, .02);

  hubUpperFallback.add(...bake(hubUpperFallback));
  hubUpperLayer.setPreparation(async () => {
    const model = await assets.cloneRoot('automation-hub-upper', 'magnetEast', 'hubUpper');
    remapCityMaterials(model, {
      city_glass: glass,
      city_trim: trim,
      city_future_light: futureLight,
      city_solar: solar,
    });
    const replacement = new T.Group();
    replacement.name = 'automation-hub-upper-glb';
    replacement.add(model);
    replacement.add(...bake(replacement));
    hubUpper.add(replacement);
    hubUpperFallback.traverse(object => {
      if (object instanceof T.Mesh) object.geometry.dispose();
    });
    hubUpperFallback.removeFromParent();
  });

  hubBase.add(...bake(hubBase));
  return { id: 'magnetEast', root, layers: { hubBase: hubBaseLayer, hubUpper: hubUpperLayer, hubNeutralProps: neutralPropsLayer }, marker: createGuestMarker(root, 'nw'), automationHub, automationDistrict };
}

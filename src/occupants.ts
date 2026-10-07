import * as T from 'three';
import type { WorldState } from './presets.ts';
import { conversationPose, crowdShare, hash, pedestrians, streetRhythm, yawTo } from './mobility.ts';

/** People who live and work inside and on top of buildings: Fuji TV's staff, audience and public floors (civicCore) and residents on
 * the roof garden terraces (`publishRoofWalks`). One shared pedestrian fleet draws them all, rebuilt as each building publishes. */
const ease=(t:number)=>T.MathUtils.smoothstep(t,0,1);
/** `staff` keep a building busy day and evening; `public` and `resident` follow the strollers' day rhythm. */
type Crowd='staff'|'public'|'resident';
/** A placed person. `talk` people stand (or sit, `seated`) and join the nearest neighbours within TALK m as one conversation, facing its
 * centre (alone they keep `yaw`); `desk` staff work seated; the `audience` watches the stage and applauds now and then. */
export type Spot={at:T.Vector3;yaw:number;mode:'talk'|'desk'|'audience';crowd:Crowd;seated?:boolean};
/** One person, or an abreast pair `pair` m either side of the line, strolling end to end along `curve` and back, resting `rest` s at
 * each end facing `view` (yaw; a pair faces each other) before turning back. */
export type Walk={curve:T.Curve<T.Vector3>;crowd:Crowd;pair?:number;view?:number;rest?:readonly [number,number]};
/** Riders standing on an escalator from `from` to `to`, `gap` m apart in two staggered files, at `speed` m/s; hidden while their feet are
 * within a `through` height band (where the escalator runs through solid structure). */
export type Ride={from:T.Vector3;to:T.Vector3;gap:number;speed:number;through?:readonly (readonly [number,number])[]};
export const TALK=1.9;

const spots:Spot[]=[],walks:(Walk&{length:number})[]=[],rides:Ride[]=[];
let version=0;
export function publishOccupants(list:{spots?:readonly Spot[];walks?:readonly Walk[];rides?:readonly Ride[]}) {
  spots.push(...list.spots??[]);walks.push(...(list.walks??[]).map(w=>({...w,length:w.curve.getLength()})));rides.push(...list.rides??[]);version++;
}
/** Everything published so far, for checks. */
export const occupants=()=>({spots,walks,rides});

/** A stroll `length` m long: walk it at .75–1.1 m/s, rest `rest` s at the far end, walk back, rest again. `d` metres from the start,
 * `forward` the leg just walked (or being walked), `resting` seconds into a rest (-1 walking) of `pause` s. */
export function strollPose(time:number,index:number,length:number,rest:readonly [number,number]=[3,8]) {
  const speed=.75+.35*hash(index,40),pause=rest[0]+(rest[1]-rest[0])*hash(index,41),walk=length/speed,cycle=2*(walk+pause);
  const s=((time+hash(index,42)*cycle)%cycle+cycle)%cycle,back=s>=walk+pause,t=back?s-walk-pause:s,d=t<walk?t*speed:length;
  return {d:back?length-d:d,forward:!back,resting:t<walk?-1:t-walk,pause,speed};
}
/** How much of a rider `d` metres up an escalator `length` m long is shown: fading over the .6 m at each landing and each `through` band. */
export function rideShown(ride:Ride,length:number,d:number) {
  const rise=(ride.to.y-ride.from.y)/length,y=ride.from.y+d*rise;
  return (ride.through??[]).reduce((v,[lo,hi])=>v*T.MathUtils.clamp(Math.max(lo-y,y-hi)/(.6*rise),0,1),
    d<length?T.MathUtils.clamp(d/.6,0,1)*T.MathUtils.clamp((length-d)/.6,0,1):0);
}
/** Riders on an escalator `length` m long: `d` metres up for rider `k` of `riders`, and how much of them is shown. */
export function ridePose(time:number,ride:Ride,length:number,k:number) {
  const n=Math.ceil(length/ride.gap),loop=n*ride.gap,d=((time*ride.speed+k*ride.gap)%loop+loop)%loop;
  return {d,visible:rideShown(ride,length,d),riders:n};
}
/** Conversations: greedy groups of up to three `talk` spots within TALK m at one level, seated with seated. */
export function talkGroups(list:readonly Spot[]) {
  const group=new Int32Array(list.length).fill(-1),groups:number[][]=[];
  list.forEach((s,i)=>{
    if(s.mode!=='talk'||group[i]>=0)return;
    const members=[i];group[i]=groups.length;
    for(let j=i+1;j<list.length&&members.length<3;j++){
      const o=list[j];
      if(o.mode==='talk'&&group[j]<0&&!!o.seated===!!s.seated&&Math.abs(o.at.y-s.at.y)<.5&&o.at.distanceTo(s.at)<TALK){group[j]=groups.length;members.push(j);}
    }
    groups.push(members);
  });
  return {group,groups};
}

/** Roof terraces [x, z, roof y, radius] as planted by `plantRoofCanopy` on `model`: each takes a stroll line (one resident or an abreast
 * pair) on one side and a small standing group on the other, outside everything a terrace can grow — the planter's oval rim tiers
 * (coastalCanopy `plantClusters`), the Meter's meadow mound (1.19 r) and four sail posts (districtMeters) — on flat roof under open sky
 * with 1.5 m of roof beyond the outermost person. Terraces with no such room stay empty. */
const roofSamples:T.Vector3[]=[];
export function publishRoofWalks(model:T.Object3D,clusters:readonly (readonly [number,number,number,number])[]) {
  model.updateMatrixWorld(true);
  const top=new T.Box3().setFromObject(model).max.y+1,ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),normal=new T.Vector3();
  const roofAt=(p:T.Vector3)=>{
    ray.set(new T.Vector3(p.x,top,p.z),down);const hit=ray.intersectObject(model,true)[0];
    return !!hit?.face&&Math.abs(hit.point.y-p.y)<.3&&normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).y>.98;
  };
  const frames=clusters.map(([x,z,,r],i)=>({x,z,r,yaw:Math.sin(x*.37+z*.11)*3,stretch:1.15+(i%3)*.12}));
  const clear=(p:T.Vector3)=>frames.every(f=>{
    const dx=p.x-f.x,dz=p.z-f.z,c=Math.cos(f.yaw),s=Math.sin(f.yaw),lx=dx*c-dz*s,lz=dx*s+dz*c;
    return (lx/(f.r*f.stretch+.6))**2+(lz/(f.r/f.stretch+.6))**2>1&&Math.hypot(lx,lz)>f.r*1.19+.6
      &&[[-1,-1],[1,-1],[-1,1],[1,1]].every(([a,b])=>Math.hypot(lx-a*f.r*1.1,lz-b*f.r*.7)>.9);
  })&&roofSamples.every(q=>q.distanceTo(p)>2);
  const found:{spots:Spot[];walks:Walk[]}={spots:[],walks:[]};
  frames.forEach((f,i)=>{
    const y=clusters[i][2],along=new T.Vector3(Math.cos(f.yaw),0,-Math.sin(f.yaw)),across=new T.Vector3(Math.sin(f.yaw),0,Math.cos(f.yaw));
    const at=(o:number,t:number)=>new T.Vector3(f.x,y,f.z).addScaledVector(across,o).addScaledVector(along,t);
    let walked=false,grouped=false;
    for(const side of [1,-1]){
      const pair=hash(f.x*7+f.z,70)<.5?.35:0,o=side*(f.r*1.19+.65+pair);
      // People at offsets `m` across from the line point at `t` along it, each with roof 1.5 m beyond them on the outer side.
      const fits=(t:number,ms:readonly number[])=>ms.every(m=>{const p=at(o+side*m,t);return clear(p)&&roofAt(p)&&roofAt(at(o+side*(m+1.5),t));});
      if(!walked){
        const ms=pair?[-pair,pair]:[0],ends=[1,-1].map(dir=>{let t=0;while(Math.abs(t)<8&&fits(t+dir*.5,ms))t+=dir*.5;return t;});
        const a=ends[1]+1.5,b=ends[0]-1.5;
        if(b-a>=5&&fits(0,ms)){
          walked=true;const line=new T.LineCurve3(at(o,a),at(o,b));
          for(let t=a;t<=b;t+=.5)for(const m of ms)roofSamples.push(at(o+side*m,t));
          found.walks.push({curve:line,crowd:'resident',pair,view:Math.atan2(across.x*side,across.z*side),rest:[6,16]});
          continue;
        }
      }
      if(!grouped){
        const size=hash(f.x+f.z*3,71)<.5?2:3,centre=at(side*(f.r*1.19+1.3),0);
        const members=Array.from({length:size},(_,j)=>{const a=f.yaw+j*Math.PI*2/size+.5;return centre.clone().add(new T.Vector3(Math.sin(a)*.65,0,Math.cos(a)*.65));});
        const ring=Array.from({length:8},(_,j)=>centre.clone().add(new T.Vector3(Math.sin(j*Math.PI/4)*2.15,0,Math.cos(j*Math.PI/4)*2.15)));
        if(members.every(p=>clear(p)&&roofAt(p))&&ring.every(roofAt)){
          grouped=true;roofSamples.push(...members);
          for(const p of members)found.spots.push({at:p,yaw:0,mode:'talk',crowd:'resident'});
        }
      }
    }
  });
  publishOccupants(found);
  return found;
}

/** The occupant fleet; `update` once a frame, after `mobility` (which sets the shared collar light). */
export function occupantFleet(scene:T.Object3D) {
  const pose=new T.Object3D(),p=new T.Vector3(),t=new T.Vector3(),side=new T.Vector3();
  let built=-1,people:ReturnType<typeof pedestrians>|null=null,facing=new Float32Array(0),groupOf=new Int32Array(0),groups:number[][]=[];
  let level=new Float32Array(0),walkBase=0,rideBase=0,lastTime=NaN,rideLengths:number[]=[];
  const build=()=>{
    if(people){scene.remove(...people.meshes);people.meshes.forEach(m=>{m.geometry.dispose();(m.material as T.Material).dispose();m.dispose();});}
    rideLengths=rides.map(r=>r.from.distanceTo(r.to));
    walkBase=spots.length;rideBase=walkBase+walks.reduce((n,w)=>n+(w.pair?2:1),0);
    const total=rideBase+rides.reduce((n,r,i)=>n+ridePose(0,r,rideLengths[i],0).riders,0);
    people=total?pedestrians(scene,total,'building-occupants'):null;
    ({group:groupOf,groups}=talkGroups(spots));
    // Talkers face their group's centre; a lone talker and everyone else keep the published heading.
    facing=Float32Array.from(spots,(s,k)=>{
      const g=groupOf[k]<0?null:groups[groupOf[k]];if(!g||g.length<2)return s.yaw;
      const c=g.reduce((a,j)=>a.add(spots[j].at),new T.Vector3()).divideScalar(g.length);return Math.atan2(c.x-s.at.x,c.z-s.at.z);
    });
    level=new Float32Array(total).fill(-1);built=version;
  };
  return (state:Pick<WorldState,'crowd'>,time:number,automationShare?:number,hour?:number)=>{
    if(built!==version)build();
    if(!people)return;
    const rhythm=streetRhythm(hour),crowd=crowdShare(state,automationShare);
    const share={staff:.4+.6*rhythm.people,public:rhythm.strollers*(.5+.5*crowd),resident:rhythm.strollers*Math.min(1,crowd*1.4)};
    // Presence eases over 1.5 s of animation time, each person wholly on or off (as in `mobility`); a jump settles at once.
    const fade=Number.isFinite(lastTime)&&time>lastTime?(time-lastTime)/1.5:1;lastTime=time;
    const present=(k:number,who:Crowd)=>{const target=share[who]>hash(k,61)?1:0;level[k]=level[k]<0?target:level[k]+T.MathUtils.clamp(target-level[k],-fade,fade);return ease(level[k]);};
    const size=(k:number,who:Crowd,visible=1)=>present(k,who)*visible*(.93+.12*hash(k,8));
    spots.forEach((s,k)=>{
      pose.position.copy(s.at);pose.rotation.set(0,facing[k],0);pose.scale.setScalar(size(k,s.crowd));people!.set(k,pose);people!.gait(k,0,0,s.seated?1:0);
      let look=0,gesture=0;
      if(s.mode==='desk'){
        // Eyes on the screen, a glance aside now and then, hands typing.
        look=.5*Math.sin(time*.21+k*1.7)**5;gesture=.1+.05*Math.sin(time*8+k);
      }else if(s.mode==='audience'){
        // The house applauds together for 5 s in every 50, a few hands staying down; between, heads follow the stage.
        const clap=1-ease(Math.abs(((time+50)%50)-2.5)/2.5-.4);
        look=.18*Math.sin(time*.13+k);gesture=hash(k,63)<.8?clap*(.55+.35*Math.sin(time*13+k*2.3)):0;
      }else{
        const g=groups[groupOf[k]];
        if(g.length>1){
          // Between turns (`toward` past the last member) the group is quiet and everyone looks ahead.
          const m=g.indexOf(k),c=conversationPose(time,3000+groupOf[k],m,g.length),other=c.toward<g.length?spots[g[c.toward]].at:null;
          look=other?T.MathUtils.clamp(yawTo(facing[k],Math.atan2(other.x-s.at.x,other.z-s.at.z)),-.65,.65)*c.attention:0;gesture=c.gesture;
        }else{look=.35*Math.sin(time*.3+k*2.1);gesture=.3*Math.max(0,Math.sin(time*.45+k*1.3))**6;}
      }
      people!.social(k,look,gesture);
    });
    let slot=walkBase;
    walks.forEach((w,i)=>{
      const s=strollPose(time,i,w.length,w.rest),u=s.d/w.length;
      w.curve.getPointAt(u,p);w.curve.getTangentAt(u,t);side.set(-t.z,0,t.x).normalize();
      const travel=Math.atan2(t.x,t.z)+(s.forward?0:Math.PI),arrive=s.resting<0?0:ease(s.resting/1.2),leave=s.resting<0?0:ease((s.resting-s.pause+1.2)/1.2);
      const offsets=w.pair?[-w.pair,w.pair]:[0];
      offsets.forEach((o,m)=>{
        // Resting: a pair turns to face each other, someone alone to the view; both turn back before walking on.
        const target=w.pair?Math.atan2(-side.x*Math.sign(o),-side.z*Math.sign(o)):w.view??travel;
        let yaw=travel+yawTo(travel,target)*arrive;yaw+=yawTo(yaw,travel+Math.PI)*leave;
        pose.position.copy(p).addScaledVector(side,o);pose.rotation.set(0,yaw,s.resting<0?Math.sin(s.d*5.5)*.03:0);
        pose.scale.setScalar(size(slot,w.crowd));people!.set(slot,pose);people!.gait(slot,s.d*5.5+slot,s.resting<0?.42:0);
        const c=conversationPose(time,7000+i,m,2),talking=w.pair?arrive*(1-leave):0;
        people!.social(slot,w.pair?0:.5*Math.sin(time*.5+i)*arrive*(1-leave),c.gesture*talking);slot++;
      });
    });
    rides.forEach((r,i)=>{
      t.subVectors(r.to,r.from).normalize();side.set(-t.z,0,t.x).normalize();
      for(let k=0;k<ridePose(0,r,rideLengths[i],0).riders;k++,slot++){
        const q=ridePose(time,r,rideLengths[i],k);
        pose.position.copy(r.from).addScaledVector(t,q.d).addScaledVector(side,(k%2-.5)*.5);pose.rotation.set(0,Math.atan2(t.x,t.z),0);
        pose.scale.setScalar(size(slot,'public',q.visible));people!.set(slot,pose);people!.gait(slot,0,0);people!.social(slot,.4*Math.sin(time*.2+k*2.7),0);
      }
    });
    people.flush();
  };
}

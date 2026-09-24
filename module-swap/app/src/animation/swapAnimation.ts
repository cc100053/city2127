import { Group, Quaternion, Vector3 } from "three";

const worldUp = new Vector3(0, 1, 0);

function smoothstep(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function localWorldUp(wrapper: Group): Vector3 {
  const parentQuaternion = new Quaternion();
  wrapper.parent?.getWorldQuaternion(parentQuaternion);
  return worldUp.clone().applyQuaternion(parentQuaternion.invert()).normalize();
}

function animate(
  wrapper: Group,
  fromOffset: number,
  toOffset: number,
  fromScale: number,
  toScale: number,
  durationMs: number,
): Promise<void> {
  const up = localWorldUp(wrapper);
  return new Promise((resolve) => {
    const start = performance.now();
    let scheduleVersion = 0;
    const schedule = (callback: (now: number) => void): void => {
      const version = ++scheduleVersion;
      const runOnce = (): void => {
        if (version !== scheduleVersion) return;
        scheduleVersion += 1;
        callback(performance.now());
      };
      requestAnimationFrame(runOnce);
      // rAF can be suspended in a background/minimized tab. The guarded timer
      // keeps an in-progress swap from leaving the entire UI locked forever.
      window.setTimeout(runOnce, 34);
    };
    const frame = (now: number): void => {
      const raw = Math.min((now - start) / durationMs, 1);
      const t = smoothstep(raw);
      const offset = fromOffset + (toOffset - fromOffset) * t;
      const scale = fromScale + (toScale - fromScale) * t;
      wrapper.position.copy(up).multiplyScalar(offset);
      wrapper.scale.setScalar(scale);
      if (raw < 1) {
        schedule(frame);
      } else {
        wrapper.position.copy(up).multiplyScalar(toOffset);
        wrapper.quaternion.identity();
        wrapper.scale.setScalar(toScale);
        resolve();
      }
    };
    schedule(frame);
  });
}

export function animateModuleIn(wrapper: Group): Promise<void> {
  return animate(wrapper, -1.25, 0, 0.9, 1, 400);
}

export function animateModuleOut(wrapper: Group): Promise<void> {
  return animate(wrapper, 0, -1.25, 1, 0.9, 250);
}

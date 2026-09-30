import * as THREE from 'three';

export function createHologram(container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    console.warn('WebGL unavailable; QR terminal remains functional.', error);
    return { reveal() {}, reset() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 5;
  const cyan = 0x73ecf4, magenta = 0xec76d6;
  const rings = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let revealedAt = -1, ready = false, frame;

  function arc(radius, start, length, color, opacity = 1) {
    const points = Array.from({ length: 100 }, (_, i) => {
      const angle = start + length * i / 99;
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    });
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  }

  // QR corners reach radius .693. Every effect stays outside radius .73.
  [0.75, 0.82, 0.9].forEach((radius, index) => {
    const group = new THREE.Group();
    group.add(arc(radius, 0, Math.PI * 2, cyan, .12));
    for (let j = 0; j < 3; j++) {
      group.add(arc(radius, j * Math.PI * 2 / 3 + index * .4, .95, index === 1 ? magenta : cyan, .7));
      group.add(arc(radius + .008, j * Math.PI * 2 / 3 + index * .4, .25, index === 1 ? magenta : cyan, .35));
    }
    const tickPoints = [];
    for (let j = 0; j < 120; j++) {
      const angle = j / 120 * Math.PI * 2;
      const length = j % 10 === 0 ? .025 : .009;
      tickPoints.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
      tickPoints.push(new THREE.Vector3(Math.cos(angle) * (radius + length), Math.sin(angle) * (radius + length), 0));
    }
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPoints), new THREE.LineBasicMaterial({ color: index === 1 ? magenta : cyan, transparent: true, opacity: .34 })));
    scene.add(group);
    rings.push(group);
  });

  const count = 180, positions = new Float32Array(count * 3);
  const seeds = Array.from({ length: count }, () => ({ angle: Math.random() * Math.PI * 2, radius: .74 + Math.random() * .23, speed: .02 + Math.random() * .06 }));
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: cyan, size: .006, transparent: true, opacity: .65, sizeAttenuation: false }));
  particles.material.size = 1.5 * renderer.getPixelRatio();
  scene.add(particles);
  const pulse = arc(.74, 0, Math.PI * 2, cyan, 0);
  scene.add(pulse);

  const observer = new ResizeObserver(() => {
    const size = container.clientWidth;
    renderer.setSize(size, size, false);
  });
  observer.observe(container);

  function animate(now) {
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    const time = now / 1000;
    const elapsed = revealedAt < 0 ? 0 : (now - revealedAt) / 1000;
    const expansion = ready ? Math.min(elapsed / 1.2, 1) : 0;
    rings.forEach((ring, i) => {
      // Expand from the QR perimeter outward, never through the code.
      const initialScale = .735 / [0.75, 0.82, 0.9][i];
      const scale = ready ? initialScale + (1 - initialScale) * (1 - (1 - expansion) ** 3) : 1;
      ring.scale.setScalar(scale);
      if (!reducedMotion) ring.rotation.z = time * (i % 2 ? -.09 : .065) * (1 + i * .25);
      ring.visible = ready;
    });
    seeds.forEach((seed, i) => {
      const angle = seed.angle + (reducedMotion ? 0 : time * seed.speed);
      const burst = ready && !reducedMotion ? Math.sin(Math.min(elapsed, 1) * Math.PI) * .055 : 0;
      positions[i * 3] = Math.cos(angle) * (seed.radius + burst);
      positions[i * 3 + 1] = Math.sin(angle) * (seed.radius + burst);
    });
    particleGeometry.attributes.position.needsUpdate = true;
    particles.visible = ready;
    const pulsePhase = elapsed % 3 / 3;
    pulse.visible = ready && !reducedMotion;
    pulse.scale.setScalar(1 + pulsePhase * .32);
    pulse.material.opacity = (1 - pulsePhase) * .28;
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  return {
    reveal() { ready = true; revealedAt = performance.now(); },
    reset() { ready = false; revealedAt = -1; },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

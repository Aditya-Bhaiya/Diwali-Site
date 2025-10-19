// style.js — Mobile-first Diwali Fireworks (module)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// canvas + scene
const canvas = document.getElementById("fireworks");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 60;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

// bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.4, 0.85));

// audio
const listener = new THREE.AudioListener();
camera.add(listener);

const soundLoader = new THREE.AudioLoader();
const sounds = {};
function loadSound(key, url) {
  const a = new THREE.Audio(listener);
  soundLoader.load(url, (buffer) => {
    a.setBuffer(buffer);
    a.setVolume(0.8);
  });
  sounds[key] = a;
}

// public-domain-ish samples (CDNs)
loadSound("launch", "https://cdn.pixabay.com/download/audio/2023/08/29/audio_6a0fa44a09.mp3?filename=rocket-launch-183711.mp3");
loadSound("boom", "https://cdn.pixabay.com/download/audio/2022/03/15/audio_15df32126e.mp3?filename=firework-large-explosion-1-6952.mp3");
loadSound("crackle", "https://cdn.pixabay.com/download/audio/2023/05/22/audio_513f8f7b3d.mp3?filename=firework-crackle-14659.mp3");

// system
const fireworks = [];
const clock = new THREE.Clock();

// create a single firework (rocket -> explosion)
function createFirework(opts = {}) {
  const { x = (Math.random() - 0.5) * 60, z = (Math.random() - 0.5) * 30, color } = opts;
  const group = new THREE.Group();

  // rocket sphere
  const rocketGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const rocketMat = new THREE.MeshBasicMaterial({ color: color || 0xfff0aa });
  const rocket = new THREE.Mesh(rocketGeo, rocketMat);
  group.add(rocket);

  // particle burst
  const count = 120 + Math.floor(Math.random() * 120);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

    const c = new THREE.Color();
    c.setHSL(Math.random(), 0.8, 0.5);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.45,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geom, mat);
  points.visible = false;
  group.add(points);

  group.userData = {
    rocket,
    points,
    exploded: false,
    velocity: new THREE.Vector3( (Math.random()-0.5)*6, 40 + Math.random()*10, (Math.random()-0.5)*4 ),
    particleVel: null,
    life: 0
  };

  group.position.set(x, -30, z);
  scene.add(group);
  fireworks.push(group);

  // play small launch on user gesture allowed
  try { if (sounds.launch && sounds.launch.isBuffer) sounds.launch.play(); else if (sounds.launch) sounds.launch.play(); } catch(e){}

  return group;
}

// animate
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  for (let i = fireworks.length - 1; i >= 0; i--) {
    const fw = fireworks[i];
    const d = fw.userData;
    d.life += delta;

    if (!d.exploded) {
      // rocket movement + gravity
      d.velocity.y -= 28 * delta;
      fw.position.addScaledVector(d.velocity, delta);

      // when upward velocity drops -> explode
      if (d.velocity.y <= 0) {
        d.exploded = true;
        fw.remove(d.rocket);
        d.points.visible = true;

        // play boom & crackle
        try { if (sounds.boom) sounds.boom.play(); } catch(e){}
        setTimeout(()=>{ try { if (sounds.crackle) sounds.crackle.play(); } catch(e){} }, 220);

        // set particle velocities
        const ccount = d.points.geometry.attributes.position.count;
        d.particleVel = new Array(ccount);
        for (let j = 0; j < ccount; j++) {
          d.particleVel[j] = {
            x: (Math.random() - 0.5) * 40,
            y: (Math.random() - 0.5) * 40,
            z: (Math.random() - 0.5) * 40
          };
        }
      }
    } else {
      // move particles outward and fade
      const pos = d.points.geometry.attributes.position.array;
      for (let k = 0; k < d.particleVel.length; k++) {
        pos[k * 3] += d.particleVel[k].x * delta;
        pos[k * 3 + 1] += d.particleVel[k].y * delta;
        pos[k * 3 + 2] += d.particleVel[k].z * delta;
      }
      d.points.geometry.attributes.position.needsUpdate = true;
      d.points.material.opacity -= delta * 0.75;

      if (d.points.material.opacity <= 0) {
        scene.remove(fw);
        fireworks.splice(i, 1);
      }
    }
  }

  composer.render();
}
animate();

// --- UI logic: name overlay / launches / final message ---
const overlay = document.getElementById("nameOverlay");
const input = document.getElementById("nameInput");
const startBtn = document.getElementById("startBtn");
const enableSoundBtn = document.getElementById("enableSoundBtn");
const launchBtn = document.getElementById("launchBtn");
const muteBtn = document.getElementById("muteBtn");
const finalMessage = document.getElementById("finalMessage");
const finalText = document.getElementById("finalText");

let muted = false;
muteBtn.addEventListener("click", () => {
  muted = !muted;
  Object.values(sounds).forEach(s => {
    try { s.setVolume(muted ? 0 : 0.8); } catch(e){}
  });
  muteBtn.textContent = muted ? "🔈" : "🔊";
});

// enable sound (user gesture)
enableSoundBtn.addEventListener("click", async () => {
  try { if (listener.context && listener.context.state === "suspended") await listener.context.resume(); } catch(e){}
  // try playing a tiny silent sound: (if available)
  enableSoundBtn.textContent = "Sound Enabled";
  enableSoundBtn.disabled = true;
});

// start flow when enter pressed
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    startSequenceWithName(input.value || "Friend");
  }
});
startBtn.addEventListener("click", () => {
  startSequenceWithName(input.value || "Friend");
});

// small helper: focus input when overlay clicked (mobile)
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) input.focus();
});

// manual launch button (quick test)
launchBtn.addEventListener("click", () => createFirework());

// main function
function startSequenceWithName(rawName) {
  const name = String(rawName || "Friend").trim();
  if (!name) return;
  const letterCount = (name.replace(/\s+/g, "")).length || 1;

  // hide overlay
  overlay.classList.add("hidden");

  // ensure audio context resumed (gesture)
  try { if (listener.context && listener.context.state === "suspended") listener.context.resume(); } catch(e){}

  // schedule fireworks: one per letter (staggered)
  const baseDelay = 350; // ms between rockets
  const colors = [0xffb84d, 0xff4d6d, 0x7afcff, 0xa6ff7a, 0xd69bff];
  for (let i = 0; i < letterCount; i++) {
    const delay = i * baseDelay;
    setTimeout(() => {
      // pick x position across screen width
      const span = Math.max(40, Math.min(80, letterCount * 6));
      const x = (i / Math.max(1, letterCount-1) - 0.5) * span + (Math.random()-0.5)*6;
      const z = (Math.random()-0.5) * 24;
      createFirework({ x, z, color: colors[i % colors.length] });
    }, delay);
  }

  // after all fireworks done, show final message
  const guessLongest = letterCount * baseDelay + 1600;
  setTimeout(() => {
    // big boom
    try { if (sounds.boom) sounds.boom.play(); } catch(e){}
    // show message
    finalText.textContent = `Happy Diwali, ${name}!`;
    finalMessage.classList.add("show");
    // hide after some time
    setTimeout(() => {
      finalMessage.classList.remove("show");
    }, 5000);
  }, guessLongest);
}

// resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// keyboard accessible: press Enter on overlay input -> handled above

// Optional: small UX improvement — if user doesn't interact, keep overlay visible

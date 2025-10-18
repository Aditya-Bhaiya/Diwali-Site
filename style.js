// style.js — Diwali Fireworks 3D (Three.js Real Edition)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// === Scene, Camera, Renderer ===
const canvas = document.getElementById("fireworks");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);

// === Post Processing ===
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85);
composer.addPass(bloomPass);

// === Audio Loader ===
const listener = new THREE.AudioListener();
camera.add(listener);

const soundLoader = new THREE.AudioLoader();
const sounds = {};
const loadSound = (key, url) => {
  const sound = new THREE.Audio(listener);
  soundLoader.load(url, buffer => {
    sound.setBuffer(buffer);
    sound.setVolume(0.7);
  });
  sounds[key] = sound;
};

// Layered sounds (public domain samples)
loadSound("launch", "https://cdn.pixabay.com/download/audio/2023/08/29/audio_6a0fa44a09.mp3?filename=rocket-launch-183711.mp3");
loadSound("boom", "https://cdn.pixabay.com/download/audio/2022/03/15/audio_15df32126e.mp3?filename=firework-large-explosion-1-6952.mp3");
loadSound("crackle", "https://cdn.pixabay.com/download/audio/2023/05/22/audio_513f8f7b3d.mp3?filename=firework-crackle-14659.mp3");

// === Firework System ===
const fireworks = [];
const clock = new THREE.Clock();

function createFirework() {
  const group = new THREE.Group();

  // Rocket trail (simple sphere)
  const geometry = new THREE.SphereGeometry(0.3, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffaa });
  const rocket = new THREE.Mesh(geometry, material);
  group.add(rocket);

  // Explosion particles
  const particles = new THREE.BufferGeometry();
  const count = 150 + Math.random() * 150;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

    colors[i * 3] = Math.random();
    colors[i * 3 + 1] = Math.random();
    colors[i * 3 + 2] = Math.random();
  }
  particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const burst = new THREE.Points(particles, particleMaterial);
  burst.visible = false;
  group.add(burst);

  group.userData = {
    rocket,
    burst,
    exploded: false,
    velocity: new THREE.Vector3((Math.random() - 0.5) * 10, 35 + Math.random() * 15, (Math.random() - 0.5) * 6),
    age: 0
  };

  const startX = (Math.random() - 0.5) * 80;
  group.position.set(startX, -30, (Math.random() - 0.5) * 20);
  scene.add(group);
  fireworks.push(group);

  // Play launch
  if (sounds.launch.isPlaying) sounds.launch.stop();
  sounds.launch.play();
}

// === Animate Fireworks ===
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  fireworks.forEach(fw => {
    const data = fw.userData;
    data.age += delta;

    if (!data.exploded) {
      // move rocket
      data.velocity.y -= 25 * delta; // gravity
      fw.position.addScaledVector(data.velocity, delta);

      if (data.velocity.y <= 0) {
        data.exploded = true;
        fw.remove(data.rocket);
        data.burst.visible = true;

        if (sounds.boom.isPlaying) sounds.boom.stop();
        sounds.boom.play();
        setTimeout(() => {
          if (sounds.crackle.isPlaying) sounds.crackle.stop();
          sounds.crackle.play();
        }, 200);

        // give particles random outward motion
        data.particleVel = Array.from({ length: data.burst.geometry.attributes.position.count }, () => ({
          x: (Math.random() - 0.5) * 40,
          y: (Math.random() - 0.5) * 40,
          z: (Math.random() - 0.5) * 40
        }));
      }
    } else {
      // explosion animation
      const positions = data.burst.geometry.attributes.position.array;
      for (let i = 0; i < data.particleVel.length; i++) {
        positions[i * 3] += data.particleVel[i].x * delta;
        positions[i * 3 + 1] += data.particleVel[i].y * delta;
        positions[i * 3 + 2] += data.particleVel[i].z * delta;
      }
      data.burst.geometry.attributes.position.needsUpdate = true;
      data.burst.material.opacity -= delta * 0.8;
      if (data.burst.material.opacity <= 0) {
        scene.remove(fw);
      }
    }
  });

  composer.render();
}

animate();

// === Event Listeners ===
document.getElementById("launchBtn").addEventListener("click", () => {
  createFirework();
});
document.getElementById("muteBtn").addEventListener("click", () => {
  Object.values(sounds).forEach(s => s.setVolume(s.getVolume() > 0 ? 0 : 0.7));
});

// === Resize ===
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

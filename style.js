// style.js — Final Fixed Version for GitHub Pages
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("fireworks");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 60;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.4, 0.85));

// ---- AUDIO ----
const listener = new THREE.AudioListener();
camera.add(listener);
const soundLoader = new THREE.AudioLoader();
const sounds = {};
function loadSound(key, url) {
  const s = new THREE.Audio(listener);
  soundLoader.load(url, (buf) => { s.setBuffer(buf); s.setVolume(0.8); });
  sounds[key] = s;
}
loadSound("launch","https://cdn.pixabay.com/download/audio/2023/08/29/audio_6a0fa44a09.mp3?filename=rocket-launch-183711.mp3");
loadSound("boom","https://cdn.pixabay.com/download/audio/2022/03/15/audio_15df32126e.mp3?filename=firework-large-explosion-1-6952.mp3");
loadSound("crackle","https://cdn.pixabay.com/download/audio/2023/05/22/audio_513f8f7b3d.mp3?filename=firework-crackle-14659.mp3");

// ---- FIREWORKS ----
const fireworks = [];
const clock = new THREE.Clock();

function createFirework({x=(Math.random()-0.5)*60,z=(Math.random()-0.5)*30,color}={}) {
  const group=new THREE.Group();
  const rocket=new THREE.Mesh(new THREE.SphereGeometry(0.45,8,8),new THREE.MeshBasicMaterial({color:color||0xfff0aa}));
  group.add(rocket);

  const count=120+Math.random()*120;
  const pos=new Float32Array(count*3),col=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    pos[i*3]=(Math.random()-0.5)*2;
    pos[i*3+1]=(Math.random()-0.5)*2;
    pos[i*3+2]=(Math.random()-0.5)*2;
    const c=new THREE.Color(); c.setHSL(Math.random(),0.8,0.5);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute("position",new THREE.BufferAttribute(pos,3));
  geom.setAttribute("color",new THREE.BufferAttribute(col,3));
  const pts=new THREE.Points(geom,new THREE.PointsMaterial({size:0.45,vertexColors:true,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending}));
  pts.visible=false; group.add(pts);

  group.userData={rocket,pts,exploded:false,vel:new THREE.Vector3((Math.random()-0.5)*6,40+Math.random()*10,(Math.random()-0.5)*4),life:0};
  group.position.set(x,-30,z);
  scene.add(group); fireworks.push(group);
  try{sounds.launch?.play();}catch{}
}

function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta();
  for(let i=fireworks.length-1;i>=0;i--){
    const g=fireworks[i],d=g.userData;
    d.life+=dt;
    if(!d.exploded){
      d.vel.y-=28*dt;
      g.position.addScaledVector(d.vel,dt);
      if(d.vel.y<=0){
        d.exploded=true; g.remove(d.rocket); d.pts.visible=true;
        try{sounds.boom?.play();}catch{} setTimeout(()=>{try{sounds.crackle?.play();}catch{}},200);
        const c=d.pts.geometry.attributes.position.count;
        d.pv=Array.from({length:c},()=>({x:(Math.random()-0.5)*40,y:(Math.random()-0.5)*40,z:(Math.random()-0.5)*40}));
      }
    } else {
      const p=d.pts.geometry.attributes.position.array;
      for(let j=0;j<d.pv.length;j++){p[j*3]+=d.pv[j].x*dt;p[j*3+1]+=d.pv[j].y*dt;p[j*3+2]+=d.pv[j].z*dt;}
      d.pts.geometry.attributes.position.needsUpdate=true;
      d.pts.material.opacity-=dt*0.8;
      if(d.pts.material.opacity<=0){scene.remove(g);fireworks.splice(i,1);}
    }
  }
  composer.render();
}
animate();

// ---- UI ----
const overlay=document.getElementById("nameOverlay");
const input=document.getElementById("nameInput");
const startBtn=document.getElementById("startBtn");
const enableSoundBtn=document.getElementById("enableSoundBtn");
const launchBtn=document.getElementById("launchBtn");
const muteBtn=document.getElementById("muteBtn");
const finalMessage=document.getElementById("finalMessage");
const finalText=document.getElementById("finalText");

let muted=false;
muteBtn.onclick=()=>{muted=!muted;Object.values(sounds).forEach(s=>{try{s.setVolume(muted?0:0.8);}catch{}});muteBtn.textContent=muted?"🔈":"🔊";};
enableSoundBtn.onclick=async()=>{try{await listener.context.resume();}catch{} enableSoundBtn.textContent="Sound Enabled"; enableSoundBtn.disabled=true;};
input.onkeydown=e=>{if(e.key==="Enter"){startSequence(input.value);}};
startBtn.onclick=()=>startSequence(input.value);
overlay.onclick=e=>{if(e.target===overlay)input.focus();};
launchBtn.onclick=()=>createFirework();

function startSequence(nameRaw){
  const name=(nameRaw||"Friend").trim();
  if(!name)return;
  overlay.classList.add("hidden");
  try{listener.context.resume();}catch{}
  const clean=name.replace(/\s+/g,"");
  const baseDelay=350,colors=[0xffb84d,0xff4d6d,0x7afcff,0xa6ff7a,0xd69bff];
  for(let i=0;i<clean.length;i++){
    setTimeout(()=>{const span=Math.max(40,Math.min(80,clean.length*6));
      const x=(i/(clean.length-1)-0.5)*span+(Math.random()-0.5)*6;
      const z=(Math.random()-0.5)*24; createFirework({x,z,color:colors[i%colors.length]});
    },i*baseDelay);
  }
  setTimeout(()=>{
    try{sounds.boom?.play();}catch{}
    finalText.textContent=`Happy Diwali, ${name}!`;
    finalMessage.classList.add("show");
    setTimeout(()=>finalMessage.classList.remove("show"),5000);
  },clean.length*baseDelay+1800);
}

window.onresize=()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);composer.setSize(window.innerWidth,window.innerHeight);};

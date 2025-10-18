/* style.js — plain JS for Diwali Fireworks website
   - Generates gallery
   - Drawer to choose types
   - Full-screen canvas animation (particles + smoke)
   - WebAudio synthesized sound (no external files)
   - Mobile + keyboard shortcuts: Space = launch, M = mute, C = clear
*/

(() => {
  // ---------- Data ----------
  const CATALOG = [
    { id: 'rocket', name: 'Rocket', desc: 'Soars high and bursts into a starfield.', thumb: '🚀',
      types: [{ id: 'r.red', label: 'Red Starburst', color: '#ff3b30', size:1 },
              { id: 'r.gold', label: 'Gold Shower', color: '#ffd60a', size:1.2 },
              { id: 'r.multi', label: 'Rainbow Burst', color: 'multi', size:1.1 }]
    },
    { id: 'anar', name: 'Anar (Fountain)', desc: 'Ground fountain with glitter.', thumb: '🧨',
      types: [{ id: 'a.silver', label: 'Silver Sparkle', color: '#e5e7eb', size:0.9 },
              { id: 'a.blue', label: 'Blue Cascade', color: '#60a5fa', size:1 }]
    },
    { id: 'chakri', name: 'Chakri (Spinner)', desc: 'Spinning wheel of light.', thumb: '🌀',
      types: [{ id: 'c.neon', label: 'Neon Loop', color: '#7c3aed', size:0.8 },
              { id: 'c.sun', label: 'Sunburst', color: '#f97316', size:1 }]
    },
    { id: 'bombetta', name: 'Bombetta', desc: 'Cluster shells with layered booms.', thumb: '💥',
      types: [{ id: 'b.purp', label: 'Purple Bloom', color: '#8b5cf6', size:1.4 },
              { id: 'b.cyan', label: 'Cyan Ring', color: '#06b6d4', size:1.2 }]
    }
  ];

  // ---------- DOM refs ----------
  const galleryEl = document.getElementById('gallery');
  const drawer = document.getElementById('drawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerDesc = document.getElementById('drawerDesc');
  const typeList = document.getElementById('typeList');
  const closeDrawer = document.getElementById('closeDrawer');
  const launchBtn = document.getElementById('launchBtn');
  const previewBtn = document.getElementById('previewBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const exploreBtn = document.getElementById('exploreBtn');
  const exploreScroll = document.getElementById('exploreScroll');
  const autoShow = document.getElementById('autoShow');
  const muteBtn = document.getElementById('muteBtn');
  const fxCanvas = document.getElementById('fxCanvas');

  let selectedFirework = null;
  let selectedType = null;
  let isMuted = false;

  // ---------- Canvas & animation state ----------
  const ctx = fxCanvas.getContext('2d');
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let particles = [];
  let smoke = [];
  let raf = null;

  function resizeCanvas(){
    dpr = Math.max(1, window.devicePixelRatio || 1);
    fxCanvas.width = window.innerWidth * dpr;
    fxCanvas.height = window.innerHeight * dpr;
    fxCanvas.style.width = window.innerWidth + 'px';
    fxCanvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ---------- Render loop ----------
  let lastTime = performance.now();
  function loop(t){
    const dt = Math.min(50, t - lastTime) / 1000;
    lastTime = t;
    ctx.clearRect(0,0, window.innerWidth, window.innerHeight);
    updateParticles(dt);
    updateSmoke(dt);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  // ---------- Helpers ----------
  function rand(min, max){ return Math.random() * (max - min) + min; }

  function createSmoke(x,y,size=60){
    smoke.push({ x,y, size, life:1, maxLife: 2 + Math.random()*1.8, vx: (Math.random()-0.5)*20, vy: -10 - Math.random()*20 });
  }

  function createExplosion(x,y, color, sizeMult=1, multi=false){
    const count = 50 + Math.floor(Math.random()*80*sizeMult);
    for(let i=0;i<count;i++){
      const angle = Math.random() * Math.PI*2;
      const speed = (60+Math.random()*220) * (0.5 + Math.random()*0.9) * sizeMult;
      const hue = multi ? Math.floor(Math.random()*360) : null;
      particles.push({
        kind: 'spark',
        x,y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: 1,
        maxLife: 1.4 + Math.random()*1.2,
        size: 1 + Math.random()*2.5,
        color: multi ? `hsl(${hue} 100% 60%)` : color
      });
    }
    createSmoke(x,y, 80*sizeMult);
  }

  function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      if(p.kind === 'rocket'){
        p.vy += 0 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // draw rocket point and little trail
        ctx.beginPath();
        ctx.fillStyle = '#fff7e6';
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2);
        ctx.fill();
        // trail
        ctx.globalAlpha = 0.08;
        for(let k=0;k<5;k++){
          ctx.fillRect(p.x + (Math.random()-0.5)*6, p.y + k*2 + 4, 2,2);
        }
        ctx.globalAlpha = 1;
        if(p.y <= p.peakY){
          // explode
          const multi = p.type.color === 'multi';
          createExplosion(p.x, p.y, p.type.color === 'multi' ? '#ffffff' : p.type.color, p.type.size || 1, multi);
          particles.splice(i,1);
          setTimeout(()=>{ /* no-op: maybe update UI */ }, 300);
        }
      } else if(p.kind === 'spark'){
        p.vy += 220 * dt; // gravity
        p.vx *= 0.995;
        p.vy *= 0.998;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / p.maxLife;
        const alpha = Math.max(0, p.life);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.size * (1 + (1 - p.life)*1.5), 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if(p.life <= 0 || p.y > window.innerHeight + 80) particles.splice(i,1);
      }
    }
  }

  function updateSmoke(dt){
    for(let i=smoke.length-1;i>=0;i--){
      const s = smoke[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt / s.maxLife;
      const a = Math.max(0, s.life);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
      g.addColorStop(0, `rgba(120,120,120,${0.12 * a})`);
      g.addColorStop(1, `rgba(60,60,60,${0.01 * a})`);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
      ctx.globalCompositeOperation = 'source-over';
      if(s.life <= 0) smoke.splice(i,1);
    }
  }

  // ---------- Audio ----------
  let audioCtx = null;
  function ensureAudio(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playLaunchSound(){
    if(isMuted) return;
    try{
      const ctxA = ensureAudio();
      const now = ctxA.currentTime;
      const o = ctxA.createOscillator();
      const g = ctxA.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(150, now);
      o.frequency.exponentialRampToValueAtTime(420, now + 0.6);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      o.connect(g).connect(ctxA.destination);
      o.start(); o.stop(now + 1);

      // explosion noise
      setTimeout(()=>{
        const bufSize = ctxA.sampleRate * 1.4;
        const buffer = ctxA.createBuffer(1, bufSize, ctxA.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0;i<bufSize;i++){
          data[i] = (Math.random()*2 - 1) * Math.pow(1 - i / bufSize, 2);
        }
        const noise = ctxA.createBufferSource();
        noise.buffer = buffer;
        const ng = ctxA.createGain();
        ng.gain.setValueAtTime(0.001, ctxA.currentTime);
        ng.gain.exponentialRampToValueAtTime(0.6, ctxA.currentTime + 0.02);
        ng.gain.exponentialRampToValueAtTime(0.0001, ctxA.currentTime + 1.6);
        noise.connect(ng).connect(ctxA.destination);
        noise.start();
      }, 380);
    }catch(e){
      // audio may be blocked by autoplay policies until user interacts
      console.warn('Audio error', e);
    }
  }

  // ---------- Launch sequence ----------
  function triggerLaunch(fw, type){
    // create a rocket particle that rises then explodes
    const x = window.innerWidth * (0.12 + Math.random()*0.76);
    const y = window.innerHeight - 20;
    const peakY = window.innerHeight * (0.12 + Math.random()*0.5);
    const flightDuration = 700 + Math.random()*700; // ms
    // calculate vy (pixels per second)
    const vy = - (window.innerHeight - peakY) / (flightDuration / 1000);
    particles.push({
      kind: 'rocket',
      x, y,
      vx: 0,
      vy,
      start: performance.now(),
      peakY,
      fw,
      type
    });
    // smoke at launch
    createSmoke(x, y - 8, 26);
    playLaunchSound();
  }

  // ---------- UI generation ----------
  function makeCard(item){
    const el = document.createElement('article');
    el.className = 'card';
    el.tabIndex = 0;
    el.innerHTML = `
      <div class="card-thumb">${item.thumb}</div>
      <h4>${item.name}</h4>
      <p>${item.desc}</p>
      <div class="card-meta">
        <div class="muted">${item.category || 'Traditional'}</div>
        <button class="btn small open-btn">Open</button>
      </div>
    `;
    el.querySelector('.open-btn').addEventListener('click', ()=> openDrawer(item));
    el.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') openDrawer(item); });
    return el;
  }

  function openDrawer(item){
    selectedFirework = item;
    selectedType = item.types[0];
    drawerTitle.textContent = item.name;
    drawerDesc.textContent = item.desc;
    typeList.innerHTML = '';
    item.types.forEach(t => {
      const r = document.createElement('label');
      r.className = 'type-item';
      r.innerHTML = `
        <div class="type-label">
          <div class="color-swatch" style="background: ${t.color==='multi' ? 'linear-gradient(90deg,#ff3b30,#ffd60a,#60a5fa)' : t.color};"></div>
          <div>
            <div style="font-weight:600">${t.label}</div>
            <div class="muted" style="font-size:12px">size ${t.size}</div>
          </div>
        </div>
        <input type="radio" name="type" ${selectedType && selectedType.id===t.id ? 'checked' : ''} />
      `;
      r.querySelector('input').addEventListener('change', ()=> selectedType = t);
      typeList.appendChild(r);
    });
    drawer.setAttribute('aria-hidden', 'false');
    // focus for accessibility
    setTimeout(()=> closeDrawer.focus(), 60);
  }

  function closeDrawerFunc(){
    drawer.setAttribute('aria-hidden', 'true');
    selectedFirework = null;
    selectedType = null;
  }

  // ---------- Bind UI ----------
  CATALOG.forEach(c => galleryEl.appendChild(makeCard(c)));

  closeDrawer.addEventListener('click', closeDrawerFunc);
  cancelBtn.addEventListener('click', closeDrawerFunc);

  launchBtn.addEventListener('click', () => {
    if(selectedFirework && selectedType) {
      triggerLaunch(selectedFirework, selectedType);
      closeDrawerFunc();
    }
  });

  previewBtn.addEventListener('click', () => {
    if(selectedFirework && selectedType) {
      // preview: small explosion at center
      const cx = window.innerWidth/2;
      const cy = window.innerHeight * (0.35 + Math.random()*0.2);
      const multi = selectedType.color === 'multi';
      createExplosion(cx, cy, selectedType.color === 'multi' ? '#fff' : selectedType.color, selectedType.size || 1, multi);
      playLaunchSound();
    }
  });

  exploreBtn.addEventListener('click', ()=> document.getElementById('gallery').scrollIntoView({behavior:'smooth'}));
  exploreScroll.addEventListener('click', ()=> document.getElementById('gallery').scrollIntoView({behavior:'smooth'}));
  autoShow.addEventListener('click', ()=> {
    // randomly open a card then auto launch its first type
    const idx = Math.floor(Math.random()*CATALOG.length);
    const item = CATALOG[idx];
    openDrawer(item);
    setTimeout(()=> {
      if(item && item.types && item.types[0]) {
        triggerLaunch(item, item.types[0]);
        closeDrawerFunc();
      }
    }, 600);
  });

  // mute toggle
  function updateMuteUI(){
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
  }
  muteBtn.addEventListener('click', ()=>{ isMuted = !isMuted; updateMuteUI(); });
  updateMuteUI();

  // keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if(e.code === 'Space'){
      e.preventDefault();
      if(selectedFirework && selectedType) triggerLaunch(selectedFirework, selectedType);
    }
    if(e.key.toLowerCase() === 'm'){ isMuted = !isMuted; updateMuteUI(); }
    if(e.key.toLowerCase() === 'c'){ particles = []; smoke = []; }
  });

  // mobile touch: tap empty space to clear
  fxCanvas.addEventListener('touchstart', ()=> { particles=[]; smoke=[]; }, {passive:true});

  // click outside drawer to close
  drawer.addEventListener('click', (ev)=>{
    if(ev.target === drawer) closeDrawerFunc();
  });

  // ensure first user interaction unlocks audio on some browsers
  document.addEventListener('click', function unlockAudioOnce(){
    try { ensureAudio(); } catch(e){}
    document.removeEventListener('click', unlockAudioOnce);
  });

  // initial little show: a gentle sparkle in the hero
  setTimeout(()=> {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for(let i=0;i<20;i++){
      const cx = w * (0.3 + Math.random()*0.4);
      const cy = h * (0.18 + Math.random()*0.15);
      createExplosion(cx, cy, ['#ffd60a','#ff3b30','#60a5fa'][Math.floor(Math.random()*3)], 0.6, Math.random() > 0.6);
    }
  }, 800);

  // expose for debug in console
  window._diwali = { triggerLaunch, particlesRef: () => particles, smokeRef: () => smoke };

})();

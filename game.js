/* MiniRP 2.0 — motor escrito integralmente do zero em JavaScript.
   O CAPX é usado APENAS como origem dos sprites e tiles. Nenhum evento,
   posição de mapa, waypoint ou collision-polygon do Construct 2 foi reutilizado. */
import {CELL,STREET,WORLD_SIZE,GRID,buildCity,collide,nearbyBuilding,zoneAt} from './world.js';
const $=s=>document.querySelector(s);
// Canvas 2D sincronizado: evita quadros invisíveis em alguns navegadores/GPUs.
const canvas=$('#stage'),ctx=canvas.getContext('2d',{alpha:false});
const mini=$('#minimap'),mc=mini.getContext('2d');
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const SAVE_KEY='minirp-novomotor-v1';
const LOADER=['assets/asphalt.webp','assets/pavement.webp','assets/grass.webp','assets/concrete.webp','assets/stone.webp','assets/actors/NPC1_Parado_S_0.webp','assets/buildings/07.webp','assets/trees/00.webp'];
const imageMap=new Map();
// Algumas animações do GitHub ficaram em assets/NPC*.webp, fora de actors/.
// A correção procura o caminho alternativo sem exigir reenvio das imagens.
function image(path){
 if(!path)return null;
 let im=imageMap.get(path);
 if(!im){
  im=new Image();im.decoding='async';
  if(/^assets\/actors\/NPC[2-4]_/.test(path)){
   im.onerror=()=>{im.onerror=null;im.src=path.replace('assets/actors/','assets/')};
  }
  im.src=path;imageMap.set(path,im);
 }
 return im.complete&&im.naturalWidth>0?im:null;
}
async function loadImage(path){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{imageMap.set(path,im);resolve(im)};im.onerror=()=>reject(Error('Não foi possível abrir: '+path));im.src=path})}
const types=['NPC1','NPC2','NPC3','NPC4'];
let city=null,sizes={},screen='boot',started=false,paused=false,chosenAvatar='NPC1';
let player={x:1170,y:1170+44,name:'Dante',city:'MiniRP',avatar:'NPC1',dir:'S',anim:0,moving:false,energy:100,cash:500,time:12*60};
let camera={x:player.x,y:player.y,scale:1.2},screenSize={w:1280,h:720,dpr:1};
let keyset=new Set(),joy={x:0,y:0},running=false,frame=0,last=0,lastMini=0,lastSave=0,lastPaint=0;
const patterns=new Map();
function pattern(path){if(patterns.has(path))return patterns.get(path);const im=image(path);if(!im)return null;const p=ctx.createPattern(im,'repeat');patterns.set(path,p);return p}
function fillPattern(path,x,y,w,h,fallback){ctx.fillStyle=pattern(path)||fallback;ctx.fillRect(x,y,w,h)}
function showScreen(which){screen=which;for(const id of ['boot','menu','create'])$('#'+id).classList.toggle('hidden',id!==which);$('#hud').classList.toggle('hidden',which!=='game');if(which!=='game')$('#pause-dialog').classList.add('hidden')}
function notify(s){const el=$('#toast');el.textContent=s;el.classList.add('visible');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('visible'),3400)}
function resize(){const mobile=window.innerWidth<=850||matchMedia('(pointer: coarse)').matches;let dpr=Math.min(window.devicePixelRatio||1,mobile?1:1.25);screenSize={w:window.innerWidth,h:window.innerHeight,dpr};canvas.width=Math.max(1,Math.round(screenSize.w*dpr));canvas.height=Math.max(1,Math.round(screenSize.h*dpr));canvas.style.width=screenSize.w+'px';canvas.style.height=screenSize.h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true}
function saveGame(silent=false){if(!started)return;const data={...player,version:1};try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));if(!silent)notify('Progresso salvo neste dispositivo.')}catch(e){if(!silent)notify('Não foi possível salvar neste navegador.')}$('#continue-game').disabled=false}
function loadSave(){try{const v=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return v&&v.version===1&&Number.isFinite(v.x)&&Number.isFinite(v.y)?v:null}catch(e){return null}}
function begin(saved){if(saved){player={...player,...saved};}else{
  player={...player,...city.spawn,name:$('#create [name="name"]').value.trim()||'Dante',city:$('#create [name="city"]').value.trim()||'MiniRP',avatar:chosenAvatar,energy:100,cash:500,time:12*60};
 }player.x=clamp(player.x,100,WORLD_SIZE-100);player.y=clamp(player.y,100,WORLD_SIZE-100);
 started=true;paused=false;camera={x:player.x,y:player.y,scale:window.innerWidth<700?1.28:1.32};$('#city-label').textContent=player.city.toUpperCase();showScreen('game');$('#pause-dialog').classList.add('hidden');saveGame(true)}
function initializeUI(){
 $('#new-game').onclick=()=>{showScreen('create');};
 $('#continue-game').onclick=()=>{const v=loadSave();if(v)begin(v);else notify('Nenhuma partida salva neste dispositivo.')};
 $('#continue-game').disabled=!loadSave();
 $('#back').onclick=()=>showScreen('menu');
 const avatarWrap=$('#avatars');avatarWrap.replaceChildren();
 for(const type of types){const b=document.createElement('button');b.type='button';b.className='avatar '+(type===chosenAvatar?'selected':'');b.setAttribute('aria-label','Selecionar '+type);const im=document.createElement('img');im.src=`assets/actors/${type}_Parado_S_0.webp`;if(type!=='NPC1')im.onerror=()=>{im.onerror=null;im.src=`assets/${type}_Parado_S_0.webp`};im.alt=type;const label=document.createElement('span');label.textContent='Estilo '+type.slice(3);b.append(im,label);b.onclick=()=>{chosenAvatar=type;[...avatarWrap.children].forEach(x=>x.classList.toggle('selected',x===b))};avatarWrap.append(b)}
 $('#create-form').onsubmit=e=>{e.preventDefault();begin(null)};
 $('#pause').onclick=()=>togglePause();$('#resume').onclick=()=>togglePause(false);$('#save').onclick=()=>saveGame();$('#home').onclick=()=>{saveGame(true);paused=false;started=false;showScreen('menu')};
 $('#zoom-in').onclick=()=>camera.scale=clamp(camera.scale+.16,.72,2.0);
 $('#zoom-out').onclick=()=>camera.scale=clamp(camera.scale-.16,.72,2.0);
 $('#interact').onclick=interact;$('#action').onclick=interact;
 const run=$('#run');run.addEventListener('pointerdown',e=>{e.preventDefault();running=true;run.setPointerCapture(e.pointerId)});run.addEventListener('pointerup',()=>running=false);run.addEventListener('pointercancel',()=>running=false);
 const pad=$('#joystick'),stick=$('#stick');let id=null;
 function moveStick(e){const r=pad.getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2;const dx=e.clientX-cx,dy=e.clientY-cy,n=Math.hypot(dx,dy),max=r.width*.30;joy.x=clamp(dx/max,-1,1);joy.y=clamp(dy/max,-1,1);const magnitude=Math.hypot(joy.x,joy.y);if(magnitude>1){joy.x/=magnitude;joy.y/=magnitude}stick.style.transform=`translate(${clamp(dx,-max,max)}px,${clamp(dy,-max,max)}px)`}
 pad.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;pad.setPointerCapture(id);moveStick(e)});
 pad.addEventListener('pointermove',e=>{if(e.pointerId===id)moveStick(e)});
 const release=()=>{id=null;joy={x:0,y:0};stick.style.transform='translate(0px,0px)'};
 pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);
 window.addEventListener('keydown',e=>{const focused=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);if(focused)return;let k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat&&(k==='e'||k==='escape'))return;keyset.add(k);if(k==='e')interact();if(k==='escape'&&screen==='game')togglePause()});
 window.addEventListener('keyup',e=>keyset.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keyset.clear();joy={x:0,y:0};running=false});
 window.addEventListener('beforeunload',()=>saveGame(true));
 window.addEventListener('resize',resize);
}
function togglePause(force){if(screen!=='game')return;paused=typeof force==='boolean'?force:!paused;$('#pause-dialog').classList.toggle('hidden',!paused);if(paused)saveGame(true)}
function interact(){if(screen!=='game'||paused)return;const nearest=nearbyBuilding(city,player.x,player.y,120);if(nearest){notify(`${nearest.name}: estabelecimentos em desenvolvimento.`)}else notify('Explore a cidade! Lojas e profissões serão implementadas depois.')}
function update(dt){if(screen!=='game'||paused)return;const p=player;
 let dx=(keyset.has('d')||keyset.has('arrowright')?1:0)-(keyset.has('a')||keyset.has('arrowleft')?1:0)+joy.x;
 let dy=(keyset.has('s')||keyset.has('arrowdown')?1:0)-(keyset.has('w')||keyset.has('arrowup')?1:0)+joy.y;
 const mag=Math.hypot(dx,dy);p.moving=mag>.09;
 const sprint=(keyset.has('shift')||running)&&p.energy>2;
 if(p.moving){dx/=mag;dy/=mag;p.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'D':'A'):(dy>0?'S':'W');p.anim+=dt*(sprint?13:9);
 const speed=sprint?234:151,mx=dx*dt*speed,my=dy*dt*speed;
 if(!collide(city,p.x+mx,p.y,15))p.x+=mx;
 if(!collide(city,p.x,p.y+my,15))p.y+=my;
 p.energy=clamp(p.energy-(sprint?9:0)*dt,0,100);
 }else p.energy=clamp(p.energy+dt*7,0,100);
 if(p.moving&&!sprint)p.energy=clamp(p.energy+dt*3,0,100);
 p.time=(p.time+dt*.85)%1440;
 for(const n of city.npcs){let target=n.route[n.point],dx=target[0]-n.x,dy=target[1]-n.y,dist=Math.hypot(dx,dy);if(dist<3){n.point=(n.point+1)%n.route.length;continue}const step=Math.min(n.speed*dt,dist);n.x+=dx/dist*step;n.y+=dy/dist*step;n.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'D':'A':dy>0?'S':'W';n.anim+=dt*7}
 for(const car of city.cars){car.braking=false;for(const other of city.cars){if(car===other||car.axis!==other.axis||Math.abs(car.lane-other.lane)>8||car.direction!==other.direction)continue;let ahead=(other.position-car.position)*car.direction;if(ahead>0&&ahead<145){car.braking=true;break}}
  if(!car.braking){car.position+=car.speed*dt*car.direction;if(car.position>WORLD_SIZE-80)car.position=80;if(car.position<80)car.position=WORLD_SIZE-80}
 }
 camera.x+=(p.x-camera.x)*Math.min(1,dt*6);camera.y+=(p.y-camera.y)*Math.min(1,dt*6);
 const eText=p.energy.toFixed(0)+'%',cashText='R$ '+p.cash.toLocaleString('pt-BR'),timeText=String(Math.floor(p.time/60)).padStart(2,'0')+':'+String(Math.floor(p.time%60)).padStart(2,'0'),zoneText=zoneAt(p.x,p.y).toUpperCase();
 if($('#energy').style.width!==eText)$('#energy').style.width=eText;
 if($('#cash').textContent!==cashText)$('#cash').textContent=cashText;
 if($('#clock').textContent!==timeText)$('#clock').textContent=timeText;
 if($('#zone').textContent!==zoneText)$('#zone').textContent=zoneText;
 lastSave+=dt;if(lastSave>18){lastSave=0;saveGame(true)}
}
function inView(x,y,pad=150){const halfW=screenSize.w/(camera.scale*2),halfH=screenSize.h/(camera.scale*2);return x>camera.x-halfW-pad&&x<camera.x+halfW+pad&&y>camera.y-halfH-pad&&y<camera.y+halfH+pad}
// O terreno é estático: cria cada quarteirão uma única vez e reutiliza a imagem.
// Canvas de 780 × 780 por setor, com cache LRU limitado (evita renderizar ruas a cada frame).
const terrainCache=new Map();
function paintPattern(g,path,x,y,w,h,fallback){
 const im=image(path);
 g.fillStyle=im?g.createPattern(im,'repeat'):fallback;
 g.fillRect(x,y,w,h);
}
function paintCrosswalk(g,x,y){
 // Travessias em torno de cada cruzamento, com marcas na orientação da via.
 // Faixas em zebra, orientadas conforme o sentido real de cada via.
 g.fillStyle='rgba(245,244,232,.92)';
 const offset=STREET/2+91;
 for(let k=-3;k<=3;k++){
  const d=k*17;
  g.fillRect(x+offset+d,y-55,10,110);
  g.fillRect(x-offset+d,y-55,10,110);
  g.fillRect(x-55,y+offset+d,110,10);
  g.fillRect(x-55,y-offset+d,110,10);
 }
}
function buildTerrainChunk(block){
 const tile=document.createElement('canvas');tile.width=tile.height=CELL;
 const g=tile.getContext('2d',{alpha:false});
 // A transformação mantém as texturas alinhadas entre os setores.
 g.translate(-block.x,-block.y);
 const x=block.x,y=block.y;
 paintPattern(g,'assets/asphalt.webp',x,y,CELL,CELL,'#303039');
 const insideX=x+STREET/2,insideY=y+STREET/2,s=CELL-STREET;
 paintPattern(g,'assets/pavement.webp',insideX,insideY,s,s,'#777571');
 g.lineWidth=7;g.strokeStyle='#c9c8c4';g.strokeRect(insideX+2,insideY+2,s-4,s-4);
 g.lineWidth=3;g.strokeStyle='#535450';g.strokeRect(insideX+9,insideY+9,s-18,s-18);
 const inside=insideX+40,iy=insideY+40,size=s-80;
 if(block.kind==='park'){
  paintPattern(g,'assets/grass.webp',inside,iy,size,size,'#377d3c');
  g.fillStyle='#d3c7b0';g.fillRect(inside,y+CELL/2-19,size,38);g.fillRect(x+CELL/2-19,iy,38,size);
  g.strokeStyle='#eee2ca';g.lineWidth=2;g.strokeRect(inside,iy,size,size);
  g.fillStyle='#65a5a9';g.beginPath();g.arc(x+CELL/2,y+CELL/2,27,0,Math.PI*2);g.fill();g.strokeStyle='#e4dbc6';g.lineWidth=6;g.stroke();
 }else if(block.kind==='plaza'){
  paintPattern(g,'assets/stone.webp',inside,iy,size,size,'#bbb1a5');
  g.fillStyle='#a3bdb0';g.fillRect(inside+34,iy+34,145,145);g.fillRect(inside+size-179,iy+34,145,145);
  g.fillRect(inside+34,iy+size-179,145,145);g.fillRect(inside+size-179,iy+size-179,145,145);
  g.fillStyle='#628caa';g.beginPath();g.arc(x+CELL/2,y+CELL/2,60,0,Math.PI*2);g.fill();g.strokeStyle='#eff1e7';g.lineWidth=11;g.stroke();
 }else{
  paintPattern(g,block.kind==='industrial'?'assets/concrete.webp':'assets/grass.webp',inside,iy,size,size,block.kind==='industrial'?'#aaa5a0':'#397a43');
  for(let gx=0;gx<2;gx++)for(let gy=0;gy<2;gy++){
   const xx=x+CELL*(gx?0.695:0.305),yy=y+CELL*(gy?0.696:0.305),lotw=266;
   paintPattern(g,block.kind==='industrial'?'assets/concrete.webp':'assets/pavement.webp',xx-lotw/2,yy-lotw/2,lotw,lotw,block.kind==='industrial'?'#999':'#a49e93');
   g.strokeStyle='rgba(22,26,28,.23)';g.lineWidth=3;g.strokeRect(xx-lotw/2,yy-lotw/2,lotw,lotw);
   g.fillStyle='#c2c0b9';g.fillRect(xx-15,yy+lotw*.41,30,40);
  }
 }
 g.strokeStyle='#cfcac1';g.lineWidth=3;g.setLineDash([37,36]);
 g.beginPath();g.moveTo(x,y);g.lineTo(x,y+CELL);g.stroke();
 g.beginPath();g.moveTo(x,y);g.lineTo(x+CELL,y);g.stroke();
 g.setLineDash([]);
 // 4 vértices para manter marcas inteiras apesar dos limites entre chunks.
 for(let a=0;a<=1;a++)for(let b=0;b<=1;b++)paintCrosswalk(g,x+a*CELL,y+b*CELL);
 return tile;
}
function getTerrainChunk(block){
 const key=block.row*GRID+block.col;
 if(terrainCache.has(key)){
  const c=terrainCache.get(key);terrainCache.delete(key);terrainCache.set(key,c);return c;
 }
 const c=buildTerrainChunk(block);terrainCache.set(key,c);
 const limit=window.innerWidth<=850?6:9;
 while(terrainCache.size>limit){const oldest=terrainCache.keys().next().value;terrainCache.delete(oldest)}
 return c;
}
function fillGround(){
 // Somente quarteirões visíveis são desenhados. Nenhum piso recalculado a cada frame.
 const halfW=screenSize.w/(camera.scale*2),halfH=screenSize.h/(camera.scale*2);
 const x0=camera.x-halfW,y0=camera.y-halfH,x1=camera.x+halfW,y1=camera.y+halfH;
 for(const block of city.blocks){
  if(block.x>x1||block.x+CELL<x0||block.y>y1||block.y+CELL<y0)continue;
  ctx.drawImage(getTerrainChunk(block),block.x,block.y);
 }
}
function drawImageSprite(path,x,y,w,h){const im=image(path);if(!im)return;ctx.drawImage(im,x-w/2,y-h/2,w,h)}
function actorImage(actor){const key=actor.moving?actor.dir:'Parado_'+actor.dir;const frame=actor.moving?Math.floor(actor.anim)%8:Math.floor(performance.now()/900)%2;return image(`assets/actors/${actor.avatar||actor.kind}_${key}_${frame}.webp`)}
function renderWorld(){let {w,h,dpr}=screenSize;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#1d2226';ctx.fillRect(0,0,w,h);
 const scale=camera.scale;ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
 fillGround();
 const layers=[];
 for(const b of city.buildings)if(inView(b.x,b.y,390))layers.push({y:b.y+b.h*.35,kind:'building',v:b});
 for(const t of city.trees)if(inView(t.x,t.y,150))layers.push({y:t.y,kind:'tree',v:t});
 for(const b of city.props)if(inView(b.x,b.y,130))layers.push({y:b.y,kind:'prop',v:b});
 if(started){for(const n of city.npcs)if(inView(n.x,n.y,100))layers.push({y:n.y,kind:'npc',v:n});}
 if(started){for(const c of city.cars){const x=c.axis==='x'?c.position:c.lane,y=c.axis==='x'?c.lane:c.position;if(inView(x,y,140))layers.push({y,kind:'car',v:c,x})}}
 if(started)layers.push({y:player.y,kind:'player',v:player});
 layers.sort((a,b)=>a.y-b.y);
 for(const layer of layers){const o=layer.v;
  if(layer.kind==='building'){
   ctx.save();ctx.fillStyle='rgba(12,17,14,.26)';ctx.beginPath();ctx.ellipse(o.x+8,o.y+o.h*.37,o.w*.45,13,0,0,Math.PI*2);ctx.fill();ctx.restore();
   drawImageSprite(`assets/buildings/${String(o.frame).padStart(2,'0')}.webp`,o.x,o.y,o.w,o.h);
  }else if(layer.kind==='tree')drawImageSprite(`assets/trees/${String(o.frame).padStart(2,'0')}.webp`,o.x,o.y,76*o.scale,93*o.scale);
  else if(layer.kind==='prop')drawImageSprite(`assets/props/${String(o.frame).padStart(2,'0')}.webp`,o.x,o.y,72*o.scale,44*o.scale);
  else if(layer.kind==='npc'||layer.kind==='player'){
   const im=actorImage(o);
   if(im){const hh=layer.kind==='player'?45:36,ww=layer.kind==='player'?28:24;ctx.drawImage(im,o.x-ww/2,o.y-hh/2,ww,hh)}
  }else if(layer.kind==='car'){
   const x=o.axis==='x'?o.position:o.lane,y=o.axis==='x'?o.lane:o.position;
   const im=image(`assets/cars/${String(o.frame).padStart(2,'0')}.webp`);
   if(im){ctx.save();ctx.translate(x,y);if(o.axis==='y')ctx.rotate(Math.PI/2*o.direction);else if(o.direction<0)ctx.rotate(Math.PI);ctx.drawImage(im,-69,-29,138,58);ctx.restore()}
  }
 }
 if(started){const near=nearbyBuilding(city,player.x,player.y,120);if(near){ctx.textAlign='center';ctx.font='bold 16px sans-serif';ctx.fillStyle='#f5f4f1';ctx.fillText('E · '+near.name,near.x,near.y+near.h*.67)}}
 ctx.restore();
 // Slight unified atmosphere; no synthetic dark blocks from misplaced CAPX layers.
 ctx.fillStyle='rgba(4,5,12,.065)';ctx.fillRect(0,0,w,h);
 if(started&&frame%8===0)drawMinimap();
}
function drawMinimap(){const w=mini.width,h=mini.height;mc.clearRect(0,0,w,h);mc.fillStyle='#282d32';mc.fillRect(0,0,w,h);const range=850,s=w/(range*2);const pc=player;mc.save();mc.translate(w/2-pc.x*s,h/2-pc.y*s);mc.scale(s,s);
 for(let b of city.blocks){mc.fillStyle=b.kind==='park'?'#4c9360':b.kind==='plaza'?'#9eaba4':b.kind==='commercial'?'#83909b':b.kind==='industrial'?'#69706a':'#6b876e';mc.fillRect(b.x+STREET/2,b.y+STREET/2,CELL-STREET,CELL-STREET)}
 mc.fillStyle='#27373a';for(let b of city.buildings)mc.fillRect(b.x-b.w*.4,b.y-b.h*.4,b.w*.8,b.h*.8);
 mc.restore();mc.fillStyle='#fff';mc.beginPath();mc.arc(w/2,h/2,6,0,Math.PI*2);mc.fill();mc.strokeStyle='#fa595c';mc.lineWidth=3;mc.stroke();
 mc.strokeStyle='#a5bac5';mc.lineWidth=2;mc.strokeRect(1,1,w-2,h-2);
}
let lastRenderError='';
function showRenderError(e){
 const message=String(e?.message||e||'Erro desconhecido');
 if(message===lastRenderError)return;
 lastRenderError=message;
 console.error('MiniRP: erro no desenho do jogo',e);
 const el=document.createElement('div');el.id='minirp-debug-error';
 el.setAttribute('role','alert');
 el.style.cssText='position:fixed;top:46%;left:50%;transform:translate(-50%,-50%);z-index:28;max-width:min(540px,90vw);padding:14px 18px;color:#fff;background:#3d1422eF;border:1px solid #ff6b74;border-radius:12px;font:13px/1.5 sans-serif;box-shadow:0 8px 32px #000a;text-align:center';
 el.textContent='Falha ao desenhar MiniRP: '+message;
 document.getElementById('minirp-debug-error')?.remove();document.body.appendChild(el);
}
canvas.addEventListener('contextlost',e=>{e.preventDefault();showRenderError('O navegador perdeu o contexto gráfico do Canvas. Recarregue a página.')});
canvas.addEventListener('contextrestored',()=>{patterns.clear();resize();document.getElementById('minirp-debug-error')?.remove();lastRenderError=''});
function animate(t){
 requestAnimationFrame(animate);
 // 30 FPS em telas de toque, 45 FPS no PC, para diminuir calor e uso de CPU/GPU.
 const maxFPS=(window.innerWidth<=850||matchMedia('(pointer: coarse)').matches)?30:45;
 if(lastPaint && t-lastPaint<1000/maxFPS-1.2)return;
 const dt=Math.min(lastPaint?(t-lastPaint)/1000:0,.08);
 lastPaint=t;frame++;
 try{update(dt);if(city)renderWorld()}catch(e){showRenderError(e)}
}
async function boot(){try{
 resize();const response=await fetch('asset-sizes.json');if(!response.ok)throw Error('Lista de imagens ausente.');sizes=await response.json();city=buildCity(sizes);
 for(let i=0;i<LOADER.length;i++){await loadImage(LOADER[i]);$('#progress').style.width=Math.round((i+1)/LOADER.length*100)+'%';$('#progress-text').textContent=`Carregando recursos ${i+1}/${LOADER.length}`}
 $('#progress-text').textContent='Construindo bairro e inicializando motor...';initializeUI();camera.x=city.spawn.x;camera.y=city.spawn.y;showScreen('menu');requestAnimationFrame(animate);
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
 }catch(e){$('#progress-text').textContent='Falha ao iniciar: '+e.message;console.error(e)}
}
boot();

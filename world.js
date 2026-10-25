/* MiniRP 2.0 v0.5 — ruas com segmentos independentes e quadras irregulares.
   Bairro e regras criados em JavaScript; CAPX usado somente como biblioteca gráfica.
   A remoção planejada de trechos viários cria quadras retangulares e em L. */
export const CELL=780,STREET=150,SIDE=34,GRID=4;
export const X_ROADS=[0,680,1520,2250,3210];
export const Y_ROADS=[0,850,1580,2500,3210];
export const WORLD_SIZE=3210;
export const COL_WIDTHS=X_ROADS.slice(1).map((v,i)=>v-X_ROADS[i]);
export const ROW_HEIGHTS=Y_ROADS.slice(1).map((v,i)=>v-Y_ROADS[i]);
// H = rua horizontal sobre a divisória y_j, no segmento da coluna c.
// V = rua vertical sobre a divisória x_i, no segmento da linha r.
// Os trechos omitidos formam blocos contínuos, inclusive três quarteirões em L.
export const OMITTED_ROADS=new Set([
 'V:0:1','H:1:0',     // Quadra em L, canto noroeste
 'V:1:3','H:1:3',     // Quadra em L, canto nordeste
 'V:3:2','H:3:2',     // Quadra em L, região sul
 'H:3:0'              // Quadra retangular longa, sudoeste
]);
export const BLOCK_TYPES=[
 ['residential','industrial','commercial','commercial'],
 ['residential','park','residential','residential'],
 ['residential','commercial','plaza','industrial'],
 ['residential','commercial','commercial','industrial']
];
export const typeNames={commercial:'Centro comercial',residential:'Bairro residencial',park:'Parque Central',industrial:'Distrito industrial',plaza:'Praça Cívica'};
export const buildingLabels={7:'Mercado Central',11:'Loja de Conveniência',15:'Hospital',16:'Banco',18:'Estação',19:'Restaurante',20:'Café',23:'Loja',25:'Museu',68:'Comércio',69:'Loja',70:'Posto de Combustível',72:'Loja de Roupas',75:'Banco',76:'Concessionária'};
const HOUSE=new Set([8,12,13,14,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43]);
const TOWER=new Set([0,1,2,3,4,5,15,21,22,23,24,25,26,44,45,46,47,48,49,50,51,52,74]);
const commercial=[7,11,16,19,20,23,25,68,69,70,72,73,75,76,0,1,5,21,44,45,47,49];
const residential=[8,12,13,22,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52];
const industrial=[6,9,10,53,54,55,58,59,60,61,62,64,65,66,67];
let seed=1962857;
function random(){seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}
const between=(a,b)=>a+(b-a)*random();
const pick=a=>a[Math.floor(random()*a.length)];
const limitRange=(v,a,b)=>Math.max(a,Math.min(b,v));
export const hasHorizontalRoad=(j,c)=>!OMITTED_ROADS.has(`H:${j}:${c}`);
export const hasVerticalRoad=(r,i)=>!OMITTED_ROADS.has(`V:${r}:${i}`);
function createRoadNetwork(){
 const nodes=[],edges=[],adj=Array.from({length:(GRID+1)*(GRID+1)},()=>[]);
 const node=(j,i)=>j*(GRID+1)+i;
 for(let j=0;j<=GRID;j++)for(let i=0;i<=GRID;i++)nodes.push({x:X_ROADS[i],y:Y_ROADS[j]});
 function add(a,b,axis){const id=edges.length;let p=nodes[a],q=nodes[b];edges.push({id,a,b,axis,length:Math.hypot(q.x-p.x,q.y-p.y)});adj[a].push({edge:id,end:b});adj[b].push({edge:id,end:a})}
 for(let j=0;j<=GRID;j++)for(let c=0;c<GRID;c++)if(hasHorizontalRoad(j,c))add(node(j,c),node(j,c+1),'x');
 for(let i=0;i<=GRID;i++)for(let r=0;r<GRID;r++)if(hasVerticalRoad(r,i))add(node(r,i),node(r+1,i),'y');
 return {nodes,edges,adj};
}
function makeGroups(){
 const parents=Array.from({length:GRID*GRID},(_,i)=>i);
 function root(a){while(parents[a]!==a){parents[a]=parents[parents[a]];a=parents[a]}return a}
 function union(a,b){parents[root(b)]=root(a)}
 for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
  if(c<GRID-1&&!hasVerticalRoad(r,c+1))union(r*GRID+c,r*GRID+c+1);
  if(r<GRID-1&&!hasHorizontalRoad(r+1,c))union(r*GRID+c,(r+1)*GRID+c);
 }
 const groups=new Map();for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
  let key=root(r*GRID+c);if(!groups.has(key))groups.set(key,[]);groups.get(key).push([r,c]);
 }
 return [...groups.values()];
}
// A zona permanece a mesma dentro de todas as partes de uma quadra em L.
const ZONES_BY_CELL=Array.from({length:GRID},()=>Array(GRID));
for(const cells of makeGroups()){
 const kind=BLOCK_TYPES[cells[0][0]][cells[0][1]];
 for(const [row,col] of cells)ZONES_BY_CELL[row][col]=kind;
}
export function buildCity(sizes={}){
 seed=1962857;
 const buildings=[],trees=[],props=[],npcs=[],cars=[],blocks=[],groups=makeGroups(),network=createRoadNetwork();
 let id=0;
 for(let groupId=0;groupId<groups.length;groupId++){
  const cells=groups[groupId];
  // Os grupos inteiros recebem uma zona: nenhuma antiga rua atravessa um mesmo quarteirão.
  const kind=BLOCK_TYPES[cells[0][0]][cells[0][1]];
  for(const [row,col] of cells){
   const x=X_ROADS[col],y=Y_ROADS[row],w=COL_WIDTHS[col],h=ROW_HEIGHTS[row];
   const borders={left:hasVerticalRoad(row,col),right:hasVerticalRoad(row,col+1),top:hasHorizontalRoad(row,col),bottom:hasHorizontalRoad(row+1,col)};
   // Nas divisas SEM rua o piso alcança a célula vizinha, sem faixa de asfalto fantasma.
   const left=x+(borders.left?STREET/2:0),right=x+w-(borders.right?STREET/2:0);
   const top=y+(borders.top?STREET/2:0),bottom=y+h-(borders.bottom?STREET/2:0);
   const block={x,y,w,h,row,col,kind,groupId,borders,land:{x:left,y:top,w:right-left,h:bottom-top},lots:[]};
   blocks.push(block);
   const inset=STREET/2+SIDE+24,ix=x+inset,iy=y+inset,iw=w-inset*2,ih=h-inset*2;
   if(kind==='park'||kind==='plaza'){
    for(let i=0;i<(kind==='park'?8:4);i++){
     const px=between(ix+17,ix+iw-17),py=between(iy+17,iy+ih-17);
     if(Math.abs(px-(x+w/2))<43||Math.abs(py-(y+h/2))<43)continue;
     trees.push({x:px,y:py,frame:pick([0,1,2,3,4,5,6,7,12,14,15]),scale:between(.57,.80)});
    }
    for(let i=0;i<(kind==='park'?4:2);i++){
     const px=between(ix+45,ix+iw-45),py=between(iy+45,iy+ih-45);
     if(Math.abs(px-(x+w/2))<48||Math.abs(py-(y+h/2))<48)continue;
     props.push({x:px,y:py,frame:2,scale:.72});
    }
   }else{
    // Lotes independentes dentro de quadras de geometrias diferentes.
    const sections=iw>570&&random()>.42?3:2;
    const widths=[];let remaining=iw;
    for(let c=0;c<sections;c++){
     const width=c===sections-1?remaining:limitRange(iw/sections*between(.83,1.12),140,remaining-140*(sections-c-1));
     widths.push(width);remaining-=width;
    }
    let cursor=ix;
    for(let c=0;c<sections;c++){
     const colW=widths[c],split=random()>.22,firstHeight=split?ih*between(.42,.56):ih;
     for(let r=0;r<(split?2:1);r++){
      const sy=iy+(r?firstHeight:0),sh=(r?ih-firstHeight:firstHeight);
      const lot={x:cursor+9,y:sy+9,w:colW-18,h:sh-18,material:kind==='industrial'?'concrete':random()>.74?'stone':'pavement'};
      block.lots.push(lot);
      if(random()<(kind==='residential'?.20:.13)){
       lot.empty=true;if(lot.w>105&&lot.h>125)trees.push({x:lot.x+lot.w*.52,y:lot.y+lot.h*.52,frame:pick([0,1,3,4,12]),scale:.58});continue;
      }
      const frame=pick(kind==='industrial'?industrial:kind==='commercial'?commercial:residential);
      // Casas preservadas exatamente na escala da v0.4. Só prédios não residenciais aumentam.
      const hBase=HOUSE.has(frame)?between(103,128):TOWER.has(frame)?between(208,266):kind==='industrial'?between(172,217):between(169,208);
      const meta=sizes[`buildings/${String(frame).padStart(2,'0')}`]||[220,230],aspect=meta[0]/Math.max(1,meta[1]);
      const bh=Math.min(hBase,lot.h-14,(lot.w-14)/Math.max(.2,aspect)),bw=bh*aspect;
      if(bh<72)continue;
      const bx=lot.x+lot.w*.5+between(-8,8),by=lot.y+lot.h*.52+between(-7,7);
      buildings.push({id:id++,x:bx,y:by,w:bw,h:bh,frame,kind,name:buildingLabels[frame]||(kind==='residential'?'Residência':kind==='industrial'?'Edifício Industrial':'Estabelecimento'),solid:true,lot});
     }
     cursor+=colW;
    }
    for(let i=0;i<2+(random()>.62?1:0);i++){
     const tx=between(ix+10,ix+iw-10),ty=random()>.5?y+STREET/2+SIDE*.67:y+h-STREET/2-SIDE*.67;
     trees.push({x:tx,y:ty,frame:pick([0,1,2,3,4,5,7,12,14,15]),scale:between(.52,.77)});
    }
   }
   const walkInset=STREET/2+38;
   const circuit=[[x+walkInset,y+walkInset],[x+w-walkInset,y+walkInset],[x+w-walkInset,y+h-walkInset],[x+walkInset,y+h-walkInset]];
   for(let k=0;k<(kind==='park'?3:2);k++){
    const idx=Math.floor(random()*4),p=circuit[idx];
    npcs.push({x:p[0]+k*7,y:p[1]+k*8,route:circuit,point:(idx+1)%4,kind:`NPC${1+(row*2+col+k)%4}`,speed:between(33,52),dir:'S',walking:true,anim:between(0,8)});
   }
  }
 }
 // Veículos trafegam exclusivamente nos trechos REAIS do grafo; nunca atravessam uma quadra em L.
 for(let i=0;i<17;i++){
  const edge=network.edges[(i*13+5)%network.edges.length],direction=i%3?1:-1;
  const car={edge:edge.id,direction,progress:between(.08,.89),speed:between(55,88),frame:pick([3,4,5,6,7,8,9,10,11,12,13]),braking:false};
  placeCar(car,network);cars.push(car);
 }
 const park=blocks.find(b=>b.row===1&&b.col===1);
 return {buildings,trees,props,npcs,cars,blocks,network,groups,spawn:{x:park.x+park.w*.5,y:park.y+park.h*.5+44}};
}
export function placeCar(car,network){
 const e=network.edges[car.edge];if(!e)return;
 const from=network.nodes[car.direction>0?e.a:e.b],to=network.nodes[car.direction>0?e.b:e.a];
 const t=car.progress;
 const heading=Math.atan2(to.y-from.y,to.x-from.x);
 // Deslocamento lateral para mão de trânsito; evita sobreposição das duas direções.
 const offset=24;
 car.x=from.x+(to.x-from.x)*t-Math.sin(heading)*offset;
 car.y=from.y+(to.y-from.y)*t+Math.cos(heading)*offset;
 car.angle=heading;
}
export function updateTraffic(city,dt){
 const {edges,nodes,adj}=city.network;
 for(const car of city.cars){
  const edge=edges[car.edge];if(!edge)continue;
  car.braking=false;
  for(const other of city.cars){
   if(other===car||other.edge!==car.edge||other.direction!==car.direction)continue;
   if(other.progress>car.progress&&other.progress-car.progress<150/edge.length){car.braking=true;break}
  }
  if(car.braking)continue;
  car.progress+=car.speed*dt/edge.length;
  if(car.progress>=1){
   const finish=car.direction>0?edge.b:edge.a;
   const from=car.direction>0?edge.a:edge.b;
   const options=adj[finish]||[];
   // Prefere seguir em frente, mas permite virar. Evita retorno se houver alternativa.
   const forward=nodes[finish],last=nodes[from];
   const eligible=options.filter(o=>o.end!==from);
   const pool=eligible.length?eligible:options;
   const straight=pool.find(o=>{
    const next=nodes[o.end];return Math.abs((forward.x-last.x)*(next.y-forward.y)-(forward.y-last.y)*(next.x-forward.x))<1;
   });
   const choice=straight&&random()<.7?straight:pick(pool);
   if(choice){car.edge=choice.edge;const ne=edges[choice.edge];car.direction=ne.a===finish?1:-1}
   car.progress=0;
  }
  placeCar(car,city.network);
 }
}
export function collide(city,x,y,radius=18){
 if(x<85||y<85||x>WORLD_SIZE-85||y>WORLD_SIZE-85)return true;
 for(const b of city.buildings){if(Math.abs(x-b.x)>b.w/2+radius||Math.abs(y-b.y)>b.h/2+radius)continue;
  const bw=b.w*.78/2,bh=b.h*.83/2;
  if(x+radius>b.x-bw&&x-radius<b.x+bw&&y+radius>b.y-bh&&y-radius<b.y+bh)return true;
 }
 return false;
}
export function nearbyBuilding(city,x,y,range=112){
 let best=null,dist=Infinity;
 for(const b of city.buildings){const dx=x-b.x,dy=y-(b.y+b.h*.42),d=Math.hypot(dx,dy);if(d<range&&d<dist){best=b;dist=d}}
 return best;
}
export function zoneAt(x,y){
 const locate=(v,cuts)=>{for(let i=0;i<cuts.length-1;i++)if(v<cuts[i+1])return i;return cuts.length-2};
 return typeNames[ZONES_BY_CELL[locate(y,Y_ROADS)][locate(x,X_ROADS)]];
}

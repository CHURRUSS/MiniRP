/* MiniRP — NOVO bairro. Nenhuma posição, evento ou camada foi copiada do Construct 2.
   Apenas a arte gráfica foi extraída do arquivo CAPX do autor. */
export const CELL=780, STREET=150, SIDE=34, GRID=4, WORLD_SIZE=CELL*GRID;
export const BLOCK_TYPES=[
 ['commercial','commercial','residential','industrial'],
 ['residential','park','commercial','residential'],
 ['commercial','plaza','commercial','industrial'],
 ['residential','residential','park','commercial']
];
export const typeNames={commercial:'Centro comercial',residential:'Bairro residencial',park:'Parque Central',industrial:'Distrito industrial',plaza:'Praça Cívica'};
export const buildingLabels={7:'Mercado Central',11:'Loja de Conveniência',15:'Hospital',16:'Banco',18:'Estação',19:'Restaurante',20:'Café',23:'Loja',25:'Museu',68:'Comércio',69:'Loja',70:'Posto de Combustível',72:'Loja de Roupas',75:'Banco',76:'Concessionária'};
let seed=27112026;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}
const pick=a=>a[Math.floor(rand()*a.length)];
const numeric=(i,folder='buildings')=>`assets/${folder}/${String(i).padStart(2,'0')}.webp`;
export function buildCity(sizes={}){
  seed=27112026;
  const buildings=[],trees=[],props=[],npcs=[],cars=[],blocks=[];
  const commercial=[7,11,19,20,23,68,69,72,73,76,16,75,25];
  const residential=[8,12,13,22,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52];
  const industrial=[6,9,10,14,53,54,55,58,59,60,61,62,64,65,66,67];
  let id=0;
  for(let row=0;row<GRID;row++)for(let col=0;col<GRID;col++){
    const kind=BLOCK_TYPES[row][col];
    const x=col*CELL,y=row*CELL;
    blocks.push({x,y,col,row,kind});
    const innerX=x+STREET/2+SIDE+15,innerY=y+STREET/2+SIDE+15;
    if(kind==='park'||kind==='plaza'){
      for(const [dx,dy] of [[-195,-195],[195,-195],[-195,195],[195,195],[-195,0],[195,0]]){
        trees.push({x:x+CELL/2+dx,y:y+CELL/2+dy,frame:pick([0,1,2,3,4,5,6,7,12,14,15]),scale:.78+rand()*.19});
      }
      for(const [dx,dy] of [[-100,-130],[105,135],[135,-100],[-105,135]])props.push({x:x+CELL/2+dx,y:y+CELL/2+dy,frame:2,scale:.82});
    }else{
      const bank=kind==='commercial'?commercial:kind==='industrial'?industrial:residential;
      // Independent, intentional block construction: 2 by 2 lots.
      for(let gy=0;gy<2;gy++)for(let gx=0;gx<2;gx++){
        const frame=pick(bank);
        const meta=sizes[`buildings/${String(frame).padStart(2,'0')}`]||[200,280];
        const ratio=meta[0]/Math.max(meta[1],1);
        let h=kind==='industrial'?205:kind==='commercial'?213:kind==='residential'?209:210;
        let w=Math.min(256,h*ratio);
        if(w<105){w=110;h=Math.min(h,110/ratio)}
        const bx=x+CELL*(gx?0.695:0.305),by=y+CELL*(gy?0.696:0.305);
        buildings.push({id:id++,x:bx,y:by,w,h,frame,kind,name:buildingLabels[frame]||(kind==='residential'?'Residência':kind==='industrial'?'Edifício Industrial':'Estabelecimento'),solid:true});
      }
      // Plant trees on outer edges, not in front of building entrances.
      for(let k=0;k<4;k++){
        const tx=x+(k%2?CELL-117:117),ty=y+(k<2?105:CELL-105);
        trees.push({x:tx,y:ty,frame:pick([0,1,2,3,4,5,7,12,14,15]),scale:.63+rand()*.20});
      }
    }
    // Each neighborhood has its own sidewalk patrol loop. No CAPX waypoints reused.
    const m=113;
    const circuit=[[x+m,y+m],[x+CELL-m,y+m],[x+CELL-m,y+CELL-m],[x+m,y+CELL-m]];
    for(let k=0;k<(kind==='park'?3:2);k++){
      let idx=Math.floor(rand()*4);
      const a=circuit[idx];
      npcs.push({x:a[0]+k*7,y:a[1]+k*8,route:circuit,point:(idx+1)%4,kind:`NPC${1+(row+col+k)%4}`,speed:37+rand()*16,dir:'S',walking:true,anim:rand()*8});
    }
  }
  // A deliberately simple, independent traffic sandbox on straight lanes.
  const lanes=[-30,30];
  for(let i=0;i<15;i++){
    const axis=i%2?'x':'y',lane=(i%4)*CELL+pick(lanes);
    const direction=i%3?1:-1;
    cars.push({axis,lane,position:145+rand()*(WORLD_SIZE-290),direction,speed:57+rand()*31,frame:pick([3,4,5,6,7,8,9,10,11,12,13]),braking:false});
  }
  return {buildings,trees,props,npcs,cars,blocks,spawn:{x:CELL*1.5,y:CELL*1.5+44}};
}
export function collide(city,x,y,radius=18){
  if(x<85||y<85||x>WORLD_SIZE-85||y>WORLD_SIZE-85)return true;
  for(const b of city.buildings){
    if(Math.abs(x-b.x)>b.w/2+radius||Math.abs(y-b.y)>b.h/2+radius)continue;
    // The solid area approximates the physical structure, not the full transparent sprite.
    const bw=b.w*.78/2,bh=b.h*.83/2;
    if(x+radius>b.x-bw&&x-radius<b.x+bw&&y+radius>b.y-bh&&y-radius<b.y+bh)return true;
  }
  return false;
}
export function nearbyBuilding(city,x,y,range=112){
  let best=null,dist=Infinity;
  for(const b of city.buildings){const dx=x-b.x,dy=y-(b.y+b.h*.42);const d=Math.hypot(dx,dy);if(d<range&&d<dist){best=b;dist=d}}
  return best;
}
export function zoneAt(x,y){const col=Math.max(0,Math.min(GRID-1,Math.floor(x/CELL)));const row=Math.max(0,Math.min(GRID-1,Math.floor(y/CELL)));return typeNames[BLOCK_TYPES[row][col]]}

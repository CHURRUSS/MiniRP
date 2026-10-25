/* MiniRP — cidade redesenhada com quadras de dimensões e ocupação irregulares.
   Nenhum layout ou evento é importado do Construct 2. As imagens permanecem as originais. */
export const CELL=780, STREET=150, SIDE=34, GRID=4;
export const COL_WIDTHS=[680,840,730,960], ROW_HEIGHTS=[850,730,920,710];
export const X_ROADS=[0,680,1520,2250,3210],Y_ROADS=[0,850,1580,2500,3210];
export const WORLD_SIZE=3210;
export const BLOCK_TYPES=[
 ['residential','industrial','commercial','residential'],
 ['commercial','park','residential','commercial'],
 ['residential','commercial','plaza','industrial'],
 ['commercial','residential','park','residential']
];
export const typeNames={commercial:'Centro comercial',residential:'Bairro residencial',park:'Parque Central',industrial:'Distrito industrial',plaza:'Praça Cívica'};
export const buildingLabels={7:'Mercado Central',11:'Loja de Conveniência',15:'Hospital',16:'Banco',18:'Estação',19:'Restaurante',20:'Café',23:'Loja',25:'Museu',68:'Comércio',69:'Loja',70:'Posto de Combustível',72:'Loja de Roupas',75:'Banco',76:'Concessionária'};
let seed=1962857;
function random(){seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}
const between=(a,b)=>a+(b-a)*random();
const pick=a=>a[Math.floor(random()*a.length)];
const limitRange=(v,min,max)=>Math.max(min,Math.min(max,v));
const HOUSE=new Set([8,12,13,14,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43]);
const TOWER=new Set([0,1,2,3,4,5,15,21,22,23,24,25,26,44,45,46,47,48,49,50,51,52,74]);
const commercial=[7,11,16,19,20,23,25,68,69,70,72,73,75,76,0,1,5,21,44,45,47,49];
const residential=[8,12,13,22,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52];
const industrial=[6,9,10,53,54,55,58,59,60,61,62,64,65,66,67];
const position=(cuts,i)=>cuts[i];
export function buildCity(sizes={}){
 seed=1962857;
 const buildings=[],trees=[],props=[],npcs=[],cars=[],blocks=[];let id=0;
 for(let row=0;row<GRID;row++)for(let col=0;col<GRID;col++){
  const x=position(X_ROADS,col),y=position(Y_ROADS,row);
  const w=COL_WIDTHS[col],h=ROW_HEIGHTS[row],kind=BLOCK_TYPES[row][col];
  const block={x,y,w,h,col,row,kind,lots:[],alleys:[],details:Math.floor(random()*3)};
  blocks.push(block);
  const m=STREET/2+SIDE+24, ix=x+m,iy=y+m,iw=w-2*m,ih=h-2*m;
  if(kind==='park'||kind==='plaza'){
   // Plantio irregular, espaços livres e passagem principal no centro.
   const treeCount=kind==='park'?9:5;
   for(let i=0;i<treeCount;i++){
    const px=between(ix+15,ix+iw-15),py=between(iy+15,iy+ih-15);
    if(Math.abs(px-(x+w/2))<45||Math.abs(py-(y+h/2))<45)continue;
    trees.push({x:px,y:py,frame:pick([0,1,2,3,4,5,6,7,12,14,15]),scale:between(.57,.80)});
   }
   for(let k=0;k<(kind==='park'?5:3);k++){
    const px=between(ix+55,ix+iw-55),py=between(iy+55,iy+ih-55);
    if(Math.abs(px-(x+w/2))<60||Math.abs(py-(y+h/2))<60)continue;
    props.push({x:px,y:py,frame:2,scale:.72});
   }
  }else{
   // Lotes com subdivisões desiguais: 2 ou 3 colunas e diferentes alturas.
   // O resultado abandona as quatro construções igualmente alinhadas do protótipo.
   const sections=iw>570 && random()>.42?3:2;
   const widths=[];let left=iw;
   for(let i=0;i<sections;i++){
    let width=i===sections-1?left:limitRange(iw/sections*between(.83,1.12),140,left-140*(sections-i-1));
    widths.push(width);left-=width;
   }
   let cursor=ix;
   for(let c=0;c<sections;c++){
    const colW=widths[c],two=(random()>.22),rowSections=two?2:1;
    let firstHeight=two?ih*between(.42,.56):ih;
    for(let r=0;r<rowSections;r++){
     const sy=iy+(r?firstHeight:0),sh=(r?ih-firstHeight:firstHeight);
     const lot={x:cursor+9,y:sy+9,w:colW-18,h:sh-18,material:kind==='industrial'?'concrete':random()>.74?'stone':'pavement'};
     block.lots.push(lot);
     // Algumas parcelas ficam vazias: jardim, pátio ou futuro estacionamento.
     if(random()<(kind==='residential'?.20:.13)){
       lot.empty=true;
       if(lot.w>105&&lot.h>125)trees.push({x:lot.x+lot.w*.52,y:lot.y+lot.h*.52,frame:pick([0,1,3,4,12]),scale:.58});
       continue;
     }
     const bank=kind==='industrial'?industrial:kind==='commercial'?commercial:residential;
     let frame=pick(bank);
     // Casas baixas não podem ocupar a mesma escala que um prédio de vários andares.
     const hBase=HOUSE.has(frame)?between(103,128):TOWER.has(frame)?between(175,224):kind==='industrial'?between(145,189):between(143,177);
     const meta=sizes[`buildings/${String(frame).padStart(2,'0')}`]||[220,230];
     const aspect=meta[0]/Math.max(1,meta[1]);
     const bh=Math.min(hBase,lot.h-20,(lot.w-21)/Math.max(.2,aspect));
     const bw=bh*aspect;
     if(bh<72)continue;
     const bx=lot.x+lot.w*.5+between(-8,8),by=lot.y+lot.h*.52+between(-7,7);
     buildings.push({id:id++,x:bx,y:by,w:bw,h:bh,frame,kind,name:buildingLabels[frame]||(kind==='residential'?'Residência':kind==='industrial'?'Edifício Industrial':'Estabelecimento'),solid:true,lot});
    }
    cursor+=colW;
   }
   // Vegetação em posições próprias e sem simetria forçada.
   for(let i=0;i<2+(random()>.62?1:0);i++){
    const onTop=random()>.5;
    const tx=between(ix+10,ix+iw-10),ty=onTop?y+STREET/2+SIDE*.67:y+h-STREET/2-SIDE*.67;
    trees.push({x:tx,y:ty,frame:pick([0,1,2,3,4,5,7,12,14,15]),scale:between(.52,.77)});
   }
  }
  // Circuitos de NPCs em calçadas, adaptados a cada tamanho de quadra.
  const inset=STREET/2+38;
  const circuit=[[x+inset,y+inset],[x+w-inset,y+inset],[x+w-inset,y+h-inset],[x+inset,y+h-inset]];
  for(let k=0;k<(kind==='park'?3:2);k++){
   const idx=Math.floor(random()*4),p=circuit[idx];
   npcs.push({x:p[0]+k*7,y:p[1]+k*8,route:circuit,point:(idx+1)%4,kind:`NPC${1+(row*2+col+k)%4}`,speed:between(33,52),dir:'S',walking:true,anim:between(0,8)});
  }
 }
 // Os carros usam as coordenadas REAIS das ruas, que agora têm espaçamentos diferentes.
 for(let i=0;i<17;i++){
  const axis=i%2?'x':'y',roads=axis==='x'?Y_ROADS:X_ROADS;
  const lane=roads[i%roads.length]+pick([-30,30]);
  const direction=i%3?1:-1;
  cars.push({axis,lane,position:150+random()*(WORLD_SIZE-300),direction,speed:between(55,88),frame:pick([3,4,5,6,7,8,9,10,11,12,13]),braking:false});
 }
 const park=blocks.find(b=>b.row===1&&b.col===1);
 return {buildings,trees,props,npcs,cars,blocks,spawn:{x:park.x+park.w*.5,y:park.y+park.h*.5+44}};
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
 return typeNames[BLOCK_TYPES[locate(y,Y_ROADS)][locate(x,X_ROADS)]];
}

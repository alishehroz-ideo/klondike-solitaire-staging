export const RULES={klondike:{name:'クロンダイク',en:'KLONDIKE',subtitle:'Emerald Palace',suit:'♣'},spider:{name:'スパイダー',en:'SPIDER',subtitle:'Moonlit Atelier',suit:'♠'},freecell:{name:'フリーセル',en:'FREECELL',subtitle:'Crystal Gallery',suit:'♦'}};
export const duration=type=>type==='klondike'?300:180;
export function shuffled(n,seed){let a=Array.from({length:n},(_,i)=>i),s=2166136261;for(const c of seed)s=Math.imul(s^c.charCodeAt(0),16777619);function rnd(){s+=0x6d2b79f5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}for(let i=n-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function createGame(type,seed){if(!RULES[type])throw Error('Unknown game');const ids=shuffled(type==='spider'?104:52,seed);let cards=ids.map(id=>({id,r:id%13+1,s:type==='spider'?3:Math.floor(id/13),up:false}));let g={type,seed,cols:Array.from({length:type==='spider'?10:type==='freecell'?8:7},()=>[]),stock:[],waste:[],cells:[null,null,null,null],found:[[],[],[],[]],sets:0,flips:[],moves:0,combo:0,maxCombo:0,...(type==='klondike'?{recycles:0}:{})};if(type==='klondike'){for(let i=0;i<7;i++){g.cols[i]=cards.splice(0,i+1);g.cols[i].at(-1).up=true}g.stock=cards}else if(type==='spider'){for(let i=0;i<10;i++){g.cols[i]=cards.splice(0,i<4?6:5);g.cols[i].at(-1).up=true}g.stock=cards}else{for(let i=0;cards.length;i++)g.cols[i%8].push({...cards.shift(),up:true})}return g}
const red=c=>c.s===0||c.s===1;
export function sequence(g,list){return list.length>0&&list.every((c,i)=>c.up&&(!i||(list[i-1].r===c.r+1&&(g.type==='spider'?list[i-1].s===c.s:red(list[i-1])!==red(c)))))}
export function sourceCards(g,src){if(src.kind==='col')return g.cols[src.i]?.slice(src.at)??[];if(src.kind==='cell')return g.cells[src.i]?[g.cells[src.i]]:[];if(src.kind==='waste')return g.waste.length?[g.waste.at(-1)]:[];return[]}
export function capacity(g,dest){const free=g.cells.filter(c=>!c).length;const empty=g.cols.filter((c,i)=>c.length===0&&i!==dest).length;return(free+1)*2**empty}
export function canMove(g,src,dest){let list=sourceCards(g,src);if(!sequence(g,list))return false;if(src.kind==='col'&&dest.kind==='col'&&src.i===dest.i)return false;let c=list[0];if(dest.kind==='found')return g.type!=='spider'&&list.length===1&&c.s===dest.i&&c.r===g.found[dest.i].length+1;if(dest.kind==='cell')return g.type==='freecell'&&list.length===1&&!g.cells[dest.i]&&!(src.kind==='cell'&&src.i===dest.i);if(dest.kind!=='col'||!g.cols[dest.i])return false;const top=g.cols[dest.i].at(-1);if(g.type==='freecell'&&list.length>capacity(g,dest.i))return false;return top?top.up&&top.r===c.r+1&&(g.type==='spider'||red(top)!==red(c)):g.type!=='klondike'||c.r===13}
function flip(g,i){let c=g.cols[i]?.at(-1);if(c&&!c.up){c.up=true;if(!g.flips.includes(c.id))g.flips.push(c.id)}}
function settle(g){if(g.type==='spider')for(let i=0;i<10;i++){let a=g.cols[i];while(a.length>=13&&sequence(g,a.slice(-13))&&a.at(-13).r===13&&a.at(-1).r===1){a.splice(-13);g.sets++;g.combo++;g.maxCombo=Math.max(g.combo,g.maxCombo);flip(g,i)}}}
export function move(g,src,dest){if(!canMove(g,src,dest))return null;g=structuredClone(g);const list=sourceCards(g,src);if(src.kind==='col'){g.cols[src.i].splice(src.at);flip(g,src.i)}else if(src.kind==='cell')g.cells[src.i]=null;else g.waste.pop();if(dest.kind==='col')g.cols[dest.i].push(...list);else if(dest.kind==='cell')g.cells[dest.i]=list[0];else g.found[dest.i].push(list[0]);g.moves++;if(dest.kind==='found'){g.combo++;g.maxCombo=Math.max(g.combo,g.maxCombo)}else g.combo=0;settle(g);return g}
export function draw(g){if(g.type==='freecell')return null;g=structuredClone(g);if(g.type==='spider'){if(g.stock.length<10||g.cols.some(c=>!c.length))return null;for(let i=0;i<10;i++)g.cols[i].push({...g.stock.shift(),up:true});g.moves++;g.combo=0;settle(g);return g}if(!g.stock.length){if(!g.waste.length)return null;g.stock=g.waste.map(c=>({...c,up:false}));g.waste=[];g.recycles=(g.recycles??0)+1}else for(let i=0,n=Math.min(3,g.stock.length);i<n;i++)g.waste.push({...g.stock.shift(),up:true});g.moves++;g.combo=0;return g}
export function won(g){return g.type==='spider'?g.sets===8:g.found.reduce((n,a)=>n+a.length,0)===52}
export function score(g,seconds=duration(g.type),reason='playing'){
 const cards=g.type==='spider'?g.sets*1300:g.found.reduce((n,a)=>n+a.length,0)*100;
 const reveal=g.flips.length*40,combo=g.maxCombo*10;
 if(g.type!=='klondike'){const time=won(g)?Math.max(0,duration(g.type)-Math.floor(seconds))*5:0;return{cards,reveal,combo,time,total:cards+reveal+combo+time}}
 const clear=won(g),remaining=Math.max(0,300-Math.floor(seconds));
 const recyclePenalty=Math.max(0,(g.recycles??0)-2)*20;
 const finishPenalty=!clear&&(reason==='manual'||reason==='timeout'||reason==='stuck')?200:0;
 const penalty=recyclePenalty+finishPenalty,base=cards+reveal+combo;
 const clearBonus=clear?2000:0,time=clear?remaining*10:0;
 return{cards,reveal,combo,recyclePenalty,finishPenalty,penalty,base,clearBonus,time,total:Math.max(0,base+clearBonus+time-penalty)};
}
export function replay(type,seed,log,seconds,reason='playing'){
 if(!Number.isFinite(seconds)||seconds<0||seconds>duration(type))throw Error('Invalid result time');
 if(!['playing','manual','clear','timeout','stuck'].includes(reason))throw Error('Invalid end reason');
 let g=createGame(type,seed),last=0;
 for(const e of log){if(won(g)||!Number.isInteger(e.at)||e.at<last||e.at>duration(type)*1000)throw Error('Invalid time');const next=e.kind==='draw'?draw(g):move(g,e.src,e.dest);if(!next)throw Error('Illegal move');g=next;last=e.at}
 if(seconds*1000<last)throw Error('Invalid result time');
 if(reason==='clear'&&!won(g))throw Error('Invalid clear');
 if(reason==='timeout'&&seconds<duration(type))throw Error('Invalid timeout');
 if(reason==='stuck'&&!isStuck(g))throw Error('Invalid stuck');
 return{game:g,score:score(g,seconds,reason)};
}

// A complete draw/recycle orbit is checked without changing the live game.
export function isStuck(g){
 if(g.type!=='klondike'||won(g))return false;
 let state=g;const seen=new Set();
 while(state){
  const key=JSON.stringify([state.stock.map(c=>c.id),state.waste.map(c=>c.id)]);
  if(seen.has(key))return true;seen.add(key);
  const sources=state.cols.flatMap((a,i)=>a.map((c,at)=>({kind:'col',i,at}))).concat([{kind:'waste'}]);
  for(const src of sources){
   for(let i=0;i<4;i++)if(canMove(state,src,{kind:'found',i}))return false;
   for(let i=0;i<7;i++){
    // Moving an entire exposed King pile into an empty column changes no options.
    if(src.kind==='col'&&src.at===0&&!state.cols[i].length)continue;
    if(canMove(state,src,{kind:'col',i}))return false;
   }
  }
  state=draw(state);
 }
 return true;
}

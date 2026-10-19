import {installResponsiveLayout} from './layout.mjs';
import {prepareEnding,showEnding} from './ending.mjs';
import {prepareCardAssets} from './card-assets.mjs';
import {prepareScoreAsset,showScoreboard} from './scoreboard.mjs';
import {KLONDIKE_SEEDS} from './deals.mjs';
import {cardFace,backFace,stockBack,foundationFace} from './presentation.mjs';
import {RULES,duration,createGame,sequence,sourceCards,move,draw,won,score,replay,isStuck} from './engine.mjs';
const app=document.querySelector('#app'),suits=['♥','♦','♣','♠'],rank=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];let type='klondike',g,selected=null,mode='collection',start=0,log=[],timer,ending=false,muted=localStorage.getItem('luxe-muted')!=='false',ctx,bgm,decoded={},lastPointer=null,passMoves=0,lastPassMoves=0;const descriptions={klondike:'赤と黒を交互に重ね、AからKを完成させる。',spider:'同じマークをKからAまでつなぐ、1スート版。',freecell:'4つのフリーセルを活用する、思考のゲーム。'};
function toast(t){let el=document.querySelector('#toast');el.textContent=t;el.classList.add('visible');clearTimeout(toast.id);toast.id=setTimeout(()=>el.classList.remove('visible'),2400)}
function soundUI(){document.querySelector('#sound').innerHTML=`♪<span>${muted?'OFF':'ON'}</span>`;document.querySelector('#sound').setAttribute('aria-label',muted?'音をオンにする':'音をミュートにする')}
async function audio(){ctx??=new AudioContext({latencyHint:'interactive'});await ctx.resume();for(const name of ['card-paper','draw-paper','game-end','all-clear'])if(!decoded[name])try{decoded[name]=await ctx.decodeAudioData(await(await fetch(`audio/${name}.mp3`)).arrayBuffer())}catch{}}
function effect(name){if(muted||!ctx||!decoded[name])return;const s=ctx.createBufferSource(),v=ctx.createGain();s.buffer=decoded[name];v.gain.value=.38;s.connect(v).connect(ctx.destination);s.start()}
function music(){bgm?.pause();bgm=new Audio(`audio/${type}.wav`);bgm.loop=true;bgm.volume=.09;if(!muted)bgm.play().catch(()=>{})}
document.querySelector('#sound').onclick=async()=>{muted=!muted;localStorage.setItem('luxe-muted',muted);soundUI();if(muted)bgm?.pause();else{await audio();if(mode==='playing')bgm?.play().catch(()=>{})}};soundUI();
function setTheme(t){type=t;document.body.dataset.theme=t;document.querySelector('meta[name=theme-color]').content=t==='klondike'?'#061b14':t==='spider'?'#110d22':'#081a2a'}
function art(t,hero=false){const suit=t==='spider'?'♠':t==='freecell'?'♦':'♥';return `<div class="${hero?'hero-art':'art'}"><div class="display-card">${cardFace({s:3,r:13})}</div><div class="display-card">${cardFace({s:t==='spider'?3:t==='freecell'?1:0,r:12})}</div>${hero?`<div class="display-card">${cardFace({s:t==='spider'?3:2,r:11})}</div>`:''}</div>`}
function collection(){document.body.classList.remove('score-mode');clearInterval(timer);bgm?.pause();setTheme('klondike');mode='lobby';prepareCardAssets().catch(()=>{});prepareScoreAsset().catch(()=>{});prepareEnding().catch(()=>{});document.body.classList.add('cover-mode');window.scrollTo(0,0);app.innerHTML=`<section class="klondike-cover" aria-label="クロンダイク"><img src="assets/klondike-cover.png" alt="緑と金の宮殿を背景にしたクロンダイク・ソリティア"><button id="play" class="cover-play" aria-label="クロンダイクを始める"></button></section>`;document.querySelector('#play').onclick=begin;}
function lobby(t){setTheme(t);mode='lobby';window.scrollTo(0,0);app.innerHTML=`<button class="backlink" id="collection">← TOPへ戻る</button><section class="lobby"><div class="eyebrow">${RULES[t].subtitle}</div><h1>${RULES[t].en}</h1><h2>${RULES[t].name}</h2>${art(t,true)}<button class="playbtn" id="play">PLAY ▸</button><p class="detail">毎回ランダム配札 / 制限時間 ${t==='klondike'?'5:00 / 3枚引き':'3:00'}${t==='spider'?' / 1スート':''}<br>${descriptions[t]}</p><button class="quietbtn" id="rules">遊び方・スコア</button><p class="collection-note">自己ベスト ${best(t).toLocaleString()} pt</p></section>`;document.querySelector('#collection').onclick=collection;document.querySelector('#rules').onclick=help;document.querySelector('#play').onclick=begin}
function best(t){try{return Number(JSON.parse(localStorage.getItem('luxe-best-'+(t==='klondike'?'klondike-v3':t))||'null')?.score)||0}catch{return 0}}
function help(){document.querySelector('#help h2').textContent='遊び方';const text={klondike:['場札は赤・黒を交互に、数字を1つずつ小さくして重ねます。複数枚の正しい並びもまとめて移動できます。','空いた列にはKから始まるカードだけ置けます。山札は3枚引き。一番手前だけ動かせ、使うと下のカードが使えます。山札が尽きたら捨て札を戻せます。','組札は同じマークでA→K。カードを選んで置き先をタップ。ダブルタップで組札へ送れます。'],spider:['1スート版です。場札は数字を1つずつ小さくして重ねます。正しく連続した並びをまとめて移動できます。','K→Aの13枚が完成すると自動で回収されます。8組を完成させるとクリアです。','山札を押すと各列に1枚ずつ配ります。空の列がある間は配れません。空いた列には好きなカードを置けます。'],freecell:['場札は赤・黒を交互に、数字を1つずつ小さくして重ねます。組札は同じマークでA→K。','フリーセル4枠には各1枚を保留できます。空の列には好きなカードを置けます。','まとめて移せる枚数は（空きセル＋1）×2の空き列数乗。移動先の空き列は数えません。']}[type];document.querySelector('#helpBody').innerHTML=text.map((s,i)=>`<p class="rule"><b>${i+1}.</b> ${s}</p>`).join('')+`<p class="rule">得点：${type==='spider'?'完成1組＝1,300点':'組札1枚＝100点'}。裏のカードを開くと40点。最大連続${type==='spider'?'完成':'組札移動'}×10点。${type==='klondike'?'全クリアで2,000点、さらに残り1秒につき10点を加算。未クリアで終了・時間切れの場合は200点減点（時間ボーナスなし）。山札の再利用は2回まで無料、3回目から毎回20点減点。最終得点は0点未満になりません。':'全クリア時のみ残り1秒につき5点。'}カードの往復移動では加点しません。</p><p class="rule">時間は画面を離れても進みます。クリア手順を確認した配札からランダムに選びます。選ぶ手順によっては手詰まりになります。山札を一周する範囲まで調べて動かせるカードがない場合は、自動でゲームオーバーとなり、200点減点してスコア画面へ移動します。ヒント・やり直し機能はありません。結果はこのブラウザーに保存されます。</p>`;document.querySelector('#help').showModal()}
document.querySelector('#closeHelp').onclick=()=>document.querySelector('#help').close();document.querySelector('.brand').onclick=e=>{e.preventDefault();if(mode==='loading'||mode==='playing'||mode==='ending')toast('ゲーム終了後にTOPへ戻れます');else collection()};
async function begin(){
 if(mode==='loading'||mode==='playing'||mode==='ending')return;
 mode='loading';const play=document.querySelector('#play');play.disabled=true;play.setAttribute('aria-label','カードを準備しています');
 document.querySelector('.card-loading')?.remove();const loading=document.createElement('p');loading.className='card-loading';loading.setAttribute('role','status');loading.textContent='カードを準備しています…';app.append(loading);
 try{await prepareCardAssets()}catch{mode='lobby';play.disabled=false;play.setAttribute('aria-label','クロンダイクを始める');loading.textContent='画像を読み込めませんでした。もう一度PLAYを押してください。';return}
 loading.remove();
document.body.classList.remove('score-mode');document.body.classList.remove('cover-mode');let seed=crypto.randomUUID();if(type==='klondike'){const last=localStorage.getItem('luxe-last-deal');const pool=KLONDIKE_SEEDS.filter(s=>s!==last);const v=new Uint32Array(1);crypto.getRandomValues(v);seed=pool[Math.floor(v[0]/4294967296*pool.length)];localStorage.setItem('luxe-last-deal',seed)}g=createGame(type,seed);selected=null;log=[];passMoves=0;lastPassMoves=0;ending=false;start=performance.now();mode='playing';document.querySelector('#help').close();render();window.scrollTo(0,0);document.querySelector('.board').classList.add('dealing');audio().then(()=>effect('draw-paper'));music();clearInterval(timer);timer=setInterval(tick,150);tick()}
function seconds(){return Math.min(duration(type),(performance.now()-start)/1000)}
function card(c,src,top=0){let sel=selected&&selected.kind===src.kind&&selected.i===src.i&&(src.kind!=='col'||src.at>=selected.at);return `<button class="card ${c.up?'':'back'} ${c.s<2?'red':''} ${sel?'selected':''}" style="top:${top}px" data-src='${JSON.stringify(src)}' aria-label="${c.up?suits[c.s]+rank[c.r]:'裏向きカード'}" ${c.up?'draggable="true"':''}>${c.up?cardFace(c):backFace()}</button>`}
function render(){const boardScroll=app.querySelector('.columns')?.scrollTop||0;let pts=score(g,seconds());app.innerHTML=`<div class="game-top"><h1>${RULES[type].name}<small>${RULES[type].subtitle.toUpperCase()}</small></h1></div><div class="stats"><div class="stat"><small>SCORE</small><b id="score">${pts.total.toLocaleString()}</b></div><div class="stat"><small>TIME LEFT</small><b id="time">${type==='klondike'?'5:00':'3:00'}</b></div><div class="stat"><small>${type==='spider'?'COMPLETED':'FOUNDATION'}</small><b>${type==='spider'?g.sets+'/8':g.found.reduce((n,c)=>n+c.length,0)+'/52'}</b></div></div><div class="timerbar"><i id="bar"></i></div><section class="board ${type}" aria-label="カード盤面"><div class="zones ${type==='klondike'?'klondike-zones':''}">${type==='freecell'?g.cells.map((c,i)=>`<div class="zone cell" data-dest='{"kind":"cell","i":${i}}'>${c?card(c,{kind:'cell',i}):'◇'}<span class="slotlabel">FREE</span></div>`).join(''):`<button class="zone ${type==='klondike'?'stock-slot':''}" id="stock" aria-label="${type==='spider'?'各列に1枚配る':'山札を引く'}">${g.stock.length?(type==='klondike'?stockBack():'♠'):'↻'}<span class="slotlabel">${type==='klondike'?'山札 · ':''}${g.stock.length}${type==='klondike'?'枚':' CARDS'}</span></button>${type==='klondike'?`<div class="zone waste-zone">${g.waste.slice(-3).map((c,i,a)=>i===a.length-1?card(c,{kind:'waste'}):`<div class="waste-peek ${c.s<2?'red':''}" aria-hidden="true" style="left:${22*i}%">${cardFace(c)}</div>`).join('')}<span class="slotlabel">手前のカードを使用</span></div>`:''}`}<div class="spacer"></div>${type==='spider'?`<div class="eyebrow" style="align-self:center">${g.sets} / 8 SETS</div>`:g.found.map((a,i)=>`<div class="zone foundation-zone" data-dest='{"kind":"found","i":${i}}'>${foundationFace(a,i)}<span class="slotlabel">${a.length}/13</span></div>`).join('')}</div><div class="columns" data-scroll-top="${boardScroll}">${g.cols.map((a,i)=>{let gap=type==='spider'?19:25;return `<div class="column" data-dest='{"kind":"col","i":${i}}' style="height:${Math.max(240,a.length*gap+85)}px"><div class="emptycol">${type==='klondike'?'K':'◇'}</div>${a.map((c,at)=>card(c,{kind:'col',i,at},at*gap)).join('')}</div>`}).join('')}</div></section>`;if(document.querySelector('#stock'))document.querySelector('#stock').onclick=()=>actionDraw();app.querySelectorAll('[data-src]').forEach(el=>{let src=JSON.parse(el.dataset.src);el.onclick=e=>{e.stopPropagation();select(src)};el.ondblclick=e=>{e.stopPropagation();if(type!=='spider'){selected=src;attempt({kind:'found',i:sourceCards(g,src)[0]?.s})}};el.ondragstart=e=>{if(!sequence(g,sourceCards(g,src))){e.preventDefault();return}selected=src;e.dataTransfer.setData('text/plain','card')};el.ondragend=()=>{}});app.querySelectorAll('[data-dest]').forEach(el=>{let dest=JSON.parse(el.dataset.dest);el.onclick=()=>attempt(dest);el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();attempt(dest)}});tick()}
function select(src){if(mode!=='playing'||ending)return;if(seconds()>=duration(type)){finish(false);return}if(selected&&src.kind==='col'&&!(selected.kind==='col'&&selected.i===src.i)){if(attempt({kind:'col',i:src.i}))return}if(!sequence(g,sourceCards(g,src))){toast('表向きの正しい並びを選んでください');return}if(JSON.stringify(selected)===JSON.stringify(src))selected=null;else selected=src;render()}
function attempt(dest){if(mode!=='playing'||ending||!selected)return false;if(seconds()>=duration(type)){finish(false);return false}let n=move(g,selected,dest);if(!n){toast('その場所には置けません');return false}let e={kind:'move',src:selected,dest,at:Math.floor(seconds()*1000)};g=n;log.push(e);passMoves++;selected=null;effect('card-paper');render();if(dest.kind==='col')document.querySelectorAll('.column')[dest.i]?.classList.add('moveflash');if(won(g))finish(true);else if(isStuck(g))finish(false,'stuck');return true}
function actionDraw(){if(mode!=='playing'||ending)return;if(seconds()>=duration(type)){finish(false);return}const completedPass=type==='klondike'&&!g.stock.length&&g.waste.length>0;const noProgress=completedPass&&passMoves===lastPassMoves;let n=draw(g);if(!n){toast(type==='spider'?'空の列を埋めるか、山札を確認してください':'山札がありません');return}g=n;log.push({kind:'draw',at:Math.floor(seconds()*1000)});selected=null;effect('draw-paper');render();if(completedPass){lastPassMoves=passMoves;if(noProgress){toast('カードを使わず一周しました。場札で動かせるカードを確認してください。');clearTimeout(toast.id);toast.id=setTimeout(()=>document.querySelector('#toast').classList.remove('visible'),6500)}}if(won(g))finish(true);else if(isStuck(g))finish(false,'stuck')}
function tick(){if(mode!=='playing'||ending)return;let left=Math.max(0,duration(type)-Math.floor(seconds()));let el=document.querySelector('#time');if(el){el.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');el.classList.toggle('warning',left<=15);document.querySelector('#bar').style.width=(left/duration(type)*100)+'%'}if(seconds()>=duration(type))finish(false)}
async function finish(clear,reason=clear?'clear':'timeout'){if(ending)return;ending=true;clearTimeout(toast.id);document.querySelector('#toast').classList.remove('visible');let elapsed=seconds();clearInterval(timer);bgm?.pause();mode='ending';window.scrollTo(0,0);document.querySelector('#help').close();let pts=score(g,elapsed,reason);app.innerHTML=`<div class="ending"><div class="eyebrow">${clear?'BEAUTIFULLY PLAYED':'CHALLENGE COMPLETE'}</div><h1>${clear?'ゲームクリア':'ゲームオーバー'}</h1><p>${clear?'すべてのカードをクリア':reason==='stuck'?'動かせるカードがありません。200点減点してスコアへ移動します。':'スコアを集計しています'}</p></div>`;effect(clear?'all-clear':'game-end');if(!clear){try{await showEnding(app)}catch{}}setTimeout(()=>result(pts,elapsed,clear,reason),clear?1250:2000)}
async function result(pts,elapsed,clear,reason){
try{await showScoreboard(app,pts,{cards:g.found.flat().length,elapsed,moves:g.moves,combo:g.maxCombo,recycles:g.recycles??0})}catch{
 const message=app.querySelector('.ending p');if(message)message.textContent='スコア画面を読み込めませんでした。再試行してください。';
 if(!app.querySelector('#retryScore')){const button=document.createElement('button');button.id='retryScore';button.className='quietbtn';button.textContent='再試行';button.onclick=()=>{button.remove();result(pts,elapsed,clear,reason)};app.querySelector('.ending').append(button)}return;
}
mode='result';const old=best(type);let saved=false;try{const verified=replay(type,g.seed,log,elapsed,reason);if(verified.score.total!==pts.total)throw Error('Score mismatch');const detail={type,score:pts.total,elapsed,reason,rulesVersion:type==='klondike'?3:1,seed:g.seed,moves:log,date:new Date().toISOString()};if(pts.total>old)localStorage.setItem('luxe-best-'+(type==='klondike'?'klondike-v3':type),JSON.stringify(detail));localStorage.setItem('luxe-last-'+type,JSON.stringify(detail));saved=true}catch{}document.querySelector('#registerScore').onclick=()=>{const status=document.querySelector('#registrationStatus');if(!saved){status.textContent='記録を保存できませんでした';return}try{localStorage.setItem('luxe-registered-'+type,localStorage.getItem('luxe-last-'+type));status.textContent='このブラウザーに登録しました';document.querySelector('#registerScore').disabled=true;document.querySelector('#registerScore').setAttribute('aria-label','登録済み')}catch{status.textContent='記録を保存できませんでした'}}}

installResponsiveLayout();
// ---- GameBull hooks (gamebull/client-hooks.mjs) ----
// Appended to the client's dist/app.mjs at build time by vite.gamebull.config.ts (their file in dist/ is never
// edited). It runs in the same module scope as their code, so their functions (begin, tick, select, attempt,
// actionDraw, finish, result) are module bindings this block can wrap, and their `let`s (g, mode, start, log,
// ending, timer, bgm, selected...) are shared. The build drops their last statement `collection();` (their TOP
// page with the cover art and the score-board picture): __gbPark() below is that function without those two
// pictures, because the GameBull lobby replaces their TOP page and the GameBull board their score page.
// The GameBull shell (main.tsx, another module) only talks to window.KLClient.
import {canMove as __gbCanMove} from './engine.mjs';

const __gbHooks={onLock:null,onZero:null,onEnd:null}; // set by the shell
let __gbRunMs=duration('klondike')*1000;              // the run's length (the client's 300 s, or a challenge limit)
let __gbHeld=false;    // Score Challenge: board dealt, frozen under the 5..1 GO intro
let __gbTarget=0;      // Score Challenge target (early finish), 0 = none
let __gbLocked=false;  // input locked: target reached / clock at 0 / run over
let __gbZero=false;    // the 0.7 s zero hold has started
let __gbEnded=false;   // the end has been handed to the shell (once per run)
let __gbLastScore=0;

// A run shorter than the client's 300 s starts with the difference already used, so their own clock, timer bar,
// time bonus (remaining whole seconds x 10) and replay check need no change.
// GameBull: sound ON until the player chooses (their own default is OFF: muted unless "luxe-muted" is 'false').
// Once the player taps their sound button (or the GameBull mute), their own code saves the choice and it is kept.
try{if(localStorage.getItem('luxe-muted')===null){muted=false;soundUI();console.log('[KL-GB] Sound ON by default (no saved choice yet).')}}catch{}

const __gbOffsetMs=()=>Math.max(0,duration(type)*1000-__gbRunMs);
const __gbLive=()=>mode==='playing'&&!ending&&!__gbHeld&&!__gbLocked;

// Their collection() without the cover picture and the score-board picture (see the header).
function __gbPark(){document.body.classList.remove('score-mode');document.body.classList.remove('cover-mode');clearInterval(timer);bgm?.pause();setTheme('klondike');mode='lobby';prepareCardAssets().catch(()=>{});prepareEnding().catch(()=>{});window.scrollTo(0,0);app.innerHTML='<button id="play" hidden></button>'}

const __gbBegin=begin;
begin=async function(){
 await __gbBegin();
 if(mode!=='playing')return;   // their card images failed to load: their own message stays on screen
 start=performance.now()-__gbOffsetMs();tick();
 console.log('[KL-GB] Client deal '+g.seed+' started: '+Math.round(__gbRunMs/1000)+' s on the clock'+(__gbHeld?' (held for the intro).':'.'));
};

// While held, the clock stays full (their tick keeps drawing it).
const __gbTick=tick;
tick=function(){if(__gbHeld&&mode==='playing')start=performance.now()-__gbOffsetMs();__gbTick()};

function __gbCheckTarget(){
 if(__gbTarget<=0||!__gbLive())return;
 const s=score(g,seconds()).total;
 if(s<__gbTarget)return;
 __gbLocked=true;selected=null;render();
 console.log('[KL-GB] Challenge target '+__gbTarget+' reached at '+s+'; ending in 0.9 s.');
 // If the clock ran out during the beat, their own timeout has ended the run already.
 setTimeout(()=>{if(mode==='playing'&&!ending)finish(won(g),won(g)?'clear':'target')},900);
}
const __gbSelect=select;
select=function(src){if(__gbHeld||__gbLocked)return;__gbSelect(src)};
const __gbAttempt=attempt;
attempt=function(dest){if(__gbHeld||__gbLocked)return false;const r=__gbAttempt(dest);__gbCheckTarget();return r};
const __gbDraw=actionDraw;
actionDraw=function(){if(__gbHeld||__gbLocked)return;__gbDraw();__gbCheckTarget()};

const __gbFinish=finish;
finish=function(clear,reason=clear?'clear':'timeout'){
 if(ending||__gbEnded)return;
 if(reason==='timeout'){
  // Clock at 0: lock now, hold "0" for 0.7 s (the shell's countdown), then their own end.
  if(__gbZero)return;
  __gbZero=true;__gbLocked=true;selected=null;
  __gbHooks.onLock?.('clock');
  if(__gbHooks.onZero){__gbHooks.onZero(()=>__gbFinish(false,'timeout'));return}
  return __gbFinish(false,'timeout');
 }
 __gbLocked=true;__gbHooks.onLock?.(reason);
 if(reason==='target'){
  // Target reached: no "game over" picture (that is their timeout / dead-end screen); straight to the board.
  ending=true;clearTimeout(toast.id);document.querySelector('#toast').classList.remove('visible');
  const elapsed=seconds();clearInterval(timer);bgm?.pause();mode='ending';document.querySelector('#help').close();
  effect('all-clear');result(score(g,elapsed,reason),elapsed,false,reason);return;
 }
 return __gbFinish(clear,reason);
};

// Their score page is replaced by the GameBull board: their result() gets the same numbers their scoreboard
// would show (their score(), their replay check), and hands them to the shell instead.
const __gbResult=result;
result=async function(pts,elapsed,clear,reason){
 if(__gbEnded)return;
 if(!__gbHooks.onEnd)return __gbResult(pts,elapsed,clear,reason);
 __gbEnded=true;mode='result';
 let check;
 try{const v=replay(type,g.seed,log,elapsed,reason==='target'?'playing':reason);check=v.score.total===pts.total?'replay ok':'REPLAY MISMATCH '+v.score.total}catch(e){check='replay failed: '+e.message}
 const f={reason,clear,total:pts.total,cards:pts.cards,reveal:pts.reveal,combo:pts.combo,clearBonus:pts.clearBonus??0,
  recyclePenalty:pts.recyclePenalty??0,finishPenalty:pts.finishPenalty??0,time:pts.time,
  foundation:g.found.flat().length,flips:g.flips.length,maxCombo:g.maxCombo,recycles:g.recycles??0,moves:g.moves,
  secondsLeft:clear?Math.max(0,duration(type)-Math.floor(elapsed)):0,elapsed,seed:g.seed,check};
 console.log('[KL-GB] Client run end \''+reason+'\': foundation '+f.foundation+'/52, reveals '+f.flips+', max combo '+f.maxCombo+', recycles '+f.recycles+', client score '+f.total+' ('+check+', '+log.length+' actions, deal '+g.seed+').');
 __gbHooks.onEnd(f);
};

// iPhone / Safari: sound may only start inside a tap, and Safari (unlike Chrome) does not count an earlier tap.
// On their own site begin() runs inside the PLAY tap; here the shell calls it after a server call, so on an iPhone
// their music's play() is refused and their AudioContext stays suspended (their audio() then waits on resume()
// and never decodes their effects). Without their music playing, older iPhones also put Web Audio (their effects,
// the GameBull countdown ticks) under the silent switch. So on the player's taps during a run, start them exactly
// as their own code does: their audio() (resume + decode) and their music, if their sound is on.
function __gbAudioTap(){
 if(muted||mode!=='playing'||ending)return;
 if(!ctx||ctx.state!=='running'||!decoded['card-paper'])audio().catch(()=>{});
 if(bgm&&bgm.paused)bgm.play().then(()=>console.log('[KL-GB] Client music started on a tap (Safari: no autoplay outside a tap).')).catch(()=>{});
}
for(const t of ['touchend','pointerup','click','keydown'])document.addEventListener(t,__gbAudioTap,{capture:true,passive:true});

window.KLClient={
 hooks:__gbHooks,
 // Under the lobby: their TOP state without the cover (music off, no clock).
 park(){__gbPark()},
 // A run = their own PLAY (begin(): random verified deal, card decode wait, music), then the GameBull run length.
 async start(runMs,target,hold){
  __gbRunMs=runMs;__gbTarget=target||0;__gbHeld=!!hold;__gbLocked=false;__gbZero=false;__gbEnded=false;__gbLastScore=0;
  __gbPark();await begin();
 },
 go(){__gbHeld=false;if(mode==='playing'){start=performance.now()-__gbOffsetMs();tick()}},
 totalScore(){if(g&&(mode==='playing'||mode==='ending'))__gbLastScore=score(g,seconds()).total;return __gbLastScore},
 remaining(){return mode==='playing'?Math.max(0,duration(type)-seconds()):0},
 isRunning(){return __gbLive()},
 muted(){return muted},
 // Localhost autoplay only (gamebull/ui/DevAuto.tsx): 1 = sensible moves, 2 = draw only. Their own attempt() /
 // actionDraw() run every move, so their rules decide everything.
 autoStep(how){
  if(!__gbLive())return;
  if(how!=='2'){
   const tops=[{kind:'waste'},...g.cols.map((a,i)=>a.length?{kind:'col',i,at:a.length-1}:null).filter(Boolean)];
   for(const s of tops)for(let i=0;i<4;i++)if(__gbCanMove(g,s,{kind:'found',i})){selected=s;attempt({kind:'found',i});return}
   for(let i=0;i<7;i++){const a=g.cols[i],at=a.findIndex(c=>c.up);if(at<=0)continue;
    for(let j=0;j<7;j++)if(__gbCanMove(g,{kind:'col',i,at},{kind:'col',i:j})){selected={kind:'col',i,at};attempt({kind:'col',i:j});return}}
   for(let j=0;j<7;j++)if(__gbCanMove(g,{kind:'waste'},{kind:'col',i:j})){selected={kind:'waste'};attempt({kind:'col',i:j});return}
  }
  actionDraw();
 },
};
window.dispatchEvent(new Event('klclient-ready'));

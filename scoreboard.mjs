export function scoreboard(pts,{cards,elapsed,moves,combo,recycles}){
const n=v=>Number(v).toLocaleString('ja-JP');
return `<section class="palace-score" aria-label="スコアボード"><img class="score-art" src="assets/score-palace.png" alt="王冠と金の装飾に彩られた宮殿のスコアボード"><h1 class="sr-only">スコア</h1><div class="palace-total"><span class="score-number">${n(pts.total)}</span><small>pt</small></div><div class="palace-summary"><span>組札<b>${cards}/52</b></span><span>プレイ時間<b>${Math.floor(elapsed)}秒</b></span><span>手数<b>${moves}手</b></span></div><dl class="palace-details">${[['♤','組札に移した得点',pts.cards],['♧','カードをめくった得点',pts.reveal],['★','コンボ ×'+combo,pts.combo],['♛','全クリアボーナス',pts.clearBonus??0],['↶','山札の再利用（'+recycles+'回）','−'+n(pts.recyclePenalty??0)],['!','ゲームオーバー減点','−'+n(pts.finishPenalty??0)],['⌛','時間ボーナス',pts.time]].map(([icon,label,value])=>`<div><dt><i aria-hidden="true">${icon}</i>${label}</dt><dd>${typeof value==='number'?n(value):value} <small>pt</small></dd></div>`).join('')}</dl><button class="palace-register" id="registerScore" aria-label="スコア登録"></button><p class="sr-only" id="registrationStatus" role="status"></p></section>`;
}

let scoreAsset;
export function prepareScoreAsset(){
 if(!scoreAsset){const image=new Image();image.src=new URL('assets/score-palace.png',import.meta.url).href;scoreAsset=image.decode().then(()=>image).catch(error=>{scoreAsset=null;throw error})}
 return scoreAsset;
}
export async function showScoreboard(app,pts,detail){
 await prepareScoreAsset();
 const template=document.createElement('template');template.innerHTML=scoreboard(pts,detail);
 const section=document.importNode(template.content.firstElementChild,true);
 const art=section.querySelector('.score-art');art.src=new URL('assets/score-palace.png',import.meta.url).href;await art.decode();
 document.body.classList.add('score-mode');
 app.replaceChildren(section);window.scrollTo(0,0);
}


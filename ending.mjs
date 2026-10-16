let ready;
export function prepareEnding(){
 if(!ready){const image=new Image();image.src=new URL('assets/game-over-palace.png',import.meta.url).href;ready=image.decode().then(()=>image).catch(e=>{ready=null;throw e})}return ready;
}
export async function showEnding(app){
 const image=await prepareEnding();
 const section=document.createElement('section');section.className='ending palace-ending';section.setAttribute('aria-label','ゲームオーバー');
 image.alt='ゲームオーバー。スコアを集計しています。';section.append(image);
 const status=document.createElement('p');status.className='sr-only';status.setAttribute('role','status');section.append(status);
 document.body.classList.add('score-mode');app.replaceChildren(section);window.scrollTo(0,0);
}

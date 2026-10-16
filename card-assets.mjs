import {DECK} from './presentation.mjs';
const images=[];
let pending;
export function prepareCardAssets(){
 if(pending)return pending;
 pending=Promise.all(DECK.map(async ({file})=>{
  const image=new Image();images.push(image);
  image.src=new URL('assets/'+file,import.meta.url).href;
  await image.decode();
  if(!image.naturalWidth)throw new Error('Card image unavailable');
 })).catch(error=>{pending=null;images.length=0;throw error});
 return pending;
}

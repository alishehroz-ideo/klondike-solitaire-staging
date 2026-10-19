/* Presentation only: never reads or changes game state, moves or scoring. */
let installed = false;
export function installResponsiveLayout() {
  if (installed) return;
  installed = true;
  const app = document.querySelector('#app');
  const body = document.body;
  let frame = 0;
  let previousArea = null;
  const set = (el, key, value) => {
    if (el.style.getPropertyValue(key) !== value) el.style.setProperty(key, value);
  };
  function update() {
    frame = 0;
    const board = app.querySelector('.board.klondike');
    body.classList.toggle('playing-view', Boolean(board));
    if (board) {
      const area = board.querySelector('.columns');
      const available = Math.max(0, area.clientHeight - 8);
      for (const column of area.children) {
        const cards = [...column.querySelectorAll(':scope > .card')];
        const cardHeight = column.clientWidth / .66;
        const upSteps = cards.slice(0,-1).filter(c => !c.classList.contains('back')).length;
        const downSteps = Math.max(0, cards.length - 1 - upSteps);
        let upGap = Math.max(25, Math.min(33, column.clientWidth * .48));
        let downGap = Math.max(8, Math.min(14, column.clientWidth * .22));
        if (cardHeight + upSteps*upGap + downSteps*downGap > available) downGap = 6;
        if (upSteps) upGap = Math.max(24, Math.min(upGap, (available-cardHeight-downSteps*downGap)/upSteps));
        let y = 0;
        for (let i=0;i<cards.length;i++) {
          set(cards[i], 'top', `${Math.round(y*100)/100}px`);
          if (i < cards.length-1) y += cards[i].classList.contains('back') ? downGap : upGap;
        }
        set(column, 'height', `${Math.ceil(Math.max(available,y+cardHeight))}px`);
      }
      if (area !== previousArea) area.scrollTop = Number(area.dataset.scrollTop) || 0;
      previousArea = area;
    } else {
      previousArea = null;
    }
    const art = app.querySelector('.klondike-cover,.palace-score,.palace-ending');
    if (art) {
      const img = art.querySelector('img');
      const ratio = img?.naturalHeight && img?.naturalWidth ? img.naturalHeight/img.naturalWidth : art.classList.contains('palace-ending') ? 2 : 1844/853;
      // Keep the entire original artwork and all overlaid controls visible.
      const width = Math.min(app.clientWidth, 560, app.clientHeight/ratio);
      set(body, '--art-width', `${width}px`);
      set(body, '--art-top', `${Math.max(0,(app.clientHeight-width*ratio)/2)}px`);
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  const resize = new ResizeObserver(schedule);
  resize.observe(body); resize.observe(app);
  new MutationObserver(schedule).observe(app,{childList:true});
  app.addEventListener('load',schedule,true);
  window.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  schedule();
}

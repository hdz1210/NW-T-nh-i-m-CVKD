// Builds an isolated proposal from the incumbent ConfigUI DOM and CSS.
// No Apps Script calls, no changes to src, no live spreadsheet data.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const root = __dirname;
const sourcePath = path.resolve(root, '../../../src/ConfigUI.html');
const source = fs.readFileSync(sourcePath, 'utf8');
const bootstrap = source.replace(/window\.addEventListener\('DOMContentLoaded', function\(\) \{\s*fetchData\(\);\s*\}\);/, '');
if (bootstrap === source) throw new Error('Could not isolate the original data-loading bootstrap');
const additionCSS = `
body{padding:0;background:#eef2f6}
.modal-backdrop{position:static;display:flex;background:transparent;align-items:flex-start;padding:0}
.modal-content{animation:none;box-shadow:none;max-width:100%;margin:0 auto}
.progressive-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-strong);margin:2px 0 4px}
.progressive-tabs .tab-btn{font-size:13px;padding:7px 12px;justify-content:center;flex:1}
.progressive-fields[hidden]{display:none}
.progressive-fields .filter-input{width:100%;height:36px;font-weight:700;text-align:center}
.proposal-error{font-size:11px;color:var(--danger)}
.proposal-error:empty{display:none}
@media(max-width:560px){.modal-content{padding:16px}.price-controls{flex-wrap:wrap}.price-controls>label{flex-basis:100%}.price-controls>div:nth-last-child(2){display:none}.score-heading{flex-wrap:wrap;gap:6px}}
`;
const isolatedScript = `
const isF2=document.getElementById('addFundType').value==='f2';
const prefix=isF2?'addF2':'add';
const minEl=document.getElementById(prefix+'GiaTu');
const maxEl=document.getElementById(prefix+'GiaDen');
const priceLabel=document.getElementById(prefix+'KhoangGiaPreview');
const scoreEl=document.getElementById(isF2?'addScoreF2':'addScore');
const stepEl=document.getElementById('proposalStep');
const extraEl=document.getElementById('proposalExtra');
let progressive=true;
function updateProposal(){
  const min=Number(minEl.value),max=Number(maxEl.value);
  let range=progressive?(max>=999?'> '+min:min+' < Giá ≤ '+max):(min<=0&&max>=999?'Tất cả':min===max?'= '+min:min<=0?'< '+max:max>=999?'>= '+min:min+' - '+max);
  priceLabel.textContent=range;
  priceLabel.style.color=range==='Tất cả'?'var(--text-tertiary)':'#92400e';
  priceLabel.style.background=range==='Tất cả'?'var(--bg-muted)':'#fef3c7';
  priceLabel.style.borderColor=range==='Tất cả'?'var(--border-subtle)':'#fde68a';
  const inputs=[minEl,maxEl,scoreEl,...(progressive?[stepEl,extraEl]:[])];
  const blank=inputs.some(el=>el.value==='');
  const invalid=inputs.some(el=>el.value!==''&&(!Number.isFinite(Number(el.value))||Number(el.value)<0))||min>=999||max>999||(max<999&&(progressive?max<=min:max<min))||(progressive&&(Number(stepEl.value)<=0||Number(extraEl.value)<=0));
  const invalidMonth=progressive&&document.getElementById(prefix+'ScoreMonth').value==='ALL';
  document.getElementById('proposalError').textContent=invalidMonth?'Vui lòng chọn một tháng áp dụng cụ thể.':invalid?'Kiểm tra khoảng giá, bước tăng và điểm cộng.':'';
  document.querySelector('.modal-footer .btn-primary').disabled=invalid||invalidMonth||blank;
}
function setMode(on){
  progressive=on;
  document.getElementById('proposalFixed').classList.toggle('active',!on);
  document.getElementById('proposalProgressive').classList.toggle('active',on);
  document.getElementById('proposalFixed').setAttribute('aria-selected',String(!on));
  document.getElementById('proposalProgressive').setAttribute('aria-selected',String(on));
  document.getElementById('proposalProgressiveFields').hidden=!on;
  const allOption=document.querySelector('#'+prefix+'ScoreMonth option[value="ALL"]');
  if(allOption)allOption.disabled=on;
  updateProposal();
}
document.getElementById('proposalFixed').addEventListener('click',()=>setMode(false));
document.getElementById('proposalProgressive').addEventListener('click',()=>setMode(true));
document.querySelectorAll('input').forEach(el=>el.addEventListener('input',updateProposal));
document.getElementById(prefix+'ScoreMonth').addEventListener('change',updateProposal);
document.getElementById('addFundType').addEventListener('change',event=>location.href=event.target.value==='f2'?'mockup-f2.html':'mockup.html');
document.querySelectorAll('.modal-close,.modal-footer .btn-secondary').forEach(el=>el.addEventListener('click',()=>document.getElementById('addRowModal').style.display='none'));
document.querySelector('.modal-footer .btn-primary').addEventListener('click',()=>alert('Mockup: chưa ghi dữ liệu vào Google Sheets.'));
setMode(true);
`;
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results=[];
  for(const fund of ['th','f2']){
    const page=await browser.newPage({viewport:{width:720,height:1200},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent(bootstrap,{waitUntil:'load'});
    await page.evaluate(async fund=>{
      configData={thMonths:[{colIdx:10,dateStr:'2026-09-01',display:'09/2026'}],thRows:[],f2Months:[{colIdx:4,dateStr:'2026-09-01',display:'09/2026'}],f2Rows:[],campaign:{rows:[]}};
      activeTab=fund;
      openAddRowModal();
      await document.fonts.ready;
    },fund);
    const snapshot=await page.evaluate(fund=>{
      const p=fund==='f2'?'addF2':'add';
      const modal=document.getElementById('addRowModal');
      const score=document.getElementById(fund==='f2'?'addScoreF2':'addScore');
      document.getElementById(p+'GiaTu').setAttribute('value','50');
      document.getElementById(p+'GiaDen').setAttribute('value','999');
      score.setAttribute('value','5');
      const box=document.getElementById(p+'ScoreMonthBadge').parentElement.parentElement;
      box.firstElementChild.classList.add('score-heading');
      box.firstElementChild.insertAdjacentHTML('afterend','<div class="progressive-tabs" role="tablist" aria-label="Cách tính điểm"><button type="button" class="tab-btn" id="proposalFixed" role="tab" aria-selected="false">Điểm cố định</button><button type="button" class="tab-btn active" id="proposalProgressive" role="tab" aria-selected="true" aria-controls="proposalProgressiveFields">Lũy tiến theo giá</button></div>');
      box.insertAdjacentHTML('beforeend','<div class="form-row-2 progressive-fields" id="proposalProgressiveFields" role="tabpanel" aria-labelledby="proposalProgressive"><div class="form-group"><label class="field-label" for="proposalStep">Mỗi (tỷ VNĐ) <span style="color:var(--danger)">*</span></label><input type="number" min="0.01" step="0.5" class="filter-input" id="proposalStep" value="10"></div><div class="form-group"><label class="field-label" for="proposalExtra">Cộng thêm (điểm) <span style="color:var(--danger)">*</span></label><input type="number" min="0.01" step="0.5" class="filter-input" id="proposalExtra" value="1"></div></div><div class="proposal-error" id="proposalError" role="alert"></div>');
      document.getElementById(p+'GiaTu').parentElement.parentElement.classList.add('price-controls');
      for(const el of modal.querySelectorAll('*')) for(const attr of [...el.attributes]) if(attr.name.startsWith('on'))el.removeAttribute(attr.name);
      modal.querySelector('option[value="campaign"]').remove();
      const fonts=[...document.querySelectorAll('head link')].map(el=>el.outerHTML).join('\n');
      return {html:modal.outerHTML,css:document.querySelector('head style').textContent,fonts,fontLoaded:document.fonts.check('13px Manrope')};
    },fund);
    const content='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mockup setting '+(fund==='f2'?'Quỹ Chéo':'Quỹ NW')+'</title>'+snapshot.fonts+'<style>'+snapshot.css+additionCSS+'</style></head><body>'+snapshot.html+'<script>'+isolatedScript+'</script></body></html>';
    const name=fund==='f2'?'mockup-f2.html':'mockup.html';
    fs.writeFileSync(path.join(root,name),content);
    await page.goto(pathToFileURL(path.join(root,name)).href);
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.modal-content').screenshot({path:path.join(root,fund==='f2'?'mockup-quy-cheo.png':'mockup-quy-nw.png')});
    await page.locator('#proposalFixed').click();
    await page.locator('#'+(fund==='f2'?'addF2':'add')+'GiaTu').fill('0');
    await page.locator('#'+(fund==='f2'?'addScoreF2':'addScore')).fill('');
    await page.evaluate(()=>document.activeElement.blur());
    await page.locator('.modal-content').screenshot({path:path.join(root,fund==='f2'?'mockup-quy-cheo-co-dinh.png':'mockup-quy-nw-co-dinh.png')});
    await page.locator('#proposalProgressive').click();
    await page.locator('#'+(fund==='f2'?'addF2':'add')+'GiaTu').fill('50');
    await page.locator('#'+(fund==='f2'?'addScoreF2':'addScore')).fill('5');
    await page.setViewportSize({width:430,height:1400});
    await page.evaluate(()=>document.activeElement.blur());
    const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    await page.locator('.modal-content').screenshot({path:path.join(root,fund==='f2'?'qa-mobile-cheo.png':'qa-mobile-nw.png')});
    if(errors.length)throw new Error(errors.join('; '));
    if(layout.scrollWidth>layout.width)throw new Error('Mobile overflow: '+JSON.stringify(layout));
    results.push({fund,fontLoaded:snapshot.fontLoaded,errors,layout,source:'src/ConfigUI.html',change:'Only score tabs and two progressive inputs added'});
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(root,'qa-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exit(1)});

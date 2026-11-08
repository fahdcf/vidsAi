// Isolated UI regression check. No workers or external providers are started.
// Usage: node scripts/studio-ui-check.cjs [path-to-built-ui]
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const runtime = fs.realpathSync(path.resolve(root, '../runtime'));
const directory = fs.mkdtempSync(path.join(runtime, 'studio-ui-'));
const bundle = path.resolve(process.argv[2] || path.join(root, 'dist'));
const origin = 'http://127.0.0.1:5288';
const server = cp.spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', String.raw`
import express from 'express';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {app} from './server/app.ts';
import {insert,now} from './server/database.ts';
const uid=insert('users',{name:'Studio check',email:'studio@example.test',password:await bcrypt.hash('Studio-test-only-42',10),created_at:now()});
for (const [i,name,status] of [[1,'Golden hour stories','reviewing'],[2,'Weekend in motion','completed'],[3,'A new perspective','pending']]) {
 const id=insert('projects',{user_id:uid,name,type:'product',category:'Travel',description:'A short studio fixture',language:'english',script_option:'paste',custom_script:'Find a different perspective.',voiceover_option:'upload',status,video_format:'["9:16"]',created_at:now(),updated_at:now()});
 if(i<3) for(let n=1;n<=3;n++) insert('scenes',{project_id:id,scene_number:n,script_text:['Find a different perspective.','Make space for the unexpected.','Tell a story that stays with you.'][n-1],type:'image',video_url:process.env.NODE_APP_ORIGIN+'/studio-fixtures/'+(n===2?'story-sculpture':'story-glass')+'.png',duration_seconds:2,gemini_duration:2,trimmed_duration:2,start_time:0,end_time:2,status:'completed',approved:0});
}
const stage=express(); stage.use(express.static(process.env.STUDIO_TEST_BUILD));
stage.use('/studio-fixtures',express.static(path.join(process.env.STUDIO_TEST_RUNTIME,'fixtures')));
stage.get(/^\/(?:login|register|dashboard|create(?:\/from-scratch)?|profile|processing\/\d+|review\/\d+|subtitle-styles\/\d+|projects\/\d+\/editor|final\/\d+)$/,(_req,res)=>res.sendFile(path.join(process.env.STUDIO_TEST_BUILD,'index.html')));
stage.use(app);stage.listen(5288,'127.0.0.1');
`], {cwd:root, env:{...process.env,NODE_APP_ORIGIN:origin,NODE_DATABASE_PATH:path.join(directory,'test.sqlite'),NODE_MEDIA_ROOT:path.join(directory,'media'),NODE_SKIP_LEGACY_IMPORT:'1',STUDIO_TEST_BUILD:bundle,STUDIO_TEST_RUNTIME:directory},stdio:['ignore','pipe','pipe'],windowsHide:true});
const log=fs.createWriteStream(path.join(directory,'server.log'));
server.stdout.pipe(log); server.stderr.pipe(log);
const report={directory,checks:[],screenshots:[]};
function wav(){const b=Buffer.alloc(32044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);return b;}
async function main(){
 for(let n=0;;n++){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(n>100)throw Error('Fixture server unavailable');await new Promise(r=>setTimeout(r,100));}
 // UI art uses WebP; project source images use the export profile's PNG format.
 const encoder=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await encoder.newPage();await page.goto(origin+'/login');fs.mkdirSync(path.join(directory,'fixtures'));
  for(const name of ['story-glass','story-sculpture']) {
   const png=await page.evaluate(async name=>{const image=new Image();image.src='/studio/'+name+'.webp';await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/png').split(',')[1];},name);
   fs.writeFileSync(path.join(directory,'fixtures',name+'.png'),Buffer.from(png,'base64'));
  }
 } finally {await encoder.close();}
 for(const channel of ['chrome','msedge']) {
  // Each browser starts with the same unconfirmed fixture, independent of the previous run.
  const database = new (require('better-sqlite3'))(path.join(directory,'test.sqlite'));
  try { database.transaction(()=>{
   database.prepare("UPDATE projects SET status='reviewing',edit_state=NULL WHERE id=1").run();
   database.prepare('UPDATE scenes SET approved=0 WHERE project_id=1').run();
   database.prepare('DELETE FROM edit_revisions WHERE project_id=1').run();
   database.prepare('DELETE FROM edit_commands WHERE project_id=1').run();
  })(); } finally {database.close();}
  const browser=await chromium.launch({channel,headless:true});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});
   await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   const page=await context.newPage(); const errors=[],serverRenders=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.method()==='POST'&&/\/(render|export)$/.test(new URL(r.url()).pathname))serverRenders.push(r.url());});
   const go=async(url,selector)=>{await page.goto(origin+url);await page.locator(selector).first().waitFor();await page.evaluate(()=>document.fonts.ready);};
   const shot=async(name)=>{await page.evaluate(()=>{window.scrollTo(0,0);document.querySelectorAll('.inspector').forEach(p=>p.scrollTop=0);});await page.screenshot({path:path.join(directory,channel+'-'+name+'.png'),fullPage:true});report.screenshots.push(channel+'-'+name);};
   const noOverflow=async(name)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' overflows');
   await go('/login','#email');await page.locator('#email').fill('studio@example.test');await page.locator('#password').fill('Studio-test-only-42');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/dashboard');
   await page.locator('.dashboard-art').evaluate(i=>i.decode());await shot('dashboard');
   await page.getByLabel('Search projects').fill('no-results-123');await page.getByRole('heading',{name:'No matching projects'}).waitFor();await page.getByLabel('Search projects').fill('');
   await page.getByRole('button',{name:'Ready',exact:true}).click();assert.equal(await page.locator('.project-card').count(),1);await page.getByRole('button',{name:'All projects',exact:true}).click();
   await go('/create','.create-options');assert.equal(await page.locator('.create-options li').count(),4);assert.equal(await page.locator('.create-options a').count(),1);await page.locator('.create-options img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await shot('create-options');
   await page.getByRole('link',{name:'Video from scratch',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForURL('**/create/from-scratch');
   await page.getByLabel('Project name',{exact:true}).fill('UI creation check');await page.getByLabel('Category',{exact:true}).fill('Travel');await page.getByLabel('Description',{exact:true}).fill('A short fixture');await page.getByLabel('Your script',{exact:true}).fill('One new idea.');
   await page.getByRole('button',{name:'Landscape 16:9',exact:true}).click();assert.equal(await page.getByLabel('Video format',{exact:true}).inputValue(),'16:9');
   await page.getByLabel('Voiceover (MP3 or WAV, up to 10 MB)').setInputFiles({name:'test.wav',mimeType:'audio/wav',buffer:wav()});await shot('create-form');
   const created=page.waitForResponse(r=>r.url()===origin+'/create'&&r.request().method()==='POST');await page.getByRole('button',{name:'Generate scenes',exact:true}).click();assert.equal((await created).status(),201);await page.waitForURL(/\/processing\/\d+$/);await page.locator('.processing-card').waitFor();await shot('processing');
   await go('/review/1','.scene-strip');await shot('review');await page.getByRole('button',{name:'Review scene 2',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Review scene 2',exact:true}).getAttribute('aria-current'),'true');
   await page.getByRole('button',{name:'Confirm All Scenes',exact:true}).click();await page.waitForURL('**/subtitle-styles/1');await page.locator('.style-gallery').waitFor();
   const save=async(name)=>{const response=page.waitForResponse(r=>r.url().endsWith('/projects/1/commands')&&r.request().method()==='POST');await page.getByRole('button',{name,exact:true}).click();assert.equal((await response).status(),200);};
   const state=async()=> (await(await page.request.get(origin+'/projects/1/edit-state')).json()).edit_state;
   await page.getByRole('button',{name:'Use Progressive Highlight',exact:true}).click();await page.getByLabel('Font size',{exact:true}).fill(channel==='chrome'?'52':'50');await save('Save caption style');assert.equal((await state()).tracks.subtitles[0].style,'progressive_highlight');await shot('styles');
   await page.getByRole('button',{name:'Transitions',exact:true}).click();await page.getByRole('button',{name:'Use Fade transition',exact:true}).click();const st=await state();if(st.tracks.video[0].transition_out?.type!=='fade')await save('Save transitions');
   for(const tab of ['Music','Captions','Clips','Styles'])await page.getByRole('button',{name:tab,exact:true}).click();
   await page.getByRole('button',{name:'Open editor',exact:true}).click();await page.waitForURL('**/projects/1/editor');await page.locator('.timeline-panel').waitFor();
   await page.getByRole('button',{name:'Captions',exact:true}).click();await page.locator('input[name=size]').fill(channel==='chrome'?'56':'58');await save('Save caption style');await page.getByText('Saved',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByText('Saved',{exact:true}).waitFor();await page.getByRole('button',{name:'Redo',exact:true}).click();await page.getByText('Saved',{exact:true}).waitFor();assert.equal((await state()).tracks.subtitles[0].config.fontSize,channel==='chrome'?'56px':'58px');
   await page.getByRole('button',{name:'Zoom in timeline',exact:true}).click();await page.getByText('125%',{exact:true}).waitFor();await page.getByRole('button',{name:'Fit',exact:true}).click();
   await shot('editor');
   for(const tab of ['Scene','Audio','Overlays','Format','Captions'])await page.locator('.inspector').getByRole('button',{name:tab,exact:true}).click();
   for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:900});
    for(const [url,selector,name] of [['/dashboard','.dashboard-intro','dashboard'],['/create','.create-options','create'],['/create/from-scratch','.create-form','form'],['/processing/3','.processing-card','processing'],['/review/1','.scene-strip','review'],['/subtitle-styles/1','.style-studio','styles'],['/projects/1/editor','.timeline-panel','editor']]){
     await go(url,selector);await noOverflow(name+' '+width);if(width===390)await shot(name+'-mobile');
     if(name==='editor') {const b=await page.locator('.timeline-panel').boundingBox();assert.ok(b.y+b.height<=901,'Timeline fits viewport');}
    }
   }
   await page.setViewportSize({width:1440,height:960});await go('/projects/1/editor','.timeline-panel');
   console.log(channel+': responsive and editing checks passed; starting browser export');
   await page.getByRole('button',{name:'Export video',exact:true}).click();
   try { await Promise.race([page.getByRole('link',{name:'Download MP4',exact:true}).waitFor({timeout:120000}),page.getByRole('heading',{name:'Export: failed',exact:true}).waitFor({timeout:120000}).then(()=>{throw Error('Browser export failed');})]); }
   catch(e) { await shot('export-failed'); console.error(await page.locator('body').innerText()); throw e; }
   const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'Download MP4',exact:true}).click();const download=await downloadEvent;await download.saveAs(path.join(directory,channel+'-export.mp4'));assert.ok(fs.statSync(path.join(directory,channel+'-export.mp4')).size>1000);
   assert.deepEqual(serverRenders,[]);assert.deepEqual(errors,[]);
   report.checks.push({channel,pages:7,widths:[1440,1024,768,390,320],create:201,confirmation:true,captionSave:true,undoRedo:true,localExport:true,serverRenders:0});
   console.log(JSON.stringify(report.checks.at(-1)));
  } finally {await browser.close();}
 }
}
main().catch(e=>{console.error(e);report.error=String(e);process.exitCode=1;}).finally(()=>{server.kill();fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2));console.log('Report: '+path.join(directory,'report.json'));});

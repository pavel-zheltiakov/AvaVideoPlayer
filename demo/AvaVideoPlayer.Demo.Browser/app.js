// build.py inserts the unchanged production browser module above this application.
// Bundled media is materialized as a named File only when selected.
const clips = [
 {
  "id": "waterfall",
  "file": "waterfall-360.mp4",
  "variants": [
   "waterfall-360.mp4",
   "waterfall-360.mov"
  ],
  "title": "A pause by the waterfall",
  "short": "The waterfall",
  "place": "Northern Ireland",
  "category": "360",
  "description": "Ess-Na-Crub waterfall with captured location sound.",
  "author": "Bernard Ladenthin",
  "license": "CC BY 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
  "source": "https://commons.wikimedia.org/wiki/File:20180407_132600_Ess-Na-Crub_Waterfall.webm",
  "duration": 10.013
 },
 {
  "id": "village",
  "file": "village-360.webm",
  "variants": [
   "village-360.webm",
   "village-360.mp4"
  ],
  "title": "An afternoon in Esino Lario",
  "short": "A village afternoon",
  "place": "Esino Lario, Italy",
  "category": "360",
  "description": "Esino Lario with captured location sound.",
  "author": "Jan Ainali",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
  "source": "https://commons.wikimedia.org/wiki/File:Esino_Lario_360.webm",
  "duration": 14.016
 }
];
const icons={play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5h2v14H8zM15 5h2v14h-2z"/>',volume:'<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',muted:'<path d="m11 5-6 4H2v6h3l6 4zM17 9l5 6m0-6-5 6"/>',back:'<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/><path d="M14 8h-4v4h3v4h-4"/>',forward:'<path d="M21 10a9 9 0 1 0-1 8m1-14v6h-6"/><path d="M14 8h-4v4h3v4h-4"/>',fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',loop:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',folder:'<path d="M3 7V5h6l2 2h10v12H3z"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',grid:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H5a2 2 0 0 1-2-2zm18 0h-4v9h2a2 2 0 0 0 2-2z"/>',move:'<path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>'};
const $=id=>document.getElementById(id);
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;}
for(const el of document.querySelectorAll('[data-icon]'))el.innerHTML=icon(el.dataset.icon);
let selected=clips[0], currentFile=clips[0].file, selectedFile=null, loaded=false, loading=false, yaw=0,pitch=0,fov=80,report=null,checking=false,draggingSeek=false;
const host=create((y,p,f)=>{yaw=y;pitch=p;fov=f;viewOrientation();});
$('video-mount').append(host);
const video=host.querySelector('video');
command(host,'volume',.8);
function info(){return JSON.parse(snapshot(host));}
function clock(seconds){seconds=Math.max(0,Number.isFinite(seconds)?seconds:0);return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function message(text){$('notice').textContent=text||'';$('notice').hidden=!text;}
function creditFor(c){const box=document.createElement('span');box.append('Film by '+c.author+' · ');for(const [label,url] of [[c.license,c.licenseUrl],['Source ↗',c.source]]){const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a,' · ');}box.append(c.category==='360'?'Transcoded, scaled & sound normalized.':'Rectilinear view from 360° footage; transcoded & sound normalized.');return box;}
function setMetadata(c){
 $('format').replaceChildren();for(const file of c.variants||[c.file]){const option=document.createElement('option');option.value=file;option.textContent=file.split('.').pop().toUpperCase();$('format').append(option);}$('format').value=currentFile;
 $('video-title').textContent=c.short;
 $('projection').value=c.category==='360'?'360':'flat';
 updateViewLabel();
 if(!c.local){$('cover').src=ASSETS[currentFile].poster;$('cover').alt=c.title;}
 $('duration').textContent=clock(c.duration);
 for(const btn of document.querySelectorAll('.clip')){btn.classList.toggle('selected',btn.dataset.id===c.id);btn.setAttribute('aria-current',btn.dataset.id===c.id?'true':'false');}
}
function spherical(){return $('projection').value==='360';}
function updateViewLabel(){
 $('view-badge').textContent=spherical()?'360°':'FLAT';$('look-hint').hidden=!spherical();$('reset-view').disabled=!spherical();
 host.classList.toggle('spherical',spherical());
}
function viewOrientation(){host.setAttribute('aria-label',spherical()?`360° view, yaw ${Math.round(yaw)}°, pitch ${Math.round(pitch)}°`:'Flat video view');}
function applyView(){setView(host,spherical(),0,yaw,pitch,fov);updateViewLabel();viewOrientation();}

for(const c of clips){const btn=document.createElement('button');btn.className='clip';btn.dataset.id=c.id;btn.dataset.category=c.category;btn.setAttribute('aria-label','Play '+c.short);btn.innerHTML=`<div class="thumb"><img alt="" src="${ASSETS[c.file].poster}"><span class="length">${clock(c.duration)}</span></div><div class="clip-copy"><span class="tag">360° · ${c.variants.map(f=>f.split('.').pop().toUpperCase()).join(' / ')}</span><strong>${c.short}</strong><small>${c.place}</small></div>`;btn.addEventListener('click',()=>loadClip(c));$('playlist').append(btn);}
// Author and licence attribution is bundled and visible even while offline.
for(const c of [clips[0],clips[1]]){const p=document.createElement('p');p.append(creditFor(c));$('footage-credits').append(p);}
function materialize(c){const a=ASSETS[currentFile];const bytes=Uint8Array.from(atob(a.data),x=>x.charCodeAt(0));return new File([bytes],currentFile,{type:a.mime});}
async function loadClip(c,file,variant=c.file,viewMode=c.category){
 if(loading||checking&&!file&& !clips.includes(c))return;
 loading=true;loaded=false;message('');if(file)selectedFile=file;else if(c!==selected)selectedFile=null;selected=c;currentFile=variant;setMetadata(c);$('projection').value=viewMode==='360'?'360':'flat';$('big-play').hidden=true;$('cover').classList.add('hidden');
 $('playback-status').textContent='Opening…';$('seek').disabled=true;
 for(const b of document.querySelectorAll('.clip'))b.disabled=true;$('format').disabled=true;
 yaw=0;pitch=0;fov=80;applyView();
 try{await openFile(host,file||selectedFile||materialize(c));loaded=true;video.loop=$('loop').getAttribute('aria-pressed')==='true';command(host,'speed',Number($('speed').value));if(info().error)message(info().error);}
 catch(e){message(e.message||String(e));$('playback-status').textContent='Playback unavailable';$('big-play').hidden=false;}
 finally{loading=false;for(const b of document.querySelectorAll('.clip'))b.disabled=checking;$('format').disabled=checking;sync();}
}
async function toggle(){if(checking||loading)return;if(!loaded){await loadClip(selected);return;}try{if(video.paused){if(video.ended)command(host,'seek',0);await play(host);}else command(host,'pause',0);message(info().error);}catch(e){message(e.message);}}
$('big-play').addEventListener('click',toggle);$('play').addEventListener('click',toggle);
function seekBy(delta){if(!loaded||!info().canSeek)return;command(host,'seek',video.currentTime+delta);sync();}
$('back').onclick=()=>seekBy(-5);$('forward').onclick=()=>seekBy(5);
$('seek').addEventListener('pointerdown',()=>draggingSeek=true);
$('seek').addEventListener('input',()=>{if(!loaded)return;try{command(host,'seek',Number($('seek').value));$('elapsed').textContent=clock(Number($('seek').value));$('seek').style.setProperty('--played',`${Number($('seek').value)/Number($('seek').max)*100}%`);}catch(e){message(e.message);}});
for(const event of ['change','pointerup','pointercancel','blur'])$('seek').addEventListener(event,()=>{draggingSeek=false;sync();});
function mute(){command(host,'mute',video.muted?0:1);sync();}
$('mute').onclick=mute;$('volume').oninput=()=>{command(host,'volume',Number($('volume').value));if(video.muted)command(host,'mute',0);sync();};
$('speed').onchange=()=>{command(host,'speed',Number($('speed').value));sync();};
$('loop').onclick=()=>{video.loop=!video.loop;$('loop').setAttribute('aria-pressed',String(video.loop));};
async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await $('player').requestFullscreen();}catch(e){message('Fullscreen is unavailable in this browser. '+e.message);}}
$('fullscreen').onclick=full;document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
$('reset-view').onclick=()=>{yaw=0;pitch=0;fov=80;applyView();};
$('format').onchange=()=>loadClip(selected,null,$('format').value,$('projection').value);
$('projection').onchange=()=>{yaw=0;pitch=0;fov=80;applyView();};
$('show-credits').onclick=()=>$('credits-dialog').showModal();
$('close-credits').onclick=()=>$('credits-dialog').close();
$('diagnostics').hidden=!new URLSearchParams(location.search).has('checks');
$('open-file').onclick=()=>$('file-input').click();
$('file-input').onchange=async()=>{const file=$('file-input').files?.[0];if(!file)return;const c={id:'local',local:true,file:file.name,title:file.name,short:file.name,place:'Your computer',category:'flat',format:file.name.split('.').pop().toUpperCase()+' · Local file',description:'Your video, played locally. MOV support depends on the video and audio codecs your browser provides.',duration:0};await loadClip(c,file);$('file-input').value='';};
// Clicking the video toggles flat playback. Spherical gestures remain owned by the production module.
let pointerStart=null;host.addEventListener('pointerdown',e=>pointerStart=[e.clientX,e.clientY]);host.addEventListener('pointerup',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])<5)toggle();pointerStart=null;});
document.addEventListener('keydown',e=>{if(checking||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,select,button,summary,a'))return;if(e.code==='Space'){e.preventDefault();toggle();}else if(e.key==='ArrowLeft'){e.preventDefault();seekBy(-5);}else if(e.key==='ArrowRight'){e.preventDefault();seekBy(5);}else if(e.key.toLowerCase()==='m'){e.preventDefault();mute();}else if(e.key.toLowerCase()==='f'){e.preventDefault();full();}});
function sync(){
 const s=info();if(loaded){$('duration').textContent=clock(s.duration);$('seek').max=s.duration||100;$('seek').disabled=!s.canSeek;if(!draggingSeek){$('seek').value=s.position;$('seek').style.setProperty('--played',`${s.duration?s.position/s.duration*100:0}%`);$('elapsed').textContent=clock(s.position);}}
 const playing=loaded&&!video.paused&&!video.ended;$('play').innerHTML=icon(playing?'pause':'play');$('play').setAttribute('aria-label',playing?'Pause':video.ended?'Replay':'Play');
 $('mute').innerHTML=icon(video.muted||video.volume===0?'muted':'volume');$('mute').setAttribute('aria-label',video.muted?'Unmute':'Mute');
 if(!loading&&loaded){$('playback-status').textContent=(video.ended?'Finished':video.seeking?'Seeking':video.paused?'Paused':video.readyState<3?'Buffering':'Playing')+` · ${s.width} × ${s.height}`;if(s.error)message(s.error);}
}
for(const event of ['timeupdate','durationchange','loadedmetadata','play','pause','ended','seeking','seeked','volumechange','ratechange','error'])video.addEventListener(event,sync);
const timer=setInterval(sync,250);setMetadata(selected);
window.addEventListener('pagehide',()=>{clearInterval(timer);destroy(host);});
// Optional in-page integration checks exercise real bundled bytes and production playback.
let audioContext,analyser;
function audioMeter(){if(!audioContext){audioContext=new AudioContext();const source=audioContext.createMediaElementSource(video);analyser=audioContext.createAnalyser();analyser.fftSize=2048;source.connect(analyser);analyser.connect(audioContext.destination);}return audioContext.resume();}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate,label,ms=10000){const end=performance.now()+ms;while(performance.now()<end){if(predicate())return;await delay(60);}throw new Error('Timed out: '+label);}
function canvasFingerprint(angle){
 // Read after the production renderer in the same animation frame, before WebGL
 // discards its default drawing buffer. Mark the camera dirty without modifying it.
 setView(host,true,0,angle,0,80);
 return new Promise((resolve,reject)=>requestAnimationFrame(()=>{try{
 const c=host.querySelector('canvas'),gl=c.getContext('webgl');if(!gl||!c.width||!c.height)throw new Error('Missing WebGL frame');
 const pixels=new Uint8Array(4*8*8);gl.readPixels(Math.floor(c.width/2)-4,Math.floor(c.height/2)-4,8,8,gl.RGBA,gl.UNSIGNED_BYTE,pixels);resolve(Array.from(pixels));
 }catch(e){reject(e);}}));
}
$('run-checks').onclick=async()=>{
 if(checking||loading)return;
 await audioMeter();checking=true;report={browser:navigator.userAgent,productionModuleSha256:PRODUCTION_SHA,demoSourceSha256:DEMO_SHA,started:new Date().toISOString(),files:[],checks:[],passed:false,scope:'Real browser decode, sampled non-silent Web Audio signal, seek, UI commands and WebGL rendering. This does not establish physical speaker audibility or other browsers/OSes.'};
 $('run-checks').disabled=true;$('open-file').disabled=true;$('save-checks').disabled=true;
 const check=(condition,label)=>{report.checks.push({passed:!!condition,label});if(!condition)throw new Error(label);};
 try{
 for(const c of clips)for(const variant of c.variants){
 $('check-status').textContent='Playing and checking '+variant+'…';await loadClip(c,null,variant);check(loaded&&!video.error,'Decode '+variant);await until(()=>video.currentTime>.15&&video.videoWidth>0,'moving video');
 const start=video.currentTime;await delay(250);check(video.currentTime>start,'Advancing playback '+variant);
 const buf=new Float32Array(analyser.fftSize);let peak=0,sum=0,count=0;
 for(let i=0;i<12;i++){analyser.getFloatTimeDomainData(buf);for(const x of buf){peak=Math.max(peak,Math.abs(x));sum+=x*x;count++;}await delay(40);}
 const rms=Math.sqrt(sum/count);check(peak>.0001&&rms>.00001,'Non-silent decoded audio '+variant);
 command(host,'pause',0);check(video.paused,'Pause '+variant);command(host,'seek',3);await until(()=>!video.seeking&&Math.abs(video.currentTime-3)<.2,'seek to 3s');check(Math.abs(video.currentTime-3)<.2,'Seek '+variant);
 command(host,'speed',1.25);check(video.playbackRate===1.25,'Playback speed '+variant);command(host,'volume',.6);check(video.volume===.6,'Volume '+variant);command(host,'mute',1);check(video.muted,'Mute '+variant);command(host,'mute',0);
 let rendered=false,orbitChanged=false;
 if(c.category==='360'){
 const before=await canvasFingerprint(.001);rendered=before.some((n,i)=>i%4!==3&&n>0);check(rendered,'Non-black 360 frame '+variant);
 const after=await canvasFingerprint(90);orbitChanged=before.some((n,i)=>n!==after[i]);check(orbitChanged,'Orbit changes rendered pixels '+variant);setView(host,true,0,0,0,80);
 }
 report.files.push({file:variant,position:video.currentTime,duration:video.duration,width:video.videoWidth,height:video.videoHeight,audioPeak:peak,audioRms:rms,rendered360:rendered,orbitChanged,fixtureSha256:ASSETS[variant].sha256});
 }
 check(report.files.length===4,'All four bundled format variants');
 // Each recording appears once; switching projection must retain that recording.
 for(const c of clips){
 await loadClip(c);command(host,'pause',0);const source=video.src;
 $('projection').value='flat';$('projection').dispatchEvent(new Event('change'));
 check(video.style.display==='block','Flat mode uses the selected recording: '+c.id);
 $('projection').value='360';$('projection').dispatchEvent(new Event('change'));
 check(spherical()&&video.src===source,'Returning to 360 retains the recording: '+c.id);
 const canvas=host.querySelector('canvas');
 check(canvas.style.display==='block'&&video.style.display==='none','Spherical canvas restored: '+c.id);
 $('viewport').scrollIntoView({block:'center',behavior:'instant'});await delay(50);
 const bounds=host.getBoundingClientRect(),target=document.elementFromPoint(bounds.left+bounds.width*.5,bounds.top+bounds.height*.5);
 check(!!target&&host.contains(target),'Mouse target reaches the 360 host: '+c.id);
 const before=await canvasFingerprint(.001),after=await canvasFingerprint(90);
 check(before.some((n,i)=>i%4!==3&&n!==after[i]),'Orbit renders a changed view: '+c.id);
 yaw=0;pitch=0;fov=80;applyView();
 }
 report.passed=true;$('check-status').textContent=`PASS · ${report.checks.length} checks · four format variants decoded with non-silent audio. Seeking and 360° projection verified.`;
 }catch(e){report.error=e.message;$('check-status').textContent='FAIL · '+e.message;}
 finally{
 checking=false;report.finished=new Date().toISOString();command(host,'speed',Number($('speed').value));command(host,'volume',Number($('volume').value));command(host,'pause',0);$('run-checks').disabled=false;$('open-file').disabled=false;$('format').disabled=false;for(const b of document.querySelectorAll('.clip'))b.disabled=false;$('check-report').hidden=false;$('check-report').textContent=JSON.stringify(report,null,2);$('save-checks').disabled=false;sync();
 }
};
$('save-checks').onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ava-screening-room-checks.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};

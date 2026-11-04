// No external scripts. HTMLMediaElement owns decoding/audio; WebGL projects a video texture.
const players = new WeakMap();
const vertexSource = `attribute vec2 a; varying vec2 p; void main(){p=a;gl_Position=vec4(a,0.,1.);}`;
const fragmentSource = `precision highp float;
varying vec2 p; uniform sampler2D video; uniform vec3 camera; uniform float aspect; uniform int stereo;
const float PI=3.141592653589793;
void main(){
 float t=tan(radians(camera.z)*.5);
 vec3 d=vec3(p.x*t,p.y*t/aspect,1.);
 float cp=cos(radians(camera.y)),sp=sin(radians(camera.y));
 d=vec3(d.x,d.y*cp+d.z*sp,d.z*cp-d.y*sp);
 float cy=cos(radians(camera.x)),sy=sin(radians(camera.x));
 d=vec3(d.x*cy+d.z*sy,d.y,d.z*cy-d.x*sy);
 vec2 uv=vec2(fract(atan(d.x,d.z)/(2.*PI)+.5),.5-atan(d.y,length(d.xz))/PI);
 if(stereo==1)uv.y*=.5; if(stereo==2)uv.x*=.5;
 gl_FragColor=texture2D(video,uv);
}`;
function state(host) { const s=players.get(host); if(!s || s.disposed) throw new Error('Video player has been disposed.'); return s; }
function finite(n, fallback=0) { return Number.isFinite(n)?n:fallback; }
function fail(s,e) { s.error=e instanceof Error?e.message:String(e); }
function movSource(s){return /\.(mov|qt)$/i.test(s.title)||/\.(mov|qt)(?:[?#]|$)/i.test(s.source);}
function noMovVideo(s){if(movSource(s)&&s.video.readyState>=1&&!s.video.videoWidth)s.error='No video is exposed for this MOV. It may be audio-only or use an unsupported video codec. MOV codec support depends on the browser; try QuickTime’s Greater Compatibility (H.264) export or the desktop player.';}
function mediaError(s){
 const code=s.video.error?.code??'unknown';
 const mov=movSource(s);
 return `Video could not play (media error ${code}). `+(mov
  ? 'MOV codec support depends on the browser. Try QuickTime’s Greater Compatibility (H.264) export, or open the file in the desktop player.'
  : `Check the URL, video/audio format${s.spherical?' and CORS headers':''}.`);
}
function normalize(s){ s.yaw=((s.yaw%360)+540)%360-180;s.pitch=Math.max(-89,Math.min(89,s.pitch));s.fov=Math.max(30,Math.min(110,s.fov)); }
export function create(changed) {
 const host=document.createElement('div');
 Object.assign(host.style,{width:'100%',height:'100%',position:'relative',background:'#000',overflow:'hidden',touchAction:'none'});
 const video=document.createElement('video'); video.playsInline=true;video.preload='metadata';video.preservesPitch=true;
 Object.assign(video.style,{width:'100%',height:'100%',objectFit:'contain',display:'block'});
 const canvas=document.createElement('canvas');Object.assign(canvas.style,{width:'100%',height:'100%',display:'none'});
 const captions=document.createElement('div');
 Object.assign(captions.style,{position:'absolute',bottom:'5%',left:'5%',right:'5%',textAlign:'center',color:'white',font:'22px system-ui',whiteSpace:'pre-line',pointerEvents:'none',textShadow:'0 1px 3px black, 1px 0 3px black'});
 host.append(video,canvas,captions);
 const s={host,video,canvas,captions,changed,spherical:false,stereo:0,yaw:0,pitch:0,fov:80,dirty:true,
  disposed:false,error:null,subtitle:-1,delay:0,source:'',title:'No video loaded',stopped:false,urls:[],lastTime:-1,gl:null,contextLost:false,raf:0};
 players.set(host,s);
 video.addEventListener('error',()=>{fail(s,mediaError(s));});
 video.textTracks.addEventListener('addtrack',()=>{for(const t of video.textTracks)t.mode='hidden';});
 let drag=null;
 host.addEventListener('pointerdown',e=>{if(!s.spherical || e.button!==0)return;drag={x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);e.preventDefault();});
 host.addEventListener('pointermove',e=>{if(!drag)return;s.yaw-=(e.clientX-drag.x)*.22;s.pitch+=(e.clientY-drag.y)*.22;drag={x:e.clientX,y:e.clientY};normalize(s);s.dirty=true;s.changed(s.yaw,s.pitch,s.fov);});
 host.addEventListener('pointerup',e=>{drag=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);});
 host.addEventListener('lostpointercapture',()=>drag=null);
 host.addEventListener('wheel',e=>{if(!s.spherical)return;s.fov-=Math.sign(e.deltaY)*-5;normalize(s);s.dirty=true;s.changed(s.yaw,s.pitch,s.fov);e.preventDefault();},{passive:false});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();s.contextLost=true;s.gl=null;fail(s,'WebGL context lost. Waiting for the browser to restore it.');});
 canvas.addEventListener('webglcontextrestored',()=>{s.contextLost=false;s.gl=null;s.error=null;s.dirty=true;});
 s.observer=new ResizeObserver(()=>s.dirty=true);s.observer.observe(host);
 function frame(){if(s.disposed)return;try{draw(s);caption(s);}catch(e){fail(s,e);}s.raf=requestAnimationFrame(frame);}
 s.raf=requestAnimationFrame(frame);
 return host;
}
function initGl(s){
 const gl=s.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false});
 if(!gl)throw new Error('360° playback requires WebGL. Flat video is still available.');
 function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error(message);}return sh;}
 const vs=shader(gl.VERTEX_SHADER,vertexSource),fs=shader(gl.FRAGMENT_SHADER,fragmentSource);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 s.gl={gl,program,texture,buffer,camera:gl.getUniformLocation(program,'camera'),aspect:gl.getUniformLocation(program,'aspect'),stereo:gl.getUniformLocation(program,'stereo')};
 return s.gl;
}
function draw(s){
 if(s.contextLost || !s.spherical || s.video.readyState<2 || !s.host.clientWidth || !s.host.clientHeight)return;
 if(!s.dirty && s.lastTime===s.video.currentTime)return;
 const g=s.gl??initGl(s),gl=g.gl;
 if(gl.isContextLost())return;
 const ratio=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.floor(s.host.clientWidth*ratio)),h=Math.max(1,Math.floor(s.host.clientHeight*ratio));
 if(s.canvas.width!==w || s.canvas.height!==h){s.canvas.width=w;s.canvas.height=h;}
 gl.viewport(0,0,w,h);gl.useProgram(g.program);gl.bindTexture(gl.TEXTURE_2D,g.texture);
 try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,s.video);}
 catch(e){throw new Error('The browser cannot use this video as a 360° texture. Serve the video with Access-Control-Allow-Origin, or open a local file. '+e.message);}
 gl.uniform3f(g.camera,s.yaw,s.pitch,s.fov);gl.uniform1f(g.aspect,w/h);gl.uniform1i(g.stereo,s.stereo);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 s.lastTime=s.video.currentTime;s.dirty=false;
}
function caption(s){
 const t=s.video.textTracks[s.subtitle];
 let text='';
 if(t && !s.stopped){const time=s.video.currentTime-s.delay;const cues=s.delay===0?t.activeCues:t.cues;if(cues)text=Array.from(cues).filter(c=>c.startTime<=time&&c.endTime>time).map(c=>c.getCueAsHTML?.().textContent??c.text??'').join('\n');}
 if(s.captions.textContent!==text)s.captions.textContent=text;
}
function clearSource(s){
 s.video.pause();s.video.removeAttribute('src');s.video.load();
 for(const track of s.video.querySelectorAll('track'))track.remove();
 for(const url of s.urls)URL.revokeObjectURL(url);s.urls=[];s.subtitle=-1;s.delay=0;s.captions.textContent='';
}
export async function open(host,url){
 const s=state(host);clearSource(s);s.error=null;s.stopped=false;s.dirty=true;s.lastTime=-1;
 s.source=url;s.title=url.startsWith('blob:')?'Local video':decodeURIComponent(new URL(url,location.href).pathname.split('/').pop()||'Video');
 if(s.spherical)s.video.crossOrigin='anonymous';else s.video.removeAttribute('crossorigin');
 s.video.src=url;s.video.load();
 try{await s.video.play();noMovVideo(s);}catch(e){if(e.name==='NotAllowedError'){s.error='The browser requires a user gesture. Press Play to start.';}else{fail(s,s.video.error?mediaError(s):e);throw new Error(s.error);}}
}
export async function openFile(host,file){
 const s=state(host),url=URL.createObjectURL(file);
 try{const loading=open(host,url);s.title=file.name||'Local video';await loading;s.urls.push(url);}
 catch(e){URL.revokeObjectURL(url);throw e;}
}
export async function play(host){const s=state(host);s.error=null;s.stopped=false;await s.video.play();noMovVideo(s);}
export function command(host,name,value){
 const s=state(host),v=s.video;
 if(!Number.isFinite(value))throw new Error('A finite value is required.');
 switch(name){
 case 'pause':v.pause();break;
 case 'stop':v.pause();if(v.readyState>0 && v.seekable.length)v.currentTime=v.seekable.start(0);s.stopped=true;s.captions.textContent='';break;
 case 'seek':if(!v.seekable.length)throw new Error('This source cannot seek.');v.currentTime=Math.max(v.seekable.start(0),Math.min(value,v.seekable.end(v.seekable.length-1)));s.dirty=true;break;
 case 'speed':if(value<.25||value>4)throw new Error('Speed must be between 0.25 and 4.');v.playbackRate=value;break;
 case 'volume':v.volume=Math.max(0,Math.min(1,value));break;
 case 'mute':v.muted=value!==0;break;
 case 'audio':if(v.audioTracks){for(let i=0;i<v.audioTracks.length;i++)v.audioTracks[i].enabled=i===value;}else if(value===-1)v.muted=true;else if(value===0)v.muted=false;else throw new Error('This browser does not expose audio track selection.');break;
 case 'subtitle':if(value<-1||value>=v.textTracks.length)throw new Error('Subtitle track unavailable.');s.subtitle=value;for(const t of v.textTracks)t.mode='hidden';break;
 case 'delay':s.delay=value;break;
 default:throw new Error('Unknown player command.');
 }
}
export function setView(host,spherical,stereo,yaw,pitch,fov){
 const s=state(host),changed=s.spherical!==spherical;
 if(s.spherical!==spherical||s.stereo!==stereo||s.yaw!==yaw||s.pitch!==pitch||s.fov!==fov)s.dirty=true;
 s.spherical=spherical;s.stereo=stereo;s.yaw=yaw;s.pitch=pitch;s.fov=fov;normalize(s);
 s.canvas.style.display=spherical?'block':'none';s.video.style.display=spherical?'none':'block';
 // A cross-origin video loaded without CORS cannot subsequently become a WebGL texture.
 if(changed&&spherical&&s.source.startsWith('http')&&s.video.crossOrigin!=='anonymous'){
  const time=s.video.currentTime,paused=s.video.paused;
  s.video.crossOrigin='anonymous';s.video.src=s.source;
  s.video.addEventListener('loadedmetadata',()=>{if(s.video.seekable.length)s.video.currentTime=time;if(!paused)s.video.play().catch(e=>fail(s,e));},{once:true});s.video.load();
 }
}
export function snapshot(host){
 const s=state(host),v=s.video,tracks=[];
 if(v.videoWidth)tracks.push({id:0,kind:1,name:'Video',width:v.videoWidth,height:v.videoHeight});
 let audio=-1;
 if(v.audioTracks){for(let i=0;i<v.audioTracks.length;i++){const t=v.audioTracks[i];tracks.push({id:i,kind:0,name:t.label||`Audio ${i+1}`,language:t.language});if(t.enabled)audio=i;}}
 else if(v.readyState>0){tracks.push({id:0,kind:0,name:'Default audio (browser managed)'});audio=v.muted?-1:0;}
 for(let i=0;i<v.textTracks.length;i++){const t=v.textTracks[i];if(t.kind==='subtitles'||t.kind==='captions')tracks.push({id:i,kind:2,name:t.label||`Subtitles ${i+1}`,language:t.language});}
 const playback=s.error&&v.error?6:!s.source?0:s.stopped?4:v.ended?5:v.seeking?8:v.readyState<2?1:v.paused?3:v.readyState<3?7:2;
 const hasAudio=v.audioTracks?v.audioTracks.length>0:v.mozHasAudio===true||v.webkitAudioDecodedByteCount>0;
 const audioPresence=v.audioTracks||typeof v.mozHasAudio==='boolean'||v.webkitAudioDecodedByteCount>0?(hasAudio?'Present':'Absent'):'Not exposed by this browser';
 return JSON.stringify({state:playback,position:finite(v.currentTime),duration:finite(v.duration),canSeek:v.seekable.length>0,
  speed:v.playbackRate,volume:v.volume,muted:v.muted,audio,subtitle:s.subtitle,source:s.source,title:s.title,
  width:v.videoWidth,height:v.videoHeight,buffered:v.buffered.length?finite(v.buffered.end(v.buffered.length-1)):0,
  audioSelection:!!v.audioTracks&&v.audioTracks.length>0,hasAudio,audioPresence,
  audioSupport:v.audioTracks?'Available':'Only the browser default audio track is exposed',tracks,error:s.error});
}
export async function addSubtitle(host,vtt,name,language){
 const s=state(host),track=document.createElement('track'),url=URL.createObjectURL(new Blob([vtt],{type:'text/vtt'}));
 s.urls.push(url);track.kind='subtitles';track.label=name;track.srclang=language||'und';track.src=url;
 const loaded=new Promise((resolve,reject)=>{track.addEventListener('load',resolve,{once:true});track.addEventListener('error',()=>reject(new Error('Subtitles could not load.')),{once:true});});
 s.video.append(track);track.track.mode='hidden';await loaded;s.subtitle=Array.from(s.video.textTracks).indexOf(track.track);
}
export function pickFile(host){
 const s=state(host),input=document.createElement('input');input.type='file';input.accept='video/*,.mov,.qt,.m4v,.mp4,.mkv,.webm';
 input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;try{await openFile(host,file);}catch(e){fail(s,e);}},{once:true});input.click();
}
export async function fullscreen(host){if(document.fullscreenElement)await document.exitFullscreen();else await state(host).host.requestFullscreen();}
export function destroy(host){
 const s=players.get(host);if(!s||s.disposed)return;s.disposed=true;cancelAnimationFrame(s.raf);s.observer.disconnect();clearSource(s);
 if(s.gl){const g=s.gl;g.gl.deleteTexture(g.texture);g.gl.deleteBuffer(g.buffer);g.gl.deleteProgram(g.program);}
 s.changed=()=>{};host.replaceChildren();players.delete(host);
}

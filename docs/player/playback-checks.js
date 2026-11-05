// Optional diagnostics exercise the actual Avalonia-hosted media element.
export function monitor() {
  let parentChecks=false;try{parentChecks=new URL(parent.location.href).searchParams.has('checks');}catch{}
  const local=new URL(location.href).searchParams;let parentAuto=false;try{parentAuto=new URL(parent.location.href).searchParams.has('autocheck');}catch{}
  const checks = local.has('checks') || parentChecks;
  const automatic=checks && (local.has('autocheck') || parentAuto);
  const report = {started:new Date().toISOString(),preloads:[],events:[],frames:0,frameGaps:[],longTasks:[],source:'',segments:[],maxBufferAhead:0,mutedDiagnosticRun:automatic};
  let video, lastFrame, lastMedia, session = 0;
  const watch = new MutationObserver(() => attach());
  watch.observe(document.getElementById('out'),{childList:true,subtree:true});
  function attach() {
    const next=document.querySelector('#out video'); if(!next||next===video)return; video=next;
    for(const event of ['playing','waiting','stalled','pause','seeking','seeked','ended','emptied','error'])video.addEventListener(event,()=>{
      if(checks)report.events.push({event,wall:performance.now(),time:video.currentTime,ready:video.readyState,network:video.networkState,bufferAhead:bufferAhead()});
      if(event==='playing'){lastFrame=undefined;lastMedia=undefined;}
    });
    if(checks && video.requestVideoFrameCallback) {
      const token=++session;
      const frame=(now,meta)=>{
        if(token!==session)return;
        if(!video.paused&&!video.seeking && lastFrame!==undefined && now-lastFrame>300 && meta.mediaTime>=lastMedia)
          report.frameGaps.push({wallGap:now-lastFrame,mediaGap:meta.mediaTime-lastMedia,time:meta.mediaTime,bufferAhead:bufferAhead()});
        report.frames++;lastFrame=now;lastMedia=meta.mediaTime;report.source=video.currentSrc;report.maxBufferAhead=Math.max(report.maxBufferAhead,bufferAhead());
        video.requestVideoFrameCallback(frame);
      };video.requestVideoFrameCallback(frame);
    }
  }
  function bufferAhead(){ if(!video)return 0; for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=video.currentTime+.05&&video.buffered.end(i)>video.currentTime)return video.buffered.end(i)-video.currentTime;return 0; }
  if(checks && globalThis.PerformanceObserver)try{new PerformanceObserver(list=>{for(const e of list.getEntries())report.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});}catch{}
  const media = new Map();
  const prepareMedia=url=>{
    if(!media.has(url)) media.set(url,(async()=>{
      const start=performance.now(),response=await fetch(url);if(!response.ok)throw new Error(`Video download failed (${response.status})`);
      const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);
      report.preloads.push({url,bytes:blob.size,ms:performance.now()-start,objectUrl});return objectUrl;
    })().catch(error=>{media.delete(url);throw error;}));
    return media.get(url);
  };
  return {
    ready:()=>requestAnimationFrame(()=>document.querySelector('.loading-screen')?.remove()),
    prepareMedia,checksEnabled:()=>checks,autoCheck:()=>automatic,
    segment:name=>report.segments.push({name,wall:performance.now()}),
    summary:()=>`${report.frames} frames · ${report.events.filter(x=>x.event==='waiting').length} waits · ${report.frameGaps.length} gaps >300 ms`,
    openLink:url=>window.open(url,'_blank','noopener,noreferrer'),
    saveReport:()=>{
      const data={...report,ended:new Date().toISOString(),quality:video?.getVideoPlaybackQuality?.(),position:video?.currentTime,bufferAhead:bufferAhead(),userAgent:navigator.userAgent};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='avavideo-avalonia-playback.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  };
}

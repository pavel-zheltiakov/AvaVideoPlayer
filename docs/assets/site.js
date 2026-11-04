'use strict';
const root=document.documentElement.dataset.root||'';
const catalog=window.AVA_CATALOG;
const tree=document.getElementById('tree');
const here=decodeURIComponent(location.pathname.split('/').slice(-2).join('/'));
const link=(label,url)=>{const a=document.createElement('a');a.textContent=label;a.href=root+url;if(here===url||location.pathname.endsWith('/'+url)){a.className='current';a.setAttribute('aria-current','page');}return a;};
function group(title){const d=document.createElement('details');d.className='tree-group';d.open=true;const s=document.createElement('summary');s.textContent=title;d.append(s);tree.append(d);return d;}
if(tree&&catalog){
 for(const section of [...new Set(catalog.guides.map(x=>x.group))]){const d=group(section);for(const page of catalog.guides.filter(x=>x.group===section)){const a=link(page.label,page.url);a.dataset.search=(page.label+' '+page.title).toLowerCase();d.append(a);}}
 const api=group('API reference');api.append(link('Overview','api/index.html'));
 for(const ns of [...new Set(catalog.types.map(x=>x.namespace))]){const nd=document.createElement('details');nd.className='tree-group namespace';nd.open=location.pathname.includes('/api/');const summary=document.createElement('summary');summary.textContent=ns;nd.append(summary);api.append(nd);
 for(const t of catalog.types.filter(x=>x.namespace===ns)){const node=document.createElement('details');node.className='api-type';node.dataset.search=(t.fullName+' '+t.members.map(x=>x.name).join(' ')).toLowerCase();const s=document.createElement('summary');s.textContent=t.name;node.append(s,link(t.name+' overview',t.url));node.open=location.pathname.endsWith('/'+t.url);nd.append(node);
 for(const kind of [...new Set(t.members.map(x=>x.kind))]){const md=document.createElement('details');md.className='member-group';const ms=document.createElement('summary');ms.textContent=kind;md.append(ms);for(const m of t.members.filter(x=>x.kind===kind)){const a=link(m.name,t.url+'#'+m.anchor);a.dataset.search=(m.name+' '+m.signature).toLowerCase();a.title=m.signature;md.append(a);}node.append(md);}
 }
 }
}
const filter=document.getElementById('tree-filter');
filter?.addEventListener('input',()=>{const q=filter.value.trim().toLowerCase();for(const t of tree.querySelectorAll('.api-type')){t.hidden=!!q&&!t.dataset.search.includes(q);if(q&&!t.hidden){t.open=true;t.parentElement.open=true;t.parentElement.parentElement.open=true;}for(const a of t.querySelectorAll('a[data-search]'))a.hidden=!!q&&!a.dataset.search.includes(q);if(q)for(const d of t.querySelectorAll('.member-group')){d.open=true;d.hidden=!Array.from(d.querySelectorAll('a')).some(a=>!a.hidden);}}
 for(const a of tree.querySelectorAll(':scope>.tree-group>a[data-search]'))a.hidden=!!q&&!a.dataset.search.includes(q);
});
const browse=document.getElementById('browse');browse?.addEventListener('click',()=>{const side=document.getElementById('sidebar');const expanded=side.classList.toggle('open');browse.setAttribute('aria-expanded',String(expanded));});
const dialog=document.getElementById('search-dialog'),input=document.getElementById('global-search'),results=document.getElementById('search-results'),status=document.getElementById('search-status');
function openSearch(){dialog.showModal();input.focus();}
document.querySelectorAll('[data-search-open]').forEach(b=>b.onclick=openSearch);document.getElementById('search-close').onclick=()=>dialog.close();
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}});
input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase(),terms=q.split(/\s+/);results.replaceChildren();if(!q){status.textContent='Search guides, types, methods and properties.';return;}
 const ranked=catalog.search.map(p=>({p,score:terms.every(t=>(p.title+' '+p.text).toLowerCase().includes(t))?(p.title.toLowerCase().includes(q)?20:1)+terms.filter(t=>p.title.toLowerCase().includes(t)).length*3:0})).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,30);
 status.textContent=ranked.length?`${ranked.length} results`:'No matching pages or members.';
 for(const {p} of ranked){const a=document.createElement('a');a.className='result';a.href=root+p.url;const title=document.createElement('strong');title.textContent=p.title;const snippet=document.createElement('span');snippet.textContent=p.text.slice(0,175);a.append(title,snippet);results.append(a);}
});
const theme=document.getElementById('theme-toggle');let preference;try{preference=localStorage.getItem('ava-docs-theme');}catch{}if(preference)document.documentElement.dataset.theme=preference;else if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark';
theme.onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('ava-docs-theme',next);}catch{}theme.setAttribute('aria-label','Switch to '+(next==='dark'?'light':'dark')+' theme');};

#!/usr/bin/env python3
"""Build a genuinely self-contained player: CSS, production JS, posters and real videos."""
import base64,hashlib,json,re,zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
PACKAGE=HERE.parents[1]/'packages/AvaVideoPlayer.0.1.0-preview.2.nupkg'
with zipfile.ZipFile(PACKAGE) as archive: productionBytes=archive.read('browser/avavideo.js')
manifest=json.loads((HERE/'media/manifest.json').read_text())
assets={}
for f in manifest['files']:
 p=HERE/'media'/f['file'];sha=hashlib.sha256(p.read_bytes()).hexdigest()
 assert sha==f['sha256'],f'Changed bundled video: {p}'
 key=p.name;mime={'mp4':'video/mp4','webm':'video/webm','mov':'video/quicktime'}[p.suffix[1:]]
 assets[key]={'data':base64.b64encode(p.read_bytes()).decode(),'poster':'data:image/jpeg;base64,'+base64.b64encode(p.with_suffix('.jpg').read_bytes()).decode(),'mime':mime,'sha256':sha}
production=productionBytes.decode();sha=hashlib.sha256(productionBytes).hexdigest()
sourceHashes={name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in ['index.html','style.css','app.js','build.py','media/manifest.json']}
demoSha=hashlib.sha256(json.dumps(sourceHashes,sort_keys=True).encode()).hexdigest()
# One inline module keeps file:// usable, with the exact production source unmodified.
script=production+'\nconst PRODUCTION_SHA='+json.dumps(sha)+';\nconst DEMO_SHA='+json.dumps(demoSha)+';\nconst ASSETS='+json.dumps(assets,separators=(',',':'))+';\n'+(HERE/'app.js').read_text()
assert '</script' not in script.lower()
html=(HERE/'index.html').read_text().replace('/* DEMO_STYLES */',(HERE/'style.css').read_text()).replace('/* DEMO_SCRIPT */',script)
dist=HERE/'dist';dist.mkdir(exist_ok=True);(dist/'index.html').write_text(html)
receipt={'productionModuleSha256':sha,'demoSourceSha256':demoSha,'sourceSha256':sourceHashes,'outputSha256':hashlib.sha256(html.encode()).hexdigest(),'outputBytes':len(html.encode()),'files':[{k:v for k,v in f.items() if k!='recipe'} for f in manifest['files']],'externalRuntimeRequests':0}
(dist/'build.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(f'Built {dist / "index.html"} ({len(html.encode())/1024/1024:.1f} MiB); {len(assets)} embedded videos; production JS {sha}')

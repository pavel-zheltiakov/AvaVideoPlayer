#!/usr/bin/env python3
"""Reconstruct the reviewed NuGet byte-for-byte from a release plus binary-only delta."""
import hashlib,json,sys
from pathlib import Path

def digest(data):return hashlib.sha256(data).hexdigest()
def assemble(base_path,output_dir):
    here=Path(__file__).resolve().parent
    recipe=json.loads((here/'release-recipe.json').read_text())
    manifest=json.loads((here/'manifest.json').read_text())
    expected=manifest['packages'][0]
    assert len(manifest['packages'])==1 and expected['id']=='AvaVideoPlayer'
    assert recipe['file']==expected['file'] and recipe['sha256']==expected['sha256']
    base=Path(base_path).read_bytes();delta=(here/'release.delta').read_bytes()
    assert digest(base)==recipe['baseSha256'],'Base release differs from the reviewed package'
    assert digest(delta)==recipe['deltaSha256'],'Release delta differs from the reviewed bytes'
    result=bytearray()
    for source,offset,length in recipe['segments']:
        data={'base':base,'delta':delta}[source]
        assert offset>=0 and length>0 and offset+length<=len(data)
        result.extend(data[offset:offset+length])
    assert len(result)==expected['bytes'] and digest(result)==expected['sha256'],'Reconstructed release hash differs'
    output=Path(output_dir);output.mkdir(parents=True,exist_ok=True)
    (output/expected['file']).write_bytes(result)
    (output/'SHA256SUMS').write_text(f"{expected['sha256']}  {expected['file']}\n")
    print('Verified exact reviewed package:',expected['file'],expected['sha256'])
if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('Usage: assemble-release.py base.nupkg output-directory')
    assemble(sys.argv[1],sys.argv[2])

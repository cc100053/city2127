from pathlib import Path
import hashlib,json,sys
root=Path('artifacts/energy-city-polish/receiver-wing-batch-01')/sys.argv[1]
dev=json.loads((root/'dev/browser.json').read_text())
assert len(dev['shots'])==33
assert not dev['exceptions'] and not dev['failures']
assert not [m for m in dev['consoleMessages'] if not m['url'].endswith('/favicon.ico')]
assert not [m for m in dev['responses'] if not m['url'].endswith('/favicon.ico')]
shots={s['name']:s for s in dev['shots']}
for name,s in shots.items():
 assert [s['width'],s['height']]==[1920,1080]
 assert hashlib.sha256((root/'dev'/(name+'.png')).read_bytes()).hexdigest()==s['sha256']
assert shots['static-a']['sha256']==shots['static-b']['sha256']
assert float(shots['live-b']['time'])-float(shots['live-a']['time'])>=5
formal=json.loads((root/'formal/browser.json').read_text())
assert not formal['exceptions']
assert len(formal['failures'])==2 and all(f['error']=='net::ERR_FAILED' for f in formal['failures']),formal['failures']
source=Path('src/energyPrototype.ts').read_bytes()
assert hashlib.sha256(source).hexdigest()==dev['sourceHash']
(root/'source.ts').write_bytes(source)
result={'sourceSha256':dev['sourceHash'],'browser':dev['browser'],'gpu':dev['gpu'],'screenshots':33,'staticPngIdentical':True,'liveTimes':[shots['live-a']['time'],shots['live-b']['time']],
 'formal':'PASS original E4 runner; only expected favicon404, obsolete409, two injected aborts','platform':dev['platform'],'quality':dev['quality'],'fps':'NOT MEASURED'}
(root/'evidence-check.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))

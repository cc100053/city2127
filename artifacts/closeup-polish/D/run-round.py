"""Preserve one full shot matrix, hero and raw perf under a fresh directory."""
import hashlib,json,pathlib,subprocess,sys,os
if '--self-test' in sys.argv:
 assert 'nw:focal'.replace(':','-')=='nw-focal'
 assert len(['capture','perf','compare'])==3
 print('PASS fresh output / shot slug / three capture stages');sys.exit()
round_,shot=sys.argv[1:]
assert round_ in ['r1','r2','r3'] and shot in ['nw:focal','nw:district','energy:garden2','energy:wing','energy:island']
root=pathlib.Path('artifacts/closeup-polish/D');out=root/round_/shot.replace(':','-')
assert not out.exists(),f'Preserve existing round: {out}'
out.mkdir(parents=True)
paths=['src/headlineCamera.ts','src/siteBuilders/automationHub.ts','src/districtMeters.ts','src/energyPrototype.ts','src/devShotFrame.ts','artifacts/closeup-polish/capture.mjs']
(out/'source-hashes.json').write_text(json.dumps({'commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'sha256':{p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in paths}},indent=2)+'\n')
env={**os.environ,'CITY_SHOTS':shot+',hero','CITY2127_EVIDENCE_DIR':str(out),'CITY_NW_PAIRINGS':'1' if shot=='nw:district' else '0'}
for mode in ['capture','perf','compare']:
 with (out/(mode+'.log.txt')).open('w') as f:
  subprocess.run(['node','artifacts/closeup-polish/capture.mjs',mode],env=env,stdout=f,stderr=subprocess.STDOUT,check=True)
 print(mode,shot,flush=True)
p=root/'rounds.json';plan=json.loads(p.read_text());plan.setdefault(shot,[]).append(str(out.relative_to(root)));assert len(plan[shot])<=3;p.write_text(json.dumps(plan,indent=2)+'\n')
print('COMPLETE',out)

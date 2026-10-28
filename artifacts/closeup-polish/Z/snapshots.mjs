// The last measured local source snapshots are comparisons, never substitutes for current Z captures.
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
export const key=r=>`${r.id}/${r.state}/${r.hour}`;
export function lastSnapshots(){
 const result=new Map();
 for(const sector of ['A','B','C','D']){
  const dirs=sector==='A'||sector==='B'?[`artifacts/closeup-polish/${sector}/r3`]:
   Object.values(read(`artifacts/closeup-polish/${sector}/rounds.json`)).map(rounds=>`artifacts/closeup-polish/${sector}/${rounds.at(-1)}`);
  for(const dir of dirs){
   const capture=read(`${dir}/capture.json`);
   for(const row of capture.rows)if(!row.pairing)result.set(`${sector}/${key(row)}`,{sector,directory:dir,browser:capture.browser,commit:capture.commit,row});
  }
 }
 return result;
}
export const sectorFor=id=>id==='hero'?null:id.startsWith('ne:')||id==='energy:garden'?'A':id.startsWith('sw:')?'B':id.startsWith('se:')||id==='energy:ring'?'C':'D';

"""Check this batch's local Markdown targets, anchors and staged/tracked membership."""
from pathlib import Path
import json,re,subprocess,unicodedata
from urllib.parse import unquote,urlsplit
root=Path.cwd().resolve()
files=[Path(p) for p in ['docs/PROJECT.md','docs/EXHIBITION_SPEC.md','docs/VALIDATION.md','docs/handoffs/closeup-next.md','docs/handoffs/README.md','artifacts/closeup-next/C1/README.md','artifacts/closeup-next/C1/REVIEW.md']]
tracked=set(subprocess.check_output(['git','ls-files'],text=True).splitlines());errors=[];count=0

def anchors(p):
    found=set(re.findall(r'<a\s+(?:name|id)=[\"\']([^\"\']+)',p.read_text()));seen={}
    for h in re.findall(r'^#{1,6}\s+(.+?)\s*#*$',p.read_text(),re.M):
        h=re.sub(r'<[^>]+>','',h);h=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',h).strip().lower();h=''.join(c for c in h if c in '-_ ' or unicodedata.category(c)[0] in 'LN');slug=h.replace(' ','-');n=seen.get(slug,0);seen[slug]=n+1;found.add(slug+(f'-{n}' if n else ''))
    return found
for p in files:
    if not p.exists(): errors.append(f'Missing document {p}');continue
    for target in re.findall(r'\]\((<?[^)]+>?)\)',p.read_text()):
        target=target.strip('<>');u=urlsplit(target)
        if u.scheme or u.netloc:continue
        path=(p.parent/unquote(u.path)).resolve() if u.path else p.resolve();count+=1
        if not path.exists():errors.append(f'{p}: missing {target}');continue
        if not path.is_relative_to(root):errors.append(f'{p}: target outside repository {target}');continue
        if path.is_file() and path.relative_to(root).as_posix() not in tracked:errors.append(f'{p}: target not staged/tracked {target}')
        if u.fragment and path.suffix=='.md' and unquote(u.fragment) not in anchors(path):errors.append(f'{p}: missing anchor {target}')
result={'files':list(map(str,files)),'checkedLocalLinks':count,'errors':errors,'status':'FAIL' if errors else 'PASS'}
Path('artifacts/closeup-next/C1/link-check.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');print(json.dumps(result,ensure_ascii=False));assert not errors

import json,re,html,shutil
from pathlib import Path
root=Path(__file__).resolve().parent
source=root/'source-data'

def clean(s):return ' '.join(html.unescape(re.sub('<[^>]+>',' ',s)).replace('\ufeff','').split())
def links(s):
 return [dict(title=clean(t),url=html.unescape(u)) for u,t in re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>',s,re.S)]
def page(name):return json.loads((source/f'{name}.json').read_text())['content']
lectures=[]
for row in re.findall(r'<tr>(.*?)</tr>',page('course-materials'),re.S):
 cells=re.findall(r'<td>(.*?)</td>',row,re.S)
 if not cells:continue
 title=clean(cells[0]); num=int(title.split('.')[0])
 lectures.append(dict(id=num,title=title.split('. ',1)[1],videos=links(cells[1]),notebooks=links(cells[2]),module=0 if num<=6 else 1 if num<=13 else 2 if num<=19 else 3))
assignments=[]
for row in re.findall(r'<tr>(.*?)</tr>',page('assignments'),re.S):
 cells=re.findall(r'<td>(.*?)</td>',row,re.S)
 if not cells:continue
 link=links(cells[1])[0]
 assignments.append(dict(id=int(clean(cells[0])),title=link['title'].replace(' (.jl)',''),url=link['url'],lecture=int(re.search(r'\d+',clean(cells[2]))[0])))
data=dict(lectures=lectures,assignments=assignments,setup=links(page('course-materials').split('<table>')[0])[:3],resources=links(page('resources-for-working-in-julia')),syllabus=page('syllabus'))
assert len(lectures)==26 and len(assignments)==10
text=(root/'template.html').read_text().replace('/*COURSE_DATA*/', 'const COURSE = '+json.dumps(data,ensure_ascii=False)+';').replace('/*STYLES*/',(root/'styles.css').read_text()).replace('/*APP*/',(root/'app.js').read_text())
(root/'dist/index.html').write_text(text)

for asset in ['cloud.js','sync-core.js','firebase-config.json']:
 shutil.copyfile(root/asset,root/'dist'/asset)
(root/'dist/.nojekyll').write_text('')
legacy=root/'dist/study-studio.html'
if legacy.exists():legacy.unlink()
print(f'Built {len(lectures)} lectures, {sum(len(l["videos"]) for l in lectures)} videos, {sum(len(l["notebooks"]) for l in lectures)} notebooks and {len(assignments)} assignments.')

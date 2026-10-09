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
data.update(version=1,id='18-s191-introduction-to-computational-thinking-fall-2020',title='Introduction to Computational Thinking',number='18.S191',term='Fall 2020',url='https://ocw.mit.edu/courses/18-s191-introduction-to-computational-thinking-fall-2020/',description='Understand the world by learning to model it. From a single pixel to an entire planet.',instructors=['Alan Edelman','David P. Sanders','Grant Sanderson','James Schloss','Henri Drake'],modules=[dict(title=t,range=r,icon=i,description=d) for t,r,i,d in [('Images & abstraction','01–06','▦','Pixels, arrays, and structure.'),('Data & epidemic models','07–13','⌘','Probability, networks, and spreading processes.'),('Simulation & ray tracing','14–19','◇','Light, motion, and computation.'),('Climate & scientific computing','20–26','≈','The mathematics of a changing planet.')]],warnings=[])
data['syllabus']=clean(data['syllabus'])
(root/'courses'/f"{data['id']}.json").write_text(json.dumps(data,ensure_ascii=False))
text=(root/'template.html').read_text().replace('/*COURSE_DATA*/', 'const ORIGINAL_COURSE = '+json.dumps(data,ensure_ascii=False)+';').replace('/*STYLES*/',(root/'styles.css').read_text()).replace('/*APP*/',(root/'app.js').read_text())
(root/'dist/index.html').write_text(text)

for asset in ['cloud.js','sync-core.js','course-model.js','ocw-import.js','import-worker.js','firebase-config.json']:
 shutil.copyfile(root/asset,root/'dist'/asset)
shutil.copytree(root/'vendor',root/'dist/vendor',dirs_exist_ok=True)
shutil.copytree(root/'courses',root/'dist/courses',dirs_exist_ok=True)
manifest=[{k:c[k] for k in ['id','title','number','term','description']} for p in sorted((root/'courses').glob('*.json')) for c in [json.loads(p.read_text())]]
(root/'dist/courses/index.json').write_text(json.dumps(manifest))
(root/'dist/.nojekyll').write_text('')
legacy=root/'dist/study-studio.html'
if legacy.exists():legacy.unlink()
print(f'Built {len(lectures)} lectures, {sum(len(l["videos"]) for l in lectures)} videos, {sum(len(l["notebooks"]) for l in lectures)} notebooks and {len(assignments)} assignments.')

"""Export the production prototype as a single, offline UI preview HTML.

No remote assets, cookies, simulated live sessions or extra interface layers.
Run from the repository root: python scripts/build_standalone_preview.py [output.html]
"""
from pathlib import Path
import base64,re,sys,json
ROOT=Path(__file__).resolve().parents[1]
PROTO=ROOT/'prototype'
html=(PROTO/'index.html').read_text(encoding='utf-8')
logo_data_uri='data:image/png;base64,'+base64.b64encode((PROTO/'assets'/'tuttt-logo.png').read_bytes()).decode('ascii')
for asset in ('favicon.png','tuttt-logo.png'):
    image=base64.b64encode((PROTO/'assets'/asset).read_bytes()).decode('ascii')
    attr='href' if asset=='favicon.png' else 'src'
    html=html.replace(f'{attr}="assets/{asset}"',f'{attr}="data:image/png;base64,{image}"')
for name in re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',html):
    css=(PROTO/name).read_text(encoding='utf-8')
    css=re.sub(r'^@import[^;]+;\s*','',css,flags=re.M)
    html,n=re.subn(r'<link rel="stylesheet" href="'+re.escape(name)+r'"\s*/?>',lambda _ : f'<!-- {name} -->\n<style data-tuttt-style="{name}">\n{css}\n</style>',html,count=1)
    assert n==1,name
for name in re.findall(r'<script src="([^"]+)"></script>',html):
    js=(PROTO/name).read_text(encoding='utf-8')
    assert '</script' not in js.lower(),name
    html=html.replace(f'<script src="{name}"></script>',f'<!-- {name} -->\n<script data-tuttt-script="{name}">\n{js}\n</script>',1)
# app.js builds the header logo inside template literals after navigation. Inline those
# references too, not only the initial HTML image, or the offline preview loses its logo.
html=html.replace('assets/tuttt-logo.png',logo_data_uri)
assert 'assets/tuttt-logo.png' not in html
assert '<link rel="stylesheet"' not in html and '<script src=' not in html
version=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
out=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent/('TUTTT_V'+version.replace('.','_')+'_PREVIEW.html')
out.write_text(html,encoding='utf-8')
print(str(out),out.stat().st_size)

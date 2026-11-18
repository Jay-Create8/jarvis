# python3 tools/build-agent-zip.py – packs desktop-agent/ into JARVIS-PC-Agent.zip (download link in the app settings)
import zipfile, os, time
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = ['PC-Agent-starten.cmd', 'PC-Agent-starten.command', 'node-holen.ps1', 'agent.mjs', 'package.json', 'README.md']
out = os.path.join(ROOT, 'JARVIS-PC-Agent.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in FILES:
        src = os.path.join(ROOT, 'desktop-agent', f)
        info = zipfile.ZipInfo('JARVIS-PC-Agent/' + f, date_time=time.localtime(os.path.getmtime(src))[:6])
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100755 if f.endswith('.command') else 0o100644) << 16
        with open(src, 'rb') as fh: z.writestr(info, fh.read())
print(out, os.path.getsize(out), 'Bytes')

# python3 tools/build-agent-zip.py – packs desktop-agent/ into JARVIS-PC-Agent.zip (download link in the app settings)
import zipfile, os, time
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = ['PC-Agent-starten.cmd', 'PC-Agent-starten.command', 'node-holen.ps1', 'agent.mjs', 'dateien.mjs', 'computer.mjs', 'package.json', 'README.md']
out = os.path.join(ROOT, 'JARVIS-PC-Agent.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in FILES:
        src = os.path.join(ROOT, 'desktop-agent', f)
        info = zipfile.ZipInfo('JARVIS-PC-Agent/' + f, date_time=time.localtime(os.path.getmtime(src))[:6])
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100755 if f.endswith('.command') else 0o100644) << 16
        with open(src, 'rb') as fh: z.writestr(info, fh.read())
print(out, os.path.getsize(out), 'Bytes')

# 5.9.4.2: server setup (calls, watchers when the app is closed) as its own small download
SETUP = [('einrichten', f) for f in ['JARVIS-einrichten.cmd', 'JARVIS-einrichten.command', 'einrichten.mjs', 'node-holen.ps1', 'package.json']] + \
        [('server', f) for f in ['worker.js', 'wrangler.toml', 'package.json', 'package-lock.json', 'ANLEITUNG-SERVER.md']] + [('js', 'gemini.js'), ('', 'app-url.txt')]
LIES = """JARVIS - Anrufe & Server einrichten (keine Admin-Rechte noetig)
=================================================================
1. Diesen Ordner entpacken (Rechtsklick - "Alle extrahieren").
2. Ordner "einrichten" oeffnen - Doppelklick auf JARVIS-einrichten.cmd (Mac: JARVIS-einrichten.command).
3. Der Assistent fragt der Reihe nach:
   - Cloudflare: gratis Konto, meldet sich im Browser an ("Allow" klicken)
   - Gemini-Key (gratis, aistudio.google.com/apikey)
   - Twilio fuer echte Anrufe (optional): Account SID, Auth Token, deine Twilio-Nummer, deine Handynummer
4. Am Ende kommt ein Link/QR-Code: am Handy und am Laptop oeffnen - JARVIS ist dann mit dem Server verbunden.

Twilio (twilio.com):
 - Testkonto: gratis, ohne Karte. JARVIS kann DICH anrufen (nur deine bestaetigte Nummer).
 - Anrufe bei Restaurants/Praxen: bezahltes Konto (Zahlungsmittel bei Twilio, Guthaben vorher aufladen).
   Ca. 1.15 $/Monat Nummer + 0.04 $/Min. Festnetz bzw. 0.18-0.25 $/Min. Handy. JARVIS haelt das Budget aus der App ein (max. 5 Fr. gesamt).
"""
out2 = os.path.join(ROOT, 'JARVIS-Einrichtung.zip')
with zipfile.ZipFile(out2, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d, f in SETUP:
        src = os.path.join(ROOT, d, f)
        if not os.path.exists(src): continue
        info = zipfile.ZipInfo('JARVIS-Einrichtung/' + (d + '/' if d else '') + f, date_time=time.localtime(os.path.getmtime(src))[:6])
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100755 if f.endswith('.command') else 0o100644) << 16
        with open(src, 'rb') as fh: z.writestr(info, fh.read())
    info = zipfile.ZipInfo('JARVIS-Einrichtung/LIES-MICH.txt', date_time=time.localtime()[:6]); info.compress_type = zipfile.ZIP_DEFLATED
    z.writestr(info, LIES.replace('\n', '\r\n'))
print(out2, os.path.getsize(out2), 'Bytes')

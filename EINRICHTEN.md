# JARVIS einrichten – Schritt für Schritt (ca. 20 Minuten)

> **Nur die App (ohne Telefon/Laptop-Fernsteuerung) – 2 Minuten, gratis:** https://jay-create8.github.io/jarvis/ in Chrome öffnen →
> ⋮ → „App installieren“ (oder APK: https://jay-create8.github.io/jarvis/JARVIS.apk) → Gemini-Key holen auf
> https://aistudio.google.com/apikey („API-Schlüssel erstellen“, kopieren) → in JARVIS Einstellungen → SCHNELLSTART:
> **📋 KEY EINFÜGEN** → **🚀 ALLES FREISCHALTEN**. Fertig – denkt und spricht gratis. (Anthropic-Key geht weiterhin, kostet aber.)
> Der Rest dieser Anleitung ist nur für Server, Telefon und Laptop.

Alles, was automatisch geht, macht der **Einrichtungs-Assistent**. Du machst nur das, wofür man **dein Konto, deine Zahlungsdaten
oder dein Gerät** braucht – das darf und kann niemand sonst für dich.

## A. Am Laptop (einmal)
1. **Node.js** installieren: nodejs.org → „LTS“ → installieren.
2. Den Ordner `jarvis-5.9` aus `JARVIS-5.9-Laptop.zip` entpacken.
3. Im Ordner `einrichten` doppelklicken:
   - Windows: **`JARVIS-einrichten.cmd`**
   - Mac: **`JARVIS-einrichten.command`** (beim ersten Mal: Rechtsklick → Öffnen)
4. Der Assistent öffnet den Browser → **bei Cloudflare anmelden** (Gratis-Konto anlegen, falls du keins hast) → „Allow“.
   *Falls er meldet, dass die workers.dev-Adresse fehlt: im Cloudflare-Dashboard einmal „Workers & Pages“ öffnen, dann Assistent neu starten.*
5. Er fragt nach dem **Gemini-Key** (gratis): aistudio.google.com/apikey → „API-Schlüssel erstellen“. Damit denkt der Server
   kostenlos (Wächter, Routinen, Telefon-Gespräche). Den **Anthropic-Key** kannst du leer lassen. Eingabe ist unsichtbar.
6. **Twilio** (echte Anrufe) – nur wenn du willst, kostet Geld: Nummer ab ca. 1.15 $/Monat (Schweizer Handynummer 11.70 $ – zu teuer),
   Anrufe aufs Festnetz ca. 0.04 $/Min., aufs Handy ca. 0.18–0.25 $/Min. JARVIS hält dein Telefon-Budget aus der App ein
   (Standard 3.50 Fr. vom 5-Fr.-Deckel). Sonst einfach `n` – alles andere funktioniert trotzdem.
7. Der Assistent lädt Server und App hoch und zeigt am Ende einen **QR-Code**.

## B. Am Handy
1. **QR-Code scannen** → JARVIS öffnet sich → „Einrichtung übernehmen“ → **ERLAUBEN**.
2. Im Browser-Menü **„Zum Startbildschirm hinzufügen“** → JARVIS ist jetzt eine App.
3. Einstellungen (Zahnrad) → SCHNELLSTART → **📋 KEY EINFÜGEN** (Gemini-Key, gratis) → **🚀 ALLES FREISCHALTEN**.
4. Mikrofon, Benachrichtigungen (und Kamera für Handsteuerung) **erlauben**, wenn JARVIS fragt.
5. **ntfy-App** installieren (Play Store, gratis) → „+“ → das Thema abonnieren, das der Assistent angezeigt hat.
6. Optional: „Telefonanrufe erlauben“, „JARVIS darf andere anrufen“, Briefing-Zeiten, Freiheitsstufe.

## Testen
- In JARVIS: Einstellungen → **SERVER PRÜFEN** → „Server OK“.
- Einstellungen → **SELBSTTEST STARTEN** → Bericht herunterladen und mir schicken.
- Erster Anruf an Dritte: mit deiner eigenen Zweitnummer.

## Update später
Neue Version entpacken → `.einrichtung.json` aus dem alten `einrichten`-Ordner in den neuen kopieren → Assistent starten →
Frage „Neue Zugangs-Tokens?“ mit `n` beantworten. Dann wird nur neu hochgeladen, Handy bleibt verbunden.

## Was der Assistent NICHT tut
- Keine Konten anlegen, nichts bezahlen, keine Nummer kaufen.
- Deinen Anthropic-Key nicht lokal speichern (nur verschlüsselt bei Cloudflare als Server-Geheimnis).
- Nichts an Dritte schicken.

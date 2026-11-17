# JARVIS einrichten – Schritt für Schritt (ca. 20 Minuten)

> **Nur die App (ohne Telefon/Laptop-Fernsteuerung) – 2 Minuten:** https://jay-create8.github.io/jarvis/ in Chrome öffnen →
> ⋮ → „Zum Startbildschirm hinzufügen“ → Einstellungen → SCHNELLSTART: **📋 KEY EINFÜGEN** → **🚀 ALLES FREISCHALTEN**. Fertig.
> Der Rest dieser Anleitung ist nur für Server, Telefon und Laptop.

Alles, was automatisch geht, macht der **Einrichtungs-Assistent**. Du machst nur das, wofür man **dein Konto, deine Zahlungsdaten
oder dein Gerät** braucht – das darf und kann niemand sonst für dich.

## A. Am Laptop (einmal)
1. **Node.js** installieren: nodejs.org → „LTS“ → installieren.
2. Den Ordner `jarvis-5.6` aus `JARVIS-5.6-Laptop.zip` entpacken.
3. Im Ordner `einrichten` doppelklicken:
   - Windows: **`JARVIS-einrichten.cmd`**
   - Mac: **`JARVIS-einrichten.command`** (beim ersten Mal: Rechtsklick → Öffnen)
4. Der Assistent öffnet den Browser → **bei Cloudflare anmelden** (Gratis-Konto anlegen, falls du keins hast) → „Allow“.
   *Falls er meldet, dass die workers.dev-Adresse fehlt: im Cloudflare-Dashboard einmal „Workers & Pages“ öffnen, dann Assistent neu starten.*
5. Er fragt nach dem **Anthropic API-Key** (für Wächter, Telefon, Server-Funktionen):
   console.anthropic.com → API Keys → Create Key. **Vorher unter Billing ein Ausgabenlimit setzen.** Eingabe ist unsichtbar.
6. **Twilio** (echte Anrufe) – nur wenn du willst, kostet Geld: twilio.com → Konto → Nummer kaufen → SID, Token, Nummer eingeben.
   Sonst einfach `n` – alles andere funktioniert trotzdem.
7. Der Assistent lädt Server und App hoch und zeigt am Ende einen **QR-Code**.

## B. Am Handy
1. **QR-Code scannen** → JARVIS öffnet sich → „Einrichtung übernehmen“ → **ERLAUBEN**.
2. Im Browser-Menü **„Zum Startbildschirm hinzufügen“** → JARVIS ist jetzt eine App.
3. Einstellungen (Zahnrad) → **Anthropic API-Key** eintragen → „API-Key mit PIN schützen“ → PIN → Speichern.
4. Mikrofon, Benachrichtigungen (und Kamera für Handsteuerung) **erlauben**, wenn JARVIS fragt.
5. **ntfy-App** installieren (Play Store, gratis) → „+“ → das Thema abonnieren, das der Assistent angezeigt hat.
6. Optional: „Telefonanrufe erlauben“, „JARVIS darf andere anrufen“, Briefing-Zeiten, Freiheitsstufe.

## C. Laptop vom Handy aus steuern (optional)
Im Ordner `einrichten` die Datei **`PC-Agent-starten`** doppelklicken (wird vom Assistenten erzeugt). Beim ersten Mal lädt sie
einen Browser herunter. Solange das Fenster offen ist, kann JARVIS diesen Laptop bedienen.

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

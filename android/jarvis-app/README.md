# JARVIS als Android-App (APK)

Trusted Web Activity: Die App startet https://jay-create8.github.io/jarvis/ mit der **Chrome-Engine**. Dadurch funktionieren
Sprache („Hey Jarvis“), Kamera, 3D und Benachrichtigungen genau wie auf der Website, und **Updates kommen automatisch** –
eine neue APK brauchst du nur, wenn sich die App-Hülle ändert.

## Installieren
1. Am Handy https://jay-create8.github.io/jarvis/JARVIS.apk öffnen (oder `JARVIS-5.7.apk` aus dem Chat).
2. Android fragt „Unbekannte Apps installieren?“ → für Chrome bzw. Dateien **erlauben** → Installieren.
3. JARVIS erscheint bei deinen Apps.

**Einfacher und ohne APK:** In Chrome auf der Website ⋮ → „App installieren“ (oder in JARVIS den Knopf „📲 ALS APP INSTALLIEREN“).
Das ist ebenfalls eine echte App (WebAPK) mit eigenem Symbol und ohne Adressleiste.

## Kleine Adressleiste oben?
Ohne „Digital Asset Links“ zeigt Android bei der APK oben eine schmale Leiste mit der Adresse. Weg bekommst du sie so (optional):
neues GitHub-Repository **`jay-create8.github.io`** (genau dieser Name, öffentlich) anlegen → Bescheid geben → ich lege dort
`.well-known/assetlinks.json` (diese Datei liegt hier bereits) ab. Danach läuft die App randlos.

## Selbst bauen
Android SDK 36, Gradle 8.13: `gradle assembleRelease` → `app/build/outputs/apk/release/app-release.apk`.
**`jarvis-app.keystore` + `keystore.properties` sind dein Signierschlüssel – geheim halten und nicht verlieren:** Updates der
App müssen mit demselben Schlüssel signiert sein. Beide Dateien sind nicht im öffentlichen GitHub-Repository.

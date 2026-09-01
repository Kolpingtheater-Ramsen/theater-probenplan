# Bühnenplan – Kolpingtheater Ramsen

Produktive Probenplan-App für Termine, Rückmeldungen, Abwesenheiten, Abstimmungen und Anwesenheits-Check-ins.

## Funktionen

- geschützter Mitgliederbereich mit Passwort-Login und 30-Tage-Sitzungen
- einmalige Ersteinrichtung des ersten Admin-Kontos
- Rollen für Mitglieder und Administratoren
- automatische Seed-Konten für das Beispiel-Ensemble und drei Administratoren
- Admin-Zugangsverwaltung mit sichtbaren Startpasswörtern und sicherem Passwort-Reset
- verpflichtender Wechsel vom Startpasswort zu einem nicht auslesbaren persönlichen Passwort
- gemeinsame SQLite-Datenbank statt Browser-/Demo-Speicher
- Zu- und Absagen inklusive Absagegrund und Fristen
- längere Abwesenheiten
- Terminabstimmungen mit Admin-Bestätigung
- Admin-Termine, Gruppen, Erinnerungen und Mitgliederkonten
- Live-Check-in der Probenleitung
- Kalenderexport für Apple Kalender, Outlook und Google Kalender
- Healthcheck unter `/api/healthz/`
- responsives Layout für Desktop und Mobilgeräte

## Lokal starten

```bash
npm ci
npm run dev
```

Beim ersten Aufruf wird das erste Admin-Konto angelegt. Lokale Daten liegen standardmäßig unter `.data/theater.db`.

Nach der Ersteinrichtung werden die übrigen Seed-Konten automatisch erzeugt. Ihre Startpasswörter sind im Adminbereich sichtbar. Sobald ein Mitglied ein persönliches Passwort festlegt, wird das Startpasswort entfernt; das persönliche Passwort wird nur gehasht gespeichert und kann auch von Administratoren nicht ausgelesen werden.

## Dokploy

Das Repository enthält einen produktionsfertigen `Dockerfile` und `compose.yaml`.

- interner Port: `3000`
- Healthcheck: `/api/healthz/`
- persistentes Volume: `/data`
- Datenbank im Container: `/data/theater.db`

Für eine Dokploy-Compose-Anwendung reicht die committed `compose.yaml`; das benannte Volume `buehnenplan-data` hält die Daten auch über Deployments und Neustarts hinweg.

## Prüfungen

```bash
npm test
npm run typecheck
npm run lint
npm run build
docker build -t theater-probenplan .
```

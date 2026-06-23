# Persönliche Homepage (Quarto)

Portfolio-Website für Environmental Data Science – Projekte, Blog und CV.

## Lokal rendern

[Quarto installieren](https://quarto.org/docs/get-started/), dann im
Projektordner:

```bash
quarto preview     # Live-Vorschau im Browser (mit Auto-Reload)
quarto render      # Statische Seite nach _site/ bauen
```

## Struktur

```
_quarto.yml              # Konfiguration: Navigation, Theme
styles.scss              # Eigene Farben/Styles
index.qmd                # Startseite
about.qmd                # Über mich / CV
blog/
  index.qmd              # Blog-Übersicht (Listing)
  posts/<name>/index.qmd # Einzelne Beiträge
projects/
  index.qmd              # Projekt-Galerie (Grid-Listing)
  <name>/index.qmd       # Einzelne Projekte
assets/                  # Bilder, profile.jpg, cv.pdf, favicon.png
```

## Anpassen – Checkliste

1. `DEIN-USERNAME` und `DEIN-PROFIL` überall ersetzen (GitHub, LinkedIn,
   shinyapps.io). Suchen & ersetzen über alle Dateien.
2. `assets/profile.jpg` (Foto), `assets/cv.pdf`, `assets/favicon.png` ablegen.
3. Titel/Name in `_quarto.yml` (`website.title`) anpassen.
4. Beispiel-Projekte unter `projects/` durch echte ersetzen, je ein
   `thumbnail.png` pro Projekt.
5. Begrüßungs-Post in `blog/posts/welcome/` anpassen oder ersetzen.

## Neues Projekt hinzufügen

Ordner unter `projects/` anlegen, `index.qmd` mit Front-Matter
(`title`, `description`, `date`, `image`, `categories`) – es erscheint
automatisch in der Galerie.

## Deployment (GitHub Pages)

`.github/workflows/publish.yml` ist enthalten. Vorgehen:

1. Repo zu GitHub pushen.
2. Settings → Pages → Source: **GitHub Actions**.
3. Bei jedem Push auf `main` wird automatisch gebaut und veröffentlicht.

Alternativ ohne Actions: `quarto publish gh-pages`.

## Apps einbinden

Apps (Shiny/Streamlit) laufen nicht in der statischen Seite, sondern
extern (shinyapps.io, Hugging Face Spaces, Streamlit Community Cloud) und
werden per `<iframe>` oder Link eingebunden – siehe
`projects/beispiel-app/index.qmd`.

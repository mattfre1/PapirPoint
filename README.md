# PapírPOINT

Web papírenského festivalu PapírPOINT v Olomouci — https://papirpoint.cz

## Jak web funguje

Statický web (HTML + CSS + JS, bez build kroku) hostovaný na **Netlify**. Každý push do větve `main` na GitHubu automaticky nasadí novou verzi.

- **DNS a e-mail**: Seznam.cz
- **Kontaktní formulář**: Formspree
- **Administrace obsahu**: Decap CMS na `/admin/` (přihlášení přes Netlify Identity)

## Struktura

| Cesta | Co obsahuje |
|---|---|
| `index.html` | Homepage |
| `stranky/` | Podstránky (o nás, prodejci, partneři, galerie, kontakty, právní stránky) |
| `partials/` | Sdílená hlavička, patička a cookie lišta (vkládají se JavaScriptem) |
| `obsah/` | Obsah webu v JSON — edituje se přes `/admin/` nebo ručně |
| `obrazky/` | Obrázky (loga, fotky prodejců, homepage) |
| `css/style.css` | Veškeré styly |
| `js/main.js` | Veškerý JavaScript (menu, načítání obsahu z JSON, modaly, cookie lišta) |
| `admin/` | Konfigurace Decap CMS |
| `_headers` | HTTP hlavičky pro Netlify (cache, bezpečnost) |

## Úprava obsahu

Texty, prodejci, partneři a galerie se editují v JSON souborech ve složce `obsah/` — buď přes administraci na `papirpoint.cz/admin/`, nebo přímo v editoru. Stejné texty jsou jako výchozí obsah i přímo v HTML (kvůli vyhledávačům) — při větší změně textu na homepage uprav obojí (`obsah/home.json` i `index.html`).

## Lokální vývoj

Web nelze otevřít přímo jako soubor (`file://`) — JavaScript načítá partials a JSON přes `fetch`, což vyžaduje server. Spusť lokální server v kořenové složce, např.:

```
npx serve .
```

nebo ve VS Code rozšíření **Live Server**.

## Obrázky

Před nahráním fotky zmenši (max ~1600 px na delší straně) a ideálně převeď do WebP, např. na https://squoosh.app — velké soubory zpomalují web hlavně na mobilech.

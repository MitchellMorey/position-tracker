# Position Tracker

A static web app for spotting **newly added positions** across Excel uploads.

Upload a spreadsheet of positions; the app matches rows on a chosen ID column
(e.g. Job ID / Req #) against everything seen in earlier uploads and flags the
new ones. Upload history is stored in your browser's `localStorage` — nothing
is sent to a server.

## How it works

1. Drop in an `.xlsx`, `.xls`, or `.csv` file.
2. Pick the column that uniquely identifies a position (auto-detected when possible).
3. Click **Find new positions**. New rows are highlighted and counted.
4. New IDs are saved to history automatically, so the next upload compares against them.

Use **Reset tracked history** to start fresh.

## Tech

- Plain HTML/CSS/JS — no build step.
- [SheetJS](https://sheetjs.com/) (CDN) for parsing Excel.

## Deploy to Vercel

This is a static site. With the [Vercel CLI](https://vercel.com/docs/cli):

```bash
cd position-tracker
vercel        # preview deploy
vercel --prod # production
```

Or connect the GitHub repo at [vercel.com/new](https://vercel.com/new) and deploy
with default settings (no framework, output = repo root).

## Run locally

Just open `index.html` in a browser, or:

```bash
npx serve .
```

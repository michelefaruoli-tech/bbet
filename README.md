# BBET — Gestionale Finanziario

Web app privata per la gestione economica dell'attività: Sospesi, Master, Commissioni, LAY, Prelievi e Rendiconto.

## Stack

- Next.js 16 + React 19
- PostgreSQL (Neon)
- Prisma 7
- Auth JWT cookie
- Export CSV

## Avvio locale

1. Crea un database su [Neon](https://neon.tech) (gratuito)
2. Copia `.env.example` → `.env` e compila:
   - `DATABASE_URL` — connection string Neon
   - `AUTH_SECRET` — stringa casuale lunga (min 32 caratteri)
3. Installa e avvia:

```bash
cd C:\Users\poste\Projects\bbet
npm install
npm run db:setup
npm run dev
```

Apri http://localhost:3000

### Account demo

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@bbet.local | Admin123! |
| Operatore | operatore@bbet.local | Operatore123! |

## Sezioni

- **Dashboard** — KPI e quadratura
- **Sospesi** — Clienti Dare/Avere
- **Master** — Rapporto con il Master
- **Commissioni** — Rendiconti mensili (Casino netto = 40%)
- **LAY** — Movimenti e Tris
- **Prelievi** — Collegati alle sezioni
- **Rendiconto** — Quadratura patrimoniale
- **Report** — Export CSV
- **Archivio annuale** — Chiusura 31/12

## Deploy (Vercel + Neon)

Come il CRM energia: push su GitHub, connetti Vercel, imposta le variabili d'ambiente, deploy.

## Prossimi step

- Import Excel storico fino a giugno 2026
- Export PDF/Excel avanzati
- Grafici andamento mensile

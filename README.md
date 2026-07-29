# CoachVille certifikace — systém nahrávek

Webová aplikace pro kompletní správu agendy studentských koučovacích nahrávek CoachVille: individuální plány dodávek, upload přes magic link, automatická transkripce a AI vyhodnocení podle Master Promptu, schvalování reportů, mentorské schůzky, hlídání termínů, evidence poplatků a certifikační spis.

**Doména:** certifikace.coachville.eu · **Zadání:** [docs/zadani-v2.1.md](docs/zadani-v2.1.md)

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind) — hosting na [Vercelu](https://vercel.com)
- [Supabase](https://supabase.com) — Postgres, Auth (magic link), Storage
- Claude API — AI vyhodnocení nahrávek
- Resend — transakční e-maily (notifikace@coachville.eu)

## Vývoj

```bash
npm install
npm run dev
```

Aplikace poběží na http://localhost:3000.

## Struktura

| Cesta | Obsah |
|---|---|
| `docs/zadani-v2.1.md` | Finální zadání (zdroj pravdy) |
| `src/app/` | Next.js App Router |
| `AGENTS.md` | Instrukce pro AI nástroje |

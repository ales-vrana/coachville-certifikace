<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CoachVille certifikace — systém nahrávek

Webová aplikace pro správu a AI vyhodnocování koučovacích nahrávek studentů CoachVille (certifikace ICF ACC/PCC). Poběží na `certifikace.coachville.eu`.

**Zdroj pravdy je [docs/zadani-v2.1.md](docs/zadani-v2.1.md)** — finální zadání se všemi rozhodnutími (R1–R38), datovým modelem, rolemi a plánem stavby. Před návrhem čehokoli si přečti relevantní kapitolu. Jediná otevřená otázka je O1 (interpretace kompletního programu) — neblokuje stavbu, typ položky plánu je atribut.

## Klíčová fakta

- **Stack:** Next.js (App Router, TypeScript, Tailwind) na Vercelu + Supabase (Postgres, Auth, Storage) + GitHub. AI vyhodnocení přes Claude API, transkripce se teprve vybere (test na CZ/SK nahrávkách).
- **Přihlašování:** výhradně magic link (Supabase Auth), žádná hesla — pro všechny role.
- **Role:** student, mentor, Verča (provoz), Meira (koordinátorka), Aleš (admin). Přístupová matice v kap. 6 zadání.
- **Jazyk:** UI i veškeré texty česky. Nahrávky jsou česky i slovensky.
- **Termín:** první ostrá nahrávka do září 2026; rozsah MVP v kap. 12, postup po týdnech v kap. 17.
- **Principy (kap. 5):** výjimkový management, AI připravuje – člověk potvrzuje, každý krok zanechá auditní stopu, žádná technická bariéra pro studenty.

## Příkazy

- `npm run dev` — dev server (Turbopack)
- `npm run build` — produkční build
- `npm run lint` — ESLint
- `npm test` — vitest (unit testy v `src/**/*.test.ts`)

## Architektura přístupu k datům

- **Klient do DB nesahá přímo.** RLS je deny-all; veškerá data tečou přes server (Server Components / Actions / Route Handlers) admin klientem (`src/lib/supabase/admin.ts`, `server-only`), autorizaci podle role hlídá aplikační kód. Publishable key slouží jen auth operacím.
- **Auth:** magic link, `shouldCreateUser: false` (účty zakládá jen koordinátorka). Session drží cookies (`@supabase/ssr`), obnovu a ochranu tras dělá `src/proxy.ts` (Next 16: proxy, ne middleware). Ověření odkazu: `/auth/confirm` (token_hash, funguje napříč zařízeními) i `/auth/callback` (PKCE code z výchozí e-mail šablony).
- **Seed admina:** `node --env-file=.env.local scripts/seed-admin.ts <email> "<Jméno>"`.

## TODO před ostrým provozem

- [ ] **26. 11. 2026 vyprší Claude API klíč** — před tím datem vytvořit nový a vyměnit v `.env.local` i ve Vercelu

- [ ] Supabase šablonu Magic Link přepnout na token_hash tvar: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (jinak odkaz nefunguje při otevření na jiném zařízení, než kde byl vyžádán)
- [ ] Po zprovoznění domény přidat v Supabase (Auth → URL Configuration) Site URL `https://certifikace.coachville.eu` + redirect URL `…/auth/callback`
- [ ] Vlastní SMTP přes Resend v Supabase Auth (vestavěný odesílatel má limit jednotky e-mailů/hod.)
- [ ] `RESEND_API_KEY` přidat i do Vercel env (zatím jen v `.env.local`; Supabase proměnné ve Vercelu jsou)

## Stav infrastruktury (2026-07-29)

Produkce běží: Vercel projekt `coachville-certifikace` (auto-deploy z main), doména certifikace.coachville.eu (CNAME ve Forpsi ✓, SSL ✓), Supabase env proměnné ve Vercelu ✓, Resend doména coachville.eu verified (eu-west-1) ✓. Admin účet: ales@zivotjakohra.cz. Přihlášení+odhlášení ověřeno E2E na produkci.

## Stav stavby

- `supabase/migrations/0001_zakladni_schema.sql` — kompletní datový model dle kap. 10 + stavy dle kap. 7. RLS zapnuto bez policies (deny-all); policies dle matice kap. 6 přibudou při napojení Supabase Auth. Migrace se zatím nikam neaplikovala — Supabase projekt ještě neexistuje.
- `src/lib/plan/` — generátor plánů (kap. 8): šablony ACC / upgrade / komplet, proporční přepočet podle cílového data. Šablony v kódu jsou pro MVP zdroj pravdy; DB tabulky `program_templates`/`template_items` se seedují až při napojení.
- **Výchozí volba čekající na O1:** krátké bez vyhodnocení = poslední dvě krátké ACC fáze (měsíce 9 a 11). Až Aleš rozhodne O1, změnit v `src/lib/plan/sablony.ts` + testech.
- `src/app/studenti/` + `src/lib/studenti/akce.ts` — modul studentů (F1 onboarding): seznam (verca/meira/admin), založení s živým náhledem plánu (meira/admin), detail s plánem, tlačítko „poslat přihlašovací odkaz". Uvítací e-mail přes Resend (`src/lib/email/`). Úklid testovacích dat: `scripts/smaz-studenta.ts`.
- `src/lib/nahravky/akce.ts` + `/nahrat/[planItemId]` — upload nahrávek (F2): studentův plán na `/prehled`, signed upload URL → přímý XHR PUT do bucketu `nahravky` (progress bar), povinný checkbox souhlasu (R16), potvrzení založí `recordings` + event + přepne položku na `nahrano` + zařadí `konverze_mp3` do `job_queue`. Bucket zakládá `scripts/vytvor-bucket.ts`.
- **Upload limity:** Free tarif Supabase = max 50 MB na soubor (bucket i globální strop). Po přechodu na Pro zvednout limit bucketu (`updateBucket`) na ~500 MB. Obnovitelný přenos (TUS) zatím není — při výpadku se upload opakuje celý; zvážit `tus-js-client` ve fázi 2.
- **Zpracovatelská pipeline** (`src/lib/zpracovani/` + `/api/zpracuj`): worker fronty `job_queue` — `konverze_mp3` (MVP: passthrough, MP3 archiv v TODO; krátká bez vyhodnocení se rovnou započte) → `transkripce` (ElevenLabs Scribe, diarizace, heuristika Kouč/Klient dle Aleše: kouč zahajuje/ptá se/kratší vstupy — `oznacRole()` v `transkripce.ts`) → `vyhodnoceni` (čeká na ANTHROPIC_API_KEY + Master Prompt). Endpoint chráněn `CRON_SECRET` (Bearer), spouští se po uploadu přes `waitUntil` + denní Vercel cron (`vercel.json`); retry s exponenciálním odkladem. `/api/zpracuj` je výjimka v proxy.
- **Stránka nahrávky `/nahravka/[id]`**: tři prvky postupně — audio (signed URL 1 h), transkript s badgi Kouč/Klient, vyhodnocení (student vidí až po odemknutí dle R12; staff hned). Odkazy ze studentova plánu i z detailu studenta.
- `src/lib/plan/akce.ts` + `editace-planu.tsx` na detailu studenta — editace plánů (R21, jen verca/meira/admin): posun termínu (s auditem `puvodni_termin`, vrací „po termínu" do plánu), „Splněno dříve" (migrace F1b, stav `splneno_historicky`), zrušení/obnovení položky (soft, stav `zruseno` — studentovi se neukazuje), přidání položky. Položky s nahrávkou editovat nejdou.
- **Test transkripce (R37), 2026-07-29 na 2 CZ vzorcích (`Test-nahravky/prepisy/`, gitignorováno — soukromé nahrávky, repo veřejné!):**
  - **ElevenLabs Scribe: jasný vítěz.** Nejpřesnější čeština (lepší než Whisper large-v3-turbo), doslovný verbatim přepis (vsuvky, opakování, [smích] tagy — ideální pro hodnocení ICF kompetencí) a **bezchybná diarizace** včetně rychlých výměn u souhlasu klienta.
  - Deepgram nova-3: rychlý a levný, ale česká přesnost výrazně horší (komoleniny, „ten"→„10") a diarizace lepí krátké repliky k druhému mluvčímu — nezachytí správně výměnu u souhlasu. Nepoužít.
  - Whisper: dobrá přesnost, ale bez diarizace — jen fallback.
  - Zbývá: slovenský vzorek, ověření cen/EU zpracování u ElevenLabs, potvrzení volby Alešem. Testovací skript: `scripts/test-transkripce.ts`.

## Konvence

- Složky `node_modules/` a `.next/` mají xattr `com.dropbox.ignored` (projekt žije v Dropboxu) — po `rm -rf node_modules` je po reinstalaci potřeba xattr nastavit znovu: `xattr -w com.dropbox.ignored 1 node_modules`.
- Známý audit šum: `npm audit` hlásí high zranitelnosti v dev řetězci ESLintu (brace-expansion/minimatch, postcss) — netýká se produkce, oprava vyžaduje breaking change, čeká se na upstream.

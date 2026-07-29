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

## Konvence

- Složky `node_modules/` a `.next/` mají xattr `com.dropbox.ignored` (projekt žije v Dropboxu) — po `rm -rf node_modules` je po reinstalaci potřeba xattr nastavit znovu: `xattr -w com.dropbox.ignored 1 node_modules`.
- Známý audit šum: `npm audit` hlásí high zranitelnosti v dev řetězci ESLintu (brace-expansion/minimatch, postcss) — netýká se produkce, oprava vyžaduje breaking change, čeká se na upstream.

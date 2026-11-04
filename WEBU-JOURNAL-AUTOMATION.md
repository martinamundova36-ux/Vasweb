# WEBU Journal — bezplatná redakčná automatizácia

Existujúci workflow `publish-research-journal.yml` beží denne o 07:35 UTC. Harmonogram sa mení v jeho `cron`; tematické a kvalitatívne pravidlá sú v `journal-config.json`.

## Čo sa deje automaticky

- Vyhľadávanie v bezplatnom verejnom Crossref API bez AI a bez kľúča.
- Kontrola DOI, názvu, autorov, časopisu, vydavateľa a dátumu cez DOI záznam.
- Odmietnutie budúcich dátumov, chýbajúcej bibliografie, označených retrakcií, slabého tematického súladu a chýbajúceho abstraktu.
- Prevencia duplicít voči existujúcim článkom aj návrhom; najviac päť návrhov štúdií denne (každý v SK aj EN).
- SK a EN návrh bibliografického prehľadu v `journal-drafts/`. Abstrakt sa používa iba na výber témy a nereprodukuje sa.
- Drafty a redakčná infraštruktúra sú vylúčené z GitHub Pages cez `_config.yml`.

## Schválenie a publikovanie

1. Otvor návrh `journal-drafts/ID.md` a DOI. Posúď vhodnosť pre čitateľa.
2. V Actions otvor **WEBU Journal - bezplatné návrhy a schválené publikovanie**.
3. Vyber Run workflow → `action: publish` → presné `draft_id: ID`.
4. Táto výslovná voľba vlastníkom je schválením označeného bibliografického prehľadu, nie potvrdením vedeckých výsledkov.
5. Workflow znovu načíta DOI, vytvorí SK/EN článok, vykoná redakčnú a SEO bránu, súvisiace odkazy, favicon a sitemap. Pri chybe neurobí verejný commit článku.
6. Po commite vyžiada existujúci branch-based Pages build, počká na výsledok a skontroluje verejné URL. Stav je v Actions logoch a run summary. Záznam schváleného návrhu obsahuje dátum a URL.

Generované texty nepripisujú štúdii výsledky, veľkosť vzorky ani kauzalitu. Ak sa má prehľad rozšíriť na pôvodný odborný článok, redaktor musí skutočne posúdiť metodiku a výsledky a zaznamenať rozsah overenia.

## Náklady a obmedzenia

AI API: 0 €. Nové predplatné: žiadne. Crossref používa verejné bezplatné API. Verejný repozitár používa štandardný Ubuntu runner; workflow sa pri zmene repozitára na súkromný nespustí. Nepoužíva väčšie platené runnery, cloudové AI API ani veľké uložené artefakty. Existujúca registrácia domény nie je súčasťou nákladov tejto automatizácie.

Staré platené návrhy sú vypnuté. Starý výskumný workflow zostal dostupný iba ručne. API môžu mať výpadky a limity; neúspech vedie k reportu alebo zastaveniu, nie k náhradným vymysleným zdrojom. Kontrola bibliografie nie je overením vedeckej platnosti. Plánované Actions môžu meškať a GitHub môže deaktivovať harmonogram pri dlhodobej neaktivite verejného repozitára.

Indexovanie sa negarantuje. Sitemap sa obnoví pri publikovaní; Google ju má registrovanú na stálej URL. Google Indexing API ani neautorizované automatizované žiadosti sa nepoužívajú. Automatické opätovné odoslanie sitemap cez Search Console API vyžaduje samostatne udelené serverové oprávnenie; browserová relácia sa do GitHub secrets nekopíruje.

## Pokračovanie 4. novembra 2026

- Opätovné overenie pred publikovaním porovnáva aj poradie autorov, rok/dátum, vydavateľa, časopis a typ zdroja. Zmena zastaví publikáciu a vyžaduje novú redakčnú kontrolu.
- Denný strop platí aj na publikovanie: najviac päť štúdií, teda najviac desať SK/EN URL. Opakovaný draft beh zachová zoznam už pripravených návrhov v dennom reporte.
- Favicon workflow po zmene obrazových súborov výslovne vyžiada Pages build; samotný push cez GITHUB_TOKEN ho nemusí spustiť.
- Verejná kontrola overuje všetkých sedem favicon variantov, zhodu ich bajtov so schváleným zdrojom, PNG/ICO rozmery, SVG viewBox, robots pravidlá pre Googlebot a Googlebot-Image, prepojenie HTML a aktuálnosť SEO metadát a sitemap.
- Bezplatná AI bola opätovne preverená: GitHub Models je podľa oficiálnej dokumentácie od 30. 7. 2026 ukončený. Gemini má Free Tier pre vybrané modely, ale dostupná kapacita nie je garantovaná a pre tento projekt nie je pripojený účet/API kľúč. Nejde teda o overenú bezobslužnú náhradu redakcie. Zachovaný je funkčný Crossref režim návrhov; nepridáva sa platená závislosť ani ďalší harmonogram.

Oficiálne podklady: https://docs.github.com/en/github-models ; https://ai.google.dev/gemini-api/docs/rate-limits ; https://ai.google.dev/gemini-api/docs/billing/ ; https://developers.google.com/search/docs/appearance/favicon-in-search

## Prvý článok pripravený na obsahové schválenie

Vybraný existujúci návrh: `2026-11-04-93b063fd01b6`. Kompletný slovenský aj anglický text je v jeho `.md` a v `editorial.languages` jeho `.json`. Stav `ready_for_owner_approval` znamená redakčne pripravený, stále nezverejnený článok. Bibliografické šablóny ostatných štyroch kandidátov sa nesmú zamieňať s hotovými odbornými článkami.

Publikačný workflow po výslovnom schválení vlastníčkou naďalej používa `action=publish` a rovnaké `draft_id`. Znovu overí zdroj, kontrolné položky, úplnosť SK/EN a SHA-256 obsahu oboch verzií. Publikuje presne tieto texty, nie novú šablónu. Záznam publikácie uloží aj schválený odtlačok obsahu. Zmena textu po redakčnej kontrole alebo chýbajúca jazyková verzia publikovanie zastaví. Štrukturálna brána nenahrádza vecné čítanie zdroja.

Prvé produkčné zverejnenie čaká na výslovné obsahové schválenie používateľkou v rozhovore. Automatické zverejňovanie bez schválenia je vypnuté. Voliteľný režim sa bude pripravovať až po úspešnom prvom produkčnom publikovaní; zatiaľ existuje iba denný harmonogram návrhov. Bezplatný skript vyhľadáva a triedi vedecké podklady, nesľubuje päť hotových originálnych odborných článkov bez redakčnej práce denne.

`test_free_journal.py` overuje izolované publikovanie skutočného pripraveného textu vrátane metadát, Journalu a sitemap, odmietnutie zmeneného obsahu, neúplnej redakčnej kontroly, chýbajúcej EN verzie a oznámení o retrakcii/obavách. Produkčný commit článku vznikne až po úspešných bránach. Pri chybe pred commitom existujúci web zostáva bez zmeny. Ak zlyhá samotný Pages build po commite, workflow musí hlásiť neúspech; opakované publikovanie rovnakého návrhu sa blokuje a nasadenie sa opravuje bez tvorby ďalšieho článku.

HTTPS už bolo zapnuté a uložené v Pages nastaveniach. Následná kontrola potvrdila HTTP 301 na HTTPS a HTTPS 200 s bežným overením TLS. Favicon zostal nezmenený, sedem verejných variantov sa zhoduje so schválenými súbormi. Search Console pri jednorazovom opätovnom pokuse stále hlási dennú kvótu; nové žiadosti neboli odoslané. Historické stavy 24 článkov a nevybavené kontroly sú zaznamenané v `journal-reports/google-pending-2026-11-04.json`.

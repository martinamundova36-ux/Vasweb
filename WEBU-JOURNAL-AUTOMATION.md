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

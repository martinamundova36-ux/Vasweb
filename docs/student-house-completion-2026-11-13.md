# WEBU Residence – overenie 13. 11. 2026

Existujúci projekt Vasweb a Supabase ydqchayscxntqdkzkynv sú zachované. Nová aplikácia ani nová databáza nevznikla. Pôvodná adresa Sites smeruje na aktuálny spoločný portál; pôvodné zdroje sú zachované v histórii a src/.

## Nasadené doplnenia

- Registračné polia: dátum narodenia, štátna príslušnosť, heslo a potvrdenie hesla. Heslo spracúva výhradne Auth; žiadosť ani jej JSON v databáze heslo neobsahuje. Existujúce heslá sa neprepisujú.
- Žiadosť, osobné odpovede a databázové udalosti sa ukladajú v jednej transakcii. Pri zlyhaní ukladania sa úspech neoznámi. Súbežné žiadosti s rovnakým e-mailom sa serializujú.
- Rozpracovaný dotazník sa dá uložiť bez fotografie a povinných polí. Odoslanie na kontrolu vyžaduje úplné údaje. Čas odovzdania nastavuje server, takže staré schválenie nemožno zneužiť spätným dátumom.
- Profil dopĺňa dátum narodenia, občianstvo, telefón, typ ubytovania a upozornenie na chýbajúce foto.
- Upratovanie má recepciou vypísané konkrétne termíny, kapacity a zdroje. Čakajúce aj potvrdené rezervácie obsadzujú kapacitu; zamietnutie a zrušenie ju uvoľnia. Databázový zámok kontroluje súbeh a prekrývanie rovnakého zdroja. Žiadne fiktívne dostupné termíny sa nevytvorili.
- Jednotlivé splátky ukazujú uhradenú a zostávajúcu sumu podľa skutočných alokácií a storien. Uhradenie sa neodvodzuje od dátumu.
- Recepcia má súhrn platieb dnes, do 7 dní, po splatnosti, predpisov, skutočných úhrad a zostávajúceho zostatku.
- Export evidencie a financií je skutočný XLSX: formátované záhlavie, filtre, fixovaný prvý riadok a číselné finančné bunky. Výrazy začínajúce rovná sa zostávajú obyčajným textom.
- Nastaviteľné pripomienky predvolene 5 dní, 1 deň, v deň splatnosti a 1 deň po splatnosti. Plánovač spúšťa výber o 08:00 Europe/Bratislava. Front zabraňuje opakovaniu a pred odoslaním prepočíta aktuálny zostatok alebo zruší zastaranú správu. Pripomienky sa týkajú aktivovaných profilov.
- Správa personálu a audit sú v nastaveniach účtu org_admin; recepcia ich nemôže spravovať. Posledného aktívneho administrátora nemožno deaktivovať ani znížiť na recepciu. Oznamy aktívnym študentom vytvárajú notifikáciu aj e-mailovú udalosť.

## Overené

- Lokálne regresie: oddelenie rolí a relácií, transakčné schvaľovanie, kapacity izieb, čiastočné a rozdelené úhrady, storná, súkromie dokumentov; deväť scenárov manage s izolovaným prenosom.
- Nové izolované PostgreSQL testy: kapacity upratovania, prekrytie, uvoľnenie kapacity, oprávnenia; pripomienky, deduplikácia, čiastočné úhrady, storná, splátky a potlačenie zastaranej správy; ochrana posledného administrátora.
- V produkčnej databáze s ROLLBACK: súkromné správy, stavová história, izolácia študentov a organizácií, upratovanie; atomická registrácia a rollback po chybnej odpovedi; neúplný dotazník, koncept a čas servera. Tieto testy nezanechali platby, dlhy, dokumenty ani notifikačné správy.
- Reálna HTTP registrácia označená TEST E2E na vlastný Gmail alias: HTTP 201, stav pending, odpovede a GDPR čas uložené, účet existuje a má hash hesla, čaká na overenie e-mailu. Nemá pridelenú izbu, nájom, splátky ani prijaté platby.
- Recepčné aj študentské potvrdenie novej testovacej žiadosti majú vo fronte výsledok accepted. Študentské potvrdenie bolo následne otvorené priamo v Gmaili; overený príjemca je martinamundova36+residence-e2e-20261113@gmail.com, čas správy 13. 11. 2026 21:12 UTC (22:12 Bratislava). Tým je potvrdené aj reálne doručenie tejto správy.
- XLSX sa skutočne otvoril cez openpyxl; overené číselné bunky, diakritika, XML escaping, textové vzorce a fixované záhlavie.
- Priamo v prihlásenej produkčnej recepcii zobrazené XLSX tlačidlo, finančné ukazovatele, prázdny kalendár dostupných termínov a existujúci ubytovací poriadok. Chyba triedenia nastavení pripomienok bola nájdená v tomto teste a opravená.

## Čo ostáva otvorené

Toto NIE JE potvrdenie 100 % prevádzkovej pripravenosti.

- K dispozícii je GDPR PDF výslovne označené „NÁVRH NA SCHVÁLENIE PREVÁDZKOVATEĽOM PRED POUŽITÍM“. Chýba jeho finálna schválená verzia. Nevydávali sme ho za schválený dokument.
- V portáli je ubytovací poriadok. Individuálne zmluvy a potvrdenia o ubytovaní zatiaľ neboli recepciou nahrané. Nemožno ich nahradiť vymyslenými zmluvami.
- Recepcia musí zadať skutočnú dostupnosť upratovania. Vymyslené termíny sa do produkcie nevkladali.
- V evidencii je 66 izieb oproti požadovaným 64, vrátane zjavne neštandardných čísel. Údaje sa nemazali a fyzická správnosť inventára nie je potvrdená.
- Kompletná spojená cesta reálneho testovacieho študenta cez doručené odkazy, overenie, schválenie dotazníka, aktiváciu, podpisy a služby ešte nie je preukázaná. Databázové a syntetické testy ju nenahrádzajú.
- Skutočné zariadenia Android/iPhone sa netestovali. Browser regresie používajú emulovanú veľkosť a príslušné enginy; ich konečný výsledok je v GitHub Actions.
- Príjemca prevádzkových upozornení ostáva dočasne martinamundova36@gmail.com; cieľová adresa studenthouserecepcia@gmail.com sa nemenila potichu.
- Supabase upozorňuje na vypnutú ochranu proti uniknutým heslám. Nevykonali sme platený upgrade. Súkromné e-mailové tabuľky zámerne nemajú klientské politiky.

Zdroj pravdy zostáva Supabase. Testovacia žiadosť E2E je jasne označená; nemenili sme skutočným študentom schválenia, zmluvy, dlhy ani úhrady.

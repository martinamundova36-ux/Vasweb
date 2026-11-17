# WEBU Journal — redakčný audit historického obsahu (17. 11. 2026)

## Čo bolo skutočne skontrolované

- **118 verejne kanonických článkových URL** uvedených v `sitemap.xml`; každá strana bola načítaná z aktuálneho GitHub repozitára. Ide o 59 dvojjazyčných tematických dvojíc.
- **59 redakčných záznamov** v `journal-reports/journal-audit-register.json`, vrátane typu prístupu k zdroju, rozsahu revízie a SHA-256 integrity stránok.
- Pri celej množine bola vykonaná strojovo podporená prvá redakčná inventúra: tematika, približný rozsah, DOI v HTML, štruktúra nadpisov a vybrané rizikové jazykové výrazy. Päť článkov zo 17. novembra bolo navyše prečítaných súvisle v SK aj EN a porovnaných s dostupnými vydavateľskými abstraktmi.
- **Toto NIE JE nezávislý peer review ani kompletná plnotextová validácia 59 pôvodných vedeckých štúdií.** Nápis „vhodný do vedeckého časopisu“ by bol v tejto fáze nepravdivý.

## Evidované stupne dôkazov (z redakčného registra)

| Evidenčná kategória | Počet tematických dvojíc |
| --- | ---: |
| Automatické komentáre na základe abstraktu | 41 |
| Dokumentované porovnanie plného textu (vrátane preprintu) | 3 |
| Odborné/praktické návody s overenými odbornými dokumentmi | 7 |
| Ostatné kombinované alebo obmedzené podklady (zdrojové výňatky, metodické/časové obmedzenia) | 8 |
| **Spolu** | **59** |

**51 z 59 tematických záznamov** obsahuje jediný zdrojový záznam. Viac zdrojov nie je vždy nevyhnutných pre novinový komentár jednej štúdie, je však zásadnou slabinou pri ambícii na systematický vedecký prehľad.

## Priorita P0: Jazyk, presnosť a argumentácia

Priame príklady z publikovaných stránok (skontrolovať aj výskyt v súvisiacich odkazoch):

- `blog-journal-etnovychova-umela-inteligencia-a-mladez-v-ekvadore-pohlad-cez-pristiepeny-ab.html`: nezmyselný H1 „prištiepený abstrakt“, preklepy a príliš optimistické redakčné zovšeobecnenia. DOI: 10.3389/feduc.2026.1910214.
- `blog-journal-digitalna-transformacia-v-rozvojovych-ekonomikach-co-hovori-nova-studia-o-pr.html`: „konkrénte“; oddeliť záväznosť zistení z kolumbijského výrobného sektora od odporúčaní pre slovenské weby. DOI: 10.1108/ijppm-06-2026-0660.
- `blog-journal-digitalna-nostalgia-a-nakupny-zamer-ako-minulost-formuje-spravanie-mladych-s.html`: „k nostalgií“ a príliš kauzálne vyjadrenia pri prierezovej vzorke; používať „súvislosť“ namiesto automatického „spôsobuje“. DOI: 10.1108/yc-05-2026-3203.
- `blog-journal-vzdelavaci-manazment-pod-lupou-ako-vedenie-skol-a-kultura-vplyvaju-na-spokoj.html`: „korelačního“, „zamestnanców“, „obaja prediktory“; výrok „preukázateľne zlepšuje“ presahuje korelačnú indonézsku štúdiu. DOI: 10.37899/journallaedusci.v7i6.6030.
- `blog-journal-digitalny-lidring-a-vykonnost-firiem-v-cestovnom-ruchu-co-hovori-novy-vyskum.html`: uprednostniť zrozumiteľné „digitálne vedenie“ pred „lídringom“. DOI: 10.1108/jhti-04-2026-0606.
- `blog-journal-demokraticky-styl-vedenia-a-vykonnost-sestier-co-hovori-nova-studia-z-indone.html` a `blog-journal-employer-branding-a-dostojna-praca-porovnanie-itc-limited-a-icici-bank.html`: skontrolovať neopodstatnené „preukázateľne“ v praktických odporúčaniach.

V súvisiacich interných článkoch sa môžu opakovať staré titulky iných tém. Ich technické výskyty nepredstavujú nezávislé vedecké chyby daného článku.

## Priorita P1: Nedostatočná argumentačná hĺbka

Príklady veľmi stručných dvojjazyčných článkov (počty slov orientačné vrátane prvkov hlavného článku):

| Téma (13. 11. 2026) | SK | EN |
| --- | ---: | ---: |
| Generatívna AI v malej firme | ~447 | ~434 |
| Dôvera v online recenzie | ~399 | ~414 |
| Finančná gramotnosť | ~419 | ~429 |
| Home office, autonómia a zmysel | ~425 | ~415 |
| Rozšírená realita v e-shopoch | ~398 | ~414 |

Tieto stránky majú bibliografické minimum, ale na kvalitný vedecký rukopis im chýba úplná metodika, priamy rozbor originálnych zdrojov, syntéza literatúry, diskusia neistoty a dôkladná originálna analýza. Neodporúča sa mechanicky text natiahnuť; ak nie sú dostupné dôkazy, treba zachovať stručný **odborne popularizačný prehľad** a nie tvrdiť vedeckú úroveň.

## Priorita P2: Originalita, publikačná etika, metodológia

- **Originalita:** rutinná šablóna „Úvod — Čo skúmala — Výsledky — Limity — WEBU návrh — Záver“ je zrozumiteľná, ale samotná neprináša nové vedecké poznanie.
- **Proveniencia tvrdení:** treba viesť človekom schválenú tabuľku tvrdenie → presné miesto vo vedeckom zdroji → obmedzenie, najmä pri štatistikách, metodike a akýchkoľvek kauzálnych tvrdeniach.
- **Zdroje:** DOI označuje publikáciu, nie automaticky jej kvalitu. Pri vedeckom rukopise je potrebné vyhľadávanie a porovnanie viacerých štúdií, prístup k plným textom a primerané vyhodnotenie ich kvality.
- **Autorstvo:** osobná zodpovednosť, skutočný intelektuálny prínos a transparentné uvedenie AI pomoci; AI nemôže byť autorom. Automatické produkčné testy ani obsahový hash nie sú potvrdením ľudskej vedeckej revízie.
- **Vhodnosť na časopis:** zatiaľ nepreukázaná pri automatických abstraktových komentároch. Závisí od zvoleného typu článku a pravidiel konkrétneho časopisu.

## Hotové technické preventívne opatrenia

- `.github/scripts/journal_quality.py`: prísnejšie podmienky pre NOVÉ dvojjazyčné rukopisy, min. 700 zmysluplných slov na jazyk ako redakčný filter, min. 120 slov samostatnej praktickej analýzy, povinné zverejnenie obmedzenia abstraktu, číselná zhoda SK/EN, detekcia duplicitných odsekov a vybraných jazykových/kauzálnych excesov.
- `.github/scripts/ai_journal_writer.py`: dôraz na zdroje, alternatívne vysvetlenia, limity, originalitu praktických príkladov a korektúru; pri nevyhovujúcom texte zadržať návrh.
- `.github/scripts/auto_publish_verified.py` a `.github/scripts/free_journal.py`: kvalitatívna brána pred publikovaním nového automatického článku, pri starom obsahu bez retroaktívneho predstierania posúdenia.
- `scripts/test_journal_quality.py` a `scripts/test_abstract_autopublish.py`: regresné testy, ktoré majú odmietnuť slabý text, nesúlad dvoch jazykov a strojové chyby.
- `WEBU-JOURNAL-EDITORIAL-STANDARDS.md`: explicitne oddelené redakčné publikovanie a vedecké rukopisy.

## Realistické ďalšie podmienky na vedeckú publikovateľnosť

Na získanie kvality relevantnej pre vedecký časopis je potrebné vybrať jednu konkrétnu vedeckú otázku, nie 5 náhodných denných tém. Následne zvoliť dizajn (originálny výskum alebo skutočný systematický/scoping prehľad), dohľadať a kriticky posúdiť plné texty, vypracovať metodiku, výsledky a diskusiu, overiť zdroje a získať odborné ľudské posúdenie. Až potom posudzovať vhodnosť pre konkrétny časopis.

Uvedená inventúra nezaručuje odhalenie všetkých faktických či jazykových chýb a nesmie byť vydávaná za úplné plnotextové preskúmanie zdrojov.

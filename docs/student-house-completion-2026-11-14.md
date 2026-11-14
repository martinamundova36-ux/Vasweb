# WEBU Residence – pokračovanie overenia 14. 11. 2026

## Výsledok

Systém sa neoznačuje za 100 % prevádzkovo dokončený. Pokračovanie zachováva existujúci repozitár, projekt Supabase, účty, reálne pobyty a finančné záznamy. Na úvod boli prečítané posledné commity main, správa z 13. 11., testy a zoznam aplikovaných migrácií.

## Opravy tejto iterácie

- Kontrola podpísaného dokumentu vyžaduje pri vrátení dôvod (aspoň 3 znaky). Frontend aj server ho overujú.
- Kontrola, audit a existujúci mailový trigger sú v jednej databázovej transakcii. Chyba auditu znamená rollback celej kontroly, nie falošné potvrdenie úspechu.
- Neaktívny súbor ani už schválený dokument nemožno spätne schváliť či prepísať. Konflikt medzi dvoma recepčnými sa vracia ako HTTP 409.
- Dokončené typy dokumentov: individuálny PDF splátkový kalendár a potvrdenie o ubytovaní, ich bezpečné odovzdanie študentovi a spätné nahratie podpísanej verzie na kontrolu. Potvrdenie je podmienené priložením PDF recepciou. Žiadne zmluvy, podpisy ani právne dokumenty sa nevymýšľajú.
- Pridané RLS čítanie nových typov len vlastníkom s aktívnym členstvom; zamestnanci používajú existujúcu tenantovú politiku. Kontrolné RPC smie volať iba service_role po overení zamestnanca v Edge Function.
- Nový osobný dokument vyvolá upozornenie jeho študentovi. Odmietnutá registrácia vyvolá oznámenie žiadateľovi; opätovné uloženie nezmeneného odmietnutia e-mail neopakuje. Nahratie podpisu naďalej upozorňuje recepciu. Doručenie nových typov správ do schránky zatiaľ nebolo overené.
- Excel rozšírený o 11 doplnkových listov: Profily a dotazníky, Registrácie, Dokumenty, Predpisy, Prijaté platby, Alokácie platieb, Storná, Splátky, Upratovanie, Poruchy a požiadavky, Audit. Spolu s pôvodnou Evidenciou má export 12 listov. Pôvodná Evidencia rešpektuje svoj filter a rok; doplnkové listy obsahujú úplný aktuálne oprávnený rozsah zariadenia.
- Excel uvádza aj dátum narodenia, stav fotografie, odovzdanie a čerstvosť kontroly dotazníka, stavy dokumentov a služieb. Finančné súčty sú odvodené zo skutočných alokácií a storien. Nevyplnený nepovinný údaj sa označuje ako neuvedený, nie vymyslenou hodnotou. Prístupové kódy izieb ani podpísané URL sa neexportujú. Audit sa riadi aktuálnou rolou.
- Opravené triedenie tabuľky resident_enquiry_reviews, ktorá má zložený kľúč a nemá stĺpec id. Opravené nesprávne zobrazovanie osobných nepodpisových dokumentov ako čakajúcich na schválenie.
- Aktualizovaný DOCUMENTS-SETUP.md, ktorý nesprávne uvádzal, že základná registrácia neobsahuje heslo a nevytvára Auth účet.

## Overený východiskový stav produkcie

| Položka | Počet |
| --- | ---: |
| Registračné žiadosti | 10 |
| Rezidenti | 5 |
| Aktivované profily | 3 |
| Odoslané dotazníky | 1 |
| Schválené dotazníky | 0 |
| Dokumenty v pôvodnej tabuľke documents | 0 |
| Súbory residence_portal_files | 2 |
| Prijaté platby | 0 |
| Izby | 66 |
| Správy accepted SMTP | 15 |

Dva súbory sú ubytovací poriadok a fotografia. Žiadne individuálne zmluvy ani finálne GDPR PDF sa v tejto evidencii nenachádzali. Izby 12356799 a 1236690 nemajú nájomný vzťah a vyžadujú potvrdenie prevádzkovateľa; nič sa neodstránilo. Verejný registračný katalóg už používa 64 štandardných izieb.

Prevádzkové upozornenia zostávajú dočasne na martinamundova36@gmail.com. Pôvodný adresát studenthouserecepcia@gmail.com ostáva uložený pre neskoršie obnovenie; prepnutie sa nevykonalo.

## Overenie

- Existujúca lokálna sada npm test --prefix tests: regresie registrácie, rolí, schvaľovania, finančných operácií, upratovania, upozornení a ďalších služieb.
- Nové PGlite scenáre document-review.test.mjs: povinný dôvod, iná organizácia, študent bez oprávnenia na kontrolu, neaktuálny stav, neaktívny súbor, oba nové podpisové typy, RLS oddelenie vlastníkov a organizácií, rollback zmeny aj mailovej udalosti pri zlyhaní auditu.
- Nové mail-events.test.mjs: oznámenie zamietnutia, neopakovanie pri nezmenenom stave, správny príjemca osobného dokumentu, upozornenie recepcie na podpis a študenta na kontrolu dokumentu.
- operational-export.test.mjs: konzistentné stĺpce, čerstvosť schválenia, čiastočná úhrada a skutočný zostatok.
- Skutočný XLSX otvorený v openpyxl: 11 doplnkových listov, diakritika, bezpečný text začínajúci = a číselné finančné bunky. Žiadne produkčné osobné údaje sa na tento test nepoužili.
- V produkčnom PostgreSQL vykonané transakcie s ROLLBACK: vrátenie bez dôvodu zamietnuté, vrátenie s auditom uložené, neaktuálne schválenie zamietnuté, následné platné schválenie, upozornenie na osobný kalendár správnemu vlastníkovi. Nezostali testovacie dokumenty, maily, platby ani úpravy študentov. Toto nie je prehliadačový E2E test.
- Kontrola oprávnení RPC v produkcii: anon=false, authenticated=false, service_role=true.
- Produkčný verejný portál a recepčné prihlásenie otvorené v skutočnom zdieľanom prehliadači. Recepcia vyžaduje nové prihlásenie; v tomto prehliadači nie je prevzatá relácia z predchádzajúceho rozhovoru.
- Lokálna browser sada sa nespustila: chýbajú požadované Playwright enginy. Ich inštalácia zlyhala na neplatnom alebo skrátenom stiahnutom ZIP. Tento výsledok nie je PASS.

## Nasadenie

Tri nové databázové migrácie aplikované v existujúcom Supabase projekte: residence_document_review_integrity, residence_remaining_document_types, residence_missing_operational_notifications. Súčasná residence-files Edge Function bola aktualizovaná na verziu 11. Autentifikácia zostáva vykonávaná v tele funkcie, ako pred zmenou. residence-mail worker a jeho SMTP tajomstvá sa nemenili.

## Otvorené časti

1. Kompletná produkčná študentská cesta cez skutočne doručené odkazy a prihlásenú recepciu zatiaľ nepreukázaná. Je potrebné bezpečné prihlásenie v zdieľanom prehliadači a izolovaný testovací študent; obídenie schválenia priamou zmenou produkčných stavov sa nepoužilo.
2. Finálna schválená GDPR dokumentácia, individuálne zmluvy a skutočné rozpisy upratovania musia prísť od prevádzkovateľa. Potvrdenie o ubytovaní je potrebné len pri príslušnom študentovi.
3. Doručenie všetkých typov e-mailov do reálnej schránky nebolo v tejto iterácii potvrdené. Historických 15 accepted znamená prijatie SMTP serverom, nie dôkaz inboxu. Správa z 13. 11. uvádza jeden vtedy otvorený registračný e-mail; nové overenie sa zaň nevydáva.
4. Evidencia skutočnej platby vyžaduje skutočný doklad. Produkčné platby sa nevymýšľali; čiastočné platby a storná boli overované izolovane.
5. Inventár 66 verzus 64 vyžaduje potvrdenie dvoch neštandardných čísel.
6. Fyzický Android a iPhone sa netestovali. Lokálne browser enginy chýbajú; verejný formulár a prihlásenie boli otvorené v dostupnom Chrome.
7. Supabase naďalej upozorňuje na vypnutú ochranu proti uniknutým heslám; platené služby sa nemenili. Existujúce upozornenie na SECURITY DEFINER dostupnosť upratovania vyžaduje posudzovať podľa jeho vnútorných kontrol. E-mailové tabuľky zostávajú zámerne bez klientských RLS politík.

Aplikácia: https://www.webu.sk/student-house-portal/
Recepcia: https://www.webu.sk/student-house-portal/admin/
Repozitár: https://github.com/martinamundova36-ux/Vasweb

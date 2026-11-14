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
- Produkčný verejný portál a recepčné prihlásenie otvorené v skutočnom zdieľanom prehliadači. Po úvodnom načítaní sa obnovila existujúca relácia správcu martinamundova36@gmail.com; recepčné kroky uvedené nižšie boli následne vykonané priamo cez produkčné UI.
- Lokálna browser sada sa nespustila: chýbajú požadované Playwright enginy. Ich inštalácia zlyhala na neplatnom alebo skrátenom stiahnutom ZIP. Tento výsledok nie je PASS.

## Nasadenie

Tri nové databázové migrácie aplikované v existujúcom Supabase projekte: residence_document_review_integrity, residence_remaining_document_types, residence_missing_operational_notifications. Súčasná residence-files Edge Function bola aktualizovaná na verziu 11. Autentifikácia zostáva vykonávaná v tele funkcie, ako pred zmenou. residence-mail worker a jeho SMTP tajomstvá sa nemenili.

## Otvorené časti

1. Kompletná produkčná študentská cesta je overená po formulár aktivácie hesla. Ďalší krok vyžaduje, aby heslo testovacieho účtu zadala používateľka pri prevzatí prehliadača. Až následne možno dokončiť dôkaz prihlásenia, spätného nahratia podpísaného technického súboru a študentských služieb. Obídenie schválenia priamou zmenou produkčných stavov sa nepoužilo.
2. Finálna schválená GDPR dokumentácia, individuálne zmluvy a skutočné rozpisy upratovania musia prísť od prevádzkovateľa. Potvrdenie o ubytovaní je potrebné len pri príslušnom študentovi.
3. Priamo v Gmaili boli v tejto iterácii otvorené potvrdenie registrácie, nová výzva na opravu dotazníka, upozornenie na osobný dokument a nová aktivácia profilu testovacieho účtu. Úplná matica všetkých typov správ vrátane splatností a dokumentovej kontroly zatiaľ nie je potvrdená v inboxe. accepted sa naďalej neinterpretuje ako dôkaz doručenia ostatných správ.
4. Evidencia skutočnej platby vyžaduje skutočný doklad. Produkčné platby sa nevymýšľali; čiastočné platby a storná boli overované izolovane.
5. Inventár 66 verzus 64 vyžaduje potvrdenie dvoch neštandardných čísel.
6. Fyzický Android a iPhone sa netestovali. Lokálne browser enginy chýbajú; verejný formulár a prihlásenie boli otvorené v dostupnom Chrome.
7. Supabase naďalej upozorňuje na vypnutú ochranu proti uniknutým heslám; platené služby sa nemenili. Existujúce upozornenie na SECURITY DEFINER dostupnosť upratovania vyžaduje posudzovať podľa jeho vnútorných kontrol. E-mailové tabuľky zostávajú zámerne bez klientských RLS politík.

Aplikácia: https://www.webu.sk/student-house-portal/
Recepcia: https://www.webu.sk/student-house-portal/admin/
Repozitár: https://github.com/martinamundova36-ux/Vasweb

## Následné živé overenie a finálny bod pokračovania

- Nasadené commity: [f0df0b2](https://github.com/martinamundova36-ux/Vasweb/commit/f0df0b279ffcd4f8a30af25f4a7f6521675f8b1a) a [8920605](https://github.com/martinamundova36-ux/Vasweb/commit/8920605687219752372ecd5c641b6e809c910e49). Verejná produkčná HTML obsahuje verziu staff.js 20261114-document-review2.
- Prvý kompletný CI beh [43590067561](https://github.com/martinamundova36-ux/Vasweb/actions/runs/43590067561) a následný po oprave obnovovania [43590425737](https://github.com/martinamundova36-ux/Vasweb/actions/runs/43590425737) skončili success vrátane browser testov. GitHub Pages deployment [43590425323](https://github.com/martinamundova36-ux/Vasweb/actions/runs/43590425323) skončil success. Lokálne obmedzenie inštalácie Playwright zostáva zaznamenané vyššie.
- V produkcii bol nájdený a opravený návrat otvoreného profilu na zoznam pri automatickom obnovení po zmene fokusu. Obnovovanie teraz chráni otvorený profil, schvaľovací formulár a formuláre s neuloženou zmenou. Nová regresia overuje aj stratu fokusu. Pri opakovanom živom teste zostal profil otvorený aj po prepnutí karty a uložení kontroly.
- Pokračovalo sa na existujúcom účte TEST E2E Technicka skuska - ignorovat, martinamundova36+residence-e2e-20261113@gmail.com, rezident c072d9c5-7a04-412c-8f83-fa88fd8943dd. Nové účty ani platby sa kvôli testu nevytvárali. Úvodná registrácia a schválenie tohto účtu pochádzajú z predchádzajúcej práce; nevydávajú sa za novo zopakované kroky tejto iterácie.
- V Gmaili bol opätovne otvorený registračný receipt z 13. 11. 21:12 podľa zobrazenia schránky, pre uvedený testovací alias.
- Cez recepciu bol dotazník vrátený na opravu s jednoznačným dôvodom TEST E2E. DB uložila needs_correction. Nová správa bola reálne doručená a otvorená v Gmaili (zobrazený čas 11:33). Kliknutie na jej bezpečný odkaz prihlásilo správny testovací účet a otvorilo editovateľný dotazník s dôvodom opravy.
- Študent opravil školu na TEST univerzita, odstránil neplatný nepovinný IBAN a nepoužiteľný nepovinný rodičovský kontakt. Existujúca fotografia zostala dostupná. Cez UI dotazník opätovne odoslal. Následne videl iba čakajúci krok a hlásenie Dotazník čaká na kontrolu recepcie, bez odomknutia ubytovacieho profilu.
- Recepcia znovu otvorila testovací profil, videla opravené údaje a aktuálnu odoslanú verziu. Kliknutie na Schváliť správne vyplnený dotazník zobrazilo Dotazník bol schválený. DB potvrdila approved.
- Aktivačný e-mail sa reálne doručil a bol otvorený v Gmaili (zobrazený čas 11:48). Jeho odkaz otvoril /student-house-portal/student/?step=profile# a formulár Krok 3 – Aktivácia študentského profilu s novým heslom, potvrdením a ikonami oka. Do heslových polí sa nič nezadalo; tento krok čaká na používateľku.
- Recepcia vybrala práve uvedeného testovacieho študenta a nahrala TEST-E2E-technical-document.pdf ako schedule_draft. PDF je výslovne technický test, nie zmluva, faktúra, platba ani právny dokument; neobsahuje podpis. DB aj produkčná karta potvrdili súkromné priloženie. Upozornenie na nový dokument bolo reálne otvorené v Gmaili (zobrazený čas 11:46).
- Kliknutie recepcie na stiahnutie technického PDF vydalo auditovaný súkromný odkaz a otvorilo pomocnú kartu, ale browser download udalosť na pôvodnej karte nebola zachytená. Úspešné uloženie PDF na zariadenie sa preto zatiaľ neoznačuje za preukázané. Študentské stiahnutie a vrátenie podpisu sa dokončí po aktivácii.
- Reálnym tlačidlom Excel (.xlsx) bol stiahnutý produkčný workbook. openpyxl ho otvorilo a overilo všetkých 12 listov, fixované záhlavie, filtre a testovací riadok so školou TEST univerzita a stavom approved. Ide o skutočný export z prihlásenej recepcie, nie iba syntetický workbook.
- Recepcia v časti Upratovanie skutočne zobrazuje Recepcia zatiaľ nevypísala voľný termín a žiadne objednávky. Dostupné termíny sa nevymýšľali.

Aktuálny stav po živom teste: 10 žiadostí, 5 rezidentov, 3 aktivované profily, 1 odoslaný a teraz 1 schválený dotazník, 0 pôvodných documents, 3 portal_files (vrátane označeného technického PDF), 0 platieb, 66 izieb, 19 správ accepted, 0 termínov upratovania. Všetky nové trvalé testové zmeny sa týkajú označeného TEST E2E rezidenta.

Časy uvedené v odsekoch o Gmaili sú presne časy zobrazené v schránke; jej nastavená zóna nebola overená. Nepoužívajú sa ako tvrdenie o lokálnom čase Bratislavy.

# WEBU Journal — záväzný redakčný štandard / Editorial policy

Platí pre všetky existujúce aj nové články v slovenskej a anglickej verzii. Applies to all existing and new articles in Slovak and English.

## Povinná kontrola pred publikovaním / Required pre-publication checks
1. Overiť existenciu každého citovaného zdroja na stránke vydavateľa alebo cez DOI; skontrolovať názov, autorov, rok, časopis a DOI. Verify all cited source metadata against the publisher or DOI.
2. Ak je dostupný celý text, porovnať každé empirické tvrdenie s metodikou a výsledkami. If only an abstract or metadata is available, explicitly state that limitation; never claim full-text verification.
3. Pri výskumných tvrdeniach uviesť typ štúdie, vzorku a relevantné limity. State study design, sample and relevant limitations.
4. Rozlíšiť empirické zistenia, interpretáciu a redakčné praktické odporúčania. Do not present extrapolations or marketing advice as demonstrated study findings.
5. Zachovať vecnú zhodu medzi SK a EN, správne odkazy a prístupné označenia zdrojov. Keep SK/EN versions substantively equivalent.
6. Overiť, že odkazy fungujú, DOI smeruje na správny článok, meta description a schema.org neobsahujú zastarané tvrdenia.
7. Pri oprave staršieho článku ponechať pôvodný datePublished a prípadne doplniť dateModified; nemení sa URL bez presmerovania.
8. Nepoužívať vymyslené citácie, percentá, štatistiky, tvrdenia o kauzalite ani tvrdenia o účinnosti bez primeraného podkladu.
9. Ak kontrola zlyhá alebo zdroj nie je dostupný, označiť článok na manuálnu revíziu; nevydávať ho za overený.

## Spätný audit / Retrospective audit
Všetky existujúce články treba postupne skontrolovať podľa rovnakého checklistu. Tento dokument sám o sebe nevykonáva automatickú kontrolu a nie je dôkazom, že existujúce články už prešli auditom.

## Publishing gate
A new or edited research-based article should only be published after completing this checklist and recording the source verification. An automated check may verify link and metadata structure, but semantic comparison with research requires an actual source review.

## Povinný záznam vedeckého porovnania zdroja (od 4. 11. 2026)

Publikovanie vedeckého článku cez existujúci workflow vyžaduje `editorial.scientific_review`, viazaný na SHA-256 celého SK/EN obsahu. Záznam musí obsahovať meno/zodpovednosť kontrolujúceho, dátum, dostupnosť plného textu, presné umiestnenie metodiky/vzorky a každého kvantitatívneho tvrdenia, význam koeficientu a koncovú premennú, kauzálne obmedzenia, reprezentatívnosť, súlad prekladov a oddelenie vlastných odporúčaní. Pri článku bez čísel sa v zozname tvrdení výslovne uvedie `estimate: not applicable` a dôvod; nesmie sa vymyslieť výsledok.

Plný text nedostupný, nevyriešené tvrdenie, oprava/retrakcia, neúplný záznam alebo staršia než 30-dňová kontrola integrity zastaví nové publikovanie. Návrh zostáva neverejný a vyžaduje redaktora. Crossref opravné a retrakčné oznámenia sa preverujú opäť pri publikovaní; ich neprítomnosť nie je záruka platnosti výskumu. Redaktor porovná aj oznámenia vydavateľa. Overenie dostupnosti HTTP stránky nepotvrdzuje čitateľnosť ani odbornú kvalitu plného textu.

**Technické testy kontrolujú prítomnosť a väzbu záznamov, metadáta a bezpečnosť publikovania. Nevykonávajú odborné vedecké posúdenie, opätovnú analýzu dát ani nezávislé recenzné konanie.** Porovnanie zdroja môže byť asistované, ale vlastník schvaľuje obsah. Staršie články sa týmto spätne neoznačujú za vedecky posúdené. Issue Form nesmie obísť túto cestu pri článkoch s DOI.

## Obrázky

Existujúci publisher používa `journal-images.json` a `.github/scripts/journal_images.py`. Vyberá iba nepoužitú tematickú fotografiu zo schválenej knižnice, s overenou Pexels licenciou a pripravenými lokálnymi WebP/JPEG variantmi. Redaktor preverí tematickú vhodnosť. Ak knižnica nemá vhodný obrázok, návrh dostane `needs_image` a publikovanie sa zastaví. Nepoužíva sa náhodná externá URL ani platené API. Nové fotografie redaktor doplní do rovnakej knižnice, zaznamená licenciu/zdroj a pripraví varianty 640/1280 WebP a 1280 JPEG; technický test porovná rozmery deklarované v HTML a hashe súborov.

## Kvalita zdroja sa posudzuje osobitne

Platné DOI ani prečítaný plný text samy osebe nestačia na prijatie zdroja. Záznam `scientific_review.source_quality` musí obsahovať rozhodnutie `accepted`, `accepted_with_limitations` alebo `hold`, jeho zdôvodnenie a zoznam výhrad. `hold` aj chýbajúce rozhodnutie blokujú publikovanie, aj keby boli ostatné technické polia úplné. Kľúčové slová sú iba prvotný filter tém; nepreukazujú užitočnosť pre klientov WEBU.

HTTP kontrola podporuje HTML, PDF a XML vedeckého zdroja. Pri PDF overí aj hlavičku `%PDF-`; to však neoveruje metodiku ani pravdivosť výsledkov. Redaktor musí obsah skutočne prečítať a zdokumentovať jeho kvalitu. Pri neprístupnom zdroji alebo nevyriešených výhradách sa neznižujú štandardy kvôli dennému počtu.

## Register všetkých článkov a ochrana overeného obsahu

`journal-reports/journal-audit-register.json` eviduje každú jazykovú stránku, zdroje, ich dostupnosť, metodiku/vzorku, stav výskumného podkladu, obsahové porovnanie sekcií a hash revidovaného obsahu. Verejná metodika je na `/journal-metodika.html` a `/journal-metodika-en.html`. Register nie je potvrdením nezávislého vedeckého recenzného konania.

Praktický odborný sprievodca sa nevydáva za empirickú štúdiu: môže vychádzať z dokumentácie W3C, Google alebo metodickej príručky. Nevymýšľa sa mu výskumná vzorka ani DOI. Pri štúdii dostupnej len z abstraktu, nedostupnom texte či nevyriešenom dátume zostáva výskumný podklad označený na kontrolu. Verejná oprava smie obsahovať len doložené opisy rozsahu zdroja a jasne odlíšené bezpečné redakčné odporúčania; nesmie publikovať neoverené výsledky.

Pôvodná URL a datePublished sa zachovávajú. Zmena overeného textu bez aktualizácie skutočného redakčného záznamu je blokovaná. Automatická údržba súvisiacich odkazov a obrazových variantov nie je novým vedeckým tvrdením, preto nemení hash jadra článku. Nový vedecký článok sa zapíše do rovnakého registra po schválení existujúcim workflowom; starý Issue Form nesmie obísť úplnú dvojjazyčnú kontrolu. Referencie podľa APA7 a aspoň päť obsahových sekcií sú povinné pre nový výskumný článok. Samotná dĺžka textu ani počet sekcií nie sú dôkazom kvality.

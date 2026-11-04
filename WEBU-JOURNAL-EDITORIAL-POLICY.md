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

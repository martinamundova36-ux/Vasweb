# WEBU Journal — odborné a vedecké redakčné štandardy (od 17. 11. 2026)

## Poslanie WEBU Journal – podpora podnikania

WEBU Journal je **nezávislý výber najnovších zahraničných vedeckých výskumov pre podnikateľov**. Jeho hodnotou je objaviť relevantné štúdie, preložiť a stručne vysvetliť ich hlavné zistenia po slovensky (s anglickou verziou), uviesť kontext, limity, DOI a originálny zdroj a odlíšiť vedecké fakty od redakčného vysvetlenia. Nejde o plné preklady cudzích autorsky chránených štúdií ani o vlastnú recenzovanú vedeckú publikáciu.

**Bez reklamy na tvorbu webstránok v článkoch.** WEBU zostáva vydavateľskou značkou a súčasne má oddelené služby; tvorba webov, ceny, portfólio a ponuky WEBU sa nesmú vsúvať do výskumných zhrnutí. Ak zdroj priamo neskúma webové služby, nie je dôvod ich uvádzať. Ak štúdia nemá presvedčivú súvislosť s podnikaním, automat nesmie násilne vytvoriť podnikateľský záver ani ju bezdôvodne publikovať.

Hlavné oblasti: manažment a leadership, psychológia práce, správanie zákazníkov, marketing, financie, obchodné inovácie, organizačné vzdelávanie, AI v podnikaní a prevádzka firiem. **Najskôr overiť relevantnosť pre podnikateľov, potom písať.**

## Rozsah a tvrdenia

WEBU Journal publikuje **odborné popularizačné komentáre a metodicky transparentné výskumné prehľady**. Toto samo osebe nie je recenzovaný vedecký časopis. Automaticky pripravený komentár na základe abstraktu NESMIE byť označený ako originálny výskum, systematické preskúmanie literatúry, nezávisle overená metaanalýza ani ako rukopis pripravený do vedeckého časopisu.

**Hlavné rozhodnutie: kvalita a dôveryhodnosť sú nadradené cieľu piatich článkov denne.** Denný cieľ päť dvojjazyčných tém zostáva plánom, nie dôvodom zverejniť text, ktorý neprešiel kontrolou. Kontroly vždy vracajú pravdivé „publikované“ vs. „pozastavené“.

## A. WEBU Journal — kvalitný komentár pre verejnosť

1. **Zdroj a identita:** overiť DOI a zhodu názvu, autorov, roku, časopisu, dátumu a vydavateľa priamo v Crossref a podľa možností na stránke vydavateľa. Záznam musí mať jasné bibliografické metadáta. DOI samo nezaručuje kvalitu štúdie.
2. **Úroveň prístupu:** pri abstrakte uvádzať „podľa abstraktu“ a nespájať neoverené čísla, metódy alebo výsledky s plným textom. Nevyvodzovať kauzalitu z prierezových/korelačných dát. Rozlišovať primárny zdroj od komentára WEBU.
3. **Hodnota pre čitateľa:** konkrétna výskumná otázka, presný kontext a vzorka, čo skutočne zistili autori, metodické hranice, aspoň jedna odlišná alternatívna interpretácia a samostatná aplikácia pre prax s overiteľným krokom alebo metrikou. Nepísať uniformné prázdne závery.
4. **Jazyk a rozsah:** jazyková kontrola SK aj EN; nula zjavných pravopisných chýb a strojových výrazov. Pri nových automatických textoch technická hranica 450 obsahovo hodnotných slov na jazyk, časť o relevantnosti pre podnikanie najmenej 80 slov. To je **redakčný filter, nie norma indexovania Googlom ani podmienka vedeckej publikácie**. Text sa NESMIE dopĺňať vatou len kvôli počtu slov.
5. **Bilingválna zhoda:** rovnaký počet osôb, rovnaké štatistiky, rovnaké výhrady a vysvetlenie záverov v oboch verziách. V texte musí byť jednoznačne označené, čo je výsledok zdroja a čo je návrh redakcie.
6. **Výsledná technická kontrola:** H1, jasný SEO title, meta description, bibliografia s DOI, schema.org BlogPosting, kanonická a hreflang URL, fotky s licenciou/alt, relevantné súvisiace odkazy a viditeľný skutočný autor. Každý zdroj/citácia sa musí vzťahovať ku konkrétnemu tvrdeniu.
7. **Bezpečný proces:** pri chýbajúcom abstrakte, nepravdivom bibliografickom údaji, rozpore v číslach, nerozlíšenej kauzalite, nezrozumiteľnom preklade alebo nedostatku hodnoty publikovanie pozastaviť. Falošné „5/5 hotových“ nie je dovolené.

Deterministický filter: `.github/scripts/journal_quality.py`, testy: `scripts/test_journal_quality.py`. Filter zachytáva vybrané technické a jazykové riziká, NIE vedeckú pravdivosť či plagiátorstvo.

## B. Rukopis pre skutočný vedecký časopis — povinné navyše

- **Originalita a výskumná otázka:** vlastné prístupné údaje a reprodukovateľná metóda, alebo prehľad literatúry s jasnou metódou výberu a syntézy. Samotné prerozprávanie jedného abstraktu nestačí.
- **Kompletné zdroje:** primárne plné texty, transparentné vyhľadávanie literatúry, kritické zhodnotenie kvality štúdií, relevantné kontexty a protichodné výsledky. Pre systematický prehľad sú relevantné PRISMA 2020, pre observačný výskum STROBE; pri iných dizajnoch zvoliť adekvátnu smernicu.
- **Metodológia, reprodukovateľnosť a etika:** metódy, výber a veľkosť vzorky, nástroje, skreslenia, chýbajúce údaje, etické schválenie/informovaný súhlas ak relevantné, analytický postup, nezávislosť interpretácie, podmienky zdieľania dát a výnimky.
- **Výsledky a diskusia:** uviesť presné zdroje štatistík a neistotu, odlíšiť koreláciu od príčiny, posúdiť obmedzenia a konkurenčné vysvetlenia, porovnať s viacerými štúdiami. Nedomýšľať výsledky.
- **Autorstvo, AI a zodpovednosť:** ľudský autor musí urobiť podstatný intelektuálny príspevok, poznať všetky tvrdenia, potvrdiť presnosť a splniť kritériá cieľového časopisu; AI nie je autor. Použitie AI vrátane účelu zverejniť podľa pravidiel časopisu. Zakázať vymyslené citácie, zamlčanie AI, duplicitné publikovanie či neoverené recenzné tvrdenia.
- **Nezávislý odborný posudok:** rukopis má pred odoslaním prejsť ľudskou obsahovou, metodologickou, citačnou a jazykovou revíziou; prijatie do časopisu nemožno garantovať.

**Automatická publikácia vedeckých rukopisov je neprípustná.** Vhodnosť na odoslanie do konkrétneho časopisu sa posudzuje osobitne podľa jeho `Instructions for Authors`.

## Zdroje etických štandardov

- ICMJE (aktualizácia január 2026): https://www.icmje.org/recommendations/
- ICMJE – AI: https://www.icmje.org/recommendations/browse/artificial-intelligence/
- COPE – Authorship and AI tools: https://publicationethics.org/guidance/cope-position/authorship-and-ai
- EQUATOR reporting guidelines: https://www.equator-network.org/reporting-guidelines/
- PRISMA 2020: https://www.prisma-statement.org/prisma-2020

## Zavádzanie bez narušenia existujúceho webu

Nové automaty používajú sprísnenú kontrolu pred publikovaním. Historicky zverejnené články zostávajú online so zachovanými URL a integritnými záznamami a ich odborná revízia sa vedie ako backlog. Zmenu historického textu nesmie systém vydávať za nový vedecký posudok. Pri kontrole už publikovaného článku sa zachová dátum vydania a jasne sa uvedie, či išlo iba o jazykovú korektúru alebo odbornú revíziu.

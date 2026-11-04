# WEBU Journal – e-mailové upozornenie a rozhodnutie

Existujúci `publish-research-journal.yml` zostáva jediným bezplatným výskumným publikačným procesom. Denne o 07:35 UTC pripraví najviac päť bibliografických návrhov; nie je to sľub piatich hotových vedecky posúdených článkov.

## Upozornenia

Pre nový návrh vytvára `github-actions[bot]` samostatnú vetvu `journal/approval/<id>` a Pull Request `WEBU Journal – Na schválenie: <názov>`, priradený účtu `martinamundova36-ux`. Obsahuje anotáciu, bibliografiu/DOI, skutočný stav odbornej kontroly, náhľad SK/EN a presné príkazy na rozhodnutie.

Náhľad je Markdown v tej istej vetve repozitára, nie ďalšie nasadenie webu. Repozitár je verejný; návrhy sú teda čitateľné na GitHub, ale `journal-drafts/` a `journal-reports/` sú vylúčené z GitHub Pages.

Bot a pridelenie vlastníčke riešia problém s upozornením na vlastné PR bez plateného mailera, hesla SMTP alebo plateného API. Testovací PR vytvorený vlastníčkou môže dostať jednorazový komentár bota ako bezplatnú alternatívu upozornenia. Nezmenené návrhy nevytvárajú nové PR ani komentáre. Zmenený návrh aktualizuje ten istý otvorený PR; zatvorený/zamietnutý sa automaticky neotvára znova. Staršie návrhy pred zavedením tohto režimu sú evidované ako legacy; nejde o nové návrhy a neposielajú sa spätne naraz.

Predpoklad: v Settings → Actions → General musí byť povolené `Allow GitHub Actions to create and approve pull requests`. GitHub spája vytváranie a schvaľujúce recenzie do jedného nastavenia. Náš workflow žiadnu schvaľujúcu recenziu nevytvára a nepredstiera súhlas vlastníčky. Predvolený prístup ostatných workflowov ostáva read-only; zapisovacie oprávnenia majú iba konkrétne potrebné joby.

GitHub Notifications → Participating, @mentions and custom musí obsahovať Email; doručovacia adresa je existujúca adresa nastavená používateľkou v GitHub. Žiadna adresa sa neukladá do repozitára. Predmet správy tvorí GitHub z názvu PR a môže pridať názov repozitára a číslo.

**API úspech ani záznam GitHub Notifications nepotvrdzuje doručenie e-mailu.** Test zostáva nedokončený, kým príjemkyňa alebo oprávnený prístup do schránky nepotvrdí predmet a cieľ odkazu. Žiadne doručenie sa automaticky neoznačuje ako potvrdené.

## Rozhodnutie

Otvorte PR z e-mailu a vložte komentár priamo na GitHub. Skopírujte celý príkaz z popisu PR, kde je aktuálny 40-znakový SHA:

- `SCHVALIT <SHA>`: publikuje iba odborne pripravený dvojjazyčný článok po opätovných vedeckých záznamových, bibliografických, zdrojových, obrazových a SEO kontrolách. Po nasadení sa overia verejné URL a výsledok sa oznámi v PR.
- `UPRAVIT <SHA>`: nič sa nepublikuje; doplňte pripomienky na ďalšie riadky. Upraviť treba pôvodný JSON v `journal-drafts/` na main; zmena aktualizuje ten istý PR a vyžiada nové rozhodnutie. Nezmenená verzia sa po tomto rozhodnutí nedá schváliť.
- `ZAMIETNUT <SHA>`: nič sa nepublikuje, rozhodnutie sa uloží a PR sa zatvorí.

Príkaz je platný len od vlastníčky účtu, pre otvorenú vlastnú vetvu repozitára a presný aktuálny SHA. Z PR sa čítajú iba jeho JSON a Markdown; jeho kód sa nikdy nespúšťa. Zmena návrhu, chýbajúci plný text, neúplná SK/EN verzia, nevyriešené tvrdenia alebo testovací príznak blokujú publikovanie. Nezávislé odborné posúdenie nemôže nahradiť automatický test.

Vytvorenie PR, úspešné Actions, bežné Merge alebo komentár „páči sa mi“ nepúšťajú publikovanie. Existujúca manuálna voľba `publish` vo workflow zostáva alternatívnym výslovným schválením vlastníčky a podlieha rovnakým kontrolám.

Pri úspešnom publikovaní sa PR uzavrie s odkazmi na obe nasadené URL; nemerguje sa jeho dočasný náhľad. Pri chybe nasadenia sa nehlási úspech; existujúci režim `deploy` slúži na obnovu.

## Test bez publikovania

Spustite existujúci workflow s `action=notify-test`. Používa tú istú skutočnú bibliografiu ako už publikovaný článok o AI vo firme, ale s odlišným testovacím ID a `test_only=true`. Nejde o druhý článok. Aj pokus o SCHVALIT musí zostať bez publikovania. Opakované spustenie nezmeneného testu nesmie vytvoriť druhý PR ani druhé upozornenie.

# WEBU Journal – e-mailové upozornenie a rozhodnutie

Existujúci `publish-research-journal.yml` zostáva jediným bezplatným výskumným publikačným procesom. Denne o 08:00 Europe/Bratislava (vrátane letného a zimného času) pripraví najviac päť bibliografických návrhov; nie je to sľub piatich hotových vedecky posúdených článkov.

## Upozornenia

Pre nový návrh vytvára `github-actions[bot]` samostatnú vetvu `journal/approval/<id>` a Pull Request `WEBU Journal – Na schválenie: <názov>`, priradený účtu `martinamundova36-ux`. Obsahuje anotáciu, bibliografiu/DOI, skutočný stav odbornej kontroly, náhľad SK/EN a presné príkazy na rozhodnutie.

Nové PR sú označené Draft: ide o redakčné návrhy, nie požiadavky na automatické programátorské AI recenzie. Na priradenie, upozornenie a vlastné rozhodovacie príkazy tento stav nemá negatívny vplyv.

Náhľad je Markdown v tej istej vetve repozitára, nie ďalšie nasadenie webu. Repozitár je verejný; návrhy sú teda čitateľné na GitHub, ale `journal-drafts/` a `journal-reports/` sú vylúčené z GitHub Pages.

Bot a pridelenie vlastníčke riešia problém s upozornením na vlastné PR bez plateného mailera, hesla SMTP alebo plateného API. Testovací PR vytvorený vlastníčkou môže dostať jednorazový komentár bota ako bezplatnú alternatívu upozornenia. Nezmenené návrhy nevytvárajú nové PR ani komentáre. Zmenený návrh aktualizuje ten istý otvorený PR; zatvorený/zamietnutý sa automaticky neotvára znova. Staršie návrhy pred zavedením tohto režimu sú evidované ako legacy; nejde o nové návrhy a neposielajú sa spätne naraz.

Predpoklad: v Settings → Actions → General musí byť povolené `Allow GitHub Actions to create and approve pull requests`. GitHub spája vytváranie a schvaľujúce recenzie do jedného nastavenia. Náš workflow žiadnu schvaľujúcu recenziu nevytvára a nepredstiera súhlas vlastníčky. Predvolený prístup ostatných workflowov ostáva read-only; zapisovacie oprávnenia majú iba konkrétne potrebné joby.

GitHub Notifications → Participating, @mentions and custom musí obsahovať Email; doručovacia adresa je existujúca adresa nastavená používateľkou v GitHub. Žiadna adresa sa neukladá do repozitára. Predmet správy tvorí GitHub z názvu PR a môže pridať názov repozitára a číslo.

**API úspech ani záznam GitHub Notifications nepotvrdzuje doručenie e-mailu.** Test zostáva nedokončený, kým príjemkyňa alebo oprávnený prístup do schránky nepotvrdí predmet a cieľ odkazu. Žiadne doručenie sa automaticky neoznačuje ako potvrdené.

## Rozhodnutie

Prečítajte si náhľad článku. Odpovedzte na upozornenie z GitHub e-mailom alebo vložte komentár v príslušnom PR. Na prvý riadok stačí jedno slovo, aj bez diakritiky a bez rozlišovania veľkosti písmen:

- **SCHVÁLIŤ** — publikuje iba odborne pripravený dvojjazyčný článok po všetkých kontrolách.
- **UPRAVIŤ** — nič sa nepublikuje; na ďalší riadok doplňte pripomienky.
- **ZAMIETNUŤ** — nič sa nepublikuje a PR sa zatvorí.

Žiadny technický kód netreba kopírovať. Verzia, hash obsahu, identita účtu a čas rozhodnutia sa kontrolujú na pozadí. E-mailová odpoveď musí byť GitHubom pripísaná účtu vlastníčky; ak ju GitHub neprijme, rozhodnutie sa nevykoná. Bežný text bez jedného z troch rozhodnutí nič nepublikuje.

Príkaz sa viaže na aktuálnu verziu náhľadu v PR v čase komentára. Ak sa vetva zmení po komentári alebo nezodpovedá oznámenému náhľadu, schválenie sa odmietne. Pri odpovedi na starší e-mail si treba otvoriť aktuálny náhľad; z textu odpovede nemožno zistiť, ktorú staršiu verziu čitateľka videla. Staré testovacie príkazy s SHA zostávajú spätne podporované.

Po UPRAVIŤ upravte pôvodný JSON v `journal-drafts/` na main; zmena aktualizuje ten istý PR a vyžiada nové rozhodnutie. Nezmenená verzia sa po tomto rozhodnutí nedá schváliť. Z PR sa čítajú iba JSON a Markdown; jeho kód sa nikdy nespúšťa. Chýbajúci plný text, neúplná SK/EN verzia, nevyriešené tvrdenia alebo testovací príznak blokujú publikovanie. Nezávislé odborné posúdenie nemôže nahradiť automatický test.

Vytvorenie PR, úspešné Actions, bežné Merge alebo komentár „páči sa mi“ nepúšťajú publikovanie. Existujúca manuálna voľba `publish` vo workflow zostáva alternatívnym výslovným schválením vlastníčky a podlieha rovnakým kontrolám.

Po výslovnom schválení sa overená dátová vetva PR zlúči lokálne bez commitu. Až po úspešných obsahových záznamových a technických kontrolách sa vytvorí a odošle merge commit so schváleným návrhom a oboma hotovými stránkami. Pri chybe kontrol alebo zmene produkčnej vetvy sa nič neodošle. Po úspešnom nasadení sa výsledok oznámi s oboma URL. Testovací PR #3 sa nikdy nezlučuje ani nepublikuje. Pri chybe nasadenia sa nehlási úspech; existujúci režim `deploy` slúži na obnovu.

## Test bez publikovania

Spustite existujúci workflow s `action=notify-test`. Používa tú istú skutočnú bibliografiu ako už publikovaný článok o AI vo firme, ale s odlišným testovacím ID a `test_only=true`. Nejde o druhý článok. Aj pokus o SCHVALIT musí zostať bez publikovania. Opakované spustenie nezmeneného testu nesmie vytvoriť druhý PR ani druhé upozornenie.

## Skutočná kapacita a plán

Jediný plánovaný generátor má `cron: 0 8 * * *` a `timezone: Europe/Bratislava`. GitHub môže plánovaný beh zaradiť do frontu alebo oneskoriť; 08:00 je plánovaný čas, nie garancia okamžitého doručenia e-mailu. Samostatné denné SEO kontroly nevytvárajú články. Starý výskumný workflow zostáva iba manuálny.

Generátor bez AI vytvára najviac päť bibliografických podkladov denne. **Nedokáže automaticky napísať päť úplných, vedecky posúdených SK/EN článkov.** Crossref nie je nástroj na písanie ani vedecký recenzent. Pre aktuálny Crossref proces nechýba platený kľúč; chýba autonómne písanie celých textov a odborné posúdenie primárnych zdrojov. GitHub Models API už nie je dostupné (GitHub uvádza ukončenie 30.7.2026: https://docs.github.com/en/github-models). Žiadna platená náhrada sa nezapína.

`journal-reports/daily-status.json` odlišuje bibliografické podklady, úplné SK/EN návrhy a publikované články. Na obsahové schválenie sa posielajú iba úplné návrhy, ktoré spĺňajú redakčné záznamové kontroly. Samotný bibliografický podklad sa neposiela ako hotový článok. Výsledok technickej kontroly neznamená nezávislé odborné posúdenie. Denné limity sa počítajú podľa Bratislavy; DOI a presné názvy sa kontrolujú proti existujúcim návrhom a publikovanému obsahu. Nejde o komplexný test plagiátorstva ani sémantickej podobnosti tém.

Odpoveď **SÚHLASÍM** alebo **SUHLASIM** sa prijíma rovnako ako SCHVÁLIŤ. Oprávnenie účtu a aktuálny obsah zostávajú povinné.

Pri viacerých rozhodnutiach sa používajú samostatné skupiny podľa PR, aby sa čakajúce rozhodnutia navzájom nerušili. Ak súčasne zmenia produkčnú vetvu dva schválené návrhy, druhý zápis najviac trikrát načíta aktuálny základ, znovu overí pôvodné rozhodnutie a pripraví výstup s novými kontrolami. Pri nejasnej sieťovej chybe na nezmenenom základe alebo po vyčerpaní limitu sa zastaví. Testy simulačných upozornení zapisujú len do dočasných testovacích súborov.

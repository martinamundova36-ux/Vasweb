# Student House – dočasné smerovanie e-mailov

Dátum: 13. 11. 2026 (Europe/Bratislava)

## Nasadené WordPress nastavenia

Site ID: 258559915. Príjemca notifikácií: `martinamundova36@gmail.com`.
Vlastník systému, prihlasovacie adresy, roly a verejné kontakty sa nemenili.

| Formulár | SK | EN | RU | UA | Pôvodný príjemca |
|---|---:|---:|---:|---:|---|
| Byty Tomášikova 32 | 992 | 993 | 994 | 995 | studenthouserecepcia@gmail.com |
| Študentské ubytovanie | 21 | 128 | 129 | 247 | studenthouserecepcia@gmail.com |
| Parkovanie | 392 | 393 | 394 | 395 | studenthouserecepcia@gmail.com |
| Upratovanie | 852 | 854 | 855 | 856 | studenthouserecepcia@gmail.com |
| Podujatia Medium Inn | 412 | — | — | — | recepciastudenthouse@gmail.com |

Všetkých 17 uložených nastavení bolo po zmene opätovne prečítaných a overených. Jetpack bloky majú emailNotifications=true a saveResponses=true. Shortcode formuláre majú zmenený atribút to.

## Overené testy

- Byty SK: test `TEST EMAIL 20261113`, výsledok úspešného odoslania a ID odpovede 1103. Samostatné otvorenie Jetpack Responses a doručenie do Gmailu zatiaľ neoverené.
- Supabase obnova hesla na administrátorskú adresu: 13.11.2026 15:48:03 CET, HTTP 200 a Auth log user_recovery_requested. Toto NEPOTVRDZUJE doručenie do schránky ani úspešnú zmenu hesla.
- Testovacia registrácia: `martinamundova36+sh-test-20261113@gmail.com`, HTTP 201, stav pending. Ide o alias administrátorky, nie skutočného študenta. Žiadne skutočné študentské pozvánky neboli odoslané.

## Zistené blokery a nedokončené časti

- Supabase dashboard v tomto prehliadači vyžaduje prihlásenie. Pripojený Supabase nástroj neposkytuje čítanie/úpravu Auth SMTP konfigurácie alebo secrets. SMTP sa v tomto zásahu nemenilo.
- Gmail nie je pripojený na čítanie prijatých správ; doručenie zatiaľ nie je potvrdené.
- Živý register-student v5 ukladá registráciu bez odoslania upozornenia recepcii. Živý registration-correction v2 vracia odkaz na opravu, ale neposiela e-mail. Obe časti vyžadujú doplnenie po overení bezpečného odosielateľa.
- Celý postup schválenie → pozvánka → dotazník → kontrola → aktivácia → prihlásenie a zmena hesla zatiaľ NIE JE overený.
- Zdrojové súbory Edge Functions v main sa nezhodujú s aktuálne nasadenými verziami; pred úpravou vychádzať zo živých funkcií a neprepísať ich starším kódom.

## Návrat na oficiálny e-mail

Po overení doručovania zmeniť iba to v uvedených Jetpack contact-form blokoch a contact-form shortcodoch na oficiálne potvrdenú adresu. Nemeniť globálne prihlasovacie adresy, účty ani adresátov študentských pozvánok/obnovy hesla. Testovať každú kategóriu, overiť uloženú odpoveď aj prijatý e-mail. Tento súbor je centrálny register dočasných zmien.

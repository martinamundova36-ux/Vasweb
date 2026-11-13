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

- Byty SK: test `TEST EMAIL 20261113`, výsledok úspešného odoslania a ID odpovede 1103. Skutočné doručenie na martinamundova36@gmail.com potvrdené priamo v prijatej správe; obsah obsahuje testovacie údaje aj odkaz na odpoveď 1103. Samostatné otvorenie Jetpack Responses blokuje prihlásenie WordPressu.
- Supabase obnova hesla: e-maily na administrátorskú adresu z oboch dnešných testov sú prijaté v Gmaili. Čerstvý odkaz po oprave povolených URL otvoril formulár nového a potvrdenia nového hesla. Osobné heslo administrátorky nebolo zmenené.
- Jednorazové prihlásenie e-mailom bolo skutočne doručené a otvorilo administráciu s rolou správcu. Nezmenila sa žiadna rola.
- Testovacia registrácia: `martinamundova36+sh-test-20261113@gmail.com`, HTTP 201, stav pending. Ide o alias administrátorky, nie skutočného študenta. Žiadne skutočné študentské pozvánky neboli odoslané.

## Zistené blokery a nedokončené časti

- Supabase aj Gmail sú prihlásené. Auth SMTP ostáva smtp.gmail.com:587 so senderom martinamundova36@gmail.com; existujúce skryté heslo sa nečítalo ani nemenilo.
- Nasadený residence-mail v1, manage v16 a registration-correction v3. Nový front residence_mail_outbox zachytáva nové registrácie, potvrdenie prijatia študentovi, schválenie, opravy, odovzdanie/kontrolu dotazníka, súbory a aktiváciu. Správy čakajú na doplnenie RESIDENCE_SMTP_PASSWORD do Edge Function Secrets. Toto je samostatné od Auth SMTP a zatiaľ neodosiela. Diagnostická správa čaká vo fronte.
- Centrálne smerovanie portálu: residence_mail_config.admin_email; original_admin_email uchováva pôvodnú adresu. temporary=true. Študentské správy používajú individuálny e-mail a nie admin_email. Bez hesiel v repozitári.
- Opakovanie odosielania: cron residence-mail-retry každú minútu, najviac tri správy za 55 sekúnd; atomická rezervácia, opakovanie chýb najviac šesť pokusov. accepted znamená prijatie SMTP, NIE potvrdenie doručenia do schránky.
- Server vyžaduje schválený dotazník novší než posledné odovzdanie pred pozvánkou na heslo aj aktiváciou. Verejná UI po odovzdaní čaká na kontrolu. Auth pozvánky a obnovy hesla sa nepresmerovali.
- Pridané presné povolené URL: /student/, /admin/, /questionnaire/, /student/?step=profile, /?view=reception pod https://www.webu.sk/student-house-portal/. Predtým bola povolená iba hlavná URL.
- Celý postup schválenie → pozvánka → dotazník → kontrola → aktivácia → prihlásenie a zmena hesla zatiaľ NIE JE overený.
- Kanonické Edge zdroje sú student-house-portal/supabase/. Staršie súbory v koreňovom supabase/functions/ sa nesmú nasadiť cez aktuálne funkcie.
- Automatická kontrola odmietla vytvoriť testovacie nájomné predpisy 0,01 € v ostrej evidencii. Žiadne takéto predpisy ani platby nevznikli. Testovacia registrácia je pending; označenie zmluvy TEST-EMAIL-20261113 a preferovaná izba 001 sú iba v testovacej žiadosti.
- Overenie: 10 integračných testov prešlo; JS/TS zdroje sa syntakticky načítajú; SQL test prístupov k mailovému frontu, rezervácie a retry prešiel s rollbackom bez odoslania. End-to-end aktivácia ostáva neoverená.

## Návrat na oficiálny e-mail

Po overení doručovania zmeniť iba to v uvedených Jetpack contact-form blokoch a contact-form shortcodoch na oficiálne potvrdenú adresu. Nemeniť globálne prihlasovacie adresy, účty ani adresátov študentských pozvánok/obnovy hesla. Testovať každú kategóriu, overiť uloženú odpoveď aj prijatý e-mail. Tento súbor je centrálny register dočasných zmien.

Pre portál zmeniť residence_mail_config.admin_email na original_admin_email a temporary=false. SMTP sender/user možno zmeniť iba s platnou konfiguráciou oficiálneho odosielateľa a bezpečne vloženým príslušným app password. Vyžaduje sa overenie skutočného doručenia.

Nasadené DB migrácie: residence_operational_mail_outbox; require_reception_review_before_profile_activation; residence_mail_receipts_and_retry_schedule. Základ schémy je v docs/student-house-mail-schema.sql, serverová kontrola aktivácie je funkcia residence_activate_profile_password. Mailový front ani konfigurácia nemajú granty pre anon/authenticated; RLS bez verejných politík je zámerný zákaz prístupu.

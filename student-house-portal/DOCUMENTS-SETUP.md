# Student House Bratislava – registračný a dokumentový postup

Existujúca aplikácia WEBU Residence / Student House Bratislava.

## Presné poradie

1. **Verejná registrácia:** študent zadá kontaktné údaje, preferovaný typ izby a pobyt. **Nezadáva číslo zmluvy ani heslo.** Žiadosť zostane `pending`; nevzniká žiadny prístup do študentského profilu.
2. **Recepcia → Registrácie:** overí žiadosť, pridelí konkrétnu izbu a **číslo zmluvy** podľa vlastných podkladov, skontroluje nájomné a všetky mesačné predpisy a schváli registráciu.
3. **Pozvánka e-mailom:** pri schválení systém odošle zabezpečenú pozvánku od Supabase Auth. Existujúcim účtom vytvoreným starým postupom odošle odkaz na nastavenie hesla. Po schválení sa dá pozvánka poslať opätovne cez **Registrácie → Znova poslať pozvánku**. Heslo neprechádza cez recepciu.
4. **Študent → Krok 1:** cez pozvánku vytvorí vlastné heslo (aspoň 12 znakov). Prihlási sa do oddeleného študentského profilu.
5. **Študent → Krok 2:** osobný dotazník je predvyplnený údajmi z registrácie; študent ich skontroluje, doplní a nahrá profilovú fotografiu. Odoslanie nastaví `student_submitted_at`, ktoré nie je nastavené len predvyplnením databázy.
6. **Študent → Krok 3 / Dokumenty:** stiahne svoje **individuálne PDF zmluvy** od recepcie, všeobecný platný ubytovací poriadok a schválené GDPR informácie s podpisovým potvrdením. Vyplní a podpíše ich mimo portálu. Do súkromného úložiska pošle **podpísanú zmluvu**, **podpísaný ubytovací poriadok** a **podpísané potvrdenie o GDPR** (PDF/JPG/PNG; max. 6 MB každý).
7. **Recepcia → Dokumenty:** vidí každé odovzdanie, stiahne ho a označí **schválené** alebo **vrátené na opravu** s poznámkou. Kým nie sú všetky tri schválené, študentské prihlásenie prednostne otvára dokumentovú sekciu.

## Dokumenty musí recepcia pripraviť pred ostrým použitím

- Na karte **Dokumenty** nahrá aktuálne a schválené PDF ubytovacieho poriadku.
- Nahrá aktuálne GDPR informácie a platné samostatné potvrdenie o oboznámení sa s GDPR (nie neschválený pracovný návrh).
- Pri schválenom študentovi cez **Dokumenty → Nahrať individuálnu zmluvu (PDF)** priloží jeho zmluvu podľa jej skutočného čísla, ubytovania a dátumov. Inému študentovi sa nezobrazí.
- Recepcia overí funkčnosť e-mailovej pozvánky/SMTP a celý tok na samostatnom testovacom účte študenta.

## Ochrana osobných údajov

Supabase `residence-portal-files` je súkromné úložisko; na súbory sa vydávajú krátkodobé podpisované odkazy iba po overení členstva a RLS. Individuálne zmluvy (`contract_draft`) sa zobrazujú len danému študentovi a recepcii. Prijaté zmluvy (`signed_contract`) majú vlastný stav kontroly. Údaje o zmluve a platobnom kalendári priraďuje iba recepcia; podpis nie je automaticky schválený.

Potvrdenie oboznámenia sa s GDPR nie je všeobecný súhlas so spracúvaním údajov. Dĺžky uchovávania, zákonné základy a práva dotknutých osôb musí schváliť prevádzkovateľ.

## Technické kontroly

- Spoločný zdroj: `student-house-portal/index.html`
- Vygenerované vstupy: `student-house-portal/student/index.html`, `student-house-portal/admin/index.html`
- Pred nasadením spustiť `node scripts/build-student-house-entries.mjs` a následne `node scripts/build-student-house-entries.mjs --check`.
- Serverové funkcie: `register-student`, `manage`, `residence-files`; autentifikáciu a príslušnosť k organizácii kontrolujú serverovo.

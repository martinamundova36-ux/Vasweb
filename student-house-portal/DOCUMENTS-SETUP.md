# Student House Bratislava – registračný a dokumentový postup

Existujúca aplikácia WEBU Residence / Student House Bratislava.

## Presné poradie

1. **Krok 1 – základná registrácia:** študent uvedie meno, priezvisko, e-mail, telefón, preferovanú izbu a termín ubytovania. **Nezadáva číslo zmluvy. Zadáva heslo a jeho potvrdenie (minimálne 12 znakov), dátum narodenia, štátnu príslušnosť a GDPR potvrdenie.** Po odoslaní vidí samostatnú stránku **Čaká na schválenie recepciou**; Auth uchováva hash hesla; čakajúci účet nezískava členstvo ani prístup do profilu.
2. **Schválenie recepciou:** recepcia preverí žiadosť, pridelí izbu a **číslo zmluvy**, skontroluje mesačné platby a schváli ju.
3. **Prvá pozvánka / Krok 2 – dotazník:** recepcia odošle bezpečný link na samostatnú stránku `/student-house-portal/questionnaire/`. Link vytvorí dočasnú autorizovanú Auth session bez nutnosti vytvoriť heslo. Študent doplní dátum narodenia, národnosť, adresu, číslo dokladu, školu a ďalšie údaje, vloží fotografiu a klikne **Odoslať**. Študentský profil zostáva zamknutý.
4. **Druhá pozvánka / Krok 3 – e-mail a heslo:** až keď recepcia schváli aktuálne odoslaný dotazník s fotografiou, server odošle nový e-mail s odkazom na `/student-house-portal/student/?step=profile`. Študent uvedie svoj schválený e-mail a vyberie heslo (minimálne 12 znakov). Server overí existenciu hesla, dotazníka a fotografie, až potom aktivuje profil.
5. **Študentská zóna → Dokumenty:** zobrazuje vždy štyri základné dokumenty: **individuálnu ubytovaciu zmluvu, ubytovací poriadok, GDPR potvrdenie a potvrdenie o ubytovaní**. Ku každému musí byť pridelené správne PDF. Študent ho stiahne, vytlačí, vyplní, **prinesie na recepciu na kontrolu a podpis** a až potom nahrá do svojho profilu celý podpísaný sken (PDF/JPG/PNG do 6 MB). **Splátkový kalendár** je samostatný ďalší dokument s rovnakým postupom.
6. **Recepcia → Dokumenty:** skontroluje štyri základné podpísané dokumenty aj splátkový kalendár; schváli alebo vráti na opravu s povinným dôvodom. Kontrola, audit a požiadavka na e-mail sa ukladajú transakčne. Študent vidí stav každého dokumentu.

Existujúcim schváleným študentom sme pri migrácii zachovali prístup do profilu. Nové registrácie začínajú s neaktivovaným profilom. Ak prvý alebo druhý e-mail nedorazí, recepcia môže v časti Registrácie odoslať pozvánku na aktuálny krok opäť. Supabase Auth šablóna môže mať predvolený predmet „Pozvánka“ / „Obnovenie hesla“; šablóny e-mailov sa dajú neskôr pomenovať podľa krokov.

## Dokumenty musí recepcia pripraviť pred ostrým použitím

- Na karte **Dokumenty** nahrá aktuálne a schválené PDF ubytovacieho poriadku.
- Nahrá aktuálne GDPR informácie a platné samostatné potvrdenie o oboznámení sa s GDPR (nie neschválený pracovný návrh).
- Pri schválenom študentovi cez **Dokumenty → Nahrať individuálnu zmluvu (PDF)** priloží jeho zmluvu podľa jej skutočného čísla, ubytovania a dátumov. Inému študentovi sa nezobrazí.
- Ku konkrétnemu študentovi recepcia priloží aj **oficiálne PDF potvrdenia o ubytovaní**. Kým chýba, jeho karta v profile je stále viditeľná so stavom „Dokument ešte nepripravila recepcia“; sťahovanie sa nespustí bez skutočného súboru.
- **Splátkový kalendár** priloží recepcia k správnemu študentovi ako samostatné PDF; nevydáva sa za univerzálny dokument.
- Recepcia overí funkčnosť e-mailovej pozvánky/SMTP a celý tok na samostatnom testovacom účte študenta.

## Ochrana osobných údajov

Supabase `residence-portal-files` je súkromné úložisko; na súbory sa vydávajú krátkodobé podpisované odkazy iba po overení členstva a RLS. Individuálne zmluvy (`contract_draft`) sa zobrazujú len danému študentovi a recepcii. Prijaté zmluvy (`signed_contract`) majú vlastný stav kontroly. Údaje o zmluve a platobnom kalendári priraďuje iba recepcia; podpis nie je automaticky schválený.

Potvrdenie oboznámenia sa s GDPR nie je všeobecný súhlas so spracúvaním údajov. Dĺžky uchovávania, zákonné základy a práva dotknutých osôb musí schváliť prevádzkovateľ.

## Technické kontroly

- Spoločný zdroj: `student-house-portal/index.html`
- Vygenerované vstupy: `student-house-portal/student/index.html`, `student-house-portal/admin/index.html`
- Pred nasadením spustiť `node scripts/build-student-house-entries.mjs` a následne `node scripts/build-student-house-entries.mjs --check`.
- Serverové funkcie: `register-student`, `manage`, `residence-files`; autentifikáciu a príslušnosť k organizácii kontrolujú serverovo.

## Doplnenia 14. 11. 2026

- V časti Dokumenty môže recepcia vybrať druh osobného dokumentu: všeobecný súbor, splátkový kalendár alebo potvrdenie o ubytovaní. Kalendár a potvrdenie sa prikladajú ako PDF konkrétnemu rezidentovi.
- Študent má samostatný download a upload podpísaného kalendára. **Potvrdenie o ubytovaní je vždy viditeľné ako štvrtý základný dokument**, aj keď recepcia PDF ešte nepriložila. Nahratie skenu sa sprístupní po priložení predlohy. Podpisy sa neschvaľujú automaticky.
- Chýbajúce PDF sa označujú ako čakajúce na recepciu. Schválená GDPR verzia, individuálna zmluva a skutočné termíny upratovania ostávajú vstupom prevádzkovateľa.
- Export evidencie obsahuje aj samostatné listy dotazníkov, dokumentov, financií, upratovania, požiadaviek a auditu. Osobné súbory sa do Excelu nevkladajú ako verejné alebo časovo obmedzené odkazy; export uvádza názov a stav, súbor sa otvára v chránenom profile. Audit sa exportuje iba v rozsahu aktuálnej roly.

## Stav kontrolovaný 14. 11. 2026 – vstupy od recepcie

V produkčnej tabuľke `residence_portal_files` bol aktuálne jeden aktívny `rules_template`, jeden `schedule_draft` a jedna profilová fotografia. **Zatiaľ chýbajú** `gdpr_template`, `contract_draft` a `certificate_draft`. Aplikácia tieto právne dokumenty automaticky negeneruje a nemá používať fiktívne podpisy ani potvrdenia. Recepcia musí do existujúceho súkromného úložiska priložiť schválené originály, následne otestovať stiahnutie každého zo štyroch dokladov, podpis na recepcii, nahratie späť a kontrolu stavu v administrácii. Bez týchto PDF nie je kompletný produkčný scenár splnený.

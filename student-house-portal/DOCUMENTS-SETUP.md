# Student House Bratislava – nastavenie študentskej zóny

Toto je rozšírenie existujúcej aplikácie **WEBU Residence**, nie samostatný nový projekt.

## Študent po schválení registrácie

- Vidí svoje overené meno a priezvisko (zo záznamu vytvoreného recepciou), číslo izby (z aktívneho ubytovania alebo overeného čísla izby) a e-mail.
- Môže nahrať profilovú fotografiu JPEG/PNG, do **3 MB**, uchovávanú súkromne.
- V sekcii **Dokumenty** si môže stiahnuť schválené PDF: *Ubytovací poriadok* a *Informácie GDPR*.
- Nahrá podpísaný ubytovací poriadok a samostatné potvrdenie oboznámenia sa s GDPR (PDF, JPEG alebo PNG, do **6 MB**).
- Vidí stavy **čaká na kontrolu / schválené / vrátené na opravu** a prípadnú poznámku.

## Recepcia – prvé nastavenie

1. Prihlási sa účtom s rolou `reception` alebo `org_admin`.
2. V sekcii **Dokumenty** nahrá PDF aktuálneho a schváleného ubytovacieho poriadku.
3. Nahrá **schválené a aktuálne** GDPR informácie/oznámenie vo formáte PDF. Nepoužije návrh bez schválenia.
4. V sekcii **Registrácie** overí údaje z ubytovacej zmluvy (meno, priezvisko, číslo izby, číslo zmluvy, obdobie) a po kontrole odošle pozvánku. Overené číslo izby sa zapíše študentovi.
5. V sekcii **Dokumenty** otvorí prijaté podpisy a označí ich ako schválené alebo vrátené na opravu.
6. V sekcii **Študenti** môže opraviť overené číslo izby bez úpravy prihlasovacieho účtu.

## Technická bezpečnosť

- Supabase projekt: existujúci WEBU Residence.
- Storage bucket: `residence-portal-files` (**private**, najviac 6 MB na súbor).
- Databázová tabuľka: `public.residence_portal_files` s RLS a obmedzeným čítaním.
- Backend: existujúca aplikácia + Edge Function `residence-files`, ktorá vyžaduje aktuálny JWT a aktívne členstvo v správnom zariadení.
- Weboví klienti majú iba prístup na čítanie schválených šablón a svojich vlastných záznamov; vloženie súboru a schválenie vykonáva autorizovaná serverová funkcia.
- Server vytvára krátkodobé (90 s) podpísané odkazy na stiahnutie.
- Fotografia a podpisy sa nikdy nezobrazujú ako verejná galéria.
- Verejná registrácia je naďalej nezávislá od aktívneho ubytovania; osobné súbory sa sprístupnia iba po schválení a overení.

## Dôležité pred ostrým použitím

- Právne posúdiť aktuálnu informačnú povinnosť GDPR – fotografie, podpísané dokumenty, účely, lehoty uchovávania, príjemcov a práva študenta.
- Potvrdenie „oboznámil som sa s GDPR“ **nie je** automaticky platným súhlasom s akýmkoľvek spracúvaním.
- Vyskúšať skutočný prihlásený účet študenta a recepcie vrátane nahratia, zobrazenia, schválenia a stiahnutia súboru.
- Nedať do ostrého používania skôr, ako recepcia nahrá schválené PDF a overí nastavenie práv.
- Aplikácia je dočasne na `www.webu.sk/student-house-portal/`; budúca cieľová adresa je `portal.student-house.sk` po získaní DNS prístupu.

## Poznámka k dokumentom

PDF ubytovacieho poriadku pripravené z používateľom poskytnutého `UBYTOVACÍ PORIADOK SH final(1).docx` má 4 obsahové strany vrátane podpisovej časti. Recepcia musí overiť, že ide o práve platnú verziu.

GDPR potvrdenie pripravené pre interné použitie je **návrh**, ktorý musí prevádzkovateľ schváliť a doplniť o platnú informačnú povinnosť, než sa stane dokumentom na verejné stiahnutie.

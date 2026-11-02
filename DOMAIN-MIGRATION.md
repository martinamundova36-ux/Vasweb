# VASWEB – prechod na vlastnú doménu

Aktuálna adresa GitHub Pages: https://martinamundova36-ux.github.io/Vasweb/

**Nová doména zatiaľ nie je vybraná. DNS, CNAME ani publikovanú adresu nemeňte.**

## Príprava dokončená bez domény
- Stránky môžu zostať publikované na súčasnej adrese.
- Interné odkazy používajte relatívne, aby fungovali aj po presune.
- Kanonické a Open Graph URL aktuálne odkazujú na dočasnú adresu; po aktivácii novej domény ich treba aktualizovať.
- Neuvádzajte novú doménu v kóde, kým nie je potvrdená.

## Po výbere domény
1. Overiť vlastníctvo domény a nastavenie DNS.
2. Nastaviť Custom domain v GitHub Pages a podľa nastavenia pridať CNAME.
3. Po úspešnom overení zapnúť Enforce HTTPS.
4. Aktualizovať všetky canonical a og:url adresy, absolútne odkazy, prípadné JSON-LD a zdieľacie odkazy.
5. Vytvoriť sitemap.xml s novou absolútnou doménou a robots.txt s odkazom na sitemap.
6. Pripojiť novú doménu v Google Search Console, odoslať sitemap a otestovať indexovanie.
7. Otestovať interné odkazy, formuláre, prezentáciu, videá, ukážky a presmerovanie pôvodnej adresy.
8. Ak dôjde k zmene URL ciest, zabezpečiť vhodné presmerovania alebo zachovať kompatibilné adresy.

**Pozor:** samotný GitHub Pages neposkytuje ľubovoľné serverové pravidlá 301 presmerovaní. Pri zmene štruktúry URL treba vybrať riešenie podľa dostupného hostingu/DNS.

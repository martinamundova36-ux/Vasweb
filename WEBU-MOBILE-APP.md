# WEBU – mobilná aplikácia (PWA)

Táto implementácia rozširuje EXISTUJÚCI WEBU web na https://www.webu.sk/ – nevytvára ďalší projekt.

## Nasadené súčasti
- \`manifest.webmanifest\`: názov, ikony 192/512, skratky, inštalácia v samostatnom okne
- \`webu-sw.js\`: offline náhradná stránka + sieťovo prioritná vyrovnávacia pamäť verejných stránok
- \`webu-app.js\`: ovládacia lišta aplikácie v režime nainštalovanej PWA, zdieľanie, výzva na inštaláciu
- \`offline.html\`: náhradná obrazovka offline
- \`share.js\`: načíta app skript na verejných marketingových stránkach, nie v študentskom portáli

## Inštalácia
1. Android: otvorte https://www.webu.sk/ v Chrome. Použite tlačidlo Nainštalovať WEBU alebo menu ⋮ → Pridať na plochu.
2. iPhone: otvorte https://www.webu.sk/ v Safari → Zdieľať → Pridať na plochu.
3. Názov a ikona budú WEBU. Aplikácia bude používať aktuálny obsah webu.

## Bezpečnosť
Service worker ignoruje súkromné časti (\`student-house-portal\`, \`supabase\`, \`android-studenthouse\`) a demo weby.
Neloguje sa do administrácie a neukladá odpovede z formulárov offline. Na aktualizáciu článkov a kontaktné formuláre je potrebný internet.

## Manuálne overenie po deployi
- \`https://www.webu.sk/manifest.webmanifest\` vracia JSON
- \`https://www.webu.sk/webu-sw.js\` vracia JavaScript
- V Android Chrome sa ponúkne inštalácia, po inštalácii sa zobrazí spodná navigácia
- V Safari funguje Pridať na plochu
- Pri vypnutí internetu sa zobrazí \`offline.html\`, ak stránka nie je v cache
- \`student-house-portal/\` stále funguje bez zásahu service workera

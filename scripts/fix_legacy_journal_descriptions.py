#!/usr/bin/env python3
"""Give the 2026-11-05 SK/EN journal batch topic-specific SEO descriptions."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SK_OLD='Odborná inšpirácia pre podnikanie podľa vydavateľského abstraktu. Praktické tipy WEBU, metodické obmedzenia a pôvodný zdroj.'
EN_OLD='Research-inspired business editorial based on the publisher abstract, with WEBU practical guidance, limitations and the original study.'

DESCRIPTIONS={
 '4b65960ecdbe':(
  'Ako premeniť lajky na lojalitu zákazníkov? Výskumný pohľad na digitálne vzťahy, dôveru a praktické kroky pre malé značky.',
  'How can brands turn likes into loyal customers? Research-inspired ideas about digital trust, lasting relationships and practical steps for small businesses.'),
 '92305488b265':(
  'Čo podporuje inovácie v malých a stredných podnikoch? Poznatky o ľudskom kapitáli, vedení tímov a zdieľaní odborných znalostí.',
  'What drives innovation in small and medium businesses? Explore research on human capital, leadership and the sharing of employee expertise.'),
 '841f37bc7684':(
  'Prečo nestačí merať počet nasadených AI nástrojov? Výskumná inšpirácia o skutočnej efektivite, prínosoch a limitoch zavádzania AI.',
  'Why is counting AI tools not enough? A research-inspired look at business outcomes, effectiveness and the limits of AI adoption metrics.'),
 'e2f830a0e522':(
  'Ako vzdelávanie a digitálny marketing menia vidiecke podnikanie? Prípad z Marumpy a praktické podnety pre malé firmy.',
  'How can training and digital marketing support rural businesses? A study from Marumpa offers practical ideas and important research limits.'),
 'ad67275da37f':(
  'Ako vedenie a zdieľanie vedomostí súvisia s inovačným správaním zamestnancov? Výskumná inšpirácia pre pracovné tímy.',
  'How do leadership and knowledge sharing relate to innovative employee behavior? Research insights and ideas for modern workplace teams.'),
}

def main():
 count=0
 for slug,(sk,en) in DESCRIPTIONS.items():
  for lang,new,old in [('sk',sk,SK_OLD),('en',en,EN_OLD)]:
   name=f'journal-2026-11-05-{slug}'+('-en' if lang=='en' else '')+'.html'
   page=ROOT/name;raw=page.read_text(encoding='utf-8')
   matches=raw.count(old)
   if matches==0 and raw.count(new)==3:continue
   if matches!=3:raise ValueError(name+': unexpected old description count '+str(matches))
   page.write_text(raw.replace(old,new),encoding='utf-8');count+=1
 print('Specific article metadata updated in',count,'legacy SK/EN pages')

if __name__=='__main__':main()

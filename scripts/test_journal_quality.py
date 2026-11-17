#!/usr/bin/env python3
"""Offline regression tests for new-publication safeguards (not peer review)."""
import copy
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from journal_quality import HEADINGS, quality_issues

def article(lang):
    base=(
        "Podľa abstraktu sa dá hovoriť o zistení iba v rámci uvedenej vzorky. "
        "Praktický príklad ukazuje meranie účinnosti krokov bez domýšľania si dát. "
        "Metodika má obmedzenia, preto sa dôkazy nesmú zamieňať s kauzalitou. "
        if lang=='sk' else
        "According to the abstract, findings are limited to the observed sample. "
        "A practical example illustrates a measurement step without inventing data. "
        "The methodology has limitations, so association must not become causation. "
    )
    return {'title':'Praktické výskumné rozhodovanie' if lang=='sk' else 'Research-informed practical decisions',
            'description':'Príklad odborného redakčného komentára a jeho metodických obmedzení pre WEBU Journal.' if lang=='sk' else
                           'An example research editorial with explicitly stated source and methodology limitations.',
            'lead':base*2,
            'sections':[{'heading':heading,
                         'paragraphs':[base*3+heading+' alpha.',
                                       base*3+heading+' beta.']}
                        for heading in HEADINGS[lang]]}

def main():
    sample={lang:article(lang) for lang in ('sk','en')}
    assert not quality_issues(sample),quality_issues(sample)
    thin=copy.deepcopy(sample)
    thin['sk']['sections'][4]['paragraphs']=['A few words.','No concrete example.']
    assert any('not substantive' in x for x in quality_issues(thin))
    typo=copy.deepcopy(sample)
    typo['sk']['sections'][0]['paragraphs'][0]+=' Toto je prištiepený abstrakt.'
    assert any('proofread' in x for x in quality_issues(typo))
    promotion=copy.deepcopy(sample)
    promotion['en']['sections'][4]['paragraphs'][0]+=' Contact WEBU for our website services.'
    assert any('promotional brand/service' in x for x in quality_issues(promotion))

    missing=copy.deepcopy(sample)
    missing['en']['sections'][3]['paragraphs']=['A method without source boundaries.'*20]*2
    assert any('methodology must disclose' in x for x in quality_issues(missing))
    numbers=copy.deepcopy(sample)
    numbers['sk']['sections'][2]['paragraphs'][0]+=' Vzorka mala 493 respondentov.'
    assert any('numerical' in x for x in quality_issues(numbers))
    repeated=copy.deepcopy(sample)
    repeated['en']['sections'][5]['paragraphs'][1]=repeated['en']['sections'][5]['paragraphs'][0]
    assert any('duplicated substantive' in x for x in quality_issues(repeated))
    print('PASS: long bilingual source-scoped manuscripts accepted; thin, mistranslated, untraceable, or repetitive text rejected')
if __name__=='__main__':
    main()

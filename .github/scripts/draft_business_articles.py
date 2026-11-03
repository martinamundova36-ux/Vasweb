#!/usr/bin/env python3
"""Prepare AI-generated editorial drafts as GitHub Issues, never auto-publish."""
import os,json,urllib.request,datetime,sys,time
TOPICS=[
("Podnikanie","Ako založiť firmu a vyhnúť sa najčastejším chybám"),
("Firemné financie","Cash flow: prečo môže skrachovať aj zisková firma"),
("Peniaze","Ako nastaviť ceny produktov a služieb"),
("Marketing","Ako získať prvých 100 zákazníkov"),
("Psychológia","Psychológia nákupného rozhodovania"),
("Technológie","Ako môže malá firma využívať umelú inteligenciu"),
("Riadenie firmy","Kedy sa podnikateľovi oplatí prijať zamestnanca"),
("Značka","Ako vybudovať značku, ktorej ľudia dôverujú"),
("Financie","Ako plánovať využitie zisku firmy"),
("Trendy","Ako vyhodnocovať podnikateľské trendy bez zbytočného rizika")
]
api=os.environ.get("OPENAI_API_KEY","")
token=os.environ.get("GH_TOKEN","")
repo=os.environ.get("GITHUB_REPOSITORY","")
if not api or not token or not repo:
    raise SystemExit("Missing OPENAI_API_KEY, GH_TOKEN or GITHUB_REPOSITORY; nothing published.")
count=min(max(int(os.environ.get("DRAFT_COUNT","2")),1),10)
week=datetime.date.today().isocalendar().week
start=0 if count==10 else ((week-1)*2)%len(TOPICS)
selection=TOPICS[start:start+count] if start+count<=len(TOPICS) else (TOPICS[start:]+TOPICS[:(start+count)%len(TOPICS)])
def request(url,data,headers):
    r=urllib.request.Request(url,data=json.dumps(data,ensure_ascii=False).encode(),headers=headers,method="POST")
    with urllib.request.urlopen(r,timeout=120) as response:return json.load(response)
for category,title in selection:
    instructions=("Napíš po slovensky originálny, praktický článok pre WEBU Journal. "
      "Téma: "+title+". Kategória: "+category+". "
      "Rozsah 700 až 1000 slov. Použi zrozumiteľný úvod, aspoň 4 sekcie označené ##, "
      "konkrétne príklady a záver s praktickými krokmi. Nepíš vymyslené čísla, citácie, "
      "štatistiky ani neoverené tvrdenia o aktuálnych udalostiach. "
      "Finančné a právne rady označ ako všeobecné informácie, nie individuálne poradenstvo. "
      "Nepredstieraj, že boli overené aktuálne správy. "
      "Vráť iba samotný článok bez titulku.")
    result=request("https://api.openai.com/v1/responses",{
      "model":"gpt-4.1-mini","instructions":instructions,
      "input":"Priprav návrh článku na redakčné schválenie.","max_output_tokens":2300
    },{"Authorization":"Bearer "+api,"Content-Type":"application/json"})
    body="\n".join(part.get("text","") for item in result.get("output",[]) for part in item.get("content",[]) if part.get("type")=="output_text").strip()
    if len(body)<1200:raise RuntimeError("Draft too short; no issue created for "+title)
    issue_body=("**Redakčný návrh – NEPUBLIKOVANÉ**\n\n"
       "**Kategória:** "+category+"\n\n**Titulok:** "+title+"\n\n"
       "**Kontrola pred publikovaním:** overiť fakty, dátumy, finančné/právne tvrdenia, "
       "doplniť dôveryhodné zdroje a originálny obrázok. Vytvoriť aj anglický preklad.\n\n"
       "---\n\n"+body)
    issue=request("https://api.github.com/repos/"+repo+"/issues",
      {"title":"[NÁVRH] "+title,"body":issue_body},
      {"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"})
    print("Draft created:",issue.get("html_url"))
    time.sleep(1)

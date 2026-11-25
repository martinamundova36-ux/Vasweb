// Company details transcribed from supplied bilingual accommodation contract, page 1.
export const STUDENT_HOUSE_TENANT='ae045243-98f0-4f22-a736-d33a92f9ba61';
export const STUDENT_HOUSE_PROVIDER=Object.freeze({
 name:'Gargallo s.r.o.',address:'Tomášikova 34, 821 01 Bratislava',
 companyId:'46078223',taxId:'2023222300',vatId:'SK2023222300',
 register:'Mestský súd Bratislava III, oddiel Sro, vložka č. 71278/B',
 representatives:'Ing. Ján Blaško a Ing. Ján Bubán – konatelia',
 bank:'Tatra banka, a.s. Bratislava',iban:'SK5611000000002944020112',bic:'TATRSKBX',
 receptionEmail:'studenthouserecepcia@gmail.com'
});
export const isStudentHouse=tenant=>tenant===STUDENT_HOUSE_TENANT;
export const providerDetails=tenant=>isStudentHouse(tenant)?STUDENT_HOUSE_PROVIDER:null;
export const providerText=tenant=>{const p=providerDetails(tenant);return p?[p.name,p.address,'IČO: '+p.companyId,'DIČ: '+p.taxId,'IČ DPH: '+p.vatId,p.register,p.representatives,p.bank,'IBAN: '+p.iban,'SWIFT/BIC: '+p.bic,'E-mail: '+p.receptionEmail].join(' · '):'';};
export const normalizeContractSymbol=value=>{const digits=String(value??'').trim().replace(/\s/g,'');return /^\d{1,10}$/.test(digits)?digits:'';};

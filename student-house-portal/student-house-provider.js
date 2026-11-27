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

// Article II: property owner, not the recipient of accommodation payments.
export const STUDENT_HOUSE_PROPERTY_OWNER=Object.freeze({name:'Dorsino s.r.o.',address:'Tomášikova 34, 821 01 Bratislava',companyId:'46430245',taxId:'2820011568',vatId:'SK2820011568',register:'Mestský súd BA III, oddiel Sro, vložka č. 78133/B',leaseDate:'2014-09-10'});

const officialRoomNames=new Map([
 ['š2','Standard 2'],['s2','Standard 2'],['standard2','Standard 2'],
 ['d2','Deluxe 2'],['deluxe2','Deluxe 2'],
 ['d2v','Deluxe 2V'],['deluxe2v','Deluxe 2V'],
 ['sui2','Suite 2'],['suite2','Suite 2'],
 ['m1','Mansard 1'],['mansard1','Mansard 1'],['manzard1','Mansard 1'],
 ['m2','Mansard 2'],['mansard2','Mansard 2'],['manzard2','Mansard 2'],
 ['š1+1','Standard 1+1'],['s1+1','Standard 1+1'],['standard1+1','Standard 1+1'],
 ['š2+1','Standard 2+1'],['s2+1','Standard 2+1'],['standard2+1','Standard 2+1'],
 ['š2+2','Standard 2+2'],['s2+2','Standard 2+2'],['standard2+2','Standard 2+2'],['bezokna','Izba bez okna']
]);
export function officialRoomName(value){
 const text=String(value??'').trim();
 return officialRoomNames.get(text.toLowerCase().replace(/\s+/g,''))??text;
}

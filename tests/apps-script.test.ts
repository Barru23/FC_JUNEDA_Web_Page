import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function app(token: string | null = 'test-token') {
  const tabs=new Map<string,any>(); const properties=new Map<string,string>(); let mails=0,failMail=false;
  function sheet() {
    const rows:any[][]=[];
    return {rows,getLastRow:()=>rows.length,getLastColumn:()=>Math.max(0,...rows.map(r=>r.length)),hideColumns:()=>{},setFrozenRows:()=>{},autoResizeColumns:()=>{},
      getRange:(r:number,c:number,h=1,w=1)=>({
        getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j] ?? "")),
        setValue(value:any){this.setValues([[value]]);return this;},
        setValues(values:any[][]){values.forEach((row,i)=>row.forEach((value,j)=>{rows[r-1+i]??=[];rows[r-1+i][c-1+j]=value;}));return this;},setFontWeight(){return this;},
      }),};
  }
  let locked=false;
  const context=vm.createContext({console,LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:(key:string)=>key==='TOKEN'?token:properties.get(key),setProperty:(key:string,value:string)=>properties.set(key,value)})},
    SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:(name:string)=>tabs.get(name),insertSheet:(name:string)=>{const s=sheet();tabs.set(name,s);return s;}}),flush:()=>{}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:(text:string)=>({setMimeType:()=>JSON.parse(text)})},
  });
  vm.runInContext(readFileSync('apps-script/Codi.gs','utf8'),context);
  context.enviarCorreu_=()=>{mails++;if(failMail)throw new Error('timeout');};
  const request=(overrides:Record<string,unknown>={})=>context.doPost({postData:{contents:JSON.stringify({token:'test-token',protocol:2,sourceId:'purchase:00000000-0000-4000-8000-000000000001',type:'event',sheet:'Test',row:{nom:'Test',email:'test@example.invalid',tiquets:1,preu:15.5,estat:'Pagat',data:'26/9/2026'},email:{to:'test@example.invalid'},...overrides})}});
  return {context,request,tabs,properties,mails:()=>mails,setFail:()=>{failMail=true;}};
}
test('Apps Script retries update one row and send at most one email',()=>{
  const a=app();assert.equal(a.request().ok,true);assert.equal(a.request().ok,true);
  assert.equal(a.tabs.get('Test').rows.length,2);assert.equal(a.mails(),1);
  assert.equal(a.context.doGet().protocol,2);
});
test('ambiguous email failure is flagged and never resent on retry',()=>{
  const a=app();a.setFail();assert.equal(a.request().emailStatus,'review');assert.equal(a.request().emailStatus,'review');assert.equal(a.mails(),1);
});
test('sheet-only recovery never sends email',()=>{
  const a=app();assert.equal(a.request({email:null}).ok,true);assert.equal(a.mails(),0);
});
test('legacy conflicts do not silently merge two attendees',()=>{
  const a=app();a.request({email:null});const rows=a.tabs.get('Test').rows;const id=rows[0].indexOf('__cfjuneda_id');rows[1][id]='';rows.push([...rows[1]]);
  assert.equal(a.request({legacyMatch:true,email:null}).ok,false);assert.equal(rows.length,3);
});
test('text fields cannot create spreadsheet formulas; amounts remain numeric',()=>{
  const a=app();for(const value of ['=1+1',' +SUM(A1)','\t@x','-1+2'])assert.equal(a.context.textSegur_(value),"'"+value);
  assert.equal(a.context.textSegur_(15.5),15.5);assert.equal(a.context.textSegur_('Joan'), 'Joan');
});
test('invalid token and old protocol write nothing',()=>{
  const a=app();assert.equal(a.request({token:'wrong'}).ok,false);assert.equal(a.request({protocol:1}).ok,false);assert.equal(a.tabs.size,0);
});
test('a missing TOKEN property rejects everything, including a null token',()=>{
  const a=app(null);
  for(const token of [null,undefined,'','test-token'])assert.equal(a.request({token}).ok,false);
  assert.equal(a.tabs.size,0);assert.equal(a.mails(),0);
});

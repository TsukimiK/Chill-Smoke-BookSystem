const KEY="chill-smoke-preview-v1";
const EVENT_KEY="chill-smoke-events-v1";
const COLUMN_KEY="chill-smoke-columns-v1";

const FIREBASE_CONFIG={
  apiKey:"AIzaSyApkZW4kHFOFcHRKzNDa7vGNkVT6y3McSE",
  authDomain:"chillsmokebooksystem-468bd.firebaseapp.com",
  projectId:"chillsmokebooksystem-468bd",
  storageBucket:"chillsmokebooksystem-468bd.firebasestorage.app",
  messagingSenderId:"636248645330",
  appId:"1:636248645330:web:e09a72397287c5be92d70b",
  measurementId:"G-LJR7VDMN9G"
};

const FIREBASE_COLLECTION="products";
const FIREBASE_EVENTS_COLLECTION="events";
const FIREBASE_COLUMNS_COLLECTION="ownerColumns";

const $=s=>document.querySelector(s);
const useFirebase=Boolean(FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.projectId&&window.firebase);
let db=null;
let firebaseAuthReady=false;

if(useFirebase){
  firebase.initializeApp(FIREBASE_CONFIG);
  db=firebase.firestore();
}

const svg=(t,sub,c1,c2)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820"><rect width="1200" height="820" fill="#15110e"/><rect x="70" y="70" width="1060" height="680" rx="18" fill="#1f1914" stroke="#4a392b" stroke-width="4"/><rect x="115" y="120" width="970" height="590" rx="10" fill="#2a211a" stroke="#3c3026" stroke-width="2"/><rect x="390" y="150" width="420" height="520" rx="20" fill="${c1}" stroke="#d0a35b" stroke-width="6"/><text x="600" y="438" text-anchor="middle" font-family="Georgia,serif" font-size="70" fill="#1f1914" letter-spacing="4">${t}</text><text x="600" y="493" text-anchor="middle" font-family="Yu Gothic,sans-serif" font-size="24" fill="#2a211a" letter-spacing="7">${sub}</text></svg>`)}`;

let items=[];
let events=[];
let columns=[];

const sampleItems=[
  {id:"ending",name:"ENDING",type:"限定商品",version:"本リリースv2",price:"1,000,000円",effect:"なし",beforeImage:svg("ENDING","BEFORE","#102c66","#080713"),afterImage:svg("ENDING","OPENED","#162f4e","#30102d"),popImage:svg("ENDING","POP","#3b2419","#080713"),description:"夜空を横切る彗星のように、静かに広がるアイスミントの余韻。",memo:"プレビュー用サンプルです。"},
  {id:"eclipse",name:"Eclipse teller",type:"恒常商品",version:"本リリースv1",price:"1,000,000円",effect:"なし",beforeImage:svg("ECLIPSE","BEFORE","#1a95c9","#07122b"),afterImage:svg("ECLIPSE","OPENED","#0b5470","#180c39"),popImage:svg("ECLIPSE","POP","#1b3244","#07122b"),description:"皆既日食と星の余韻を閉じ込めた、静かなブルーのパッケージ。",memo:"検索・フィルター・詳細表示の動作確認用。"}
];
const sampleEvents=[
  {id:"event_open",date:"2026/01/01~2026/01/01",title:"Chill Smoke Archive 開始",category:"店舗",version:"ベータ",image:"",description:"煙草屋の歴史を商品とイベントで振り返るための年表サンプルです。"}
];
const sampleColumns=[
  {id:"column_1",ownerName:"歴代オーナー",ownerPeriod:"記念誌サンプル",title:"チルスモの思い出",image:"",body:"ここに歴代オーナーのコラム本文を登録できます。",signature:"Chill Smoke",order:1}
];

const esc=v=>String(v||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const localId=()=>`item_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const eventLocalId=()=>`event_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const columnLocalId=()=>`column_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

function driveId(url){
  url=String(url||"");
  const patterns=[
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /drive\.google\.com\/uc\?id=([^&]+)/,
    /drive\.google\.com\/thumbnail\?id=([^&]+)/,
    /[?&]id=([^&]+)/
  ];
  for(const p of patterns){
    const m=url.match(p);
    if(m)return decodeURIComponent(m[1]);
  }
  return "";
}
function imgUrl(url){
  url=String(url||"").trim();
  if(!url)return"";
  if(url.includes("drive.google.com")){
    const d=driveId(url);
    if(d)return`https://drive.google.com/thumbnail?id=${encodeURIComponent(d)}&sz=w1200`;
  }
  return url;
}

function normalizeEventDateRange(value){return String(value||"").trim().replaceAll(" ","").replaceAll("　","").replaceAll("～","~")}
function isYmd(value){
  const p=String(value||"").split("/");
  if(p.length!==3||p[0].length!==4||p[1].length!==2||p[2].length!==2)return false;
  const y=Number(p[0]),m=Number(p[1]),d=Number(p[2]);
  if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||m<1||m>12||d<1||d>31)return false;
  const c=new Date(y,m-1,d);
  return c.getFullYear()===y&&c.getMonth()===m-1&&c.getDate()===d;
}
function isEventDateRange(value){
  const p=normalizeEventDateRange(value).split("~");
  return p.length===2&&isYmd(p[0])&&isYmd(p[1]);
}
function getEventStartKey(value){
  const n=normalizeEventDateRange(value);
  return isEventDateRange(n)?n.split("~")[0]:"9999/99/99";
}
function compareEventDateAsc(a,b){return getEventStartKey(a.date).localeCompare(getEventStartKey(b.date))||String(a.title||"").localeCompare(String(b.title||""),"ja")}
function pad2(v){return String(v||"").trim().padStart(2,"0")}
function makeYmd(y,m,d){return `${String(y||"").trim()}/${pad2(m)}/${pad2(d)}`}
function splitEventDateRange(value){
  const p=normalizeEventDateRange(value).split("~"),s=(p[0]||"").split("/"),e=(p[1]||"").split("/");
  return{startYear:s[0]||"",startMonth:s[1]||"",startDay:s[2]||"",endYear:e[0]||"",endMonth:e[1]||"",endDay:e[2]||""};
}
function setEventDateInputs(value){
  const d=splitEventDateRange(value);
  $("#eventStartYear").value=d.startYear;$("#eventStartMonth").value=d.startMonth;$("#eventStartDay").value=d.startDay;
  $("#eventEndYear").value=d.endYear;$("#eventEndMonth").value=d.endMonth;$("#eventEndDay").value=d.endDay;
}
function getEventDateRangeFromInputs(){
  return `${makeYmd($("#eventStartYear").value,$("#eventStartMonth").value,$("#eventStartDay").value)}~${makeYmd($("#eventEndYear").value,$("#eventEndMonth").value,$("#eventEndDay").value)}`;
}

async function ensureFirebaseAuth(){
  if(!useFirebase||firebaseAuthReady)return;
  if(!firebase.auth().currentUser)await firebase.auth().signInAnonymously();
  firebaseAuthReady=true;
}

function fromFirestore(doc){
  const r=doc.data()||{};
  return{id:doc.id,name:r.name||"",type:r.type||"恒常商品",version:r.version||"ベータ",price:r.price||"",effect:r.effect||"",beforeImage:r.beforeImage||"",afterImage:r.afterImage||"",popImage:r.popImage||"",description:r.description||"",memo:r.memo||""};
}
function toFirestore(i){
  return{name:i.name,type:i.type,version:i.version,price:i.price||"",effect:i.effect||"",beforeImage:i.beforeImage||"",afterImage:i.afterImage||"",popImage:i.popImage||"",description:i.description||"",memo:i.memo||"",updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
}
function eventFromFirestore(doc){
  const r=doc.data()||{};
  return{id:doc.id,date:r.date||"",title:r.title||"",category:r.category||"イベント",version:r.version||"ベータ",image:r.image||"",description:r.description||""};
}
function eventToFirestore(e){
  return{date:e.date,title:e.title,category:e.category,version:e.version||"ベータ",image:e.image||"",description:e.description||"",dateStart:getEventStartKey(e.date),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
}
function columnFromFirestore(doc){
  const r=doc.data()||{};
  return{id:doc.id,ownerName:r.ownerName||"",ownerPeriod:r.ownerPeriod||"",title:r.title||"",image:r.image||"",body:r.body||"",signature:r.signature||"",order:Number(r.order||0)};
}
function columnToFirestore(c){
  return{ownerName:c.ownerName,ownerPeriod:c.ownerPeriod,title:c.title,image:c.image||"",body:c.body||"",signature:c.signature||"",order:Number(c.order||0),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
}

async function loadItems(){
  if(useFirebase){
    try{await ensureFirebaseAuth();const s=await db.collection(FIREBASE_COLLECTION).get();items=s.docs.map(fromFirestore).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"ja"));render();renderPopGallery();return}catch(e){alert("DB読み込みエラー: "+e.message)}
  }
  items=JSON.parse(localStorage.getItem(KEY)||"null")||sampleItems;render();renderPopGallery();
}
async function loadEvents(){
  if(useFirebase){
    try{await ensureFirebaseAuth();const s=await db.collection(FIREBASE_EVENTS_COLLECTION).get();events=s.docs.map(eventFromFirestore);renderEvents();return}catch(e){alert("イベント読み込みエラー: "+e.message)}
  }
  events=JSON.parse(localStorage.getItem(EVENT_KEY)||"null")||sampleEvents;renderEvents();
}
async function loadColumns(){
  if(useFirebase){
    try{await ensureFirebaseAuth();const s=await db.collection(FIREBASE_COLUMNS_COLLECTION).get();columns=s.docs.map(columnFromFirestore);renderColumns();return}catch(e){alert("コラム読み込みエラー: "+e.message)}
  }
  columns=JSON.parse(localStorage.getItem(COLUMN_KEY)||"null")||sampleColumns;renderColumns();
}

async function saveItem(item){
  if(useFirebase){await ensureFirebaseAuth();if(item.id&&!String(item.id).startsWith("item_"))await db.collection(FIREBASE_COLLECTION).doc(item.id).update(toFirestore(item));else await db.collection(FIREBASE_COLLECTION).add({...toFirestore(item),createdAt:firebase.firestore.FieldValue.serverTimestamp()});await loadItems();return}
  const idx=items.findIndex(x=>x.id===item.id);idx>=0?items[idx]=item:items.unshift(item);localStorage.setItem(KEY,JSON.stringify(items,null,2));render();renderPopGallery();
}
async function saveEvent(event){
  if(useFirebase){await ensureFirebaseAuth();if(event.id&&!String(event.id).startsWith("event_"))await db.collection(FIREBASE_EVENTS_COLLECTION).doc(event.id).update(eventToFirestore(event));else await db.collection(FIREBASE_EVENTS_COLLECTION).add({...eventToFirestore(event),createdAt:firebase.firestore.FieldValue.serverTimestamp()});await loadEvents();return}
  const idx=events.findIndex(x=>x.id===event.id);idx>=0?events[idx]=event:events.unshift(event);localStorage.setItem(EVENT_KEY,JSON.stringify(events,null,2));renderEvents();
}
async function saveColumn(c){
  if(useFirebase){await ensureFirebaseAuth();if(c.id&&!String(c.id).startsWith("column_"))await db.collection(FIREBASE_COLUMNS_COLLECTION).doc(c.id).update(columnToFirestore(c));else await db.collection(FIREBASE_COLUMNS_COLLECTION).add({...columnToFirestore(c),createdAt:firebase.firestore.FieldValue.serverTimestamp()});await loadColumns();return}
  const idx=columns.findIndex(x=>x.id===c.id);idx>=0?columns[idx]=c:columns.unshift(c);localStorage.setItem(COLUMN_KEY,JSON.stringify(columns,null,2));renderColumns();
}
async function deleteItem(id){if(!id)return;if(useFirebase){await ensureFirebaseAuth();await db.collection(FIREBASE_COLLECTION).doc(id).delete();await loadItems();return}items=items.filter(x=>x.id!==id);localStorage.setItem(KEY,JSON.stringify(items,null,2));render();renderPopGallery()}
async function deleteEvent(id){if(!id)return;if(useFirebase){await ensureFirebaseAuth();await db.collection(FIREBASE_EVENTS_COLLECTION).doc(id).delete();await loadEvents();return}events=events.filter(x=>x.id!==id);localStorage.setItem(EVENT_KEY,JSON.stringify(events,null,2));renderEvents()}
async function deleteColumn(id){if(!id)return;if(useFirebase){await ensureFirebaseAuth();await db.collection(FIREBASE_COLUMNS_COLLECTION).doc(id).delete();await loadColumns();return}columns=columns.filter(x=>x.id!==id);localStorage.setItem(COLUMN_KEY,JSON.stringify(columns,null,2));renderColumns()}

function filtered(){const q=$("#q").value.toLowerCase().trim(),t=$("#type").value,v=$("#version").value;return items.filter(x=>(t==="all"||x.type===t)&&(v==="all"||x.version===v)&&[x.name,x.price,x.effect,x.description,x.memo].join(" ").toLowerCase().includes(q))}
function render(){const arr=filtered();$("#total").textContent=items.length;$("#regular").textContent=items.filter(x=>x.type==="恒常商品").length;$("#limited").textContent=items.filter(x=>x.type==="限定商品").length;$("#wholesale").textContent=items.filter(x=>x.type==="卸商品").length;$("#empty").style.display=arr.length?"none":"block";$("#tableWrap").style.display=arr.length?"block":"none";$("#grid").innerHTML=arr.map(x=>`<tr><td class="nameCell"><button class="nameLink" type="button" data-action="detail" data-id="${esc(x.id)}">${esc(x.name)}</button></td><td><span class="pill">${esc(x.type)}</span></td><td><span class="pill">${esc(x.version)}</span></td><td>${esc(x.price||"-")}</td><td>${esc(x.effect||"-")}</td><td class="actionCell"><button class="ghost" type="button" data-action="edit" data-id="${esc(x.id)}">編集</button></td></tr>`).join("")}
function filteredEvents(){const q=$("#eventQ")?$("#eventQ").value.toLowerCase().trim():"",c=$("#eventCategoryFilter")?$("#eventCategoryFilter").value:"all",v=$("#eventVersionFilter")?$("#eventVersionFilter").value:"all";return events.filter(x=>(c==="all"||x.category===c)&&(v==="all"||(x.version||"ベータ")===v)&&[x.title,x.description,x.date,x.category,x.version].join(" ").toLowerCase().includes(q))}
function renderEvents(){const sorted=[...filteredEvents()].sort(compareEventDateAsc);$("#eventEmpty").style.display=sorted.length?"none":"block";$("#eventList").innerHTML=sorted.map(x=>`<article class="eventItem"><div class="eventMeta"><span class="pill">${esc(x.category)}</span><span class="pill">${esc(x.version||"ベータ")}</span><span class="eventDate">${esc(x.date)}</span></div><h3 class="eventTitle">${esc(x.title)}</h3>${x.image?`<div class="detailImgs" style="margin:10px 0"><img src="${esc(imgUrl(x.image))}"></div><div class="imageLinks" style="grid-template-columns:1fr;margin:0 0 10px"><a href="${esc(x.image)}" target="_blank" rel="noopener noreferrer">イベント画像を開く</a></div>`:""}<p class="eventText">${esc(x.description||"")}</p><div class="eventActions"><button type="button" class="ghost event-edit-btn" data-id="${esc(x.id)}">編集</button><button type="button" class="danger event-delete-btn" data-id="${esc(x.id)}">削除</button></div></article>`).join("")}
function renderPopGallery(){const q=$("#popQ")?$("#popQ").value.toLowerCase().trim():"",v=$("#popVersionFilter")?$("#popVersionFilter").value:"all";const arr=items.filter(x=>x.popImage&&(v==="all"||x.version===v)&&[x.name,x.description,x.memo].join(" ").toLowerCase().includes(q));$("#popEmpty").style.display=arr.length?"none":"block";$("#popGrid").innerHTML=arr.map(x=>`<article class="popCard"><div class="imgbox"><img src="${esc(imgUrl(x.popImage))}"><b>POP</b></div><div class="popCardBody"><h3>${esc(x.name)}</h3><p><span class="pill">${esc(x.version)}</span></p><p>${esc(x.description||"")}</p><div class="row" style="margin-top:10px"><a class="ghost" href="${esc(x.popImage)}" target="_blank" rel="noopener noreferrer">画像を開く</a></div></div></article>`).join("")}
function renderColumns(){const arr=[...columns].sort((a,b)=>Number(a.order||0)-Number(b.order||0));$("#columnEmpty").style.display=arr.length?"none":"block";$("#columnList").innerHTML=arr.map(x=>`<article class="columnItem"><div class="columnMeta"><span class="pill">${esc(x.ownerPeriod||"時期未設定")}</span><span class="pill">${esc(x.ownerName)}</span></div><h3 class="columnTitle">${esc(x.title)}</h3>${x.image?`<div class="detailImgs" style="margin:10px 0"><img src="${esc(imgUrl(x.image))}"></div>`:""}<p class="columnText">${esc(x.body||"")}</p>${x.signature?`<p style="color:#f1d49b;margin:12px 0 0">${esc(x.signature)}</p>`:""}<div class="columnActions"><button class="ghost column-edit-btn" type="button" data-id="${esc(x.id)}">編集</button><button class="danger column-delete-btn" type="button" data-id="${esc(x.id)}">削除</button></div></article>`).join("")}

function detail(i){const x=items.find(a=>String(a.id)===String(i));if(!x)return;const b=imgUrl(x.beforeImage),a=imgUrl(x.afterImage),p=imgUrl(x.popImage);$("#dialogContent").innerHTML=`<h2>${esc(x.name)}</h2><div class="eventMeta"><span class="pill">${esc(x.type)}</span><span class="pill">${esc(x.version)}</span><span class="pill">価格：${esc(x.price||"-")}</span><span class="pill">効果：${esc(x.effect||"-")}</span></div><div class="detailImgs productDetailImgs"><div class="imgbox"><img src="${esc(b)}"><b>開封前</b></div><div class="imgbox"><img src="${esc(a)}"><b>開封後</b></div><div class="imgbox"><img src="${esc(p)}"><b>宣伝POP</b></div></div><div class="imageLinks productImageLinks">${x.beforeImage?`<a href="${esc(x.beforeImage)}" target="_blank" rel="noopener noreferrer">開封前画像を開く</a>`:`<span class="disabled">開封前リンクなし</span>`}${x.afterImage?`<a href="${esc(x.afterImage)}" target="_blank" rel="noopener noreferrer">開封後画像を開く</a>`:`<span class="disabled">開封後リンクなし</span>`}${x.popImage?`<a href="${esc(x.popImage)}" target="_blank" rel="noopener noreferrer">宣伝POPを開く</a>`:`<span class="disabled">宣伝POPリンクなし</span>`}</div><p>${esc(x.description)}</p>${x.memo?`<p style="color:var(--muted)">${esc(x.memo)}</p>`:""}`;$("#dialog").showModal()}
function show(v){document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===v));$("#"+v).classList.add("active");if(v==="popGallery")renderPopGallery()}
function showSub(group,viewId){document.querySelectorAll(`.subTab[data-subgroup="${group}"]`).forEach(x=>x.classList.toggle("active",x.dataset.subview===viewId));const root=group==="product"?"#archive":group==="event"?"#events":"#columns";document.querySelectorAll(`${root} .subView`).forEach(x=>x.classList.toggle("active",x.id===viewId))}
function edit(i){const x=items.find(a=>String(a.id)===String(i));if(!x)return;show("archive");showSub("product","productFormPane");$("#formTitle").textContent="商品編集";$("#saveBtn").textContent="更新";$("#productDeleteBtn").style.display="inline-block";$("#id").value=x.id;$("#name").value=x.name;$("#inType").value=x.type;$("#inVersion").value=x.version;$("#price").value=x.price||"";$("#effect").value=x.effect||"";$("#before").value=x.beforeImage||"";$("#after").value=x.afterImage||"";$("#pop").value=x.popImage||"";$("#desc").value=x.description||"";$("#memo").value=x.memo||"";preview()}
function editEvent(i){const x=events.find(a=>String(a.id)===String(i));if(!x)return;show("events");showSub("event","eventFormPane");$("#eventFormTitle").textContent="イベント編集";$("#eventSaveBtn").textContent="更新";$("#eventId").value=x.id;setEventDateInputs(x.date||"");$("#eventTitle").value=x.title||"";$("#eventCategory").value=x.category||"イベント";$("#eventVersion").value=x.version||"ベータ";$("#eventImage").value=x.image||"";$("#eventDescription").value=x.description||"";eventPreview()}
function editColumn(i){const x=columns.find(a=>String(a.id)===String(i));if(!x)return;show("columns");showSub("column","columnFormPane");$("#columnFormTitle").textContent="コラム編集";$("#columnSaveBtn").textContent="更新";$("#columnDeleteBtn").style.display="inline-block";$("#columnId").value=x.id;$("#ownerName").value=x.ownerName||"";$("#ownerPeriod").value=x.ownerPeriod||"";$("#columnTitle").value=x.title||"";$("#ownerImage").value=x.image||"";$("#columnBody").value=x.body||"";$("#columnSignature").value=x.signature||"";$("#columnOrder").value=x.order||"";columnPreview()}
function clearForm(){$("#form").reset();$("#id").value="";$("#formTitle").textContent="商品登録";$("#saveBtn").textContent="登録";$("#productDeleteBtn").style.display="none";preview()}
function clearEventForm(){$("#eventForm").reset();$("#eventId").value="";$("#eventFormTitle").textContent="イベント登録";$("#eventSaveBtn").textContent="登録";eventPreview()}
function clearColumnForm(){$("#columnForm").reset();$("#columnId").value="";$("#columnFormTitle").textContent="コラム登録";$("#columnSaveBtn").textContent="登録";$("#columnDeleteBtn").style.display="none";columnPreview()}
function preview(){const b=imgUrl($("#before").value),a=imgUrl($("#after").value),p=imgUrl($("#pop").value);$("#beforePrev").innerHTML=b?`<img src="${esc(b)}">`:"開封前プレビュー";$("#afterPrev").innerHTML=a?`<img src="${esc(a)}">`:"開封後プレビュー";$("#popPrev").innerHTML=p?`<img src="${esc(p)}">`:"宣伝POPプレビュー"}
function eventPreview(){const img=imgUrl($("#eventImage").value);$("#eventImagePrev").innerHTML=img?`<img src="${esc(img)}">`:"イベント画像プレビュー"}
function columnPreview(){const img=imgUrl($("#ownerImage").value);$("#ownerImagePrev").innerHTML=img?`<img src="${esc(img)}">`:"オーナー画像プレビュー"}
function confirmDelete(title,text,onYes){$("#dialogContent").innerHTML=`<div class="confirmBox"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="confirmActions"><button class="ghost" id="cancelDelete" type="button">いいえ</button><button class="danger" id="yesDelete" type="button">はい、削除する</button></div></div>`;$("#dialog").showModal();$("#cancelDelete").onclick=()=>$("#dialog").close();$("#yesDelete").onclick=async()=>{$("#yesDelete").disabled=true;$("#yesDelete").textContent="削除中...";try{await onYes();$("#dialog").close()}catch(error){alert("削除エラー: "+error.message);$("#yesDelete").disabled=false;$("#yesDelete").textContent="はい、削除する"}}}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>show(b.dataset.view));
document.querySelectorAll(".subTab").forEach(b=>b.onclick=()=>{const g=b.dataset.subgroup,v=b.dataset.subview;if(g==="product"&&v==="productFormPane")clearForm();if(g==="event"&&v==="eventFormPane")clearEventForm();if(g==="column"&&v==="columnFormPane")clearColumnForm();showSub(g,v)});
["#q","#type","#version"].forEach(s=>$(s).addEventListener("input",render));
["#eventQ","#eventCategoryFilter","#eventVersionFilter"].forEach(s=>$(s).addEventListener("input",renderEvents));
["#popQ","#popVersionFilter"].forEach(s=>$(s).addEventListener("input",renderPopGallery));
$("#clear").onclick=()=>{$("#q").value="";$("#type").value="all";$("#version").value="all";render()};
$("#eventFilterClear").onclick=()=>{$("#eventQ").value="";$("#eventCategoryFilter").value="all";$("#eventVersionFilter").value="all";renderEvents()};
$("#popFilterClear").onclick=()=>{$("#popQ").value="";$("#popVersionFilter").value="all";renderPopGallery()};
$("#before").addEventListener("input",preview);$("#after").addEventListener("input",preview);$("#pop").addEventListener("input",preview);$("#eventImage").addEventListener("input",eventPreview);$("#ownerImage").addEventListener("input",columnPreview);
$("#new").onclick=clearForm;$("#eventClear").onclick=clearEventForm;$("#columnClear").onclick=clearColumnForm;$("#close").onclick=()=>$("#dialog").close();
$("#grid").addEventListener("click",e=>{const btn=e.target.closest("button[data-action]");if(!btn)return;if(btn.dataset.action==="detail")detail(btn.dataset.id);if(btn.dataset.action==="edit")edit(btn.dataset.id)});
$("#productDeleteBtn").onclick=()=>confirmDelete("商品を削除しますか？",`「${$("#name").value||"この商品"}」を削除します。`,async()=>{await deleteItem($("#id").value);clearForm();show("archive");showSub("product","productListPane")});
$("#columnDeleteBtn").onclick=()=>confirmDelete("コラムを削除しますか？",`「${$("#columnTitle").value||"このコラム"}」を削除します。`,async()=>{await deleteColumn($("#columnId").value);clearColumnForm();show("columns");showSub("column","columnListPane")});
$("#eventList").addEventListener("click",async e=>{const editBtn=e.target.closest(".event-edit-btn"),deleteBtn=e.target.closest(".event-delete-btn");if(editBtn){editEvent(editBtn.dataset.id);return}if(deleteBtn){if(deleteBtn.dataset.confirm!=="true"){document.querySelectorAll(".event-delete-btn").forEach(b=>{b.dataset.confirm="false";b.textContent="削除"});deleteBtn.dataset.confirm="true";deleteBtn.textContent="もう一度押す";setTimeout(()=>{if(deleteBtn.dataset.confirm==="true"){deleteBtn.dataset.confirm="false";deleteBtn.textContent="削除"}},3000);return}await deleteEvent(deleteBtn.dataset.id)}});
$("#columnList").addEventListener("click",e=>{const editBtn=e.target.closest(".column-edit-btn"),deleteBtn=e.target.closest(".column-delete-btn");if(editBtn){editColumn(editBtn.dataset.id);return}if(deleteBtn)confirmDelete("コラムを削除しますか？","削除後は元に戻せません。",async()=>deleteColumn(deleteBtn.dataset.id))});
$("#form").onsubmit=async e=>{e.preventDefault();const item={id:$("#id").value||localId(),name:$("#name").value.trim(),type:$("#inType").value,version:$("#inVersion").value,price:$("#price").value.trim(),effect:$("#effect").value.trim(),beforeImage:$("#before").value.trim(),afterImage:$("#after").value.trim(),popImage:$("#pop").value.trim(),description:$("#desc").value.trim(),memo:$("#memo").value.trim()};try{await saveItem(item);clearForm();show("archive");showSub("product","productListPane")}catch(error){alert("保存エラー: "+error.message)}};
$("#eventForm").onsubmit=async e=>{e.preventDefault();const dateValue=getEventDateRangeFromInputs();if(!isEventDateRange(dateValue)){alert("開催期間を正しく入力してください。例：開始 2026 / 05 / 19、終了 2026 / 05 / 20");$("#eventStartYear").focus();return}const event={id:$("#eventId").value||eventLocalId(),date:dateValue,title:$("#eventTitle").value.trim(),category:$("#eventCategory").value,version:$("#eventVersion").value,image:$("#eventImage").value.trim(),description:$("#eventDescription").value.trim()};try{await saveEvent(event);clearEventForm();show("events");showSub("event","eventListPane")}catch(error){alert("イベント保存エラー: "+error.message)}};
$("#columnForm").onsubmit=async e=>{e.preventDefault();const column={id:$("#columnId").value||columnLocalId(),ownerName:$("#ownerName").value.trim(),ownerPeriod:$("#ownerPeriod").value.trim(),title:$("#columnTitle").value.trim(),image:$("#ownerImage").value.trim(),body:$("#columnBody").value.trim(),signature:$("#columnSignature").value.trim(),order:Number($("#columnOrder").value||0)};try{await saveColumn(column);clearColumnForm();show("columns");showSub("column","columnListPane")}catch(error){alert("コラム保存エラー: "+error.message)}};

loadItems();loadEvents();loadColumns();

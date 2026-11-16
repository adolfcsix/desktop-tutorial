'use strict';
(function(){
const $=document.getElementById('app');
const seed=window.TUTTT_DEMO;
const net=window.TutttNetwork;
const ux=window.TutttUX;
const stageLayout=window.TutttStageLayout;
const speakerStatus=window.TutttSpeakerStatus;
const audiencePresence=window.TutttAudiencePresence;
let pkRequestSeq=0;
let pkFinishTimer=null;
const PK_FINISH_MS=3200;
let audienceRequestSeq=0;
let roomListRequestSeq=0;
let roomNavigationSeq=0;
const pendingRoomControls=new Map();
// Local opt-in camera preview only: never published to a room or uploaded.
let pkLocalCameraStream=null;
let pkLocalCameraPending=false;
let pkLocalCameraRequestToken=0;
function stopPkLocalCamera(){
 pkLocalCameraRequestToken++;pkLocalCameraPending=false;
 if(pkLocalCameraStream){pkLocalCameraStream.getTracks().forEach(track=>track.stop());pkLocalCameraStream=null;}
}
function attachPkLocalCamera(){
 const video=$.querySelector('[data-pk-local-video]');
 if(!pkLocalCameraStream||!video)return;
 if(video.srcObject!==pkLocalCameraStream)video.srcObject=pkLocalCameraStream;
 video.hidden=false;video.closest('.pk-duel-side')?.classList.add('pk-has-local-preview');
 video.play().catch(()=>{});
}

// The explicit user choice is retained on this browser. A blocked storage context
// (offline previews, private mode) must never prevent the app from rendering.
function savedTheme(){try{const choice=window.localStorage?.getItem('tuttt.theme');return choice==='dark'?'dark':'light'}catch{return 'light'}}
function applyTheme(){
 const light=state.theme==='light';
 document.body.classList.toggle('light-mode',light);
 document.documentElement.style.colorScheme=light?'light':'dark';
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=light?'#F8F2EB':'#1B1719';
 $.querySelectorAll('[data-action="setTheme"]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.id===state.theme));
 });
}
function setTheme(next){
 if(next!=='light'&&next!=='dark')return;
 state.theme=next;
 try{window.localStorage?.setItem('tuttt.theme',next)}catch{/* Optional preference only. */}
 // Changing color must not replace any chat input, PK stage, local video or sheet.
 applyTheme();
}
const state={pkCheerBurstUntil:0,pkDemoScoreA:1240,pkDemoScoreB:980,pkDemoStart:0,pkDemoFinished:false,pkDemoStreak:0,pkFinishUntil:0,pkData:null,pkFinished:null,pkSyncAt:0,pkSyncError:false,pkPreview:false,pinnedCameraId:null,liveRoster:null,audience:null,audienceError:false,audienceUpdatedAt:0,memberTarget:null,pendingMod:null,liveModeFilter:'Tất cả',liveReady:false,voiceReady:false,voiceParticipants:[],online:false,connected:false,tab:'discover',page:'main',roomId:null,chatId:null,clubId:null,modal:null,theme:savedTheme(),filter:'Tất cả',roomFilter:'Tất cả',search:'',mic:false,seat:false,following:15,toast:'',rooms:structuredClone(seed.rooms),people:structuredClone(seed.people),chats:structuredClone(seed.chats),messages:structuredClone(seed.messages),clubs:structuredClone(seed.clubs),roomLog:[],voiceSpeakingIds:[],voicePeerReconnecting:[],voiceMicPending:false,voiceSeatPending:false,voiceCaptureIssue:'',voiceDeviceHint:'',roomMessages:[],username:'Bạn',bio:'Một tâm hồn thích những cuộc trò chuyện hay ✨'};
async function syncPK(){
 if(!state.connected||!state.roomId||state.page!=='room')return;
 const id=state.roomId,seq=++pkRequestSeq;
 try{const data=await net.pkSnapshot(id);if(seq===pkRequestSeq&&state.roomId===id&&state.page==='room'){
   state.pkSyncAt=Date.now();state.pkLastAttempt=Date.now();state.pkSyncError=false;
   const prev=state.pkData?.match;
   if(prev && !data.match){
     const confirmed=(data.recent||[]).find(x=>x.id===prev.id && x.status==='finished');
     if(confirmed)showPkFinish(confirmed);
   }
   if(data.match)dismissPkFinish();
   state.pkData=data;
   // An empty PK snapshot on reconnect is not a reason to replace the whole room.
   // This also protects an open audience sheet and the user's chat draft.
   if(!prev&&!data.match&&!state.pkFinished&&!state.pkPreview&&(!state.modal||state.modal==='roomAudience')){updatePkNetworkStatus();return;}
   // Preserve the live stage, chat input and focus when only the score snapshot changed.
   if(prev && data.match && prev.id===data.match.id && !state.modal &&
      updatePkArenaNumbers(data.match.scoreA,data.match.scoreB)){updatePkNetworkStatus();return;}
   render();
  }}
 catch{if(seq===pkRequestSeq&&state.roomId===id){state.pkSyncError=true;updatePkNetworkStatus()}}
}
function pkTime(ms){if(ms<=0)return '00:00';const secs=Math.ceil(ms/1000);return String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0')}
// Finish only from server-confirmed results; never invent a streak from a score.
// The timer is scoped to the match and room to prevent stale callbacks resetting
// another live room or a newly started match.
function showPkFinish(match,demo=false){
 if(pkFinishTimer){clearTimeout(pkFinishTimer);pkFinishTimer=null;}
 const room=state.roomId;
 state.pkFinishUntil=Date.now()+PK_FINISH_MS;
 if(state.modal==='pk'||state.modal==='pkEndConfirm')state.modal=null;
 if(demo)state.pkDemoFinished=true;
 else state.pkFinished=match;
 const id=demo?'demo':match?.id;
 pkFinishTimer=setTimeout(()=>{
  if(state.roomId!==room)return;
  if(demo && state.pkDemoFinished){state.pkDemoFinished=false;state.pkPreview=false;stopPkLocalCamera();}
  else if(!demo && state.pkFinished?.id===id)state.pkFinished=null;
  state.pkFinishUntil=0;pkFinishTimer=null;
  if(state.page==='room')render();
 },PK_FINISH_MS);
}
function dismissPkFinish(){
 if(pkFinishTimer)clearTimeout(pkFinishTimer);
 pkFinishTimer=null;state.pkFinished=null;state.pkFinishUntil=0;
 state.pkDemoFinished=false;
}
// A single viewer count across Voice/Cam and PK; never use the audio roster as an
// audience count (listeners can watch without joining the voice transport).
function audienceView(r){return audiencePresence.view({connected:state.connected,online:state.online,roomId:r.id,snapshot:state.audience,failed:state.audienceError,updatedAt:state.audienceUpdatedAt,demoCount:r.members})}
function audienceCount(r){return audienceView(r).count}
function audienceMarkup(r,classname){
 const view=audienceView(r);
 const label=!state.connected?'Xem danh sách minh họa, không phải người xem thật':view.verified?`Xem danh sách ${view.count} người đang trong phòng`:'Mở danh sách người xem, đang chờ đồng bộ từ máy chủ';
 return `<button type="button" class="${classname} audience-trigger ${view.verified||!state.connected?'':'is-unverified'}" data-action="roomAudience" data-audience-status="${view.status}" aria-label="${label}" aria-haspopup="dialog" aria-busy="${state.connected&&!view.verified}">${ico('users')} <span class="audience-number" data-audience-count>${view.count}</span><span class="audience-word"> người</span></button>`;
}
function syncAudienceDom(){
 if(state.page!=='room')return;
 const r=state.rooms.find(x=>x.id===state.roomId);if(!r)return;
 const view=audienceView(r);
 $.querySelectorAll('[data-audience-count]').forEach(el=>{el.textContent=String(view.count)});
 $.querySelectorAll('.audience-trigger').forEach(el=>{
  el.setAttribute('aria-label',!state.connected?'Xem danh sách minh họa, không phải người xem thật':view.verified?`Xem danh sách ${view.count} người đang trong phòng`:'Mở danh sách người xem, đang chờ đồng bộ từ máy chủ');
  el.setAttribute('aria-busy',String(state.connected&&!view.verified));el.dataset.audienceStatus=view.status;
  el.classList.toggle('is-unverified',state.connected&&!view.verified);
 });
 if(state.modal==='roomAudience'){
  const body=$.querySelector('[data-audience-sheet-body]');
  if(body){
   const signature=JSON.stringify({status:view.status,count:view.count,members:view.verified?state.audience.members:[]});
   if(body.dataset.audienceSignature!==signature){
    const scroller=body.closest('.sheet');const previous=scroller?.scrollTop||0;
    body.innerHTML=liveRoomSheet('audience');body.dataset.audienceSignature=signature;
    if(scroller)scroller.scrollTop=previous;
   }
  }
 }
}
async function syncAudience(){
 if(!state.connected||!state.roomId||state.page!=='room')return;
 const id=state.roomId,sequence=++audienceRequestSeq;
 try{
  const data=await net.audience(id);
  if(sequence!==audienceRequestSeq||id!==state.roomId||state.page!=='room')return;
  if(data.roomId!==id||!Array.isArray(data.members)||data.count!==data.members.length)throw new Error('Phản hồi người xem không hợp lệ');
  state.audience=data;state.audienceUpdatedAt=Date.now();state.audienceError=false;syncAudienceDom();
 }catch{
  if(sequence!==audienceRequestSeq||id!==state.roomId||state.page!=='room')return;
  state.audienceError=true;state.audienceUpdatedAt=0;syncAudienceDom();
 }
}
function pkPanel(r){
 const active=state.pkData?.match;
 const demo=!state.connected&&state.pkPreview;
 const isEnding=Boolean((!active&&state.pkFinished)||demo&&state.pkDemoFinished);
 const demoMatch=demo?{
  id:'preview-match',status:state.pkDemoFinished?'finished':'active',
  roomA:{id:r.id,host:r.host},roomB:{id:'preview-opponent',host:'Khách mời PK'},
  scoreA:state.pkDemoScoreA,scoreB:state.pkDemoScoreB,startedAt:state.pkDemoStart,
  endsAt:state.pkDemoStart+180000,winner:state.pkDemoFinished?(state.pkDemoScoreA===state.pkDemoScoreB?null:state.pkDemoScoreA>state.pkDemoScoreB?'A':'B'):null,
  winStreak:state.pkDemoStreak
 }:null;
 const m=active||(!state.connected?demoMatch:state.pkFinished);
 if(!m)return '';
 const a=m?.roomA?.host||r.host,b=m?.roomB?.host||'Khách mời PK';
 const scoreA=demo?state.pkDemoScoreA:m?.scoreA||0,scoreB=demo?state.pkDemoScoreB:m?.scoreB||0;
 const score=window.TutttPKVisual.evaluate(scoreA,scoreB);
 const remaining=m?m.endsAt-Date.now():Math.max(0,180000-(Date.now()-(state.pkDemoStart||Date.now())));
 const mine=m?(m.roomA.id===r.id?'A':'B'):'A';
 const cam=r.type==='cam';
 const scoreText=n=>Number(n).toLocaleString('vi-VN');
 const outcomeBadge=key=>!isEnding?'':`<span class="pk-outcome-flag ${m.winner===key?'pk-outcome-win':m.winner===null?'pk-outcome-draw':'pk-outcome-loss'}" role="status" aria-label="${m.winner===key?`Phe ${key} chiến thắng${Number.isInteger(m.winStreak)&&m.winStreak>0?`, chuỗi thắng ${m.winStreak}`:''}`:m.winner===null?`Phe ${key} hòa điểm`:`Phe ${key} thất bại`}"><strong>${m.winner===key?'WIN':m.winner===null?'DRAW':'LOSS'}</strong>${m.winner===key&&Number.isInteger(m.winStreak)&&m.winStreak>0?`<b class="pk-win-streak" aria-label="Chuỗi thắng ${m.winStreak} trận">x${m.winStreak}</b>`:''}</span>`;
 const status=cam?'Chưa ghép video PK':'Chưa ghép âm thanh PK';
 const localMic=state.voiceReady&&state.voiceParticipants.find(p=>p.id===r.hostId);
 const localSpeaking=Boolean(!demo&&!cam&&localMic?.mic&&state.voiceSpeakingIds.includes(r.hostId));
 const side=(key,name,color)=>cam?`<div class="pk-duel-side pk-side-${color} ${mine===key?'my-side':''}" aria-label="Phe ${key}: ${esc(name)}">
   <video class="pk-host-video" ${mine===key?'data-pk-local-video':''} autoplay muted playsinline hidden aria-label="Xem trước camera tại thiết bị, không phát lên mạng"></video>${demo&&mine===key?'<button type="button" class="pk-camera-stop" data-action="pkLocalCameraToggle" aria-label="Tắt xem trước camera">Tắt camera thử</button>':''}
   <div class="pk-camera-backdrop"><span class="pk-camera-symbol" aria-hidden="true">▣</span>${demo&&mine===key?'<button type="button" class="pk-camera-try" data-action="pkLocalCameraToggle" aria-label="Bật hoặc tắt xem trước camera ngay trên thiết bị">Thử camera của tôi</button><span>Chỉ xem trên máy · Không phát Live</span>':'<span>CHỜ TÍN HIỆU CAMERA</span>'}</div>
   <div class="pk-side-top"><span>${mine===key?'Phòng của bạn':'Đối thủ'}</span></div>
   <div class="pk-side-score" data-pk-side="${key}" aria-label="Phe ${key} có ${scoreText(key==='A'?scoreA:scoreB)} điểm"><strong data-pk-score="${key}">${scoreText(key==='A'?scoreA:scoreB)}</strong><span>Điểm cổ vũ</span>${isEnding?`<div class="pk-cam-finish-slot">${outcomeBadge(key)}</div>`:''}</div>
   <div class="pk-person"><div class="pk-person-ring"><span class="pk-person-avatar" aria-hidden="true">${esc(name.slice(0,1).toUpperCase())}</span></div><div class="pk-identity"><strong title="${esc(name)}">${esc(name)}</strong><small>${mine===key?'Đang ở phòng này':'Chưa ghép video đối thủ'}</small></div></div>
   <span class="pk-media-label" data-pk-local-media="${mine===key?'true':'false'}" role="status">${mine!==key?'Chưa ghép tín hiệu đối thủ':demo?'Camera minh họa: chưa có video thật':status}</span>
  </div>`:`<div class="pk-duel-side pk-side-${color} ${mine===key?'my-side':''}" aria-label="Phe ${key}: ${esc(name)}">
  <div class="pk-side-top"><span>${mine===key?'PHE CỦA BẠN':'PHE ĐỐI THỦ'}</span></div>
  <div class="pk-person"><div class="pk-person-ring ${mine===key&&localSpeaking?'pk-host-speaking':''}"><span class="pk-person-avatar" aria-hidden="true">${esc(name.slice(0,1).toUpperCase())}</span><span class="pk-voice-mic-mark ${mine===key&&localSpeaking?'is-speaking':''}" aria-hidden="true">${ico(mine!==key?'headphones':localMic?.mic?'mic':'micoff')}</span></div>
  <strong title="${esc(name)}">${esc(name)}</strong><small>Chủ phòng</small>
  <span class="pk-media-label" data-pk-local-media="${mine===key?'true':'false'}" role="status">${mine!==key?'Chưa kết nối âm thanh':demo?'Âm thanh minh họa':localMic?(localSpeaking?'● Đang nói':localMic.mic?'Mic đang bật':'Mic đã tắt'):status}</span></div>
  <div class="pk-voice-outcome-slot" data-pk-voice-outcome="${key}">${isEnding?outcomeBadge(key):''}</div>
 </div>`;
 return `<section data-pk-leading="${scoreA===scoreB?'tie':scoreA>scoreB?'A':'B'}" data-pk-last-decided-leader="${scoreA===scoreB?'':scoreA>scoreB?'A':'B'}" class="pk-showdown pk-battle-scene pk-arena-v2 pk-arena-v3 ${cam?'pk-broadcast-cam':'pk-broadcast-voice'} ${cam?'pk-battle-cam':'pk-battle-voice'} ${demo?'pk-demo':''} ${isEnding?'pk-end-presentation':''}" aria-label="${isEnding?'Kết quả PK giữa hai phòng':'Sân khấu PK giữa hai phòng'}">
 <div class="pk-scene-head"><div class="pk-head-text"><span class="pk-pulse-light" aria-hidden="true"></span><strong>${isEnding?'PK đã kết thúc':demo?'PK minh họa':'PK trực tiếp'}</strong>${demo?'<small class="pk-demo-only">BẢN MINH HỌA</small>':''}${!isEnding&&!demo&&Date.now()-m.startedAt<3000?'<span class="pk-intro-label" aria-label="Trận vừa bắt đầu">Vào trận!</span>':''}</div><div class="pk-head-actions">${cam?audienceMarkup(r,'pk-viewers'):''}<div class="pk-clock"><strong data-pk-countdown aria-label="Thời gian còn lại">${pkTime(remaining)}</strong></div></div></div>
 ${!cam?'<div class="pk-voice-kicker" aria-hidden="true"><span>SO TÀI TRỰC TIẾP</span><span>VOICE BATTLE <i>✦</i></span></div>':''}
 <div class="pk-duel" role="group" aria-label="Hai phòng thi đấu"><div class="pk-field-art" aria-hidden="true"><span>✳</span><span>✦</span><span>✳</span></div>
  ${side('A',a,'coral')}
  ${side('B',b,'champagne')}
  <div class="pk-duel-seam" aria-hidden="true"><span>VS</span></div>
 </div>
 <div class="pk-scoreboard"><div class="pk-score-line"><div class="pk-score-a"><span class="pk-score-label">PHE A</span><strong data-pk-score="A">${scoreText(scoreA)}</strong></div><span class="pk-score-center" data-pk-leader>${score.label}</span><div class="pk-score-right"><span class="pk-score-label">PHE B</span><strong data-pk-score="B">${scoreText(scoreB)}</strong></div></div>
 <div class="pk-balance-legends" aria-hidden="true"><span class="pk-legend-a"><i></i>PHE A <b data-pk-points="A">${scoreText(scoreA)}</b></span><span class="pk-legend-b"><b data-pk-points="B">${scoreText(scoreB)}</b> PHE B<i></i></span></div>
 <div class="pk-balance-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score.leftPct}" aria-label="Thanh thế trận PK. Phe A ${scoreText(scoreA)} điểm; Phe B ${scoreText(scoreB)} điểm" data-pk-balance>
 <span class="pk-balance-a" style="width:${score.leftPct}%"></span><span class="pk-balance-ticks" aria-hidden="true"></span><span class="pk-balance-pin" style="left:${Math.max(3,Math.min(97,score.leftPct))}%"><span aria-hidden="true">✦</span></span>
 </div><span class="pk-score-caption"><strong data-pk-leader>${score.label}</strong><span class="pk-gap-copy" data-pk-gap>${scoreA===scoreB?'· Cùng số điểm':`· Cách biệt ${scoreText(Math.abs(scoreA-scoreB))} điểm`}</span></span>${!cam?`<small class="pk-voice-footnote">${demo?'Điểm mẫu · Không phải tiền hay quà thật':'Điểm cổ vũ miễn phí · Không tính coin'}</small>`:''}</div>
 <div class="pk-network-status" role="status" aria-live="polite" hidden>Không thể đồng bộ điểm PK · Đang kết nối lại</div>
 <div class="pk-scene-footer">${cam?`<small>${demo?'Điểm mẫu · Không phải tiền hay quà thật':'Điểm cổ vũ miễn phí · Không tính coin'}</small>`:''}${!cam?`<span class="pk-cheer-wrap"><button class="pk-cheer-button" type="button" ${isEnding?'disabled aria-disabled="true"':''} data-action="${demo?'pkDemoCheer':'pkCheer'}" aria-label="Cổ vũ phe ${mine}"><span class="pk-cheer-icon" aria-hidden="true">${ico('heart')}</span><span class="pk-cheer-copy">Tiếp sức</span></button></span>`:''}</div>
 </section>`;
}
// Small, incremental DOM update. Full render during a live battle replays stage entrance,
// discards score transitions and recreates chat controls, causing noticeable stutter.
function animatePkScore(node,next){
 const end=Math.max(0,Math.round(Number(next)||0));
 const formatted=end.toLocaleString('vi-VN');
 if(node.dataset.pkTarget!==String(end)||node.textContent!==formatted){
  node.dataset.pkTarget=String(end);
  node.textContent=formatted;
 }
}
// Small celebratory effect on the viewer's tap. Never changes the score itself.
function burstPkHearts(){
 const root=$.querySelector('.pk-battle-scene');
 const button=root?.classList.contains('pk-broadcast-cam')
   ? $.querySelector('.cam-actions .pk-rail-cheer')
   : root?.querySelector('.pk-cheer-button');
 if(!button||button.disabled)return;
 const glyph=button.querySelector('.pk-cheer-icon');
 if(glyph){glyph.classList.remove('is-pk-heart-filled');void glyph.offsetWidth;glyph.classList.add('is-pk-heart-filled');}
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 // Show one clean filled heart; bound the effect under rapid taps.
 button.querySelectorAll('.pk-heart-particle').forEach(el=>el.remove());
 const el=document.createElement('span');el.className='pk-heart-particle';
 el.setAttribute('aria-hidden','true');el.innerHTML=ico('heart');
 button.appendChild(el);
 el.addEventListener('animationend',()=>el.remove(),{once:true});
 window.setTimeout(()=>el.remove(),1100);
}
function updatePkArenaNumbers(a,b,showBurst=false){
 const root=$.querySelector('.pk-battle-scene');
 if(!root)return false;
 a=Math.max(0,Number(a)||0);b=Math.max(0,Number(b)||0);
 const ratio=window.TutttPKVisual.evaluate(a,b);
 // Mark a real lead reversal once, only after an updated score snapshot.
 // Passing through a tie does not trigger a fake takeover animation.
 const incomingLead=a===b?'tie':a>b?'A':'B';
 // Preserve the last decisive leader through an exact tie, so B -> tie -> A
 // still counts as a genuine takeover; tie on the first frame is neutral.
 const lastLead=root.dataset.pkLastDecidedLeader||root.dataset.pkLeading;
 if(lastLead && lastLead!=='tie' && incomingLead!=='tie' && incomingLead!==lastLead){
  root.classList.remove('pk-lead-switch');
  void root.offsetWidth;
  root.classList.add('pk-lead-switch');
 }
 root.dataset.pkLeading=incomingLead;
 if(incomingLead!=='tie')root.dataset.pkLastDecidedLeader=incomingLead;
 root.querySelectorAll('[data-pk-score="A"]').forEach(el=>animatePkScore(el,a));
 root.querySelectorAll('[data-pk-score="B"]').forEach(el=>animatePkScore(el,b));
 root.querySelectorAll('[data-pk-leader]').forEach(el=>{el.textContent=ratio.label});
 const bar=root.querySelector('[data-pk-balance]');
 if(bar){
  bar.setAttribute('aria-label',`Thanh thế trận PK. Phe A ${a.toLocaleString('vi-VN')} điểm; Phe B ${b.toLocaleString('vi-VN')} điểm`);
  bar.setAttribute('aria-valuenow',String(ratio.leftPct));
  const fill=bar.querySelector('.pk-balance-a'),pin=bar.querySelector('.pk-balance-pin');
  if(fill)fill.style.width=ratio.leftPct+'%';
  if(pin)pin.style.left=Math.max(3,Math.min(97,ratio.leftPct))+'%';
 }
 root.querySelectorAll('[data-pk-points="A"]').forEach(el=>{el.textContent=a.toLocaleString('vi-VN')});
 root.querySelectorAll('[data-pk-points="B"]').forEach(el=>{el.textContent=b.toLocaleString('vi-VN')});
 root.querySelectorAll('[data-pk-gap]').forEach(el=>{el.textContent=a===b?'· Cùng số điểm':`· Cách biệt ${Math.abs(a-b).toLocaleString('vi-VN')} điểm`});
 root.querySelectorAll('[data-pk-side]').forEach(el=>{
  const side=el.dataset.pkSide;
  el.setAttribute('aria-label',`Phe ${side} có ${(side==='A'?a:b).toLocaleString('vi-VN')} điểm`);
 });
 if(showBurst)burstPkHearts();
 return true;
}
function updatePkNetworkStatus(){
 const stage=$.querySelector('.pk-battle-scene');
 if(!stage||!state.connected)return;
 if(stage.classList.contains('pk-end-presentation')){const button=stage.querySelector('[data-action="pkCheer"]');if(button){button.disabled=true;button.setAttribute('aria-disabled','true');}return;}
 const stale=state.pkSyncError||!state.online||!state.pkSyncAt||Date.now()-state.pkSyncAt>15000;
 const notice=stage.querySelector('.pk-network-status'),button=stage.querySelector('[data-action="pkCheer"]');
 if(notice)notice.hidden=!stale;
 if(button){button.disabled=stale;button.setAttribute('aria-disabled',String(stale));}
}
function pkChatStarter(){
 const active=!!(state.pkData?.match||state.pkFinished||(!state.connected&&state.pkPreview));
 if(!active||state.roomLog.length)return '';
 return '<div class="pk-chat-starter"><span>✦ Cổ vũ cùng mọi người</span><button type="button" data-action="pkPrompt" aria-label="Viết sẵn một lời cổ vũ trong ô chat">Viết lời cổ vũ ↗</button></div>';
}
function pkLauncher(){return `<button type="button" class="pk-launcher" data-action="pkOpen" aria-label="Mở PK giữa hai phòng">⚡ PK</button>`}
function pkSheet(){
 const info=state.pkData||{},m=info.match,inv=info.invites||[];
 const invites=inv.map(x=>{const received=x.roomB===state.roomId;return `<div class="pk-sheet-entry"><strong>${received?`Lời mời từ ${esc(x.from)}`:`Đang mời ${esc(x.to)}`}</strong><small>PK ${x.durationSeconds/60} phút · còn đến ${new Date(x.expiresAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</small><div class="pk-sheet-actions">${received?`<button data-action="pkRespond" data-id="${esc(x.id)}:no">Từ chối</button><button class="primary" data-action="pkRespond" data-id="${esc(x.id)}:yes">Chấp nhận</button>`:`<button data-action="pkCancel" data-id="${esc(x.id)}">Hủy lời mời</button>`}</div></div>`}).join('');
 const options=(info.available||[]).map(r=>`<button type="button" class="pk-target" data-action="pkInvite" data-id="${esc(r.id)}"><span class="pk-target-avatar">${esc(r.host.slice(0,1))}</span><span><strong>${esc(r.host)}</strong><small>${esc(r.title)}</small></span><span aria-hidden="true">Mời ›</span></button>`).join('');
 return `<div class="sheet-head"><h2 id="modal-title">⚡ PK hai phòng</h2><button class="close-btn" type="button" data-action="closeModal" aria-label="Đóng">×</button></div>
 <p class="tagline">PK hữu nghị 3 phút. Hai chủ phòng đồng ý trước; người xem cổ vũ miễn phí. Không thu coin hay ghép luồng media khác phòng ở phiên bản này.</p>
 ${m?`<div class="pk-sheet-entry"><strong>Đang PK: ${esc(m.roomA.host)} vs ${esc(m.roomB.host)}</strong><small>${m.scoreA} – ${m.scoreB} điểm · ${pkTime(m.endsAt-Date.now())} còn lại</small>${info.host?`<button class="pk-end-link" type="button" data-action="pkConfirmEnd">Kết thúc PK trước thời hạn</button>`:''}</div>`:''}
 ${invites}
 ${!state.connected?`<div class="notice">Bản xem trước offline · Kết quả và chuỗi thắng trong bản thử là minh họa.</div><button class="action-cta solid-full" type="button" data-action="pkPreviewToggle">${state.pkPreview?'Ẩn':'Xem'} giao diện PK minh họa</button>${state.pkPreview&&!state.pkDemoFinished?'<button class="pk-preview-finish" type="button" data-action="pkDemoFinish">Thử hiệu ứng kết thúc trận</button>':''}`:''}
 ${state.connected&&info.host&&!m&&!invites?`<div class="pk-sheet-subhead">Mời chủ phòng đang online · cùng chế độ ${esc(state.rooms.find(x=>x.id===state.roomId)?.type==='cam'?'Cam':'Voice')}</div>${options||'<p class="cam-panel-empty">Chưa có phòng tương thích khác đang online. Cần hai chủ phòng ở hai phiên truy cập.</p>'}`:''}
 ${state.connected&&!info.host&&!m&&!invites?'<p class="cam-panel-empty">Chỉ chủ phòng có thể gửi lời mời PK. Bạn vẫn được cổ vũ khi PK bắt đầu.</p>':''}
 ${info.recent?.[0]?`<div class="pk-result-summary"><span>TRẬN GẦN NHẤT</span><strong>${esc(info.recent[0].winner?info.recent[0].winner==='A'?info.recent[0].roomA.host+' chiến thắng':info.recent[0].roomB.host+' chiến thắng':'Hai bên hòa điểm')}</strong><div><span>${Number(info.recent[0].scoreA).toLocaleString('vi-VN')}</span><i>—</i><span>${Number(info.recent[0].scoreB).toLocaleString('vi-VN')}</span></div><small>Kết quả do máy chủ xác nhận · điểm cổ vũ miễn phí</small></div>`:''}`;
}
async function syncRooms(){
 if(!state.connected)return;
 const seq=++roomListRequestSeq;
 try{
  const data=await net.rooms();if(seq!==roomListRequestSeq)return;
  state.rooms=data.rooms;
  // Room cards changed, but the current room's chat, PK and media must not be recreated.
  if(state.page!=='room')render();
  else syncAudienceDom();
 }catch{
  if(seq!==roomListRequestSeq)return;
  if(state.page!=='room'){state.online=false;render();}
  else{state.audienceError=true;state.audienceUpdatedAt=0;syncAudienceDom();}
 }
}
async function syncStage(){
 if(!state.liveReady||!state.roomId||state.page!=='room')return;
 const room=state.roomId,navigation=roomNavigationSeq;
 const current=()=>state.roomId===room&&state.page==='room'&&roomNavigationSeq===navigation;
 try{
  const roster=await net.liveRoster(room);
  if(!current())return;
  state.liveRoster=roster;
  if(state.pkData?.match)updatePkNetworkStatus();else render();
 }catch{
  if(!current())return;
  state.liveReady=false;
  if(!state.pkData?.match)render();
 }
}
// Update only the Live chat region while PK is active. Do not reconstruct the
// stage or keyboard input whenever a new participant sends a message.
/** Preserve chat nodes, scroll position, editor focus and PK video across bursts.
 * The server is authoritative; stable message UUIDs prevent duplicated lines. */
function updateLiveChatDom(){
 if(!state.connected||state.page!=='room')return false;
 const r=state.rooms.find(x=>x.id===state.roomId);
 const cam=r?.type==='cam';
 const box=$.querySelector(cam?'.cam-chat-history':'.room-chatbox');
 if(!box)return false;
 const rows=state.roomMessages.slice(cam?-45:-80);
 const nearBottom=box.scrollHeight-box.clientHeight-box.scrollTop<65;
 const firstVisible=[...box.querySelectorAll('[data-chat-id]')].find(el=>el.getBoundingClientRect().bottom>box.getBoundingClientRect().top+1);
 const oldScrollTop=box.scrollTop;
 const existing=new Map([...box.querySelectorAll('[data-chat-id]')].map(node=>[node.dataset.chatId,node]));
 const ids=new Set(rows.map(m=>String(m.id)));
 for(const [id,node] of existing)if(!ids.has(id))node.remove();
 // Server chat replaces a static demo placeholder once, without touching the input.
 if(rows.length){
  if(cam)box.querySelectorAll('.cam-panel-empty,.pk-demo-chat-label,.pk-chat-starter,.cam-chat-entry:not([data-chat-id])').forEach(n=>n.remove());
  else box.querySelectorAll('.room-log:not([data-chat-id]):not(.room-log-intro)').forEach(n=>n.remove());
 }
 let next=cam?null:box.querySelector('.pk-chat-starter');
 for(let i=rows.length-1;i>=0;i--){
  const m=rows[i],id=String(m.id);
  let node=existing.get(id);
  if(!node){
   node=document.createElement('div');node.dataset.chatId=id;
   node.className=cam?'cam-chat-entry':'room-log';
   if(cam){const name=document.createElement('strong');name.textContent=m.name;const message=document.createElement('span');message.textContent=' '+m.text;node.append(name,message)}
   else node.textContent=m.name+': '+m.text;
  }
  if(node.parentNode!==box||node.nextSibling!==next)box.insertBefore(node,next);
  next=node;
 }
 if(nearBottom)box.scrollTop=box.scrollHeight;
 else if(!firstVisible?.isConnected)box.scrollTop=oldScrollTop; // let browser scroll anchoring preserve a surviving visible line
 return true;
}
// Coalesce SSE message bursts into at most one follow-up fetch. Responses from
// a previous room are discarded, even if the request finishes after navigation.
let roomMessageSync=null;
async function syncRoomMessages(){
 if(!state.connected||state.page!=='room'||!state.roomId)return;
 const room=state.roomId;
 if(roomMessageSync?.room===room){roomMessageSync.dirty=true;return roomMessageSync.promise;}
 const job={room,dirty:false,promise:null};roomMessageSync=job;
 job.promise=(async()=>{
  do{
   job.dirty=false;
   let data;try{data=await net.messages(room)}catch{return;}
   if(roomMessageSync!==job||state.roomId!==room||state.page!=='room')return;
   state.roomMessages=Array.isArray(data.messages)?data.messages:[];
   state.roomLog=state.roomMessages.map(m=>m.name+': '+m.text);
   if(!updateLiveChatDom())render();
  }while(job.dirty);
 })().finally(()=>{if(roomMessageSync===job)roomMessageSync=null;});
 return job.promise;
}
/** SSE is the control channel, not proof that a WebRTC audio track stopped. */
function updateRoomSignalDom(){
 if(state.page!=='room'||!state.connected)return;
 const unstable=!state.online;
 const voiceStatus=$.querySelector('.room-top .voice-status');
 if(voiceStatus){
  voiceStatus.classList.toggle('signal-unstable',unstable);
  voiceStatus.textContent=unstable?'◌ Tín hiệu phòng đang kết nối lại':state.voiceCaptureIssue?'◌ Cần kiểm tra mic':state.voiceSeatPending?'◌ Đang cập nhật ghế':state.voiceMicPending?'◌ Đang xin quyền mic':state.voicePeerReconnecting.length?'◌ Đang nối lại âm thanh người tham gia':state.voiceDeviceHint?'◌ Kiểm tra đường âm thanh':state.voiceReady?'● Voice đã vào phòng':'○ Voice chưa kết nối';
  voiceStatus.classList.toggle('on',!unstable&&state.voiceReady&&!state.voicePeerReconnecting.length&&!state.voiceCaptureIssue&&!state.voiceSeatPending&&!state.voiceMicPending&&!state.voiceDeviceHint);
  voiceStatus.classList.toggle('signal-unstable',unstable||state.voicePeerReconnecting.length>0||!!state.voiceCaptureIssue||state.voiceSeatPending||state.voiceMicPending||!!state.voiceDeviceHint);
  voiceStatus.setAttribute('aria-label',state.voiceCaptureIssue||state.voiceDeviceHint||voiceStatus.textContent);
  voiceStatus.title=state.voiceCaptureIssue||state.voiceDeviceHint||'';
 }
 const seatControl=$.querySelector('.room-controls [data-action="joinSeat"]');
 if(seatControl){seatControl.disabled=state.voiceSeatPending;seatControl.setAttribute('aria-busy',String(state.voiceSeatPending));seatControl.setAttribute('aria-label',state.voiceSeatPending?'Đang cập nhật ghế nói':state.seat?'Rời ghế nói':'Lên ghế nói');}
 const info=$.querySelector('.room-top > .notice');
 const micControl=$.querySelector('.room-controls [data-action="mic"]');
 if(micControl){micControl.disabled=state.voiceMicPending||state.voiceSeatPending;micControl.setAttribute('aria-busy',String(state.voiceMicPending||state.voiceSeatPending));micControl.setAttribute('aria-label',state.voiceMicPending?'Đang chờ quyền microphone':state.mic?'Tắt microphone':'Bật microphone');}
 if(info)info.textContent=unstable?'Tín hiệu điều khiển tạm gián đoạn. Âm thanh có thể vẫn hoạt động; đang đồng bộ lại phòng.':state.voiceCaptureIssue?state.voiceCaptureIssue:state.voiceSeatPending?'Đang cập nhật ghế nói. Vui lòng chờ yêu cầu hiện tại hoàn tất.':state.voiceMicPending?'Đang chờ trình duyệt cấp quyền microphone. Bạn có thể từ chối hoặc rời phòng.':state.voicePeerReconnecting.length?'Đang thử nối lại âm thanh với một người tham gia. Chat chữ vẫn hoạt động.':state.voiceDeviceHint?state.voiceDeviceHint:state.voiceReady?'Voice WebRTC đã kết nối tín hiệu. Phát âm thanh phụ thuộc microphone, HTTPS/localhost và mạng của thiết bị.':'Đang kết nối phòng voice… Chat chữ vẫn hoạt động.';
 const camStatus=$.querySelector('.cam-status-line>span:last-child');
 if(camStatus){
  if(unstable){
   if(!camStatus.dataset.signalNormalText)camStatus.dataset.signalNormalText=camStatus.textContent;
   camStatus.textContent='Tín hiệu phòng đang kết nối lại · không khẳng định camera đã ngắt';
  }else if(camStatus.dataset.signalNormalText){
   camStatus.textContent=camStatus.dataset.signalNormalText;delete camStatus.dataset.signalNormalText;
  }
 }
}
async function startNetwork(){
 if(!net)return;
 try{
   const ses=await net.session();state.username=ses.user.name;state.bio=ses.user.bio||'';state.connected=true;state.online=true;
   state.people=[];state.chats=[];state.messages={};state.rooms=[];
   await syncRooms();
   const stream=new EventSource('/api/events');
   stream.addEventListener('pk.changed',e=>{try{if(JSON.parse(e.data).roomId===state.roomId)syncPK()}catch{}});
   stream.addEventListener('stage.changed',e=>{try{if(JSON.parse(e.data).roomId===state.roomId)syncStage()}catch{}});
   stream.addEventListener('voice.changed',e=>{try{if(JSON.parse(e.data).roomId===state.roomId)voice.refresh()}catch{}});
   stream.addEventListener('voice.signal',e=>{try{voice.receive(JSON.parse(e.data))}catch{}});
   stream.addEventListener('rooms.changed',()=>{void syncRooms();if(state.page==='room')void syncAudience()});
   stream.addEventListener('room.changed',e=>{try{if(JSON.parse(e.data).roomId===state.roomId)syncRoomMessages()}catch{}});
   stream.addEventListener('open',()=>{
    state.online=true;
    if(state.page==='room'&&state.roomId){
     updateRoomSignalDom();updatePkNetworkStatus();
     void syncRoomMessages(); // missed room.changed events during reconnection
     void syncAudience();
     if(voice.roomId===state.roomId)void voice.refresh();
     void syncPK();
    }else render();
   });
   stream.addEventListener('error',()=>{
    state.online=false;audienceRequestSeq++;state.audienceUpdatedAt=0;
    if(state.page==='room'){syncAudienceDom();updateRoomSignalDom();updatePkNetworkStatus();}
    else render();
   });
   window.addEventListener('pagehide',()=>{if(state.roomId){voice.exit().catch(()=>{});net.leave(state.roomId).catch(()=>{})}stream.close()});
   setInterval(()=>{if(state.page==='room'&&state.roomId){void syncAudience();}},12000);
   setInterval(()=>{if(state.page==='room'&&state.roomId){
      const room=state.roomId,navigation=roomNavigationSeq;
      const current=()=>state.page==='room'&&state.roomId===room&&roomNavigationSeq===navigation;
      net.join(room).then(()=>{if(current())void syncAudience()}).catch(()=>{if(current()){state.audienceError=true;state.audienceUpdatedAt=0;syncAudienceDom();}});
      if(state.voiceReady)voice.heartbeat().catch(()=>{});
      if(state.liveReady)net.liveHeartbeat(room).then(roster=>{
       if(!current())return;
       const changed=JSON.stringify(state.liveRoster)!==JSON.stringify(roster);
       state.liveRoster=roster;if(changed&&!state.pkData?.match)render();
      }).catch(()=>{
       if(!current())return;
       state.liveReady=false;if(!state.pkData?.match)render();
      });
     }},30000);
 }catch(e){state.connected=false;state.online=false;render();}
}
const paths={compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-3 7-4-4z"/>',radio:'<path d="M5 16a10 10 0 0 1 14 0M8.5 12.5a5 5 0 0 1 7 0"/><path d="M12 18v2"/><circle cx="12" cy="8" r="1"/>',message:'<path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.4-.7L4 20l.8-4a8.5 8.5 0 1 1 15.2-4.5Z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',back:'<path d="m15 18-6-6 6-6"/>',headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 14v4a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2ZM20 14v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2Z"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',micoff:'<path d="m3 3 18 18M9 9v2a3 3 0 0 0 5.5 1.6M15 9V5a3 3 0 0 0-5.3-1.9M5 10a7 7 0 0 0 12 5M19 10a7 7 0 0 1-.8 3.2M12 17v5m-4 0h8"/>',gift:'<rect x="3" y="9" width="18" height="13" rx="2"/><path d="M12 9v13M3 13h18M12 9H7a3 3 0 1 1 3-3c0 2 2 3 2 3Zm0 0h5a3 3 0 1 0-3-3c0 2-2 3-2 3Z"/>',share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.6 2.1 2 1.1 2-.6 2 3.5-1.5 1.6v2.3l1.5 1.6-2 3.5-2-.6-2 1.1L14 20h-4l-.6-2.4-2-1.1-2 .6-2-3.5L5 12v-2.3L3.5 8.1l2-3.5 2 .6 2-1.1L10 2Z"/>',shield:'<path d="M12 2 4 5v6c0 5.4 3.6 9 8 11 4.4-2 8-5.6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/>',moon:'<path d="M20 15a8.5 8.5 0 0 1-11-11A9 9 0 1 0 20 15Z"/>',edit:'<path d="m13 5 6 6M3 21l4-.8L20 7.2a2 2 0 0 0-3.2-3.2L3.8 17 3 21Z"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',send:'<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13l11-11"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 9v-2a6 6 0 0 0-2-4.5"/>',spark:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',logout:'<path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M14 7l5 5-5 5m5-5H9"/>',check:'<path d="m5 12 5 5L20 7"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>'};
function ico(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.spark}</svg>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const btn=(name,action,additional='')=>`<button type="button" class="icon-btn" data-action="${action}" aria-label="${name}">${ico(additional||'more')}</button>`;
function avatar(person,size='avatar-sm'){return `<div class="avatar ${size} ${person.color||'violet'}">${esc(person.av||person.name?.slice(0,2)||'??')}${person.online?'<i class="online-dot"></i>':''}</div>`}
function header(){return `<header class="app-header"><div><div class="brand-lockup"><img class="brand-approved brand-approved-header" src="assets/tuttt-logo.png" width="1197" height="870" alt="Logo Túttt" decoding="async" /></div></div><div class="header-actions">${state.tab==='live'?'':`<button type="button" class="icon-btn" data-action="searchFocus" aria-label="Tìm kiếm">${ico('search')}</button>`}</div></header>`}
const tabs=[['discover','Khám phá','compass'],['live','Live','radio'],['create','Tạo','plus'],['chat','Chat','message'],['profile','Cá nhân','user']];
function nav(){return `<nav class="nav" aria-label="Điều hướng chính">${tabs.map(([id,label,icon])=>`<button type="button" data-action="tab" data-id="${id}" class="nav-item ${state.tab===id?'active':''} ${id==='create'?'create':''}" aria-current="${state.tab===id?'page':'false'}" aria-label="${label}">${id==='create'?`<span class="create-icon">${ico(icon)}</span>`:ico(icon)}<span>${label}</span></button>`).join('')}</nav>`}
function roomCard(r){return `<button type="button" class="room-card" data-action="room" data-id="${esc(r.id)}"><div class="room-art ${esc(r.color||'violet')}">${esc(r.art||'✦')}</div><div class="room-info"><div class="room-category">● ${r.type==='cam'?'▣ CAM · ':'◉ VOICE · '}${esc(r.tag.toUpperCase())}</div><h3>${esc(r.title)}</h3><div class="room-desc">${esc(r.subtitle)}</div><div class="room-meta"><span>${esc(r.host)} · <span class="live-dot"></span>${r.members} tham gia</span><span>↗</span></div></div></button>`}
function roomList(filter='Tất cả',query=''){
 const filtered=ux.filterRooms(state.rooms,filter,query).filter(r=>(state.tab!=='live'||state.liveModeFilter==='Tất cả'||(r.type||'voice')===state.liveModeFilter));
 return filtered.length?filtered.map(roomCard).join(''):'<div class="empty-state" role="status"><span class="empty-state-icon" aria-hidden="true">☾</span><strong>Chưa tìm thấy phòng phù hợp</strong><p>Thử một từ khóa khác hoặc chọn chủ đề Tất cả.</p><button class="action-cta" type="button" data-action="clearFilter">Xóa bộ lọc</button></div>';
}
function discover(){const featured=state.rooms.find(r=>r.featured)||state.rooms[0]||{id:'',title:'Tạo phòng đầu tiên',subtitle:'Hãy bắt đầu một cuộc trò chuyện',members:0,host:'Túttt',hostAv:'✦'};return `${header()}<section class="scrollbody"><div class="screen-padding"><div class="eyebrow" style="margin-top:7px">GOOD VIBES BEGIN HERE ✳ · ${state.connected?(state.online?'● ĐÃ KẾT NỐI':'○ ĐANG KẾT NỐI LẠI'):'BẢN XEM TRƯỚC'}</div><h1 class="page-title">Chào ngày mới, <span style="color:var(--purple)">bạn ơi.</span></h1><p class="page-sub">Hôm nay bạn muốn nghe chuyện gì?</p><div class="searchbar">${ico('search')}<input id="searchDiscover" value="${esc(state.search)}" autocomplete="off" aria-label="Tìm phòng theo tên, chủ đề" placeholder="Tìm phòng hoặc chủ đề..." /></div><div class="hero-room" role="button" tabindex="0" aria-label="${featured.id?'Vào phòng '+esc(featured.title):'Tạo phòng Live đầu tiên'}" data-action="${featured.id?'room':'create'}" data-id="${esc(featured.id)}"><div class="overline"><span class="live-tag">● LIVE CHAT</span><span class="count-tag">◉ ${featured.members} đang tham gia</span></div><div><div class="featured-kicker">PHÒNG ĐANG NỔI BẬT</div><h2>${esc(featured.title)}</h2><p>${esc(featured.subtitle)}</p></div><div class="hero-foot"><div class="hostmini"><span class="host-ava">${esc(featured.hostAv||'✦')}</span> Host: ${esc(featured.host)}</div><span class="mini-circle-btn" aria-hidden="true">↗</span></div></div><div class="section-head"><div class="section-title">Bạn đang có tâm trạng gì?</div></div><button type="button" class="vibe-banner" style="width:100%;text-align:left;color:var(--ink)" data-action="vibes"><div><div class="eyebrow">VIBE CHECK ✦</div><div class="vibe-title">Tìm đúng người, đúng mood.</div><p>Chọn cảm xúc và khám phá những cuộc trò chuyện phù hợp.</p></div><div class="orb"></div></button><div class="section-head"><div class="section-title">Phòng dành cho bạn</div><button class="text-btn" type="button" data-action="tab" data-id="live">Xem tất cả ↗</button></div><div class="room-list" id="discover-room-results" aria-live="polite">${state.search?roomList('Tất cả',state.search):ux.recommendedRooms(state.rooms).map(roomCard).join('')||'<div class="empty-state"><strong>Chưa có phòng nào</strong><p>Bắt đầu bằng phòng Live đầu tiên của bạn.</p><button class="action-cta" data-action="create">Tạo phòng</button></div>'}</div><div class="section-head"><div class="section-title">Đang online <span style="color:var(--purple)">✦</span></div><button class="text-btn" type="button" data-action="community">Cộng đồng ↗</button></div><div class="online-row">${state.people.map(p=>`<button type="button" class="online-person" data-action="openChat" data-id="${p.id}">${avatar(p,'avatar-lg')}<span>${esc(p.name)}</span></button>`).join('')}</div></div></section>${nav()}`}
function live(){let fs=['Tất cả','Tâm sự','Âm nhạc','Kết bạn','Học tập'];return `${header()}<section class="scrollbody"><div class="screen-padding"><div class="eyebrow" style="margin-top:6px">LIVE · ${state.connected?'CHAT PHÒNG REALTIME':'BẢN XEM TRƯỚC'}</div><div class="list-head"><h1 class="page-title">Live <span style="color:var(--purple)">●</span></h1></div><p class="page-sub">Bước vào một căn phòng, bắt đầu câu chuyện.</p><div class="searchbar">${ico('search')}<input id="searchRooms" value="${esc(state.search)}" placeholder="Tìm phòng đang diễn ra" aria-label="Tìm phòng" /></div><div class="live-modes" role="group" aria-label="Chọn loại phòng">${[['Tất cả','Tất cả'],['voice','Voice'],['cam','Cam']].map(([id,label])=>`<button type="button" data-action="liveMode" data-id="${id}" aria-pressed="${state.liveModeFilter===id}" class="mode-choice ${state.liveModeFilter===id?'selected':''}">${id==='cam'?ico('radio'):id==='voice'?ico('headphones'):ico('users')}${label}</button>`).join('')}</div><div class="chip-row">${fs.map(f=>`<button type="button" class="chip ${state.roomFilter===f?'active':''}" aria-pressed="${state.roomFilter===f}" data-action="roomFilter" data-id="${f}">${f}</button>`).join('')}</div><div class="list-head" style="margin:10px 0 13px"><div class="section-title">Đang diễn ra</div><div class="tiny-label" id="live-room-count"><span class="live-dot" style="display:inline-block;background:#ff9995;width:6px;height:6px;border-radius:50%;margin-right:5px"></span>${ux.filterRooms(state.rooms,state.roomFilter,state.search).filter(r=>state.liveModeFilter==='Tất cả'||r.type===state.liveModeFilter).length} phòng</div></div><div class="room-list" id="room-list-results" aria-live="polite">${roomList(state.roomFilter,state.search)}</div><div class="notice" style="margin-top:20px">${state.connected?'Phòng được đồng bộ từ máy chủ. Chat trong phòng hoạt động giữa nhiều thiết bị; âm thanh chưa được kết nối.':'Đây là dữ liệu mẫu. Hãy chạy server bằng npm start để thử phòng thật.'}</div></div></section>${nav()}`}
function chat(){return `${header()}<section class="scrollbody"><div class="screen-padding"><div class="eyebrow" style="margin-top:7px">STAY CLOSE</div><div class="list-head"><h1 class="page-title">Chat</h1><button class="icon-btn" data-action="newChat" ${state.connected?'disabled title="Chat riêng chưa hỗ trợ tài khoản khách"':''} aria-label="Tin nhắn mới">${ico('plus')}</button></div><p class="page-sub">Những người bạn muốn trò chuyện mỗi ngày.</p>${state.connected?'<div class="notice" role="status">Chat cá nhân chưa được kết nối với backend. Bạn có thể vào Live để gửi tin nhắn phòng theo thời gian thực.</div>':'<div class="notice">Chat cá nhân là dữ liệu mô phỏng, chưa kết nối.</div>'}<div class="searchbar">${ico('search')}<input id="searchChats" placeholder="Tìm cuộc trò chuyện" aria-label="Tìm cuộc trò chuyện" /></div><div class="section-head"><span class="section-title">Tin nhắn</span><span class="tiny-label">${state.chats.length} cuộc trò chuyện</span></div><div id="chats-list">${!state.chats.length?'<div class="empty-state"><span class="empty-state-icon" aria-hidden="true">✉</span><strong>Chưa có cuộc trò chuyện</strong><p>Chat riêng sẽ khả dụng sau khi hệ thống tài khoản được tích hợp.</p><button type="button" class="action-cta" data-action="tab" data-id="live">Khám phá phòng Live</button></div>':''}${state.chats.map(c=>`<button class="chat-row" type="button" data-action="openChat" data-id="${c.id}">${avatar(c,'avatar-lg')}<div class="chat-row-info"><strong>${esc(c.name)}</strong><p>${esc(c.last)}</p></div><div class="chat-row-right"><span>${esc(c.time)}</span>${c.unread?`<span class="unread">${c.unread}</span>`:''}</div></button>`).join('')}</div></div></section>${nav()}`}
function profile(){return `${header()}<section class="scrollbody"><div class="screen-padding"><div class="profile-cover"></div><div class="profile-main">${avatar({name:state.username,av:'T',color:'violet'},'avatar-lg')}<button type="button" class="secondary-cta" data-action="editProfile">${ico('edit')} <span style="vertical-align:top"> Sửa hồ sơ</span></button></div><h1 class="profile-title">${esc(state.username)} <span style="color:#bb9eff;font-size:14px">✦</span></h1><div class="tiny-label">${state.connected?'Phiên khách · Hồ sơ cá nhân':'@tuttt_user · UI demo'}</div><p class="tagline">${esc(state.bio)}</p>${state.connected?'<p class="tagline">Thống kê người theo dõi và huy hiệu chưa được kết nối với tài khoản khách.</p>':`<div class="stat-grid"><div><strong>${state.connected?0:12}</strong><small>Người theo dõi</small></div><div><strong>${state.connected?0:state.following}</strong><small>Đang theo dõi</small></div><div><strong>${state.connected?0:"08"}</strong><small>Phòng đã tham gia</small></div></div><div class="section-head"><span class="section-title">Dấu ấn của bạn</span><button type="button" class="text-btn" data-action="badges">Xem thêm ↗</button></div><div class="badge-row"><span class="tag-badge">✦ Thành viên mới</span><span class="tag-badge">☾ Cú đêm</span><span class="tag-badge">♥ Dễ mến</span></div>`}<div class="section-head"><div class="section-title">Tài khoản</div></div>${[['users','Cộng đồng của tôi','community'],['settings','Cài đặt','settings'],['shield','Quyền riêng tư & an toàn','safety'],['headphones','Trung tâm trợ giúp','help']].map(([icon,title,action])=>`<button type="button" class="settings-row" data-action="${action}">${ico(icon)}<span>${title}</span><span class="arrow">›</span></button>`).join('')}</div></section>${nav()}`}
function community(){return `${header()}<section class="scrollbody"><div class="screen-padding"><div class="eyebrow" style="margin-top:7px">YOUR PEOPLE</div><div class="list-head"><h1 class="page-title">Cộng đồng</h1><button type="button" class="icon-btn" data-action="createClub" aria-label="Tạo cộng đồng">${ico('plus')}</button></div><p class="page-sub">Những nơi bạn luôn có người đồng điệu.</p><div class="vibe-banner" style="margin:17px 0 22px"><div><div class="eyebrow">TOGETHER, BETTER</div><div class="vibe-title">Tìm hội cùng sở thích.</div><p>Trò chuyện, tham gia sự kiện và có một nơi thuộc về mình.</p></div><div class="orb"></div></div><div class="section-title" style="margin-bottom:13px">Cộng đồng nổi bật</div>${state.connected?'<div class="notice">Cộng đồng chưa kết nối máy chủ ở v0.2. Các thẻ dưới đây chỉ minh họa thiết kế.</div>':''}${state.clubs.map(c=>`<button type="button" class="club-card" data-action="club" data-id="${c.id}"><div class="club-art ${c.color}">${esc(c.art)}</div><div style="flex:1"><h3>${esc(c.name)}</h3><p>${esc(c.subtitle)}</p><span>◌ ${c.members} thành viên · ${c.joined?'✓ Đã tham gia':'Tham gia ↗'}</span></div></button>`).join('')}</div></section>${nav()}`}
function conversation(){const person=state.chats.find(c=>c.id===state.chatId);if(!person){state.page='main';return chat()}const msgs=state.messages[person.id]||[];return `<div class="conversation-head"><button type="button" class="back-btn" data-action="back" aria-label="Quay lại">${ico('back')}</button>${avatar(person,'avatar-sm')}<div style="flex:1"><strong>${esc(person.name)}</strong><small>${person.online?'● Đang hoạt động':'Hoạt động gần đây'}</small></div><button class="icon-btn" type="button" data-action="chatInfo">${ico('more')}</button></div><div class="conversation-body" id="conversation-body"><div style="text-align:center;color:var(--muted);font-size:10px;margin-bottom:8px">Hôm nay</div>${msgs.map(m=>`<div class="bubble ${m.who}">${esc(m.text)}<div class="bubble-time">${esc(m.time)}</div></div>`).join('')}</div><form id="chat-send" class="chat-compose"><input type="text" name="message" required maxlength="500" autocomplete="off" aria-label="Tin nhắn" placeholder="Nhắn điều gì đó..." /><button class="send-btn" type="submit" aria-label="Gửi">${ico('send')}</button></form>`}
function cameraMembers(roster,r){
 // Offline example seats are explicitly marked as samples and never represent real camera tracks.
 const demoSeats=!state.connected?{hostId:'preview-host',members:[{id:'preview-host',name:r.host,role:'host',speaker:true},...(r.speakers||[]).slice(1,5).map((_,i)=>({id:'preview-guest-'+i,name:'Khách mẫu '+(i+1),role:'listener',speaker:true,preview:true}))]}:null;
 return stageLayout.selectSeats(roster||demoSeats,r.host);
}
function liveRoomSheet(kind){
 const roster=state.liveRoster;
 const r=state.rooms.find(x=>x.id===state.roomId);
 if(!r)return '<p class="cam-panel-empty">Không tìm thấy phòng.</p>';
 if(kind==='audience'){
  // Offline preview is illustrative, never a purported live presence list.
  if(!state.connected){
   const examples=[{name:r.host,role:'host'},...seed.people.slice(0,3).map(x=>({name:x.name,role:'viewer'}))];
   const sampleRows=examples.map(m=>`<div class="cam-person-row"><span class="cam-person-avatar" aria-hidden="true">${esc(m.name.charAt(0).toUpperCase())}</span><div class="cam-person-name"><strong>${esc(m.name)}</strong><small>${m.role==='host'?'Chủ phòng':'Người xem'} · minh họa</small></div></div>`).join('');
   return `<div class="audience-panel-summary is-preview"><span class="audience-presence-dot" aria-hidden="true"></span><div><strong>BẢN XEM TRƯỚC</strong><small>${r.members} người là số liệu mẫu · không phải đang trực tuyến</small></div></div><div class="audience-preview-rows">${sampleRows}</div>`;
  }
  const view=audienceView(r);
  if(!view.verified)return `<div class="audience-panel-summary is-pending" role="status"><span class="audience-presence-dot" aria-hidden="true"></span><div><strong>${view.status==='reconnecting'?'Đang kết nối lại':view.status==='unavailable'?'Chưa xác minh được':'Đang đồng bộ'}</strong><small>${esc(view.message)}</small></div></div>`;
  const current=state.audience;
  const inStage=current.members.filter(m=>m.onStage),viewers=current.members.filter(m=>!m.onStage);
  const row=m=>`<div class="cam-person-row audience-person"><span class="cam-person-avatar" aria-hidden="true">${esc((m.name||'?').charAt(0).toUpperCase())}</span><div class="cam-person-name"><strong>${esc(m.name||'Khách')}${m.id===current.selfId?'<span class="audience-self">Bạn</span>':''}</strong><small>${m.role==='host'?'Chủ phòng':m.role==='moderator'?'Phó phòng':m.onStage?'Trên sân khấu':'Người xem'}</small></div></div>`;
  return `<div class="audience-panel-summary is-current" role="status"><span class="audience-presence-dot" aria-hidden="true"></span><div><strong>${current.count} người trong phòng</strong><small>Danh sách vừa được máy chủ xác nhận · gồm cả người chỉ xem</small></div></div><div class="audience-section"><div class="cam-queue-title">Trên sân khấu <span>${inStage.length}</span></div>${inStage.map(row).join('')||'<div class="cam-panel-empty">Chưa có ai trên sân khấu.</div>'}</div><div class="audience-section"><div class="cam-queue-title">Đang xem <span>${viewers.length}</span></div>${viewers.map(row).join('')||'<div class="cam-panel-empty">Chưa có người xem khác.</div>'}</div>`;
 }
 if(r.type!=='cam')return '<p class="cam-panel-empty">Quản lý Voice không nằm trong bảng người xem.</p>';
 const members=roster?.members||[];
 const me=members.find(x=>x.id===roster.selfId);
 const isHost=me?.role==='host',isManager=isHost||me?.role==='moderator';
 const rows=members.map(m=>{
  const role=m.role==='host'?'Chủ phòng':m.role==='moderator'?'Phó phòng':m.speaker?'Có ghế cam':'Người xem';
  const canManage=isManager&&m.id!==roster.selfId&&m.role!=='host'&&(isHost||m.role==='listener');
  return `<div class="cam-person-row"><div class="cam-person-avatar" aria-hidden="true">${esc(m.name[0]||'?')}</div><div class="cam-person-name"><strong>${esc(m.name)}</strong><small>${role}${m.chatMutedUntil>Date.now()?' · Chat bị khóa':''}</small></div>${canManage?`<div class="cam-member-actions">${!m.speaker?`<button type="button" class="cam-invite-button" data-action="inviteGuest" data-id="${esc(m.id)}">Mời lên cam</button>`:''}<button type="button" class="cam-person-menu" data-action="memberMenu" data-id="${esc(m.id)}" aria-label="Quản lý ${esc(m.name)}">${ico('more')}</button></div>`:''}</div>`;
 }).join('')||'<div class="cam-panel-empty">Chưa có thành viên trực tuyến trong danh sách.</div>';
 if(!isManager)return '<p class="cam-panel-empty">Chỉ chủ phòng hoặc phó phòng mới có quyền quản lý.</p>';
 const requests=roster?.requests||[];
 const waiting=requests.map(id=>members.find(m=>m.id===id)).filter(Boolean).map(m=>`<div class="cam-person-row"><div class="cam-person-name"><strong>${esc(m.name)}</strong><small>Đang xin lên cam</small></div><button type="button" class="cam-compact primary" data-action="stageApprove" data-id="${esc(m.id)}">Duyệt</button></div>`).join('')||'<p class="cam-panel-empty">Không có yêu cầu lên cam.</p>';
 const sent=(roster?.outgoingInvitations||[]).map(inv=>`<div class="cam-person-row"><div class="cam-person-name"><strong>${esc(members.find(m=>m.id===inv.toId)?.name||'Thành viên')}</strong><small>Đang chờ xác nhận lời mời</small></div><button class="cam-compact" data-action="cancelInvite" data-id="${esc(inv.id)}">Hủy</button></div>`).join('');
 const settings=isHost&&roster?`<div class="cam-room-settings"><strong>Cài đặt phòng</strong><button class="cam-setting-row" data-action="stageSetting" data-id="locked"><span>${ico('lock')} Khóa phòng</span><b>${roster.settings.locked?'Đang khóa':'Đang mở'}</b></button><button class="cam-setting-row" data-action="stageSetting" data-id="chatEnabled"><span>${ico('message')} Chat chung</span><b>${roster.settings.chatEnabled?'Được phép':'Đã khóa'}</b></button><button class="cam-setting-row" data-action="stageSetting" data-id="slowModeSeconds"><span>${ico('settings')} Chat chậm</span><b>${roster.settings.slowModeSeconds||0} giây</b></button></div>`:'';
 return `<div class="cam-queue-title">Yêu cầu lên cam <span>${requests.length}</span></div>${waiting}${sent?`<div class="cam-queue-title">Lời mời đang chờ</div>${sent}`:''}${settings}<div class="cam-queue-title">Quản lý thành viên</div>${rows}`;
}
function camRoom(r){
 const roster=state.liveRoster,me=roster?.members.find(m=>m.id===roster.selfId);
 const isManager=['host','moderator'].includes(me?.role),isHost=me?.role==='host';
 const members=roster?.members||[],requests=roster?.requests||[];
 // Stage uses server-granted seats; actual camera tracks are not available in web preview.
 const membersOnStage=cameraMembers(roster,r);
 const stage=stageLayout.layout(membersOnStage,state.pinnedCameraId);
 if(state.pinnedCameraId&&!stage.pin)state.pinnedCameraId=null;
 const seats=stage.visible;
 const seat=!!me?.speaker,pending=!!roster&&requests.includes(roster.selfId);
 const occupied=membersOnStage.filter(m=>!m.reserved).length;
 // No browser camera track: represent every seat as a circular avatar, never a fake video rectangle.
 const stageTiles=seats.map(m=>{
  const reserved=!!m.reserved;
  const focused=stage.pin===m.id;
  const role=reserved?'Giữ chỗ':m.role==='host'?'Chủ phòng':m.role==='moderator'?'Phó phòng':'Khách';
  const audio=speakerStatus.visual({connected:!state.connected,mic:!state.connected?false:null,speaking:false});
  return `<button type="button" class="cam-tile occupied avatar-only ${reserved?'reserved':''} ${focused?'pinned':''} ${audio.showGreenRing?'is-speaking':''}" data-action="pinCam" data-id="${esc(m.id)}" aria-pressed="${focused}" aria-label="${focused?'Bỏ ghim':'Phóng to'} ${esc(m.name)}; camera chưa mở" title="${focused?'Bỏ ghim':'Chạm để phóng to'}">
   <span class="cam-avatar-wrap"><span class="cam-stage-avatar" aria-hidden="true">${esc(m.name.slice(0,1).toUpperCase())}</span>${audio.showMuteBadge?`<span class="live-mic-muted" aria-label="Mic tắt (minh họa)">${ico('micoff')}</span>`:''}</span>
   <span class="cam-avatar-meta"><strong>${esc(m.name)}</strong><small>${role}${m.preview?' · Mẫu':''}</small></span>
   ${focused?'<span class="cam-focus-indicator">ĐÃ GHIM</span>':''}
  </button>`;
 }).join('');
 // The viewer count opens the audience sheet; it is never a persistent tab.
 const chatRows=state.connected?state.roomMessages.slice(-45).map(m=>`<div class="cam-chat-entry" data-chat-id="${esc(m.id)}"><strong>${esc(m.name)}</strong><span> ${esc(m.text)}</span></div>`).join(''):
  state.roomLog.slice(-35).map(line=>{const separator=line.indexOf(': ');return separator>0?`<div class="cam-chat-entry"><strong>${esc(line.slice(0,separator))}</strong><span>${esc(line.slice(separator+2))}</span></div>`:`<div class="cam-chat-entry"><span>${esc(line)}</span></div>`;}).join('');
 const incoming=roster?.incomingInvitations?.[0];
 const inviteNotice=incoming?`<div class="cam-invite-notice" role="status" aria-live="polite"><div><strong>${esc(incoming.fromName)} mời bạn lên ${r.type==='cam'?'camera':'mic'}</strong><small>Chỉ khi bạn đồng ý mới có quyền lên sân khấu. Mic và camera vẫn tắt.</small></div><div class="cam-invite-choices"><button type="button" data-action="inviteAnswer" data-id="${esc(incoming.id)}:no">Từ chối</button><button type="button" class="primary" data-action="inviteAnswer" data-id="${esc(incoming.id)}:yes">Chấp nhận</button></div></div>`:'';
 const status=state.connected?(state.liveReady?'Quản lý phòng đã kết nối · camera chỉ phát trong ứng dụng native có LiveKit.':'Phòng đã có trên máy chủ · chưa cấu hình LiveKit để truyền hình.'):'Bản xem trước · Chưa có hình ảnh và âm thanh thật.';
 return `<div class="cam-page live-experience cam-mode-unified">
 <header class="cam-topbar"><button type="button" class="back-btn" data-action="back" aria-label="Quay lại danh sách Live">${ico('back')}</button><div class="cam-title"><div class="cam-title-line"><span class="cam-live-pill">● LIVE CAM</span><span class="cam-privacy">${roster?.settings.locked?ico('lock')+' Riêng tư':'Công khai'}</span></div><strong>${esc(r.title)}</strong></div><button type="button" class="cam-header-more" data-action="liveOptions" aria-label="Tùy chọn Live">${ico('more')}</button></header>
 ${inviteNotice}<div class="cam-content"><div class="cam-stage-caption"><div><strong>Sân khấu trực tiếp</strong><span>${esc(r.host)} · Chủ phòng</span></div><div class="cam-stage-metrics">${audienceMarkup(r,'cam-viewers')}<span class="cam-stage-count">${occupied}/6 ghế</span></div></div>
  ${pkLauncher()}${pkPanel(r)}

  <div class="cam-stage-grid cam-stage-adaptive cam-layout-${stage.variant} cam-count-${stage.count} ${stage.pin?'has-pin':''}" role="group" aria-label="Sân khấu có ${stage.count} vị trí đã cấp quyền, tối đa 6 vị trí">${stageTiles}</div>
  <p class="cam-visual-helper">Avatar tròn khi tắt camera · trạng thái mic trong bản web Cam chỉ là minh họa.</p>
 <div class="cam-status-line" role="status"><span class="cam-status-dot"></span><span>${status}</span></div>
 <section class="cam-interaction cam-chat-float" aria-label="Trò chuyện trực tiếp"><div class="cam-chat-label"><span class="cam-live-chat-dot" aria-hidden="true"></span> Trò chuyện <span class="cam-chat-label-extra">trong trận</span></div><div class="cam-panel-body"><div class="cam-chat-history" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Tin nhắn trong phòng">${chatRows||(!state.connected&&state.pkPreview?'<div class="pk-demo-chat-label">TIN NHẮN MẪU</div><div class="cam-chat-entry"><strong>Minh</strong><span> Hai bên căng đấy 🔥</span></div><div class="cam-chat-entry"><strong>Ly</strong><span> Cố lên cả hai ♥</span></div><div class="cam-chat-entry"><strong>Hà</strong><span> Mới vào, chào mọi người nha!</span></div>':pkChatStarter()||'<p class="cam-panel-empty">Chưa có tin nhắn. Hãy gửi lời chào đầu tiên!</p>')}</div></div></section>
 </div>
 ${`<form id="room-send" class="room-compose cam-compose"><input name="message" maxlength="200" required autocomplete="off" placeholder="Nhắn trong phòng..." aria-label="Nhắn trong phòng"/><button type="submit" aria-label="Gửi tin nhắn">${ico('send')}</button></form>`}
 <div class="cam-actions" aria-label="Điều khiển phòng Live"><button type="button" data-action="${isHost?'hostSeatInfo':seat?'leaveCamSeat':'requestCamSeat'}" class="cam-action ${seat?'active':''}" ${pending?'disabled':''} aria-label="${isHost?'Ghế của chủ phòng':seat?'Rời ghế camera':pending?'Đang chờ lên cam':'Yêu cầu lên cam'}"><span>${ico('users')}</span><small>${isHost?'Ghế chủ':seat?'Rời ghế':pending?'Đang chờ':'Lên cam'}</small></button><button type="button" data-action="camInfo" class="cam-action" aria-label="Bật hoặc tắt camera trên ứng dụng di động"><span>${ico('radio')}</span><small>Camera</small></button><button type="button" data-action="camInfo" class="cam-action"><span>${ico('micoff')}</span><small>Mic</small></button>${(state.pkData?.match||state.pkFinished||state.pkPreview)?`<button type="button" ${state.pkFinished||state.pkDemoFinished?'disabled aria-disabled="true"':''} data-action="${state.connected?'pkCheer':'pkDemoCheer'}" class="cam-action pk-cheer-button pk-rail-cheer" aria-label="Tiếp sức phe của bạn"><span class="pk-cheer-icon">${ico('heart')}</span><small class="pk-cheer-copy">Tiếp sức</small></button>`:''}<button type="button" data-action="leaveRoom" class="cam-action danger"><span>${ico('logout')}</span><small>Rời</small></button></div>
 </div>`;
}
/** One speaker model for the original room render and the in-place roster updates.
 * Only actual microphone evidence may activate the speaking ring. */
function voiceSeats(r){
 const seats=state.voiceReady
  ?state.voiceParticipants.filter(p=>p.role==='speaker').slice(0,4).map(p=>({id:p.id,name:p.name,av:p.name.slice(0,2).toUpperCase(),color:p.id===voice.selfId?'mint':'violet',mic:p.mic,me:p.id===voice.selfId,host:p.id===r.hostId}))
  :[{name:r.host,av:r.hostAv||'✦',color:'violet',host:true},...(state.connected?[]:(r.speakers||[]).slice(0,2).map((x,i)=>({name:['Miu','Thỏ'][i],av:x,color:['peach','blue'][i]}))),...(state.seat?[{name:'Bạn',av:'T',color:'mint',me:true}]:[])];
 while(seats.length<2)seats.push(null);
 return seats;
}
function voiceSeatKey(s,i){return s?.id?'speaker:'+s.id:s?'preview:'+i:'empty:'+i}
function voiceSeatLabel(s,audio){return s?`${s.name}${audio.muted?', mic tắt':audio.active?', đang nói':s.mic===true?', mic bật':', trạng thái mic chưa xác định'}`:'Ghế trống'}
function voiceSeatMarkup(s,i){
 const audio=speakerStatus.visual({connected:state.voiceReady&&!!s,mic:s?.mic??null,speaking:!!s?.id&&state.voiceSpeakingIds.includes(s.id)});
 return `<button type="button" class="seat ${s?'':'empty'} ${audio.active?'is-speaking':''}" data-seat-key="${esc(voiceSeatKey(s,i))}" data-speaker-id="${s?.id?esc(s.id):''}" data-action="${s?'seatInfo':'joinSeat'}" aria-label="${esc(voiceSeatLabel(s,audio))}"><span class="voice-avatar-wrap"><span class="avatar ${s?esc(s.color):''}">${s?esc(s.av):ico('plus')}</span>${audio.showMuteBadge?`<span class="live-mic-muted" aria-label="Microphone đang tắt">${ico('micoff')}</span>`:''}</span><span class="seat-name">${s?esc(s.name):'Ghế trống'}</span><span class="seat-speaking-caption" aria-hidden="true">Đang nói</span></button>`;
}
function room(){const r=state.rooms.find(x=>x.id===state.roomId);if(!r){state.page='main';return live()}if(r.type==='cam')return camRoom(r);const seats=voiceSeats(r);return `<div class="room-top"><div class="room-topbar"><button class="back-btn" data-action="back" aria-label="Quay lại danh sách Live">${ico('back')}</button><span class="live-tag">● LIVE VOICE</span>${audienceMarkup(r,'voice-audience')}<button class="icon-btn" data-action="liveOptions" aria-label="Tùy chọn Live">${ico('more')}</button></div><div class="voice-title-row"><div class="section-title">${esc(r.title)}</div></div><p class="room-subtitle">${esc(r.subtitle)} · Host: ${esc(r.host)}</p>${pkPanel(r)}<div class="notice" style="margin-top:4px">${state.voiceReady?'Voice WebRTC đã kết nối tín hiệu. Phát âm thanh phụ thuộc microphone, HTTPS/localhost và mạng của thiết bị.':state.connected?'Đang kết nối phòng voice… Chat chữ vẫn hoạt động.':'Bạn đang xem demo offline. Voice cần chạy qua máy chủ.'}</div><div class="voice-summary" role="status" aria-live="polite"><span class="voice-status ${state.voiceReady?'on':''}">${state.voiceReady?'● Voice đã vào phòng':'○ Bản xem trước · Voice chưa kết nối'}</span><div class="voice-pk-row">${pkLauncher()}</div><span>${state.voiceReady?state.voiceParticipants.length:0}/6 người trong voice · tối đa 4 mic</span><button type="button" data-action="unlockAudio" class="voice-unlock">${ico('headphones')} Bật tiếng</button></div><div class="seat-grid">${seats.map(voiceSeatMarkup).join('')}</div></div><div style="flex:1;min-height:0;overflow:auto" class="room-chatbox"><div class="room-log room-log-intro">${state.connected?'Tin nhắn phòng được đồng bộ từ máy chủ.':'✦ '+esc(r.host)+(state.pkPreview?' · Chào mọi người!':': Chào bạn, vào trò chuyện cùng chúng mình nhé.')}</div>${state.connected?state.roomMessages.slice(-80).map(m=>`<div class="room-log" data-chat-id="${esc(m.id)}">${esc(m.name+': '+m.text)}</div>`).join(''):state.roomLog.map(x=>`<div class="room-log">${esc(x)}</div>`).join('')}${pkChatStarter()}</div><form id="room-send" class="room-compose"><input type="text" maxlength="200" name="message" required autocomplete="off" placeholder="Gửi lời chào vào phòng..." aria-label="Nhắn trong phòng"/><button type="submit" aria-label="Gửi">${ico('send')}</button></form><div class="room-controls ${(state.pkData?.match||state.pkFinished||state.pkPreview)?'is-pk-active':''}"><button class="circle-action ${state.seat?'active':''}" data-action="joinSeat"><span class="circle-icon">${ico('users')}</span>${state.voiceReady&&voice.self?.id===r.hostId?'Ghế Host':state.seat?'Rời ghế':'Lên ghế'}</button><button class="circle-action ${state.mic?'active':''}" data-action="mic" aria-pressed="${state.mic}" aria-label="${state.mic?'Tắt microphone':'Bật microphone'}"><span class="circle-icon">${ico(state.mic?'mic':'micoff')}</span>${state.mic?'Tắt mic':'Bật mic'}</button><button class="circle-action danger" data-action="leaveRoom" aria-label="Rời phòng Live"><span class="circle-icon">${ico('logout')}</span>Rời phòng</button></div>`}
function clubPage(){const c=state.clubs.find(x=>x.id===state.clubId);if(!c){state.page='main';return community()}return `<div class="conversation-head"><button class="back-btn" data-action="back">${ico('back')}</button><strong>Cộng đồng</strong></div><section class="scrollbody"><div class="screen-padding"><div class="club-art ${c.color}" style="height:176px;width:100%;font-size:96px;margin-top:18px;border-radius:23px">${esc(c.art)}</div><div class="eyebrow" style="margin-top:23px">GẶP NGƯỜI CÙNG GU</div><h1 class="page-title">${esc(c.name)}</h1><p class="page-sub">${esc(c.subtitle)} · ${c.members} thành viên</p><button class="action-cta solid-full" data-action="joinClub" data-id="${c.id}">${c.joined?'✓ Đã tham gia · Rời nhóm':'Tham gia cộng đồng'} ${ico('arrow')}</button><div class="section-head"><span class="section-title">Không gian chung</span></div><div class="notice">Bản thiết kế cộng đồng: bài viết, kênh chat, sự kiện và phân quyền sẽ được kết nối backend ở giai đoạn sau.</div><div class="club-card"><div class="club-art violet">◉</div><div><h3>Phòng trò chuyện</h3><p>Gặp các thành viên đang online</p><span>Chưa mở trong demo</span></div></div></div></section>`}
function settingsPage(){return `<div class="conversation-head"><button class="back-btn" data-action="back">${ico('back')}</button><strong>Cài đặt</strong></div><section class="scrollbody"><div class="screen-padding"><h1 class="page-title" style="margin-top:23px">Tùy chỉnh trải nghiệm</h1><p class="page-sub">Túttt theo cách bạn thấy thoải mái nhất.</p><div class="section-title">Giao diện</div><div class="theme-choices" role="group" aria-label="Chọn giao diện"><button type="button" class="theme-choice" data-action="setTheme" data-id="light" aria-pressed="${state.theme==='light'}">${ico('sun')} Ivory · Sáng</button><button type="button" class="theme-choice" data-action="setTheme" data-id="dark" aria-pressed="${state.theme==='dark'}">${ico('moon')} Espresso · Tối</button></div><p class="theme-choices-description">Áp dụng thống nhất cho Khám phá, Live, Chat, Cá nhân và Cài đặt.</p><div class="section-title" style="margin-top:25px">Quyền riêng tư</div><p class="theme-choices-description">Dữ liệu và quyền riêng tư được quản lý khi có tài khoản thật; bản xem trước chưa lưu thông tin nhạy cảm.</p><p class="notice">Phiên khách ${state.connected?'đã được tạo trên máy chủ demo. Không dùng cho dữ liệu nhạy cảm.':'hiện đang hoạt động offline và không có tài khoản thực.'}</p></div></section>`}
function liveOptionsSheet(){
 const room=state.rooms.find(r=>r.id===state.roomId);
 const me=state.liveRoster?.members.find(m=>m.id===state.liveRoster.selfId);
 const canManage=room?.type==='cam'&&state.liveReady&&['host','moderator'].includes(me?.role);
 const activePk=Boolean(state.pkData?.match||state.pkFinished||state.pkPreview);
 const row=(action,title,detail)=>`<button type="button" class="live-option-row" data-action="${action}"><strong>${title}</strong><small>${detail}</small></button>`;
 return `<div class="sheet-head"><h2 id="modal-title">Tùy chọn Live</h2><button type="button" class="close-btn" data-action="closeModal" aria-label="Đóng">×</button></div>
 <div class="live-option-list">
 ${canManage?row('roomManage','Quản lý phòng','Duyệt yêu cầu và quản lý thành viên'):''}
 ${activePk?row('pkOpen','PK & kết quả','Tình trạng trận, điểm và quyền kết thúc PK'):''}
 ${row('roomReport','Báo cáo phòng','Gửi mô tả vi phạm tới máy chủ')}
 </div>`;
}
function modal(){let content='';if(state.modal==='liveOptions'){content=liveOptionsSheet()}else if(state.modal==='roomAudience'||state.modal==='roomManage'){const manage=state.modal==='roomManage';content=`<div class="sheet-head"><h2 id="modal-title">${manage?'Quản lý phòng':'Người trong phòng'}</h2><button type="button" class="close-btn" data-action="closeModal" aria-label="Đóng">×</button></div><div class="cam-sheet-body" ${manage?'':'data-audience-sheet-body'}>${liveRoomSheet(manage?'manage':'audience')}</div>`}else if(state.modal==='pk'){content=pkSheet()}else if(state.modal==='pkEndConfirm'){content=`<div class="sheet-head"><h2 id="modal-title">Kết thúc PK?</h2><button class="close-btn" data-action="closeModal">×</button></div><p class="tagline">Phòng của bạn sẽ thua theo luật bỏ cuộc. Bạn có muốn kết thúc không?</p><div class="pk-sheet-actions"><button data-action="closeModal">Ở lại</button><button class="primary" data-action="pkEnd">Xác nhận bỏ cuộc</button></div>`}else if(state.modal==='create'){content=`<div class="sheet-head"><h2 id="modal-title">Tạo phòng Live ✦</h2><button class="close-btn" data-action="closeModal" aria-label="Đóng">×</button></div><p class="tagline">Một góc nhỏ của bạn. Tự do đặt chủ đề và mời mọi người trò chuyện.</p><form id="create-room"><fieldset class="create-type-picker"><legend>Chọn kiểu Live</legend><label class="type-option"><input type="radio" name="type" value="voice" checked /><span class="type-icon">◉</span><strong>Live Voice</strong><small>Trò chuyện · 8 ghế mic</small></label><label class="type-option"><input type="radio" name="type" value="cam" /><span class="type-icon">▣</span><strong>Live Cam</strong><small>6 camera kể cả host</small></label></fieldset><label class="form-label" for="room-name">Tên phòng</label><input required maxlength="55" id="room-name" class="form-input" name="name" placeholder="Ví dụ: Những câu chuyện chưa kể"/><label class="form-label" for="room-topic">Chủ đề</label><select class="form-select" id="room-topic" name="tag"><option>Tâm sự</option><option>Âm nhạc</option><option>Kết bạn</option><option>Học tập</option></select><label class="form-label" for="room-desc">Mô tả ngắn (không bắt buộc)</label><textarea class="form-area" id="room-desc" name="desc" maxlength="120" placeholder="Mọi người sẽ nói về điều gì?"></textarea><p class="form-note">Khi chạy server, phòng và tin nhắn được lưu thật. Live Cam hỗ trợ tối đa 6 vị trí kể cả chủ phòng, truyền hình thực tế cần build mobile và LiveKit.</p><button type="submit" class="action-cta solid-full">Tạo phòng ${ico('arrow')}</button></form>`}else if(state.modal==='memberActions'){
 const r=state.liveRoster,m=r?.members.find(x=>x.id===state.memberTarget),me=r?.members.find(x=>x.id===r.selfId);
 const host=me?.role==='host';
 const actions=m?[['kick','Mời ra khỏi phòng','Người này có thể quay lại.'],['ban','Cấm tham gia 1 giờ','Người này không được vào lại trong 60 phút.'],[m.chatMutedUntil>Date.now()?'unmute-chat':'mute-chat',m.chatMutedUntil>Date.now()?'Mở chat':'Khóa chat 10 phút','Thay đổi quyền gửi tin nhắn.'],...(host?[[m.role==='moderator'?'demote':'promote',m.role==='moderator'?'Thu hồi phó phòng':'Phong phó phòng','Thay đổi quyền quản trị.']]:[])]:[];
 content=`<div class="sheet-head"><h2 id="modal-title">${m?esc(m.name):'Thành viên không khả dụng'}</h2><button class="close-btn" data-action="closeModal" aria-label="Đóng">×</button></div><p class="tagline">Chọn hành động quản lý. Mọi thay đổi được kiểm tra quyền từ máy chủ.</p><div class="member-action-list">${actions.map(([action,label,description])=>`<button type="button" class="member-action-option" data-action="stageMod" data-id="${action}:${esc(m.id)}"><strong>${label}</strong><small>${description}</small></button>`).join('')}</div>`;
 }else if(state.modal==='confirmStageAction'){
 const p=state.pendingMod,m=state.liveRoster?.members.find(x=>x.id===p?.uid);
 const labels={kick:'Mời ra khỏi phòng',ban:'Cấm tham gia 1 giờ',promote:'Phong phó phòng',demote:'Thu hồi phó phòng','mute-chat':'Khóa chat 10 phút','unmute-chat':'Mở chat'};
 content=`<div class="sheet-head"><h2 id="modal-title">Xác nhận quản trị</h2><button class="close-btn" data-action="closeModal" aria-label="Đóng">×</button></div><p class="tagline">${esc(labels[p?.action]||'Thay đổi quyền')} cho <strong>${esc(m?.name||'thành viên')}</strong>?</p><div class="notice">Hệ thống lưu thao tác vào trạng thái phòng. Quyền sẽ được máy chủ kiểm tra trước khi áp dụng.</div><div class="cam-confirm-actions"><button type="button" class="cam-compact" data-action="closeModal">Hủy</button><button type="button" class="cam-compact primary" data-action="confirmStageMod">Xác nhận</button></div>`;
 }else if(state.modal==='confirmLeave'){
 content=`<div class="sheet-head"><h2 id="modal-title">Rời phòng Live?</h2><button class="close-btn" data-action="closeModal" aria-label="Đóng">×</button></div><p class="tagline">Bạn sẽ rời khỏi phòng và tắt kết nối mic/camera. Bạn có thể vào lại nếu phòng còn mở.</p><div class="cam-confirm-actions"><button class="cam-compact" data-action="closeModal">Ở lại</button><button class="cam-compact primary" data-action="confirmLeaveRoom">Rời phòng</button></div>`;
 }else if(state.modal==='vibes'){content=`<div class="sheet-head"><h2 id="modal-title">Hôm nay bạn thấy sao?</h2><button class="close-btn" data-action="closeModal">×</button></div><p class="tagline">Chọn tâm trạng để khám phá phòng phù hợp.</p><div class="floating-pills" style="margin:23px 0">${[['Tâm sự','☾ Muốn tâm sự'],['Âm nhạc','♫ Nghe nhạc'],['Kết bạn','♥ Kết bạn mới'],['Học tập','✎ Học cùng nhau']].map(([id,title])=>`<button type="button" class="little-pill" data-action="selectVibe" data-id="${id}">${title}</button>`).join('')}</div><div class="notice">Tính năng gợi ý nâng cao bằng mô hình phù hợp sở thích sẽ được phát triển sau.</div>`}else if(state.modal==='editProfile'){content=`<div class="sheet-head"><h2 id="modal-title">Sửa hồ sơ</h2><button class="close-btn" data-action="closeModal">×</button></div><form id="edit-profile"><label class="form-label">Tên hiển thị</label><input class="form-input" required maxlength="30" name="name" value="${esc(state.username)}"/><label class="form-label">Giới thiệu</label><textarea class="form-area" maxlength="140" name="bio">${esc(state.bio)}</textarea><button class="action-cta solid-full" style="margin-top:19px" type="submit">Lưu thay đổi ${ico('check')}</button></form>`}else if(state.modal==='roomReport'){content=`<div class="sheet-head"><h2 id="modal-title">Tùy chọn phòng</h2><button class="close-btn" data-action="closeModal">×</button></div><p class="tagline">Gửi báo cáo khi gặp nội dung vi phạm.</p><form id="room-report"><label class="form-label" for="report-reason">Mô tả vi phạm</label><textarea id="report-reason" name="reason" class="form-area" required minlength="8" maxlength="250" placeholder="Nội dung quấy rối, spam, xúc phạm..."></textarea><div class="notice" style="margin:15px 0">${state.connected?'Báo cáo sẽ được lưu trên máy chủ demo. Chưa có đội kiểm duyệt xử lý tự động.':'Đây là UI demo. Cần chạy máy chủ để gửi báo cáo thật.'}</div><button type="submit" class="action-cta solid-full">Gửi báo cáo</button></form>`}else if(state.modal==='newChat'){content=`<div class="sheet-head"><h2 id="modal-title">Nhắn tin mới</h2><button class="close-btn" data-action="closeModal">×</button></div><p class="tagline">Chọn một người để bắt đầu cuộc trò chuyện.</p>${state.people.map(p=>`<button class="chat-row" data-action="openChat" data-id="${p.id}">${avatar(p)}<div class="chat-row-info"><strong>${esc(p.name)}</strong><p>${esc(p.desc)}</p></div>${ico('arrow')}</button>`).join('')}` }else{const txt={chatInfo:'Tùy chọn trò chuyện',badges:'Huy hiệu',safety:'Quyền riêng tư & an toàn',help:'Trung tâm trợ giúp',createClub:'Tạo cộng đồng',seatInfo:'Thông tin ghế nói'}[state.modal]||'Thông tin';content=`<div class="sheet-head"><h2 id="modal-title">${txt}</h2><button class="close-btn" data-action="closeModal">×</button></div><p class="tagline">Chức năng sẽ được kết nối với tài khoản và hệ thống backend trong các giai đoạn tiếp theo.</p><div class="notice">Bản này tập trung hoàn thiện luồng màn hình và trải nghiệm người dùng.</div>`}
return `<div class="screen-overlay" data-action="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="sheet-handle"></div>${content}</div></div>`}
function toast(msg){
 state.toast=msg;
 // Inform the user without rebuilding active chat, microphone controls or the PK stage.
 const roomVisible=state.page==='room'&&!!$.querySelector('.room-top,.cam-page');
 if(roomVisible){
  let node=$.querySelector('.toast');
  if(!node){node=document.createElement('div');node.className='toast';node.setAttribute('role','status');$.appendChild(node)}
  node.textContent=msg;
 }else render();
 window.clearTimeout(toast.timer);
 toast.timer=window.setTimeout(()=>{state.toast='';$.querySelector('.toast')?.remove()},2800);
}
// Reconcile real speaker arrivals/leaves/mic updates without replacing chat, PK or input.
// Existing seat nodes (and keyboard focus) survive when their member ID stays the same.
function syncVoiceSeatsDom(){
 if(state.page!=='room'||!state.voiceReady)return false;
 const r=state.rooms.find(x=>x.id===state.roomId);
 const grid=$.querySelector('.room-top .seat-grid');
 if(r?.type==='cam'||!grid)return false;
 const seats=voiceSeats(r);
 const old=new Map([...grid.children].filter(n=>n.dataset?.seatKey).map(n=>[n.dataset.seatKey,n]));
 seats.forEach((s,i)=>{
  const key=voiceSeatKey(s,i);
  let seat=old.get(key);
  if(seat)old.delete(key);
  else{const tpl=document.createElement('template');tpl.innerHTML=voiceSeatMarkup(s,i);seat=tpl.content.firstElementChild;}
  const audio=speakerStatus.visual({connected:!!s&&state.voiceReady,mic:s?.mic??null,speaking:!!s?.id&&state.voiceSpeakingIds.includes(s.id)});
  const expectedName=s?.name||'Ghế trống';
  const name=seat.querySelector('.seat-name');if(name&&name.textContent!==expectedName)name.textContent=expectedName;
  const avatar=seat.querySelector('.avatar');
  const avatarText=s?.av||'';
  if(avatar&&s&&avatar.textContent!==avatarText)avatar.textContent=avatarText;
  if(avatar&&s){avatar.classList.remove('mint','violet','peach','blue');avatar.classList.add(s.color)}
  seat.dataset.speakerId=s?.id||'';
  seat.dataset.action=s?'seatInfo':'joinSeat';
  seat.classList.toggle('empty',!s);
  seat.classList.toggle('is-speaking',audio.active);
  seat.setAttribute('aria-label',voiceSeatLabel(s,audio));
  const wrap=seat.querySelector('.voice-avatar-wrap');
  const badge=wrap?.querySelector('.live-mic-muted');
  if(audio.showMuteBadge&&!badge&&wrap){const el=document.createElement('span');el.className='live-mic-muted';el.setAttribute('aria-label','Microphone đang tắt');el.innerHTML=ico('micoff');wrap.appendChild(el)}
  else if(!audio.showMuteBadge&&badge)badge.remove();
  const position=grid.children[i];if(position!==seat)grid.insertBefore(seat,position||null);
 });
 for(const stale of old.values())stale.remove();
 const people=state.voiceParticipants.length;
 syncAudienceDom();
 const count=$.querySelector('.voice-summary>span:nth-child(3)');if(count)count.textContent=`${people}/6 người trong voice · tối đa 4 mic`;
 const connection=$.querySelector('.voice-status');if(connection){connection.classList.toggle('on',state.voiceReady);connection.textContent=state.voiceReady?'● Voice đã vào phòng':'○ Voice chưa kết nối'}
 const changeControl=(action,label,active)=>{
  const btn=$.querySelector(`.room-controls [data-action="${action}"]`);if(!btn)return;
  btn.classList.toggle('active',active);
  const tail=btn.lastChild;if(tail?.nodeType===3&&tail.textContent!==label)tail.textContent=label;
 };
 changeControl('joinSeat',voice.self?.id===r.hostId?'Ghế Host':state.seat?'Rời ghế':'Lên ghế',state.seat);
 changeControl('mic',state.mic?'Tắt mic':'Bật mic',state.mic);
 const seatBtn=$.querySelector('.room-controls [data-action="joinSeat"]');
 if(seatBtn){seatBtn.disabled=state.voiceSeatPending;seatBtn.setAttribute('aria-busy',String(state.voiceSeatPending));seatBtn.setAttribute('aria-label',state.voiceSeatPending?'Đang cập nhật ghế nói':state.seat?'Rời ghế nói':'Lên ghế nói');}
 const micBtn=$.querySelector('.room-controls [data-action="mic"]');
 if(micBtn){
  micBtn.disabled=state.voiceSeatPending||state.voiceMicPending;micBtn.setAttribute('aria-busy',String(state.voiceMicPending||state.voiceSeatPending));
  micBtn.setAttribute('aria-label',state.mic?'Tắt microphone':'Bật microphone');micBtn.setAttribute('aria-pressed',String(state.mic));
  const glyph=micBtn.querySelector('.circle-icon');
  if(glyph&&glyph.dataset.micState!==String(state.mic)){glyph.innerHTML=ico(state.mic?'mic':'micoff');glyph.dataset.micState=String(state.mic)}
 }
 return true;
}
// Speech events update existing rings, badges, and labels, never the message editor.
function updateVoiceActivityDom(){
 if(state.page!=='room')return;
 const current=state.rooms.find(x=>x.id===state.roomId);
 if(current?.type==='cam')return;
 const speaking=new Set(state.voiceSpeakingIds);
 const hostId=state.rooms.find(x=>x.id===state.roomId)?.hostId;
 const host=state.voiceParticipants.find(x=>x.id===hostId);
 const active=Boolean(state.voiceReady&&host?.mic&&speaking.has(hostId));
 const scene=$.querySelector('.pk-battle-scene');
 if(scene){
  const own=scene.querySelector('.pk-duel-side.my-side');
  own?.querySelector('.pk-person-ring')?.classList.toggle('pk-host-speaking',active);
  const micMark=own?.querySelector('.pk-voice-mic-mark');
  if(micMark){
   micMark.classList.toggle('is-speaking',active);
   const icon=host?.mic?'mic':'micoff';
   if(micMark.dataset.micIcon!==icon){micMark.innerHTML=ico(icon);micMark.dataset.micIcon=icon;}
   micMark.setAttribute('aria-label',active?'Đang nói':host?.mic?'Mic đang bật':'Mic đang tắt');
  }
  const label=own?.querySelector('[data-pk-local-media="true"]');
  if(label)label.textContent=host?(active?'● Đang nói':host.mic?'Mic đã bật':'Mic tắt'):'Chưa ghép âm thanh PK';
 }
 $.querySelectorAll('.room-top .seat[data-speaker-id]').forEach(seat=>{
  const id=seat.dataset.speakerId;
  if(!id)return;
  const member=state.voiceParticipants.find(x=>x.id===id);
  const active=!!member?.mic && speaking.has(id);
  seat.classList.toggle('is-speaking',active);
  // Update the existing seat badge without recreating the room or losing the chat draft.
  // An unknown microphone state is not the same as an enabled microphone.
  const showMuted=Boolean(state.voiceReady&&member?.mic===false);
  const wrap=seat.querySelector('.voice-avatar-wrap');
  const badge=wrap?.querySelector('.live-mic-muted');
  if(showMuted&&!badge&&wrap){
   const marker=document.createElement('span');marker.className='live-mic-muted';
   marker.setAttribute('aria-label','Microphone đang tắt');marker.innerHTML=ico('micoff');
   wrap.appendChild(marker);
  }else if(!showMuted&&badge)badge.remove();
  const activity=active?', đang nói':member?.mic===false?', mic tắt':member?.mic===true?', mic bật':', trạng thái mic chưa xác định';
  seat.setAttribute('aria-label',(member?.name||'Thành viên')+activity);
 });
}
const voice=new window.TutttVoice(net.api, (data)=>{
  state.voiceParticipants=data.participants||[];
  state.seat=!!data.seat;state.mic=!!data.mic;state.voiceSpeakingIds=data.activeSpeakerIds||[];state.voicePeerReconnecting=data.peerReconnecting||voice.peerRecoverySnapshot();
  state.voiceReady=!!voice.roomId && !!voice.selfId;state.voiceMicPending=voice.micPending;state.voiceSeatPending=voice.seatPending;state.voiceCaptureIssue=voice.captureIssue;state.voiceDeviceHint=voice.deviceHint;
  if(state.page==='room'){
   // Roster and activity updates follow the same incremental path. During PK the
   // hidden seat grid also stays current for the moment the duel finishes.
   if(syncVoiceSeatsDom()){updateVoiceActivityDom();updateRoomSignalDom();return;}
   if(data.activityOnly&&state.voiceReady){updateVoiceActivityDom();updateRoomSignalDom();return;}
   render();
  }
}, (message)=>toast(message));
// Renders should preserve where someone is reading or typing when an SSE event arrives.
let lastViewKey='',lastModal=null,modalFocusReturn=null;
function viewKey(){return [state.page,state.tab,state.roomId||'',state.chatId||'',state.clubId||''].join(':')}
function getNode(key){
 if(!key)return null;
 if(key.id)return document.getElementById(key.id);
 if(key.name)return [...$.querySelectorAll('[name]')].find(el=>el.name===key.name&&el.tagName===key.tagName)||null;
 if(!key.action)return null;
 return [...$.querySelectorAll('[data-action]')].find(el=>el.dataset.action===key.action&&el.dataset.id===key.itemId)||null;
}
function render(){
 const sameView=lastViewKey===viewKey();
 const before=document.activeElement;
 const within=before&&$.contains(before);
 const inDialog=!!before?.closest?.('[role="dialog"]');
 const focusKey=within?{id:before.id||'',action:before.dataset?.action,itemId:before.dataset?.id,name:before.name,tagName:before.tagName}:null;
 const selection=within&&['INPUT','TEXTAREA'].includes(before.tagName)&&typeof before.selectionStart==='number'?[before.selectionStart,before.selectionEnd]:null;
 const values={};
 if(sameView)$.querySelectorAll('input,textarea,select').forEach(el=>{if(el.id||el.name)values[(el.closest('[role="dialog"]')?'dialog:':'room:')+(el.id||'name:'+el.name)]=el.value});
 const scrolls={};
 if(sameView)$.querySelectorAll('.scrollbody,.conversation-body,.room-chatbox,.cam-content,.cam-chat-history,.sheet').forEach((el,index)=>{scrolls[el.className+':'+index]={top:el.scrollTop,nearBottom:el.scrollHeight-el.clientHeight-el.scrollTop<65}});
 if(state.modal&&!lastModal&&!inDialog)modalFocusReturn=focusKey;
 applyTheme();
 let content='';
 if(state.page==='conversation')content=conversation();else if(state.page==='room')content=room();else if(state.page==='club')content=clubPage();else if(state.page==='community')content=community();else if(state.page==='settings')content=settingsPage();else content=({discover,live,chat,profile})[state.tab]?.()||discover();
 $.innerHTML=content+(state.modal?modal():'')+(state.toast?`<div class="toast" role="status">${esc(state.toast)}</div>`:'');
 if(pkLocalCameraStream){if($.querySelector('[data-pk-local-video]'))attachPkLocalCamera();else stopPkLocalCamera();}
 // Always retain the room chat draft when opening/closing a sheet. Only retain
 // dialog fields when the *same* dialog stays open, to avoid cross-sheet values.
 if(sameView)$.querySelectorAll('input,textarea,select').forEach(el=>{const dialogField=!!el.closest('[role="dialog"]');if(dialogField&&state.modal!==lastModal)return;const key=(dialogField?'dialog:':'room:')+(el.id||'name:'+el.name);if(Object.prototype.hasOwnProperty.call(values,key)&&el.type!=='checkbox'&&el.type!=='radio')el.value=values[key]});
 if(sameView){let index=0;$.querySelectorAll('.scrollbody,.conversation-body,.room-chatbox,.cam-content,.cam-chat-history,.sheet').forEach(el=>{const key=el.className+':'+index++;if(Object.prototype.hasOwnProperty.call(scrolls,key))el.scrollTop=scrolls[key].nearBottom?el.scrollHeight:scrolls[key].top})}
 const dialog=$.querySelector('[role="dialog"]');
 if(dialog){dialog.setAttribute('tabindex','-1');if(state.modal===lastModal&&inDialog){(getNode(focusKey)||dialog).focus({preventScroll:true})}else {dialog.focus({preventScroll:true})}}
 else if(lastModal&&modalFocusReturn){getNode(modalFocusReturn)?.focus({preventScroll:true});modalFocusReturn=null}
 else if(sameView&&within){const focusNode=getNode(focusKey);if(focusNode){focusNode.focus({preventScroll:true});if(selection&&typeof focusNode.setSelectionRange==='function')try{focusNode.setSelectionRange(...selection)}catch{}}}
 if(state.page==='conversation'&&!sameView){const el=document.getElementById('conversation-body');if(el)el.scrollTop=el.scrollHeight}
 lastModal=state.modal;lastViewKey=viewKey();
 syncRoomControlPendingDom();
}

function showTab(id){if(id!=='create'&&state.page==='room')roomNavigationSeq++;stopPkLocalCamera();if(id==='create'){state.modal='create';render();return}state.tab=id;state.page='main';state.modal=null;render()}
async function openRoom(id){
 if(!id)return;
 const navigation=++roomNavigationSeq;
 // Do not start the next room while a stale voice transport is still closing.
 stopPkLocalCamera();
 if(voice.roomId)await voice.exit();
 if(navigation!==roomNavigationSeq)return;
 state.liveRoster=null;state.liveReady=false;state.audience=null;state.audienceError=false;state.audienceUpdatedAt=0;audienceRequestSeq++;
 state.roomId=id;dismissPkFinish();state.pkData=null;state.pkSyncAt=0;state.pkLastAttempt=0;state.pkSyncError=false;pkRequestSeq++;
 state.pkPreview=false;state.pkDemoFinished=false;state.pinnedCameraId=null;state.page='room';state.memberTarget=null;state.pendingMod=null;state.modal=null;
 state.mic=false;state.seat=false;state.voiceReady=false;state.voiceParticipants=[];state.voiceSpeakingIds=[];state.voicePeerReconnecting=[];
 state.voiceMicPending=false;state.voiceSeatPending=false;state.voiceCaptureIssue='';state.voiceDeviceHint='';state.roomLog=[];state.roomMessages=[];roomMessageSync=null;
 render();
 if(!state.connected)return;
 const current=()=>navigation===roomNavigationSeq&&state.page==='room'&&state.roomId===id;
 try{
  await net.join(id);
  if(!current()){
   // If the same room was re-entered, never leave its new membership.
   if(state.page!=='room'||state.roomId!==id)void net.leave(id).catch(()=>{});
   return;
  }
  void syncAudience();
  const r=state.rooms.find(x=>x.id===id);
  if(r?.type==='cam'){
   try{
    const data=await net.liveToken(id);
    if(!current())return;
    state.liveRoster=data.roster;state.liveReady=true;
   }catch(error){if(current())state.liveReady=false;}
  }else{
   try{await voice.enter(id);}
   catch(error){if(current()){state.voiceReady=false;toast(error.message);}}
   if(!current()){
    // Only disconnect a stale voice client if it has not been reused by
    // the next navigation (including re-entry into this same room).
    if(voice.roomId===id&&state.roomId!==id)void voice.exit().catch(()=>{});
    return;
   }
  }
  if(!current())return;
  await syncRoomMessages();if(!current())return;
  await syncRooms();if(!current())return;
  await syncPK();
 }catch(error){if(current())toast(error.message)}
}
/** Room-scoped control requests are single-flight and generation-bound.
 * Late success/error from a former room must not replace the current Live stage,
 * close a new dialog, or show misleading success feedback. */
function roomControlBusy(key){
 const job=pendingRoomControls.get(key);
 return !!job&&job.room===state.roomId&&job.navigation===roomNavigationSeq;
}
function syncRoomControlPendingDom(){
 if(state.page!=='room')return;
 const busySeat=roomControlBusy('cam-seat');
 $.querySelectorAll('[data-action="requestCamSeat"],[data-action="leaveCamSeat"]').forEach(button=>{
  button.disabled=busySeat;button.setAttribute('aria-busy',String(busySeat));
 });
 $.querySelectorAll('[data-action="stageApprove"]').forEach(button=>{
  const busy=roomControlBusy('cam-approve:'+button.dataset.id);
  button.disabled=busy;button.setAttribute('aria-busy',String(busy));
 });
}
function runRoomControl(key,request,onSuccess){
 if(!state.connected||state.page!=='room'||!state.roomId)return;
 if(roomControlBusy(key))return; // Ignore a duplicate tap, not queue a contrary command.
 const job={room:state.roomId,navigation:roomNavigationSeq};
 const current=()=>state.page==='room'&&state.roomId===job.room&&roomNavigationSeq===job.navigation;
 pendingRoomControls.set(key,job);syncRoomControlPendingDom();
 return Promise.resolve().then(()=>request(job.room)).then(data=>{
  if(current())onSuccess?.(data);
 }).catch(error=>{if(current())toast(error?.message||'Thao tác không thành công')}).finally(()=>{
  if(pendingRoomControls.get(key)===job){pendingRoomControls.delete(key);syncRoomControlPendingDom();}
 });
}
function openChat(id){let c=state.chats.find(c=>c.id===id);if(!c){const person=state.people.find(p=>p.id===id);if(!person)return;c={id,name:person.name,av:person.av,color:person.color,last:'Bắt đầu cuộc trò chuyện',time:'Bây giờ',unread:0,online:person.online};state.chats.unshift(c);state.messages[id]=[]}c.unread=0;state.chatId=id;state.tab='chat';state.page='conversation';state.modal=null;render()}
$.addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;const id=b.dataset.id;if(action==='overlay'&&event.target===b){state.modal=null;render();return}if(action==='tab')return showTab(id);if(action==='room')return openRoom(id);if(action==='openChat')return openChat(id);if(action==='back'){if(state.page==='room'){state.modal='confirmLeave';return render()}else if(state.page==='conversation'){state.page='main';state.tab='chat'}else if(state.page==='club'){state.page='community'}else{state.page='main';state.tab='profile'}return render()}if(action==='community'){state.page='community';state.modal=null;return render()}if(action==='club'){state.page='club';state.clubId=id;return render()}if(action==='joinClub'){const c=state.clubs.find(c=>c.id===id);c.joined=!c.joined;return toast(c.joined?'Đã tham gia (minh họa)':'Đã rời cộng đồng (minh họa)')}if(action==='leaveRoom'){state.modal='confirmLeave';return render()}if(action==='liveMode'){state.liveModeFilter=id;return render()}if(action==='roomFilter'){state.roomFilter=id;return render()}if(action==='clearFilter'){state.roomFilter='Tất cả';state.search='';return render()}if(action==='selectVibe'){state.roomFilter=id;state.tab='live';state.page='main';state.modal=null;return render()}if(action==='requestCamSeat'){if(!state.liveReady)return toast('Chưa cấu hình LiveKit; hãy sử dụng app mobile.');
 void runRoomControl('cam-seat',room=>net.liveRequest(room),roster=>{state.liveRoster=roster;toast('Đã gửi yêu cầu lên cam')});return}
 if(action==='hostSeatInfo')return toast('Chủ phòng luôn giữ một vị trí camera. Bạn có thể tắt mic/camera trên ứng dụng mobile.');
 if(action==='leaveCamSeat'){if(!state.liveReady)return toast('Chưa kết nối phòng');
 void runRoomControl('cam-seat',room=>net.liveSeatLeave(room),roster=>{state.liveRoster=roster;toast('Đã rời vị trí camera')});return}
 if(action==='camInfo')return toast('Camera được phát qua ứng dụng mobile. Trên web đây là bản xem trước bố cục.');
 if(action==='stageApprove'){if(!state.liveReady)return toast('Chưa kết nối phòng');void runRoomControl('cam-approve:'+id,room=>net.liveApprove(room,id,true),roster=>{state.liveRoster=roster;render()});return}
 if(action==='roomAudience'){state.modal='roomAudience';render();void syncAudience();return}
 if(action==='roomManage'){const me=state.liveRoster?.members.find(m=>m.id===state.liveRoster.selfId);const room=state.rooms.find(r=>r.id===state.roomId);if(!state.liveReady||room?.type!=='cam'||!['host','moderator'].includes(me?.role))return toast('Bạn không có quyền quản lý phòng');state.modal='roomManage';return render()}
 if(action==='pinCam'){const r=state.rooms.find(x=>x.id===state.roomId);if(!r||r.type!=='cam')return;const seats=cameraMembers(state.liveRoster,r);if(seats.length<2||!seats.some(x=>x.id===id))return toast('Chỉ có một vị trí trên sân khấu');state.pinnedCameraId=state.pinnedCameraId===id?null:id;return render()}

 if(action==='pkLocalCameraToggle'){
  if(pkLocalCameraStream){stopPkLocalCamera();render();return;}
  if(pkLocalCameraPending)return; // A double tap must never open a second device stream.
  if(state.connected||!state.pkPreview||state.page!=='room')return toast('Xem trước camera chỉ dành cho bản minh họa.');
  if(!navigator.mediaDevices?.getUserMedia)return toast('Trình duyệt này không hỗ trợ camera, hoặc trang chưa chạy trên HTTPS/localhost.');
  const room=state.roomId,navigation=roomNavigationSeq,token=++pkLocalCameraRequestToken;
  const current=()=>pkLocalCameraRequestToken===token&&roomNavigationSeq===navigation&&state.roomId===room&&state.page==='room'&&state.pkPreview&&!state.pkDemoFinished&&!state.connected;
  pkLocalCameraPending=true;
  navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(stream=>{
   if(!current()){stream.getTracks().forEach(track=>track.stop());return;}
   pkLocalCameraStream=stream;
   stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(pkLocalCameraStream===stream){stopPkLocalCamera();render();}},{once:true});
   attachPkLocalCamera();
  }).catch(()=>{if(current())toast('Không bật được camera. Hãy kiểm tra quyền truy cập, HTTPS và thiết bị.');})
    .finally(()=>{if(pkLocalCameraRequestToken===token)pkLocalCameraPending=false;});
  return;
 }
 if(action==='pkPrompt'){const field=$.querySelector('#room-send input[name="message"]');if(field){if(!field.value.trim())field.value='Cố lên nào! ♥';field.focus({preventScroll:true})}return}
 if(action==='pkOpen'){state.modal='pk';return render()}
 if(action==='pkPreviewToggle'){stopPkLocalCamera();dismissPkFinish();state.pkPreview=!state.pkPreview;if(state.pkPreview){state.pkDemoScoreA=1240;state.pkDemoScoreB=980;state.pkDemoStart=Date.now();state.pkDemoFinished=false;state.pkCheerBurstUntil=0}state.modal=null;return render()}
 if(action==='pkDemoFinish'&&!state.connected&&state.pkPreview&&!state.pkDemoFinished){
  stopPkLocalCamera();const winner=state.pkDemoScoreA===state.pkDemoScoreB?null:state.pkDemoScoreA>state.pkDemoScoreB?'A':'B';
  state.pkDemoStreak=winner==='A'?state.pkDemoStreak+1:0;
  state.modal=null;showPkFinish(null,true);return render();
 }
 if(action==='pkDemoCheer'){if(!state.connected&&state.pkPreview&&!state.pkDemoFinished){state.pkDemoScoreA+=40;state.pkCheerBurstUntil=Date.now()+900;if(updatePkArenaNumbers(state.pkDemoScoreA,state.pkDemoScoreB,true))return;return render()}return toast('Chỉ có thể thử trong bản minh họa')}
 if(action==='pkInvite'){
  if(!state.connected)return toast('Bản offline không thể gửi lời mời thật');
  void runRoomControl('pk-invite:'+id,room=>net.pkInvite(room,id,180),()=>{state.modal='pk';toast('Đã gửi lời mời PK');void syncPK()});return;
 }
 if(action==='pkRespond'){
  const [invitationId,reply]=id.split(':');
  void runRoomControl('pk-respond:'+invitationId,room=>net.pkRespond(room,invitationId,reply==='yes'),()=>{state.modal=null;toast(reply==='yes'?'Đã bắt đầu PK!':'Đã từ chối PK');void syncPK()});return;
 }
 if(action==='pkCancel'){
  void runRoomControl('pk-cancel:'+id,room=>net.pkCancel(room,id),()=>{toast('Đã hủy lời mời');void syncPK()});return;
 }
 if(action==='pkCheer'){
  if(state.pkSyncError||!state.online||!state.pkSyncAt||Date.now()-state.pkSyncAt>15000)return toast('PK đang mất đồng bộ. Hãy thử lại khi kết nối ổn định.');
  const match=state.pkData?.match;if(!match)return toast('Chưa có trận PK');
  void runRoomControl('pk-cheer',room=>net.pkCheer(room,match.id),()=>{burstPkHearts();void syncPK()});return;
 }
 if(action==='pkConfirmEnd'){state.modal='pkEndConfirm';return render()}
 if(action==='pkEnd'){
  const match=state.pkData?.match;if(!match)return;
  state.modal=null;void runRoomControl('pk-end',room=>net.pkEnd(room,match.id),()=>{toast('Đã kết thúc PK');void syncPK()});return;
 }

 if(action==='inviteGuest'){
  if(!state.liveReady)return toast('Cần kết nối LiveKit để gửi lời mời thật');
  void runRoomControl('cam-invite:'+id,room=>net.liveInvite(room,id),roster=>{state.liveRoster=roster;render();toast('Đã gửi lời mời, đang chờ người xem xác nhận')});return;
 }
 if(action==='inviteAnswer'){
  const [inviteId,answer]=id.split(':');if(!state.liveReady)return toast('Chưa kết nối LiveKit');
  void runRoomControl('cam-invite-reply:'+inviteId,room=>net.liveInviteRespond(room,inviteId,answer==='yes'),roster=>{state.liveRoster=roster;render();toast(answer==='yes'?'Bạn đã chấp nhận. Mic/camera vẫn tắt.':'Đã từ chối lời mời')});return;
 }
 if(action==='cancelInvite'){
  if(!state.liveReady)return toast('Chưa kết nối LiveKit');
  void runRoomControl('cam-invite-cancel:'+id,room=>net.liveInviteCancel(room,id),roster=>{state.liveRoster=roster;render();toast('Đã hủy lời mời')});return;
 }

 if(action==='memberMenu'){if(!state.liveReady)return toast('Chưa kết nối quản lý phòng');state.memberTarget=id;state.modal='memberActions';return render()}
 if(action==='stageMod'){
  if(!state.liveReady)return toast('Chưa kết nối quản lý phòng');
  const [what,uid]=id.split(':');state.pendingMod={action:what,uid};state.modal='confirmStageAction';return render();
 }
 if(action==='confirmStageMod'){
  const p=state.pendingMod;if(!p||!state.liveReady)return toast('Thao tác không hợp lệ');
  state.modal=null;render();
  void runRoomControl('cam-moderation',room=>net.liveModerate(room,p.uid,p.action,p.action==='ban'?60:p.action==='mute-chat'?10:undefined),roster=>{
   state.liveRoster=roster;state.pendingMod=null;render();toast('Đã cập nhật quyền thành viên');
  });return;
 }
 if(action==='confirmLeaveRoom'){roomNavigationSeq++;stopPkLocalCamera();
  const departing=state.roomId;
  if(voice.roomId)voice.exit().catch(()=>{});
  if(state.connected&&departing){if(state.liveReady)net.liveLeave(departing).catch(()=>{});net.leave(departing).then(result=>{if(result?.mediaDisconnectPending&&state.page!=='room')toast('Đã rời phòng trong ứng dụng; LiveKit chưa xác nhận ngắt media. Hãy kiểm tra mic/camera trên thiết bị.')}).catch(()=>{})}
  state.roomId=null;state.audience=null;state.audienceUpdatedAt=0;audienceRequestSeq++;state.liveReady=false;state.voiceReady=false;state.roomMessages=[];roomMessageSync=null;
  dismissPkFinish();state.pkData=null;state.pkSyncAt=0;state.pkLastAttempt=0;state.pkSyncError=false;pkRequestSeq++;state.pkPreview=false;state.pkDemoFinished=false;state.page='main';state.tab='live';state.mic=false;state.seat=false;state.modal=null;return toast('Bạn đã rời phòng');
 }
 if(action==='stageSetting'){if(!state.liveReady||!state.liveRoster)return toast('Chưa kết nối phòng');
 const s=state.liveRoster.settings;const value=id==='locked'?{locked:!s.locked}:id==='chatEnabled'?{chatEnabled:!s.chatEnabled}:{slowModeSeconds:s.slowModeSeconds===0?5:s.slowModeSeconds===5?10:s.slowModeSeconds===10?30:0};
 void runRoomControl('cam-settings',room=>net.liveSettings(room,value),roster=>{state.liveRoster=roster;render()});return}
 if(action==='joinSeat'){if(!state.voiceReady)return toast('Chưa kết nối voice. Hãy chạy server bằng localhost/HTTPS.');if(voice.seatPending)return;voice.seat(!state.seat).catch(e=>toast(e.message));return}if(action==='mic'){if(!state.voiceReady)return toast('Chưa kết nối voice');if(voice.seatPending)return;voice.toggleMic().catch(e=>toast(e.message));return}if(action==='unlockAudio'){voice.unlockAudio();return}if(action==='setTheme'&&(id==='light'||id==='dark'))return setTheme(id);if(action==='theme')return setTheme(state.theme==='dark'?'light':'dark');if(action==='searchFocus'){state.tab='live';state.page='main';render();document.getElementById('searchRooms')?.focus();return}if(action==='newChat'){state.modal='newChat';return render()}if(action==='vibes'){state.modal='vibes';return render()}if(action==='create'||action==='createClub'){state.modal=action;return render()}if(action==='settings'){state.page='settings';return render()}if(action==='closeModal'){state.modal=null;return render()}if(action==='editProfile'||action==='badges'||action==='safety'||action==='help'||action==='chatInfo'||action==='liveOptions'||action==='roomReport'||action==='seatInfo'){state.modal=action;return render()}});
$.addEventListener('input',event=>{const el=event.target;if(el.id==='searchRooms'){state.search=el.value;document.getElementById('room-list-results').innerHTML=roomList(state.roomFilter,state.search);const count=document.getElementById('live-room-count');if(count)count.lastChild.textContent=ux.filterRooms(state.rooms,state.roomFilter,state.search).length+' phòng' }if(el.id==='searchChats'){const q=el.value.toLowerCase();document.querySelectorAll('#chats-list .chat-row').forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?'flex':'none'})}if(el.id==='searchDiscover'){state.search=el.value;const results=document.getElementById('discover-room-results');if(results)results.innerHTML=roomList('Tất cả',state.search)}});
$.addEventListener('keydown',event=>{if(event.target.matches('.hero-room[role="button"]')&&(event.key==='Enter'||event.key===' ')){event.preventDefault();const hero=event.target;return hero.dataset.action==='room'?openRoom(hero.dataset.id):(state.modal='create',render())}if(event.target.id==='searchDiscover'&&event.key==='Enter'){state.tab='live';state.page='main';render();const e=document.getElementById('searchRooms');if(e){e.value=state.search;e.focus()}return}if(event.key==='Escape'&&state.modal){state.modal=null;render()}});
async function submitForm(event){event.preventDefault();const form=event.target;const data=new FormData(form);if(form.id==='create-room'){const title=String(data.get('name')||'').trim();if(!title)return;const tag=String(data.get('tag')||'Tâm sự');const desc=String(data.get('desc')||'Mời bạn cùng trò chuyện').trim();const type=data.get('type')==='cam'?'cam':'voice';if(state.connected){try{const result=await net.createRoom({title,tag,subtitle:desc,type});await syncRooms();await openRoom(result.room.id);return toast('Đã tạo phòng trên máy chủ');}catch(e){return toast(e.message)}}const id='custom-'+Date.now();state.rooms.unshift({id,type,title,subtitle:desc||'Hãy kể câu chuyện của bạn',host:state.username,hostAv:'✦',members:1,tag,color:'violet',art:'✳',speakers:[],featured:false});openRoom(id);return toast('Phòng demo đã được tạo!')}if(form.id==='room-report'){const reason=String(data.get('reason')||'').trim();if(!state.connected)return toast('Cần kết nối máy chủ để gửi báo cáo');try{const receipt=await net.report(state.roomId,reason);state.modal=null;return toast('Đã tiếp nhận báo cáo · mã '+receipt.reportId.slice(0,8))}catch(e){return toast(e.message)}}if(form.id==='edit-profile'){const name=String(data.get('name')||'').trim();const bio=String(data.get('bio')||'').trim();if(state.connected){try{const result=await net.profile(name,bio);state.username=result.user.name;state.bio=result.user.bio;}catch(e){return toast(e.message)}}else{state.username=name||'Bạn';state.bio=bio}state.modal=null;return toast(state.connected?'Đã lưu hồ sơ lên máy chủ':'Đã cập nhật hồ sơ trong bản xem trước')}if(form.id==='chat-send'){const text=String(data.get('message')||'').trim();if(!text)return;form.reset();state.messages[state.chatId].push({who:'me',text,time:'Bây giờ'});const chat=state.chats.find(c=>c.id===state.chatId);if(chat){chat.last=text;chat.time='Bây giờ'}return render()}if(form.id==='room-send'){const text=String(data.get('message')||'').trim();if(!text)return;if(state.connected){try{await net.send(state.roomId,text);form.reset();await syncRoomMessages();return;}catch(e){return toast(e.message)}}form.reset();state.roomLog.push(state.username+': '+text);return render()}}
const pendingFormSubmissions=new Set();
$.addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.target;
 if(!['create-room','edit-profile','chat-send','room-send','room-report'].includes(form.id))return;
 const key=form.id+':'+(form.id==='room-send'||form.id==='room-report'?state.roomId:'');
 if(pendingFormSubmissions.has(key))return;
 pendingFormSubmissions.add(key);
 const buttons=[...form.querySelectorAll('[type="submit"]')];
 buttons.forEach(button=>{button.disabled=true;button.setAttribute('aria-busy','true')});
 try{await submitForm(event);}
 finally{
  pendingFormSubmissions.delete(key);
  buttons.forEach(button=>{button.disabled=false;button.removeAttribute('aria-busy')});
 }
});
// The dialog is labeled, traps keyboard focus and closes with Escape.
document.addEventListener('keydown',e=>{
 const dialog=$.querySelector('[role="dialog"]');
 if(e.key==='Escape'&&state.modal){e.preventDefault();state.modal=null;render();return}
 if(!dialog||e.key!=='Tab')return;
 const nodes=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]')];
 if(!nodes.length){e.preventDefault();dialog.focus();return}
 const first=nodes[0],last=nodes[nodes.length-1];
 if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){e.preventDefault();first.focus()}
});
window.addEventListener('pagehide',stopPkLocalCamera);
render();
window.setInterval(()=>{
 if(state.page!=='room')return;
 if(state.connected&&state.audienceUpdatedAt&&Date.now()-state.audienceUpdatedAt>audiencePresence.MAX_AGE_MS)syncAudienceDom();
 updatePkNetworkStatus();
 if(state.connected&&state.pkData?.match&&Date.now()-(state.pkLastAttempt||0)>=5000){state.pkLastAttempt=Date.now();void syncPK();}
 const node=document.querySelector('[data-pk-countdown]');if(!node)return;
 if(state.pkFinished||state.pkDemoFinished){node.textContent='00:00';return;}
 const match=state.pkData?.match;
 const remaining=match?match.endsAt-Date.now():180000-(Date.now()-state.pkDemoStart);
 node.textContent=pkTime(remaining);node.closest('.pk-arena-v3')?.classList.toggle('pk-final-seconds',remaining>0&&remaining<=10000);
 if(remaining<=0){
  if(!state.connected&&state.pkPreview&&!state.pkDemoFinished){state.pkDemoStreak=state.pkDemoScoreA>state.pkDemoScoreB?state.pkDemoStreak+1:0;showPkFinish(null,true);render();}
  else if(match){node.textContent='00:00';node.setAttribute('aria-label','Đang chờ máy chủ xác nhận kết quả PK');}
 }
},1000);
startNetwork();
})();

/* Túttt v0.5.4 - stage layout only represents granted seats, NEVER camera transmission. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TutttStageLayout=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function selectSeats(roster,hostName){
   const members=Array.isArray(roster?.members)?roster.members:[];
   const hostId=roster?.hostId||'preview-host';
   const host=members.find(m=>m.id===hostId)||{id:hostId,name:hostName||'Chủ phòng',role:'host',speaker:true,reserved:!!roster};
   const guests=members.filter(m=>m.speaker&&m.id!==hostId);
   return [host,...guests].slice(0,6);
 }
 function layout(seats,pinId,showEmpty=false){
   const safe=(Array.isArray(seats)?seats:[]).filter(Boolean).slice(0,6);
   const pin=safe.length>1&&safe.some(s=>s.id===pinId)?pinId:null;
   const count=safe.length;
   const visible=showEmpty?[...safe,...Array(Math.max(0,6-count)).fill(null)]:safe;
   return {count,empty:Math.max(0,6-count),pin,visible,variant:pin?'pinned':count===1?'solo':count===2?'duo':count<=4?'compact':'group'};
 }
 return {selectSeats,layout};
});

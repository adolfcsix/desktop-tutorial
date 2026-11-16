/* v0.5.7 — stage mic/speaking display. Nothing is inferred from seat permissions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TutttSpeakerStatus=api;})(typeof window==='undefined'?globalThis:window,function(){
 function visual({connected=false,mic=null,speaking=false}={}){
  const muted=connected&&mic===false;
  const active=connected&&mic===true&&speaking===true;
  return {muted,active,showMuteBadge:muted,showGreenRing:active};
 }
 return {visual};
});

// Shared, dependency-free helpers used by the UI and its Node.js tests.
(function(root,factory){
  const helpers=factory();
  if(typeof module==='object'&&module.exports)module.exports=helpers;
  root.TutttUX=helpers;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function normalize(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').trim().toLocaleLowerCase('vi');}
  function matchesRoom(room,category='Tất cả',query=''){
    if(category!=='Tất cả' && room.tag!==category)return false;
    const terms=normalize(query).split(/\s+/).filter(Boolean);
    const searchable=normalize([room.title,room.subtitle,room.host,room.tag].join(' '));
    return terms.every(term=>searchable.includes(term));
  }
  function filterRooms(rooms,category='Tất cả',query=''){
    return (Array.isArray(rooms)?rooms:[]).filter(r=>r&&matchesRoom(r,category,query));
  }
  function recommendedRooms(rooms,limit=3){
    const sorted=Array.isArray(rooms)?rooms.filter(Boolean):[];
    const featured=sorted.find(r=>r.featured);
    return (featured?sorted.filter(r=>r.id!==featured.id):sorted).slice(0,limit);
  }
  return {normalize,matchesRoom,filterRooms,recommendedRooms};
});

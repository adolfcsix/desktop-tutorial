'use strict';
window.TUTTT_DEMO = {
  rooms: [
    {id:'midnight',title:'Chuyện sau 12 giờ',subtitle:'Đêm dài có chúng mình cùng nghe',host:'Mây',hostAv:'🌙',members:128,tag:'Tâm sự',color:'violet',art:'☾',speakers:['M','L','H','T'],featured:true},
    {type:'cam',id:'acoustic',title:'Một chút nhạc, một chút tình',subtitle:'Acoustic và những câu chuyện nhỏ',host:'Bơ',hostAv:'🎸',members:84,tag:'Âm nhạc',color:'coral',art:'♫',speakers:['B','K','A'],featured:false},
    {id:'english',title:'English, but make it fun',subtitle:'No pressure, just practice',host:'Alex',hostAv:'✨',members:42,tag:'Học tập',color:'blue',art:'✦',speakers:['A','E','N'],featured:false},
    {type:'cam',id:'coffee',title:'Cà phê sáng nói chuyện gì?',subtitle:'Có chuyện hay, ghé kể nghe',host:'Nắng',hostAv:'☕',members:63,tag:'Kết bạn',color:'mint',art:'✳',speakers:['N','V','P'],featured:false}
  ],
  people: [
    {id:'linh',name:'Linh Anh',av:'LA',color:'peach',desc:'Đang nghe nhạc',online:true},
    {id:'bao',name:'Minh Bảo',av:'MB',color:'blue',desc:'Có một câu chuyện hay',online:true},
    {id:'mi',name:'Mii',av:'MI',color:'pink',desc:'Đang tìm bạn nói chuyện',online:true},
    {id:'an',name:'Anh Nhi',av:'AN',color:'mint',desc:'See you in the room ✨',online:false}
  ],
  chats: [
    {id:'linh',name:'Linh Anh',av:'LA',color:'peach',last:'Tối nay vào phòng đó nha 🌙',time:'09:41',unread:2,online:true},
    {id:'bao',name:'Minh Bảo',av:'MB',color:'blue',last:'Mình gửi bạn playlist rồi á',time:'Hôm qua',unread:0,online:true},
    {id:'mi',name:'Mii',av:'MI',color:'pink',last:'Haha dễ thương ghê 😭',time:'Hôm qua',unread:0,online:false},
    {id:'an',name:'Anh Nhi',av:'AN',color:'mint',last:'Hẹn gặp bạn lần sau nhé!',time:'T2',unread:0,online:false}
  ],
  messages: {
    linh:[{who:'them',text:'Ê tối nay có phòng tâm sự thú vị lắm á!',time:'09:37'},{who:'me',text:'Thật hả, mấy giờ vậy?',time:'09:39'},{who:'them',text:'Tối nay vào phòng đó nha 🌙',time:'09:41'}],
    bao:[{who:'them',text:'Mình gửi bạn playlist rồi á',time:'22:14'}],
    mi:[{who:'them',text:'Haha dễ thương ghê 😭',time:'21:03'}],
    an:[{who:'them',text:'Hẹn gặp bạn lần sau nhé!',time:'18:23'}]
  },
  clubs: [
    {id:'night',name:'Hội cú đêm',subtitle:'Một nơi để kể mọi chuyện',members:'3.2k',color:'violet',art:'☾',joined:true},
    {id:'music',name:'Chạm vào giai điệu',subtitle:'Nhạc hay và người cùng gu',members:'2.8k',color:'coral',art:'♫',joined:false},
    {id:'study',name:'Cùng nhau tiến bộ',subtitle:'Học chút thôi, vui là chính',members:'1.4k',color:'blue',art:'✎',joined:false},
    {id:'books',name:'Tiệm sách nhỏ',subtitle:'Mỗi tuần một câu chuyện',members:'986',color:'mint',art:'✳',joined:false}
  ]
};

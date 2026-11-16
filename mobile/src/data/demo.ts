export type Room = {type?:'voice'|'cam';id:string;title:string;subtitle:string;host:string;members:number;tag:string;art:string;accent:string};
export type Contact = {id:string;name:string;avatar:string;last:string;time:string;unread:number;accent:string};
export type Message = {id:string;from:'me'|'them';text:string;time:string};
export type Club = {id:string;name:string;subtitle:string;members:string;art:string;accent:string;joined:boolean};
export const demoRooms:Room[] = [
  {id:'midnight',title:'Chuyện sau 12 giờ',subtitle:'Đêm dài có chúng mình cùng nghe',host:'Mây',members:128,tag:'Tâm sự',art:'☾',accent:'#8B4A40'},
  {id:'acoustic',title:'Một chút nhạc, một chút tình',subtitle:'Acoustic và những câu chuyện nhỏ',host:'Bơ',members:84,tag:'Âm nhạc',art:'♫',accent:'#A35E54'},
  {id:'english',title:'English, but make it fun',subtitle:'No pressure, just practice',host:'Alex',members:42,tag:'Học tập',art:'✦',accent:'#687A79'},
  {id:'coffee',title:'Cà phê sáng nói chuyện gì?',subtitle:'Có chuyện hay, ghé kể nghe',host:'Nắng',members:63,tag:'Kết bạn',art:'✳',accent:'#577662'}
];
export const demoContacts:Contact[] = [
  {id:'linh',name:'Linh Anh',avatar:'LA',last:'Tối nay vào phòng đó nha 🌙',time:'09:41',unread:2,accent:'#f3b79e'},
  {id:'bao',name:'Minh Bảo',avatar:'MB',last:'Mình gửi bạn playlist rồi á',time:'Hôm qua',unread:0,accent:'#afcdf5'},
  {id:'mi',name:'Mii',avatar:'MI',last:'Haha dễ thương ghê 😭',time:'Hôm qua',unread:0,accent:'#eea2c6'},
  {id:'an',name:'Anh Nhi',avatar:'AN',last:'Hẹn gặp bạn lần sau nhé!',time:'T2',unread:0,accent:'#addcc7'}
];
export const demoClubs:Club[] = [
 {id:'night',name:'Hội cú đêm',subtitle:'Một nơi để kể mọi chuyện',members:'3.2k',art:'☾',accent:'#81463B',joined:true},
 {id:'music',name:'Chạm vào giai điệu',subtitle:'Nhạc hay và người cùng gu',members:'2.8k',art:'♫',accent:'#A16054',joined:false},
 {id:'study',name:'Cùng nhau tiến bộ',subtitle:'Học chút thôi, vui là chính',members:'1.4k',art:'✎',accent:'#647E7B',joined:false}
];
export const initialMessages:Record<string,Message[]> = {
  linh:[{id:'1',from:'them',text:'Ê tối nay có phòng tâm sự thú vị lắm á!',time:'09:37'},{id:'2',from:'me',text:'Thật hả, mấy giờ vậy?',time:'09:39'},{id:'3',from:'them',text:'Tối nay vào phòng đó nha 🌙',time:'09:41'}],
  bao:[{id:'4',from:'them',text:'Mình gửi bạn playlist rồi á',time:'22:14'}],
  mi:[{id:'5',from:'them',text:'Haha dễ thương ghê 😭',time:'21:03'}],
  an:[{id:'6',from:'them',text:'Hẹn gặp bạn lần sau nhé!',time:'18:23'}]
};

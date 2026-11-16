'use strict';
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.TutttPKVisual=api;})(typeof window!=='undefined'?window:globalThis,function(){
 function evaluate(a,b){a=Number(a)||0;b=Number(b)||0;a=Math.max(0,a);b=Math.max(0,b);const sum=a+b;const leftPct=sum?Math.round(100*a/sum):50;const label=a===b?'Hòa':a>b?'Phe A dẫn':'Phe B dẫn';return {leftPct,label,leader:a===b?null:a>b?'A':'B'};}
 return Object.freeze({evaluate});
});

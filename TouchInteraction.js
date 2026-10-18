// Shared app-like touch behavior. Canvas gestures still belong to the 3D viewers;
// scrollable settings retain normal one-finger scrolling and editable fields.
if(typeof document!=='undefined'){
 const style=document.createElement('style');
 style.textContent=`
 html{touch-action:pan-x pan-y}
 body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
 input:not([type=range]):not([type=checkbox]):not([type=button]),textarea,[contenteditable=true]{-webkit-user-select:text;user-select:text}
 `;
 document.head.append(style);
 const viewport=document.querySelector('meta[name=viewport]');
 if(viewport){
  const values=viewport.content.split(',').map(value=>value.trim()).filter(value=>!/^maximum-scale=|^user-scalable=/i.test(value));
  viewport.content=[...values,'maximum-scale=1','user-scalable=no'].join(',');
 }
 // Safari exposes native page-zoom gestures separately from canvas touch input.
 for(const event of ['gesturestart','gesturechange','gestureend'])document.addEventListener(event,e=>e.preventDefault(),{passive:false});
}

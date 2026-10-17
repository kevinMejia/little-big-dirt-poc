// Rectangles come from the rendered controls, including safe areas and equipment.
// Keep this independent of DOM so portrait/landscape collision cases are testable.
export function settingsPlacement({width,height,safe={top:0,right:0,bottom:0,left:0},controls=[],menuBottom=0}){
 const left=Math.max(8,safe.left+8),panelWidth=Math.max(120,Math.min(330,width-left-safe.right-8));
 let bottom=height-safe.bottom-8;
 for(const rect of controls)if(rect.right>left&&rect.left<left+panelWidth&&rect.bottom>safe.top)bottom=Math.min(bottom,rect.top-10);
 const top=Math.max(safe.top+8,Math.min(Math.max(safe.top+8,menuBottom+8),bottom-48));
 const maxHeight=Math.max(0,Math.min(height*.66,bottom-top));
 return {left,top,width:panelWidth,maxHeight,cramped:maxHeight<150};
}

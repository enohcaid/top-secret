const sharp=require('sharp');const D='fuentes/video-fichajes/';require('fs').mkdirSync(D,{recursive:true});
const P=require('./jugadores.json').map(j=>j[0]);
const W=1080,H=1920;
const bg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
<radialGradient id="g" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#6b5424"/><stop offset=".45" stop-color="#241c0e"/><stop offset="1" stop-color="#070605"/></radialGradient>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset=".72" stop-color="#070605" stop-opacity="0"/><stop offset="1" stop-color="#070605" stop-opacity=".9"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/></svg>`);
(async()=>{for(const k of P){
  const big=await sharp(`Renders/${k}/Brazos4.png`).trim({threshold:5}).resize({height:2700}).png().toBuffer(); const bm=await sharp(big).metadata(); const cw=Math.min(bm.width,W); const pl=await sharp(big).extract({left:Math.round((bm.width-cw)/2),top:0,width:cw,height:H-230}).png().toBuffer();
  const m=await sharp(pl).metadata();
  await sharp(bg).composite([{input:pl,left:Math.round((W-m.width)/2),top:230}]).png().toFile(`${D}${k}.png`);
}
const b=await Promise.all(P.map(k=>sharp(`${D}${k}.png`).resize(270,480).toBuffer()));
await sharp({create:{width:270*P.length,height:480,channels:3,background:'#000'}}).composite(b.map((x,i)=>({input:x,left:i*270,top:0}))).png().toFile(D+'_bases.png');console.log('ok')})();

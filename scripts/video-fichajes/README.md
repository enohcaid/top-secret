# Video "Nuevos fichajes"

Reel vertical 1080×1920: apertura, 3 s por jugador (clip de Canva "Imagen a video" + texto) y cierre "Bienvenidos". Primera versión: T4, 6 jugadores, publicada en R2 `videos/nuevos-fichajes-t4.mp4`.

Para sumar o cambiar jugadores, editar `jugadores.json` (`[gamertag, dorsal, puesto]`, en el orden del video) y correr desde la raíz del repo:

```bash
node scripts/video-fichajes/base.cjs          # imagen vertical por jugador (Renders/<gt>/Brazos4.png) → fuentes/video-fichajes/<gt>.png
# clip de 5 s en Canva por jugador (solo los que faltan; necesita Chrome CDP con sesión de Canva)
for k in $(node -e "require('./scripts/video-fichajes/jugadores.json').forEach(j=>console.log(j[0]))"); do
  [ -f fuentes/video-fichajes/$k.mp4 ] || node scripts/canva-imagen-a-video.mjs fuentes/video-fichajes/$k.png --out fuentes/video-fichajes/$k.mp4
done
node scripts/video-fichajes/overlays.cjs      # textos por jugador + placas de apertura y cierre
node scripts/video-fichajes/armar.cjs         # arma fuentes/video-fichajes/nuevos-fichajes-t4.mp4
node scripts/r2.mjs put fuentes/video-fichajes/nuevos-fichajes-t4.mp4 videos/nuevos-fichajes-t4-v2.mp4
```

Los clips ya generados se reutilizan. Están también en R2 (`_fuentes/video-fichajes/`): en otra PC, `node scripts/r2.mjs sync-down _fuentes/video-fichajes fuentes/video-fichajes` antes de correr, así no se gastan créditos de Canva regenerándolos. Al generar uno nuevo, subirlo ahí también. Revisar cuadros de cada clip nuevo antes de armar (la IA a veces inventa humo o deforma caras). Sin audio: la música se agrega al subir a Instagram.

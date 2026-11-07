# TUCO Post Studio — sitio web

Sitio estático (HTML + CSS + JS, sin dependencias) publicado con GitHub Pages desde la rama `main`.

```
index.html              página única
assets/css/tuco.css     estilos (tokens de color/tipografía al inicio)
assets/js/tuco.js       comportamiento: reel, previews, reproductor, reloj CDMX
assets/fonts/           Antonio, Geist y Geist Mono (licencia OFL, autoalojadas)
assets/img/             favicon, imagen para redes (og.jpg), ident stop-motion
media/                  videos y posters optimizados para web (los genera el script)
videos/                 masters originales (no se cargan en la página)
tools/encode_media.py   pipeline de video: masters → media/
```

## Agregar un proyecto

1. Copiar el master en `videos/`.
2. Sumar una línea en `PROJECTS` dentro de `tools/encode_media.py`
   (slug, archivo, segundo donde arranca el preview de 8 s, segundo del poster).
3. Correr desde la raíz del repo: `python tools/encode_media.py`
   (requiere ffmpeg en el PATH; solo procesa lo que falta).
4. En `index.html`, duplicar un bloque `<li class="card">` y cambiar slug, título,
   duración y, si hay, `data-sub` (campaña) y `data-credits` (créditos que se ven en el reproductor).

## Pendientes de contenido

- Instagram: pegar la URL en `INSTAGRAM_URL` al inicio de `assets/js/tuco.js` y el link aparece en el pie.
- Créditos por proyecto (`data-credits`): hoy solo Adidas y Pizza Hut los tienen.

## Publicar

`git push origin main` — GitHub Pages actualiza en 1–2 minutos.

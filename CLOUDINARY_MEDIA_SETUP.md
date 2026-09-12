# Activación del flujo automático de medios

El sitio mantiene el contenido editorial en GitHub, pero los archivos pesados del hero y de los proyectos se almacenan en Cloudinary. Así GitHub no recibe videos grandes y el navegador nunca descarga el original: Cloudinary entrega un archivo comprimido y compatible con cada dispositivo.

## Activar una vez

1. Crea o usa una cuenta de [Cloudinary](https://cloudinary.com/). El plan elegido debe incluir entrega y transformaciones de video para el volumen previsto del portafolio.
2. En **Dashboard → API Keys**, copia el **Cloud name** y el **API Key**. En Vercel, configura estas variables para Production y Preview, y vuelve a desplegar:

   ```text
   PUBLIC_CLOUDINARY_CLOUD_NAME=...
   PUBLIC_CLOUDINARY_API_KEY=...
   ```

   Son valores públicos necesarios para abrir la biblioteca desde el CMS. Nunca publiques el **API Secret**.
3. En el primer uso de `/admin`, abre el selector de un campo de hero o de proyecto e inicia sesión en Cloudinary. Después el flujo habitual es solamente seleccionar/subir el archivo y guardar la entrada.

Los campos de hero y proyectos ya no permiten subir medios al repositorio. Esto evita que por error un video pesado vuelva a entrar a GitHub.

## Qué ocurre al publicar un video

1. El CMS lo carga directamente a Cloudinary.
2. El JSON guarda una URL segura del recurso, no una copia del video en Git.
3. El sitio pide a Cloudinary una versión limitada a 1920×1080, con formato, códec y calidad automáticos.
4. El `poster` se extrae automáticamente del primer fotograma del mismo video. También se usa en el preview social del home y de los proyectos.

No hay que exportar un MP4 optimizado ni crear una imagen de póster aparte.

## Migrar los videos que ya están en el repositorio

El script es seguro por defecto: primero solo enumera los videos. No borra ningún archivo local.

1. En `.env` (que está ignorado por Git), añade además las credenciales privadas:

   ```text
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

2. Comprueba la lista sin modificar nada:

   ```powershell
   npm run migrate:cloudinary:videos
   ```

3. Si la lista es correcta, realiza la subida en fragmentos de 6 MB y actualiza las referencias:

   ```powershell
   npm run migrate:cloudinary:videos -- --apply
   ```

4. Despliega, verifica el home y cada proyecto que tenga video. Solo después de confirmar producción puedes eliminar los MP4 antiguos de `public/` en una limpieza separada.

La subida inicial aún depende de la conexión de quien selecciona el archivo, pero es directa a Cloudinary y tolerante a archivos grandes. La compresión, transcodificación, entrega y póster se hacen de forma automática en la plataforma de medios.

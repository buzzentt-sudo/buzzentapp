# Buzzent CRM

CRM de prospección comercial pensado específicamente para Buzzent, una agencia web argentina. Permite registrar negocios, investigar su presencia digital, hacer seguimiento comercial y preparar fichas imprimibles.

## Tecnologías

- React 18+ y Vite.
- Lucide React para iconografía.
- Supabase REST/Auth opcional para persistencia y acceso remoto.
- PWA con manifest, ícono y Service Worker.
- CSS responsive sin framework, con componentes reutilizables.

## Instalar y ejecutar

```bash
npm install
npm run dev
```

Abrir la URL indicada por Vite. Para compilar producción:

```bash
npm run build
npm run preview
```

## Funcionalidades implementadas

- Dashboard con métricas, pipeline, oportunidades y acciones rápidas.
- Alta, edición y eliminación de prospectos.
- Filtros, búsqueda global y tabla responsive.
- Ficha individual con diagnóstico digital, oportunidad, notas y mensaje inicial.
- Historial de contactos.
- Seguimientos agrupados por atraso, hoy, mañana y semana.
- Pipeline tipo Kanban con cambio rápido de estado.
- Importación CSV con preview.
- Exportación CSV.
- Ficha A4 mediante impresión del navegador (`Ficha A4`), con layout vertical, grises y estilos de bajo consumo de tinta.
- Investigación preparada como punto de extensión para APIs públicas.
- Datos de prueba ficticios.

## Publicar online

1. Crear un proyecto en Supabase.
2. Abrir el SQL Editor y ejecutar `supabase/schema.sql`.
3. En Authentication crear o registrar el usuario inicial.
4. Copiar `.env.example` como `.env.local` y completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. Probar con `npm run build`.
6. Conectar el repositorio a Vercel y configurar las mismas variables de entorno en Production.
7. Publicar con `vercel --prod` o desde el dashboard de Vercel.
8. Configurar el dominio y agregarlo en Supabase Authentication → URL Configuration.

Con esas variables presentes, Buzzent CRM muestra login, sincroniza prospectos con Supabase y la app se puede instalar como PWA desde el navegador del celular.

## Persistencia y evolución

Sin variables de Supabase, la app mantiene un modo local con `localStorage` para desarrollo. Con variables configuradas y una sesión iniciada, utiliza Supabase Auth + Postgres mediante la capa `src/lib/cloud.js`. Las credenciales nunca deben commitearse: usar `.env.local` y las variables de entorno del hosting.

## Estructura

```text
src/
  main.jsx       # aplicación, vistas y componentes
  styles.css     # sistema visual y responsive
index.html
package.json
```

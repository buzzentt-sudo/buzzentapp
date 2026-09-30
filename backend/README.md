# Backend BUZZENT

Este directorio contiene el primer backend real: contrato de datos en `schema.sql`, health check, lectura de servicios, creación de turnos con validación de solapamiento y adaptador seguro de OpenRouter.

Instalación: copiar `.env.example` a `.env` en el servidor, completar las variables, ejecutar `schema.sql` en Supabase y arrancar con `node server.mjs`. La app no contiene secretos.

El backend deberá completar autenticación Supabase/JWT, aislamiento por `business_id`, roles `ADMINISTRADOR`/`EMPLEADO` y las tools: `buscar_cliente`, `crear_cliente`, `listar_servicios`, `consultar_disponibilidad`, `crear_turno`, `cancelar_turno`, `reprogramar_turno`, `consultar_informacion_negocio`, `consultar_preguntas_frecuentes` y `derivar_a_humano`.

El adaptador OpenRouter debe recibir contexto del negocio y conversación, ejecutar solo tools permitidas, y devolver una respuesta basada en datos confirmados. `OPENROUTER_API_KEY`, tokens de Meta y secretos JWT son variables de entorno del servidor, nunca recursos Android.

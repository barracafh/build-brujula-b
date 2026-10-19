# Brújula · Asistente de trámites

## El reto

Le cuentas tu problema con tus palabras y te dice qué trámite es, los pasos y el enlace directo a la sede. La necesidad es humana («me han echado», «me empadrono») y la sede habla en organigramas.

Puede haber hasta dos squads en este track, los dos con el mismo reto. Cada uno construye las piezas que le dé tiempo, en el orden de abajo.

## Qué se espera en la demo

A partir de una frase como «me han echado del trabajo», la herramienta identifica el trámite (en este caso, la prestación por desempleo), da los pasos en orden, la documentación y el plazo, y enlaza a la sede correspondiente. Para el voto por correo del 29-N, responde con la entrada `voto-por-correo` del catálogo y enlaza siempre su fuente oficial: [Correos](https://www.correos.es/es/es/particulares/para-el-ciudadano/voto-por-correo) y los [plazos del INE](https://www.ine.es/dyngs/CEL/index.htm?cid=1702). Como extra, puede enlazar a las herramientas de ¿Cómo voto? en `https://build.barraca.house`.

## Piezas

El reto se puede abordar por partes. Haced las que os dé tiempo. Empezad por «Qué trámite necesito»: «Y después, ¿qué?» parte del trámite que identifica.

| Pieza                | Alcance en unas 4 h                                                                                                                      | Hecho cuando…                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Qué trámite necesito | Resolver frases libres, en castellano o en valenciano, sobre el catálogo del pack.                                                       | Devuelve trámite, organismo, pasos, documentación, plazo y sede; fuera del catálogo lo dice y enlaza al buscador del PAG. |
| Y después, ¿qué?     | Encadenar los trámites y ayudas de una situación (del despido a Labora, al paro y al subsidio, por ejemplo) con el campo `relacionados`. | Propone el siguiente trámite o ayuda con su enlace y su fuente, y avisa si una entrada tiene `verificado: false`.         |

## Materiales en esta carpeta

- `catalogo-tramites-ayudas.json`: 21 entradas (13 trámites y 8 ayudas), el mismo catálogo que Derechos.
  - Cada entrada incluye `frases_usuario` (cómo lo pide la gente, con una frase en valenciano), `pasos`, `documentacion`, `plazo`, `enlace_info`, `enlace_tramite`, `fuente`, `verificado` y `relacionados`.
  - Trámites incluidos (`tipo: "tramite"`): prestación por desempleo, inscripción en Labora, alta y certificado de padrón en València, cambio de domicilio en la DGT, renovación del DNI, vida laboral, identificación digital (Cl@ve y certificado), declaración de la renta, tarjeta sanitaria SIP, cita médica de la GVA, voto por correo del 29-N (con su fuente oficial) y multas de la DGT.
  - Ayudas incluidas (`tipo: "ayuda"`): subsidio por desempleo, Ingreso Mínimo Vital, Complemento de Ayuda para la Infancia, Renta Valenciana de Inclusión, bono social eléctrico, Bono Alquiler Joven, ayudas de comedor escolar y Xarxa Llibres. «Y después, ¿qué?» las necesita: del paro se pasa al subsidio y de ahí al IMV.

## Fuentes oficiales

| Fuente                                                                                                                                  | Qué ofrece                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Buscador de trámites del PAG (SIA)](https://administracion.gob.es/tramites-electronicos/resultados-actuaciones)                        | Procedimientos estatales con código SIA y enlace a la sede. No hay API ni descarga masiva |
| [Qué es el SIA](https://administracion.gob.es/pag_Home/espanaAdmon/SIA.html)                                                            | Estructura de una ficha de procedimiento                                                  |
| [Ajuntament de València · tràmits](https://www.valencia.es/val/participacio/juntes-municipals-de-districte/tramits-gestions-i-servicis) | Trámites municipales                                                                      |
| [Sede electrónica de València](https://sede.valencia.es)                                                                                | Sede municipal                                                                            |

## A tener en cuenta

- No hay que inventar pasos, plazos ni enlaces: si no están en una fuente, no se dan.
- Si el trámite no está en el catálogo, hay que decirlo y remitir al buscador del PAG.
- Las 21 entradas están comprobadas en la sede, el BOE o el DOGV a 18/10/2026. Si se añaden entradas sin comprobar, van con `"verificado": false`.
- Plazo del paro: el BOE confirma 15 días; la nota de la entrada explica la duda sobre si son hábiles.

## Resumen para el agente

```markdown
# Brújula · Asistente de trámites · Build night · BARRACA x SOTI

Objetivo: a partir de la frase libre de un ciudadano (en castellano o valenciano), identificar el trámite o trámites que le corresponden y dar los pasos, la documentación, el plazo y el enlace a la sede.
Datos: catalogo-tramites-ayudas.json, 21 entradas: 13 de tipo "tramite" y 8 de tipo "ayuda" (subsidio por desempleo, IMV, CAPI, RVI, bono social eléctrico, Bono Alquiler Joven, comedor escolar y Xarxa Llibres). Usa las dos; el campo relacionados encadena entradas de ambos tipos. El voto por correo se responde con la entrada voto-por-correo y su fuente oficial.
Fuentes para ampliar: buscador del PAG https://administracion.gob.es/tramites-electronicos/resultados-actuaciones
Reglas: no inventar pasos, plazos ni enlaces; avisar cuando una entrada tenga verificado=false; sin coincidencia, decirlo y enlazar el buscador del PAG; no guardar datos del usuario; claves solo en servidor; la herramienta se sirve bajo /<equipo> (campo equipo de ficha.json) y muestra el aviso "No es un servicio oficial".
```

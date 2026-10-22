"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ruta } from "@/config/sitio";
import { porId, type Entrada, type Resultado } from "@/lib/catalogo";
import { interpretarAmbito, type Ambito } from "@/lib/ambito";
import { detectarIdioma, textosPara, type Textos } from "@/lib/idioma";

export type Enfoque = "resumen" | "documentacion" | "requisitos" | "plazo" | "pasos" | "sede" | "relacionados";
export type TurnoChat = {
  id: number;
  pregunta: string;
  consulta?: string;
  idioma?: string;
  estado: "cargando" | "listo" | "error";
  resultado?: Resultado;
  enfoque?: Enfoque;
  mensaje?: string;
};

type Duda = { consulta: string; resultado: Resultado };
type Opciones = { consulta?: string; ambito?: Ambito; entradaId?: string; idioma?: string; enfoque?: Enfoque };

export function detectarRepregunta(texto: string): Enfoque | undefined {
  const t = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[¿?¡!.,;:]/g, "").trim();
  if (/^(e )?(que |cales son os )?documentos( preciso| necesito| fan falta)?$/.test(t)) return "documentacion";
  if (/^(e )?(cal e o |que |o )?prazo( teno| hai)?$/.test(t) || t === "canto tempo teno") return "plazo";
  if (/^(e )?(cales son os |que |os )?requisitos( preciso| debo cumprir)?$/.test(t)) return "requisitos";
  if (/^(e )?(cales son os |os )?pasos$/.test(t) || t === "como o fago") return "pasos";
  if (/^(e )?(onde se fai|onde o pido|onde o fago|cal e a sede)$/.test(t)) return "sede";
  if (/^(e )?(despois|que mais)( que)?$/.test(t)) return "relacionados";
  if (/^(y )?(que )?(documentos|documentacion|papeles)( necesito| hacen falta| tengo que llevar)?$/.test(t) || /^(i )?(quins |quina |els )?(documents|documentacio|papers)( necessite| necessito| fan falta)?$/.test(t) || /^(what |which )?documents( do i need| are needed)?$/.test(t)) return "documentacion";
  if (/^(y )?(cual es el |que |el )?(plazo|plazos)( tengo| hay)?$/.test(t) || /^(i )?(quin es el |quin |el )?termini( tinc| hi ha)?$/.test(t) || /^(what is the |the )?deadline$/.test(t) || /^(cuanto tiempo tengo|hasta cuando puedo pedirlo|quant de temps tinc)$/.test(t)) return "plazo";
  if (/^(y )?(que |los )?requisitos( necesito| hay| debo cumplir)?$/.test(t) || /^(i )?(quins |els )?requisits( necessite| he de complir)?$/.test(t) || /^(what are the )?requirements$/.test(t)) return "requisitos";
  if (/^(y )?(cuales son los |los )?pasos$/.test(t) || /^(i )?(quins son els |els )?passos$/.test(t) || /^(como lo hago|com ho faig|how do i do it|steps)$/.test(t)) return "pasos";
  if (/^(y )?(donde se hace|donde lo pido|donde lo hago|cual es la sede)$/.test(t) || /^(i )?(on es fa|on ho demane|on ho faig|quina es la seu)$/.test(t) || /^(where do i apply|where to apply)$/.test(t)) return "sede";
  if (/^(y )?(despues|que mas|cual es el siguiente paso)( que)?$/.test(t) || /^(i )?(despres|que mes)( que)?$/.test(t) || /^(what next|what comes next)$/.test(t)) return "relacionados";
}

export function useChat() {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<TurnoChat[]>([]);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [idioma, setIdioma] = useState("es");
  const [textos, setTextos] = useState<Textos>(() => textosPara("es"));
  const idiomaActual = useRef("es");
  const textosActuales = useRef(textos);
  const pendiente = useRef<AbortController | null>(null);
  const contador = useRef(0);
  const campo = useRef<HTMLTextAreaElement>(null);
  const contexto = useRef<Resultado | null>(null);
  const duda = useRef<Duda | null>(null);
  const fichas = useRef(new Map<string, Map<string, Entrada>>());
  const respuestas = useRef(new Map<string, Map<string, Resultado>>());
  const titulos = useRef(new Map<string, Map<string, string>>());

  useEffect(() => () => pendiente.current?.abort(), []);

  const cambiarIdioma = useCallback((codigo: string, ui?: Textos) => {
    const t = ui ?? textosPara(codigo);
    idiomaActual.current = codigo;
    textosActuales.current = t;
    setIdioma(codigo); setTextos(t);
  }, []);

  const agregar = useCallback((turno: Omit<TurnoChat, "id">) => {
    const id = ++contador.current;
    setTurnos((previos) => [...previos, { ...turno, id }]);
    setSeleccion(id); setAviso(null);
    return id;
  }, []);

  const solicitar = useCallback(async (pregunta: string, opciones: Opciones = {}) => {
    if (pendiente.current) return;
    const codigo = opciones.idioma ?? detectarIdioma(pregunta, idiomaActual.current);
    if (codigo !== idiomaActual.current) cambiarIdioma(codigo);
    const control = new AbortController();
    pendiente.current = control;
    const consulta = opciones.consulta ?? pregunta;
    const id = agregar({ pregunta, consulta, idioma: codigo, estado: "cargando", enfoque: opciones.enfoque ?? "resumen" });
    setTexto("");
    try {
      const respuesta = await fetch(ruta("/api/tramite"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: consulta, idioma: codigo, ambito: opciones.ambito, entradaId: opciones.entradaId }),
        signal: control.signal,
      });
      if (!respuesta.ok) throw new Error("Consulta no disponible");
      const resultado = await respuesta.json() as Resultado;
      if (control.signal.aborted || pendiente.current !== control) return;
      // La API anterior entrega las fichas originales en castellano.
      const idiomaRespuesta = resultado.idioma ?? "es";
      cambiarIdioma(idiomaRespuesta, resultado.textos);
      duda.current = resultado.aclaracion ? { consulta, resultado } : null;
      contexto.current = resultado.aclaracion ? null : resultado;
      if (resultado.traduccionDisponible !== false) {
        const lang = idiomaRespuesta;
        const mapa = fichas.current.get(lang) ?? new Map<string, Entrada>();
        const guardadas = respuestas.current.get(lang) ?? new Map<string, Resultado>();
        const nombres = titulos.current.get(lang) ?? new Map<string, string>();
        for (const entrada of resultado.entradas) {
          mapa.set(entrada.id, entrada);
          guardadas.set(entrada.id, { ...resultado, entradas: [entrada] });
        }
        for (const entrada of [...resultado.entradas, ...(resultado.relacionadas ?? [])]) nombres.set(entrada.id, entrada.titulo);
        fichas.current.set(lang, mapa);
        respuestas.current.set(lang, guardadas);
        titulos.current.set(lang, nombres);
      }
      setTurnos((previos) => previos.map((t) => t.id === id ? { ...t, idioma: idiomaRespuesta, estado: "listo", resultado } : t));
    } catch {
      if (!control.signal.aborted && pendiente.current === control) setTurnos((previos) => previos.map((t) => t.id === id ? { ...t, estado: "error" } : t));
    } finally {
      if (pendiente.current === control) pendiente.current = null;
    }
  }, [agregar, cambiarIdioma]);

  const preguntar = useCallback((pregunta: string, enfoque: Enfoque, resultado = contexto.current) => {
    if (pendiente.current || !resultado?.entradas.length) return;
    const codigo = resultado.idioma ? detectarIdioma(pregunta, idiomaActual.current) : "es";
    if (codigo !== (resultado.idioma ?? "es") || resultado.traduccionDisponible === false) {
      void solicitar(pregunta, { entradaId: resultado.entradas[0].id, idioma: codigo, enfoque });
      return;
    }
    cambiarIdioma(codigo, resultado.textos);
    contexto.current = resultado;
    duda.current = null;
    agregar({ pregunta, enfoque, resultado, idioma: codigo, estado: "listo" });
    setTexto(""); campo.current?.focus({ preventScroll: true });
  }, [agregar, cambiarIdioma, solicitar]);

  const elegirAmbito = useCallback((ambito: Ambito | "desconocido", turno?: TurnoChat, pregunta?: string) => {
    if (pendiente.current) return;
    const origen = turno?.resultado?.aclaracion ? { consulta: turno.consulta ?? turno.pregunta, resultado: turno.resultado } : duda.current;
    if (!origen?.resultado.aclaracion) return;
    const t = textosPara(origen.resultado.idioma, origen.resultado.textos);
    if (ambito === "desconocido") {
      const resultado = { ...origen.resultado, aclaracion: { ...origen.resultado.aclaracion, ayuda: true } };
      duda.current = { ...origen, resultado };
      agregar({ pregunta: pregunta ?? t.noSe, consulta: origen.consulta, resultado, idioma: resultado.idioma, estado: "listo" });
      setTexto(""); return;
    }
    if (!origen.resultado.aclaracion.opciones.includes(ambito)) return;
    void solicitar(pregunta ?? t[ambito], { consulta: origen.consulta, ambito, idioma: idiomaActual.current });
  }, [agregar, solicitar]);

  const enviar = useCallback(async (frase: string) => {
    if (pendiente.current) return;
    const limpia = frase.trim();
    const codigo = detectarIdioma(limpia, idiomaActual.current);
    const t = codigo === idiomaActual.current ? textosActuales.current : textosPara(codigo);
    if (!limpia || limpia.length > 2000) {
      setAviso(!limpia ? t.vacio : t.largo); campo.current?.focus(); return;
    }
    if (codigo !== idiomaActual.current) cambiarIdioma(codigo);
    if (duda.current) {
      const ambito = interpretarAmbito(limpia);
      if (ambito) { elegirAmbito(ambito, undefined, limpia); return; }
    }
    duda.current = null;
    const enfoque = detectarRepregunta(limpia);
    if (enfoque && contexto.current?.entradas.length) { preguntar(limpia, enfoque); return; }
    // Permite cambiar de idioma sin perder la ficha que ya se estaba mirando.
    if (/^(?:en |responde|respon|parla|habla|fala|in english)/i.test(limpia) && codigo !== (contexto.current?.idioma ?? "es") && contexto.current?.entradas.length) {
      void solicitar(limpia, { entradaId: contexto.current.entradas[0].id, idioma: codigo }); return;
    }
    await solicitar(limpia, { idioma: codigo });
  }, [cambiarIdioma, elegirAmbito, preguntar, solicitar]);

  const abrirEntrada = useCallback((id: string) => {
    if (pendiente.current) return;
    const idioma = idiomaActual.current;
    const mapa = fichas.current.get(idioma);
    const entrada = mapa?.get(id) ?? (idioma === "es" ? porId(id) : undefined);
    const respuesta = respuestas.current.get(idioma)?.get(id);
    const pregunta = `${textosActuales.current.meInteresa}: ${titulos.current.get(idioma)?.get(id) ?? (entrada ?? porId(id))?.titulo ?? id}`;
    if (respuesta) preguntar(pregunta, "resumen", respuesta);
    else if (entrada && idioma === "es") {
      const siguientes = entrada.relacionados.map(porId).filter((e): e is Entrada => Boolean(e));
      preguntar(pregunta, "resumen", { entradas: [entrada], relacionadas: siguientes, fueraCatalogo: false, confianza: "alta", origen: "frases", idioma, textos: textosActuales.current, traduccionDisponible: true });
    } else void solicitar(pregunta, { entradaId: id, idioma });
  }, [preguntar, solicitar]);

  const reiniciar = useCallback(() => {
    pendiente.current?.abort(); pendiente.current = null;
    contexto.current = null; duda.current = null;
    setTurnos([]); setSeleccion(null); setTexto(""); setAviso(null);
    campo.current?.focus({ preventScroll: true });
  }, []);

  const seleccionar = useCallback((turno: TurnoChat) => {
    setSeleccion(turno.id);
    if (turno.resultado?.aclaracion) duda.current = { consulta: turno.consulta ?? turno.pregunta, resultado: turno.resultado };
    else if (turno.resultado) { contexto.current = turno.resultado; duda.current = null; }
  }, []);

  return {
    texto, setTexto, aviso, turnos, campo, seleccion, idioma, textos,
    seleccionado: turnos.find((t) => t.id === seleccion),
    cargando: turnos.some((t) => t.estado === "cargando"),
    enviar, preguntar, abrirEntrada, elegirAmbito, reiniciar, seleccionar,
    entradaLocalizada: (id: string) => {
      const e = porId(id);
      return e ? { id: e.id, titulo: titulos.current.get(idiomaActual.current)?.get(id) ?? e.titulo, verificado: e.verificado, frases_usuario: e.frases_usuario } : undefined;
    },
  };
}
export type Chat = ReturnType<typeof useChat>;

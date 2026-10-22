import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { crearLocalizador, validarCampos } from "../src/lib/localizar";
import { resolverConsulta } from "../src/lib/consulta";
import { extraer } from "../src/lib/clasificar";
import { detectarIdioma, textosPara, IDIOMAS_BASE } from "../src/lib/idioma";
import { porId, type Resultado } from "../src/lib/catalogo";
import type { ResultadoPAG } from "../src/lib/pag";
import type { Mensaje } from "../src/lib/ia";
import { detectarRepregunta, type Chat } from "../src/components/propuestas/use-chat";
import { RespuestaChat } from "../src/components/propuestas/respuesta-chat";

const dni = porId("renovacion-dni")!;
const base: Resultado = { entradas: [dni], fueraCatalogo: false, confianza: "alta", origen: "ia" };
const ficha: ResultadoPAG = {
  codigoSia: "1234", titulo: "Solicitud simulada", departamento: "Organismo público",
  administracion: "Estado", url: "https://administracion.gob.es/ficha-simulada",
  descripcion: "Presentar 2 documentos. Consulta https://administracion.gob.es",
  nivelTramitacion: "Presentación electrónica", centroDirectivo: null,
  enlaceWeb: "https://sede.administracion.gob.es",
};
const pag: Resultado = { ...base, entradas: [], fueraCatalogo: true, pag: { consulta: "solicitud simulada", url: "https://administracion.gob.es/busqueda", resultados: [ficha] } };
const sinPAG = async () => { throw new Error("No debe buscar en PAG"); };
function traduccionDePrueba(mensajes: Mensaje[], prefijo = "GL ") {
  const datos = JSON.parse(mensajes[1].content as string);
  const traducir = (v: unknown): unknown => Array.isArray(v) ? v.map(traducir) : typeof v === "string" && v ? prefijo + v : v;
  return JSON.stringify({ documentos: datos.documentos.map((d: { id: string; campos: Record<string, unknown> }) => ({ id: d.id, campos: Object.fromEntries(Object.entries(d.campos).map(([k, v]) => [k, traducir(v)])) })), textos: Object.fromEntries(Object.entries(datos.textos).map(([k, v]) => [k, traducir(v)])) });
}

describe("Idiomas de la respuesta", () => {
  it("reconoce gallego y conserva palabras compartidas en el idioma de la conversación", () => {
    assert.equal(detectarIdioma("Quero renovar o meu DNI"), "gl");
    assert.equal(detectarIdioma("Que documentos preciso?"), "gl");
    assert.equal(detectarIdioma("Documentos", "gl"), "gl");
    assert.equal(detectarIdioma("Documents", "ca"), "ca");
    assert.equal(detectarIdioma("Que documentos necesito?", "gl"), "gl");
    assert.equal(detectarIdioma("Que requisitos debo cumprir?", "es"), "gl");
    assert.equal(detectarIdioma("What are the requirements?", "gl"), "en");
    assert.equal(detectarIdioma("¿Qué requisitos debo cumplir?", "gl"), "es");
    assert.equal(detectarIdioma("Que documentos preciso?", "pt"), "pt");
    assert.equal(detectarIdioma("En galego, por favor", "es"), "gl");
    assert.equal(detectarRepregunta("Que documentos preciso?"), "documentacion");
    assert.equal(detectarRepregunta("Cal é o prazo?"), "plazo");
    assert.equal(detectarRepregunta("E despois?"), "relacionados");
  });

  it("extrae el idioma junto con los datos del PAG y descarta ids desconocidos", () => {
    assert.deepEqual(extraer('{"ids":["inventado"],"busqueda":"renovación pasaporte","ambito":"estado","idioma":"gl-ES"}'), { ids: [], busqueda: "renovación pasaporte", ambito: "estado", idioma: "gl" });
  });

  it("utiliza el idioma del modelo aunque el cliente aún no lo haya reconocido", async () => {
    const r = await resolverConsulta({ texto: "Je veux renouveler mon DNI", idioma: "es" }, {
      clasificar: async () => ({ ids: [dni.id], busqueda: null, ambito: "estado", idioma: "fr" }),
      buscarPAG: sinPAG, motivoFalloPAG: () => null,
      localizarResultado: async (resultado, idioma) => { assert.equal(idioma, "fr"); return { ...resultado, idioma }; },
    });
    assert.equal(r.idioma, "fr");
  });

  it("abre una ficha en el idioma elegido sin reclasificar una repregunta", async () => {
    const r = await resolverConsulta({ texto: "What documents do I need?", entradaId: dni.id, idioma: "en" }, {
      clasificar: async () => { throw new Error("No debe clasificar una selección directa"); },
      buscarPAG: sinPAG, motivoFalloPAG: () => null,
      localizarResultado: async (resultado, idioma) => ({ ...resultado, idioma }),
    });
    assert.equal(r.idioma, "en");
    assert.equal(r.entradas[0].id, dni.id);
    assert.deepEqual(r.relacionadas?.map((e) => e.id), dni.relacionados);
  });

  it("conserva el idioma valenciano con el buscador local si la IA no contesta", async () => {
    const r = await resolverConsulta({ texto: "Vull renovar el DNI" }, {
      clasificar: async () => null, buscarPAG: sinPAG, motivoFalloPAG: () => null,
      localizarResultado: async (resultado, idioma) => ({ ...resultado, idioma }),
    });
    assert.equal(r.idioma, "ca");
    assert.equal(r.entradas[0].id, dni.id);
  });

  it("busca el PAG en castellano y devuelve sus fichas en el idioma del usuario", async () => {
    const r = await resolverConsulta({ texto: "Consulta simulada en galego" }, {
      clasificar: async () => ({ ids: [], busqueda: "solicitud simulada", ambito: "estado", idioma: "gl" }),
      buscarPAG: async (consulta) => { assert.equal(consulta, "solicitud simulada"); return [ficha]; },
      motivoFalloPAG: () => null,
      localizarResultado: crearLocalizador(async (m) => traduccionDePrueba(m)),
    });
    assert.equal(r.idioma, "gl");
    assert.equal(r.traduccionDisponible, true);
    assert.equal(r.pag?.resultados[0].titulo, "GL Solicitud simulada");
    assert.equal(r.pag?.resultados[0].url, ficha.url);
  });
});

describe("Traducciones de datos públicos", () => {
  it("traduce fichas y relacionadas en un lote sin enviar la consulta ni cambiar metadatos", async () => {
    let llamadas = 0;
    const consulta = "consulta del ciudadano: ejemplo simulado";
    const localizar = crearLocalizador(async (m) => {
      llamadas++;
      assert.ok(!(m[1].content as string).includes(consulta));
      const docs = JSON.parse(m[1].content as string).documentos;
      assert.deepEqual(Object.keys(docs.find((d: { id: string }) => d.id === "relacionado:certificado-empadronamiento").campos), ["titulo"]);
      return traduccionDePrueba(m);
    });
    const r = await resolverConsulta({ texto: consulta, idioma: "gl" }, {
      clasificar: async (texto) => { assert.equal(texto, consulta); return { ids: [dni.id], idioma: "gl", ambito: "estado", busqueda: null }; },
      buscarPAG: sinPAG, motivoFalloPAG: () => null, localizarResultado: localizar,
    });
    assert.equal(llamadas, 1);
    assert.equal(r.traduccionDisponible, true);
    assert.equal(r.entradas[0].titulo, `GL ${dni.titulo}`);
    assert.equal(r.entradas[0].fuente, dni.fuente);
    assert.equal(r.entradas[0].enlace_tramite, dni.enlace_tramite);
    assert.equal(r.entradas[0].verificado, dni.verificado);
    assert.deepEqual(r.entradas[0].relacionados, dni.relacionados);
    assert.equal(r.relacionadas?.[0].titulo, `GL ${porId("certificado-empadronamiento")!.titulo}`);
    assert.ok(!("pasos" in r.relacionadas![0]));
  });

  it("admite fichas cuya nota no existe en los datos originales", async () => {
    const localizar = crearLocalizador(async (m) => traduccionDePrueba(m));
    const r = await localizar({ ...base, entradas: [porId("certificado-empadronamiento")!] }, "gl");
    assert.equal(r.traduccionDisponible, true);
    assert.equal(r.entradas[0].nota, null);
  });

  it("comparte traducciones de fichas públicas entre peticiones simultáneas y posteriores", async () => {
    let llamadas = 0;
    const localizar = crearLocalizador(async (m) => { llamadas++; return traduccionDePrueba(m); });
    const [a, b] = await Promise.all([localizar(base, "gl"), localizar(base, "gl")]);
    const c = await localizar(base, "gl");
    assert.equal(llamadas, 1);
    assert.deepEqual(a, b);
    assert.deepEqual(a, c);
  });

  it("invalida la traducción cuando cambia el contenido público del PAG", async () => {
    let llamadas = 0;
    const localizar = crearLocalizador(async (m) => { llamadas++; return traduccionDePrueba(m); });
    await localizar(pag, "gl");
    const r = await localizar({ ...pag, pag: { ...pag.pag!, resultados: [{ ...ficha, descripcion: "Texto actualizado" }] } }, "gl");
    assert.equal(llamadas, 2);
    assert.equal(r.pag?.resultados[0].descripcion, "GL Texto actualizado");
  });

  it("traduce también la interfaz de idiomas sin diccionario estático", async () => {
    const localizar = crearLocalizador(async (m) => traduccionDePrueba(m, "FR "));
    const r = await localizar(base, "fr");
    assert.equal(r.traduccionDisponible, true);
    assert.equal(r.textos?.pagComo, `FR ${IDIOMAS_BASE.es.pagComo}`);
    assert.equal(r.textos?.esperaLenta, `FR ${IDIOMAS_BASE.es.esperaLenta}`);
  });

  it("no usa IA para respuestas en castellano ni avisos vacíos en idiomas conocidos", async () => {
    const localizar = crearLocalizador(async () => { throw new Error("No debe llamar al modelo"); });
    assert.equal((await localizar(base, "es")).traduccionDisponible, true);
    assert.equal((await localizar({ ...base, entradas: [] }, "gl")).traduccionDisponible, true);
  });

  it("rechaza cifras, dominios o listas alterados, campos extra y plazos inventados", () => {
    const original = { pasos: ["Consulta citapreviadnie.es en 15 días"], plazo: null };
    assert.equal(validarCampos(original, { pasos: ["Consulta citapreviadnie.es en 30 días"], plazo: null }), false);
    assert.equal(validarCampos(original, { pasos: ["Consulta estafa.es en 15 días"], plazo: null }), false);
    assert.equal(validarCampos(original, { pasos: [], plazo: null }), false);
    assert.equal(validarCampos(original, { ...original, fuente: "https://estafa.es" }), false);
    assert.equal(validarCampos(original, { ...original, plazo: "15 días" }), false);
  });

  it("no muestra el texto español del PAG si falla su traducción", async () => {
    const localizar = crearLocalizador(async () => { throw new Error("Servicio no disponible"); });
    const r = await localizar(pag, "gl");
    assert.equal(r.traduccionDisponible, false);
    const html = renderToStaticMarkup(<RespuestaChat turno={{ id: 1, pregunta: "Consulta simulada", estado: "listo", resultado: r }} chat={{ cargando: false } as Chat} />);
    assert.ok(html.includes(textosPara("gl").noTraduccion));
    assert.ok(html.includes(ficha.enlaceWeb!));
    assert.ok(!html.includes(ficha.descripcion!));
  });
});

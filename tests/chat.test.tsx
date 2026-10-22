import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RespuestaChat } from "../src/components/propuestas/respuesta-chat";
import { detectarRepregunta, type Chat, type TurnoChat } from "../src/components/propuestas/use-chat";
import { interpretarAmbito } from "../src/lib/ambito";
import { porId, type Resultado } from "../src/lib/catalogo";
import { detectarIdioma, textosPara } from "../src/lib/idioma";

const dni = porId("renovacion-dni")!;
const chat = { cargando: false, elegirAmbito() {}, abrirEntrada() {}, preguntar() {} } as unknown as Chat;
const resultado: Resultado = { entradas: [dni], fueraCatalogo: false, confianza: "alta", origen: "ia" };
function render(respuesta: Resultado) {
  const turno: TurnoChat = { id: 1, pregunta: "Consulta simulada", estado: "listo", resultado: respuesta };
  return renderToStaticMarkup(<RespuestaChat turno={turno} chat={chat} />);
}

describe("Conversación en el front", () => {
  it("entiende las repreguntas sin convertir una nueva gestión en una repregunta", () => {
    assert.equal(detectarRepregunta("¿Qué documentos necesito?"), "documentacion");
    assert.equal(detectarRepregunta("Quins documents necessite?"), "documentacion");
    assert.equal(detectarRepregunta("What documents do I need?"), "documentacion");
    assert.equal(detectarRepregunta("I després?"), "relacionados");
    assert.equal(detectarRepregunta("Quiero renovar el DNI"), undefined);
  });

  it("detecta el idioma y conserva las respuestas de ámbito neutras", () => {
    assert.equal(detectarIdioma("Vull renovar el DNI"), "ca");
    assert.equal(detectarIdioma("Quiero empadronarme en València"), "es");
    assert.equal(detectarIdioma("I need to renew my DNI"), "en");
    assert.equal(detectarIdioma("Local", "ca"), "ca");
    assert.equal(interpretarAmbito("No ho sé"), "desconocido");
    assert.equal(interpretarAmbito("Quiero renovar el DNI"), undefined);
  });

  it("admite las respuestas actuales de la API sin metadatos nuevos", () => {
    const html = render(resultado);
    assert.ok(html.includes(dni.titulo));
    assert.ok(html.includes(dni.pasos[0]));
    assert.ok(html.includes(dni.enlace_tramite!));
    assert.ok(html.includes("Fuentes"));
  });

  it("muestra la aclaración antes de presentar los pasos", () => {
    const html = render({ ...resultado, idioma: "ca", textos: textosPara("ca"), aclaracion: { opciones: ["local", "nacional"] } });
    assert.ok(html.includes("És un tràmit local o nacional?"));
    assert.ok(html.includes("Local · Ajuntament"));
    assert.ok(html.includes("Nacional · Estat"));
    assert.ok(html.includes("No ho sé"));
    assert.ok(!html.includes(dni.pasos[0]));
  });

  it("no presenta instrucciones sin traducir cuando el servidor señala un fallo", () => {
    const html = render({ ...resultado, idioma: "ca", textos: textosPara("ca"), traduccionDisponible: false });
    assert.ok(html.includes(textosPara("ca").noTraduccion));
    assert.ok(html.includes(dni.enlace_tramite!));
    assert.ok(!html.includes(dni.pasos[0]));
  });

  it("fuera de catálogo ofrece el buscador oficial sin inventar pasos", () => {
    const html = render({ ...resultado, entradas: [], fueraCatalogo: true });
    assert.ok(html.includes(textosPara("es").noConfirmado));
    assert.ok(html.includes("https://administracion.gob.es/tramites-electronicos/resultados-actuaciones"));
    assert.ok(!html.includes(dni.pasos[0]));
  });
});

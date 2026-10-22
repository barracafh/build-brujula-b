import { buscar } from "./buscar";
import { clasificar } from "./clasificar";
import { porId, relacionadas, type Entrada, type Resultado } from "./catalogo";
import { detectarIdioma, normalizarIdioma } from "./idioma";
import { localizarResultado } from "./localizar";
import { buscarPAG, motivoFalloPAG, urlBusquedaPAG } from "./pag";

const servicios = { clasificar, localizarResultado, buscarPAG, motivoFalloPAG };
type Peticion = { texto: string; idioma?: string; entradaId?: string; historial?: string[] };

// Dependencias explícitas para probar catálogo, idiomas y PAG sin llamadas reales.
export async function resolverConsulta({ texto, idioma: anterior, entradaId, historial }: Peticion, deps = servicios): Promise<Resultado> {
  const previo = normalizarIdioma(anterior) ?? "es";
  const directa = entradaId ? porId(entradaId) : undefined;
  const detectado = directa ? previo : detectarIdioma(texto, previo);
  const ia = directa ? null : await deps.clasificar(texto, { idiomaAnterior: detectado, historial });
  const idioma = directa ? previo : ia?.idioma ?? detectado;
  const coincidencias = !directa && !ia ? buscar(texto) : [];
  const origen: Resultado["origen"] = directa ? "frases" : ia ? "ia" : coincidencias[0]?.fuerte ? "frases" : "respaldo";
  const entradas = directa ? [directa] : (ia?.ids ?? coincidencias.map((c) => c.entrada.id)).map(porId).filter((e): e is Entrada => Boolean(e));
  const resultado: Resultado = {
    entradas, fueraCatalogo: entradas.length === 0, origen,
    confianza: origen === "respaldo" && entradas.length ? "baja" : "alta",
    relacionadas: [...new Map(entradas.flatMap(relacionadas).map((e) => [e.id, e])).values()],
  };
  if (resultado.fueraCatalogo && ia?.busqueda) {
    const resultados = await deps.buscarPAG(ia.busqueda, ia.ambito);
    resultado.pag = {
      consulta: ia.busqueda, url: urlBusquedaPAG(ia.busqueda), resultados,
      ...(resultados.length ? {} : { error: deps.motivoFalloPAG() ?? "sin motivo registrado" }),
    };
  }
  // Solo las fichas públicas se envían al traductor; nunca la consulta.
  return deps.localizarResultado(resultado, idioma);
}

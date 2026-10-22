import catalogo from "../../datos/catalogo-tramites-ayudas.json";
import type { Source } from "@/components/Fuentes";
import type { Textos } from "./idioma";
import type { AclaracionAmbito } from "./ambito";

// El catálogo de la organización es la única fuente de lo que se muestra:
// pasos, plazos, documentación y enlaces salen de aquí, nunca del modelo.
export type Entrada = {
  id: string;
  tipo: "tramite" | "ayuda";
  titulo: string;
  administracion: string;
  organismo: string;
  frases_usuario: string[];
  requisitos_clave: string[];
  pasos: string[];
  documentacion: string[];
  plazo: string | null;
  enlace_info: string;
  enlace_tramite: string | null;
  fuente: string;
  verificado: boolean;
  nota: string | null;
  relacionados: string[];
};

// Lo que devuelve POST /api/tramite y consume el buscador.
export type Resultado = {
  entradas: Entrada[];
  fueraCatalogo: boolean;
  // "baja" cuando solo hay una coincidencia débil de palabras y el modelo no pudo confirmarla.
  confianza: "alta" | "baja";
  origen: "frases" | "ia" | "respaldo";
  idioma?: string;
  textos?: Textos;
  aclaracion?: AclaracionAmbito;
  relacionadas?: Entrada[];
  traduccionDisponible?: boolean;
};

export const entradas = catalogo.items as unknown as Entrada[];
export const versionCatalogo = catalogo.version;

export const porId = (id: string) => entradas.find((e) => e.id === id);

export const relacionadas = (entrada: Entrada) =>
  entrada.relacionados
    .map(porId)
    .filter((e): e is Entrada => Boolean(e));

export const PAG: Source = {
  nombre: "Buscador de trámites del Punto de Acceso General",
  url: "https://administracion.gob.es/tramites-electronicos/resultados-actuaciones",
};

// Nombre legible de cada sede; si falta, se enseña el dominio.
const NOMBRES: Record<string, string> = {
  "sede.sepe.gob.es": "Sede electrónica del SEPE",
  "www.sepe.es": "SEPE",
  "www.boe.es": "BOE",
  "dogv.gva.es": "DOGV",
  "www.correos.es": "Correos",
  "www.ine.es": "INE · Oficina del Censo Electoral",
  "www.juntaelectoralcentral.es": "Junta Electoral Central",
  "sede.valencia.es": "Sede electrónica del Ajuntament de València",
  "www.valencia.es": "Ajuntament de València",
  "sede.dgt.gob.es": "Sede electrónica de la DGT",
  "www.dgt.es": "DGT",
  "sede.gva.es": "Sede electrónica de la Generalitat Valenciana",
  "www.gva.es": "Generalitat Valenciana",
  "labora.gva.es": "Labora",
  "sede.agenciatributaria.gob.es": "Sede electrónica de la Agencia Tributaria",
  "sede.seg-social.gob.es": "Sede electrónica de la Seguridad Social",
  "www.seg-social.es": "Seguridad Social",
  "imv.seg-social.es": "Ingreso Mínimo Vital · Seguridad Social",
  "portal.seg-social.gob.es": "Import@ss · Seguridad Social",
  "www.lamoncloa.gob.es": "La Moncloa",
  "www.cnmc.es": "CNMC",
  "www.bonosocial.gob.es": "Bono social · Gobierno de España",
  "www.citapreviadnie.es": "Cita previa DNI y pasaporte",
  "www.dnielectronico.es": "DNI electrónico · Policía Nacional",
  "sede.policia.gob.es": "Sede electrónica de la Policía Nacional",
  "clave.gob.es": "Cl@ve",
  "www.sede.fnmt.gob.es": "Sede de la FNMT",
  "administracion.gob.es": "Punto de Acceso General",
  "www.mivau.gob.es": "Ministerio de Vivienda",
  "ceice.gva.es": "Conselleria de Educación",
  "portal.edu.gva.es": "Conselleria de Educación",
  "www.san.gva.es": "Conselleria de Sanidad",
  "www.tramita.gva.es": "Tramita · Generalitat Valenciana",
  "revista.seg-social.es": "Revista de la Seguridad Social",
  "www1.agenciatributaria.gob.es": "Agencia Tributaria",
};

export function nombreFuente(url: string) {
  try {
    const host = new URL(url).hostname;
    return NOMBRES[host] ?? host;
  } catch {
    return url;
  }
}

// Las fuentes de una entrada: el campo `fuente` (varias URLs separadas por ";")
// y la página informativa. El enlace al trámite va aparte, en «Dónde se hace».
export function fuentesDe(entrada: Entrada): Source[] {
  const vistas = new Set<string>();
  return [...entrada.fuente.split(/\s*;\s*/), entrada.enlace_info]
    .map((u) => u.trim())
    .filter((u) => u && !vistas.has(u) && vistas.add(u))
    .map((url) => ({ nombre: nombreFuente(url), url }));
}

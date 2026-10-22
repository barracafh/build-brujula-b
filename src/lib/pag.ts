// Buscador de trámites del Punto de Acceso General (administracion.gob.es).
// No tiene API: la página pide un fragmento HTML a su CMS y lo pinta. Aquí
// pedimos ese mismo fragmento y sacamos título, código SIA, departamento y el
// enlace a la ficha oficial. Solo se usa cuando el catálogo no tiene respuesta,
// y si algo falla se devuelve una lista vacía: nunca bloquea la respuesta.
//
// El CMS sirve resultados de caché (de otra consulta) si la petición no lleva
// la cookie de sesión que crea la propia página, así que primero abrimos la
// página y pedimos el token, como hace el navegador.
export type ResultadoPAG = {
  codigoSia: string;
  titulo: string;
  departamento: string;
  administracion: string;
  // Ficha del trámite en el PAG.
  url: string;
  // De la ficha de detalle; null si no se pudo leer.
  descripcion: string | null;
  nivelTramitacion: string | null;
  centroDirectivo: string | null;
  // «Enlace web» de la ficha: la sede u organismo que gestiona el trámite.
  enlaceWeb: string | null;
};

export type AmbitoPAG = "estado" | "autonomico" | "local";

const BASE = "https://administracion.gob.es";
const PAGINA = `${BASE}/tramites-electronicos/resultados-actuaciones`;
const FRAGMENTO = `${BASE}/content/pag-home/es/tramites-electronicos/resultados-actuaciones/jcr:content/root/container/containerSpace/pag_front_formulario.list.html`;
const CABECERAS = {
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  "accept-language": "es",
};
const COMUNITAT_VALENCIANA = "10";
// Por petición; una búsqueda completa son 2 (sesión) + 1 + hasta 5 en paralelo.
const TIEMPO_MAXIMO = 8_000;

// Sesión compartida entre peticiones. Las cookies del balanceador (AWSALB)
// rotan en cada respuesta, así que se actualizan siempre; sin ellas la CDN
// devuelve el fragmento cacheado de otra consulta.
let cookies = "";
let sesionAbierta = 0;

function absorberCookies(res: Response) {
  const mapa = new Map<string, string>();
  for (const par of cookies.split("; ").filter(Boolean)) {
    const [k, ...v] = par.split("=");
    mapa.set(k, v.join("="));
  }
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [k, ...v] = c.split(";")[0].split("=");
    mapa.set(k, v.join("="));
  }
  cookies = [...mapa].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function pedir(url: string, extra: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { ...CABECERAS, ...extra, cookie: cookies },
    cache: "no-store",
    signal: AbortSignal.timeout(TIEMPO_MAXIMO),
  });
  absorberCookies(res);
  return res;
}

async function abrirSesion(forzar = false) {
  if (!forzar && sesionAbierta > Date.now()) return;
  cookies = "";
  for (const url of [PAGINA, `${BASE}/libs/granite/csrf/token.json`])
    await (await pedir(url)).arrayBuffer();
  sesionAbierta = Date.now() + 10 * 60_000;
}

const limpiar = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

// Fichas que no son un trámite que una persona pueda iniciar: convocatorias
// para entidades, contratos, oposiciones… El PAG las mezcla con lo demás.
const NO_CIUDADANIA =
  /convocatoria|acci[oó]n concertada|concierto social|subvenci|licitaci|contrataci|contrato|oposici|concurso|proveedor|entidades|acreditaci[oó]n de (centros|entidades|empresas)|habilitaci[oó]n (excepcional|de profesionales)/i;

// Tres: a partir del cuarto la relevancia del PAG decae mucho.
export function extraerResultados(html: string, max = 3): ResultadoPAG[] {
  const resultados: ResultadoPAG[] = [];
  for (const bloque of html.split(/class="col-12 dnt-item"/).slice(1)) {
    const titulo = bloque.match(/aria-label="([^"]+)"/)?.[1];
    const codigo = bloque.match(/Ref\.:<\/span>\s*<span>(\d+)/)?.[1];
    const administracion = bloque.match(/Administración:<\/span>\s*<span>([^<]+)/)?.[1];
    const departamento = bloque.match(/Departamento:<\/span>\s*<span>([^<]+)/)?.[1];
    if (!titulo || !codigo || NO_CIUDADANIA.test(titulo)) continue;
    resultados.push({
      codigoSia: codigo,
      titulo: limpiar(titulo),
      departamento: limpiar(departamento ?? ""),
      administracion: limpiar(administracion ?? ""),
      url: urlFicha(codigo),
      descripcion: null,
      nivelTramitacion: null,
      centroDirectivo: null,
      enlaceWeb: null,
    });
    if (resultados.length >= max) break;
  }
  return resultados;
}

// URL de la búsqueda en el propio PAG, para que la persona siga desde allí.
export const urlBusquedaPAG = (consulta: string) =>
  `${PAGINA}?${new URLSearchParams({ pag_descripcion: consulta })}`;

export const urlFicha = (codigoSia: string) =>
  `${PAGINA}/detalle-actuacion?codSia=${codigoSia}&selectorServicio=buscadorActuaciones`;

// La ficha de detalle, convertida a texto con «|» entre elementos para leer
// cada campo por su etiqueta («Descripción:», «Enlace web:»…).
const campo = (texto: string, etiqueta: string) => {
  const m = texto.match(new RegExp(`${etiqueta}:\\s*\\|\\s*([^|]+)`));
  return m ? limpiar(m[1]) : null;
};

export async function detallePAG(codigoSia: string) {
  const res = await pedir(urlFicha(codigoSia));
  if (!res.ok) throw new Error(`PAG ficha ${res.status}`);
  const html = await res.text();
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  const texto = limpiar(
    main
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "")
      .replace(/<[^>]+>/g, " | ")
      .replace(/(\s*\|\s*)+/g, " | "),
  );
  const enlaceWeb =
    texto.match(/Enlace web:\s*\|\s*(https?:\/\/\S+)/)?.[1] ??
    main.match(/href="(https?:\/\/(?!administracion\.gob\.es)[^"]+)"/)?.[1] ??
    null;
  return {
    descripcion: campo(texto, "Descripción"),
    nivelTramitacion: campo(texto, "Nivel de tramitación electrónica"),
    centroDirectivo: campo(texto, "Centro directivo"),
    enlaceWeb,
  };
}

// Completa cada resultado con su ficha, en paralelo; si una falla, se queda
// con los datos de la lista.
async function enriquecer(resultados: ResultadoPAG[]) {
  return Promise.all(
    resultados.map(async (r) => {
      try {
        return { ...r, ...(await detallePAG(r.codigoSia)) };
      } catch {
        return r;
      }
    }),
  );
}

// Una ficha solo vale si comparte alguna raíz con la consulta en el título o
// la descripción; si no, el PAG ha devuelto relleno («turismo social» para
// «tratamiento adicciones alcohol») y es mejor no enseñar nada.
// Palabras que aparecen en miles de fichas y no distinguen nada: solo cuentan
// las raíces específicas de la consulta («pasap», «matri», «alcoh»).
const GENERICAS = new Set(
  `solicitud solicitar tramite tramitacion tratamiento renovacion renovar expedicion
   ayuda ayudas subvencion servicio servicios gestion certificado certificacion
   cita previa informacion inscripcion registro programa autorizacion declaracion
   comunicacion reconocimiento prestacion procedimiento convocatoria general`
    .split(/\s+/)
    .filter(Boolean),
);
const raices = (texto: string) => {
  const palabras = normalizarTexto(texto).split(" ").filter((p) => p.length >= 4);
  const especificas = palabras.filter((p) => !GENERICAS.has(p));
  // De más a menos específica: la palabra más larga primero.
  return (especificas.length ? especificas : palabras)
    .sort((a, b) => b.length - a.length)
    .map((p) => p.slice(0, 5));
};
const normalizarTexto = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ");
// Vale si contiene la raíz más específica («depen» en «reconocimiento grado
// dependencia») o al menos dos raíces; «grado» a solas no basta.
export const pertinente = (r: ResultadoPAG, consulta: string) => {
  const texto = normalizarTexto(`${r.titulo} ${r.descripcion ?? ""}`);
  const [principal, ...resto] = raices(consulta);
  if (!principal || texto.includes(principal)) return true;
  return resto.filter((raiz) => texto.includes(raiz)).length >= 2;
};

// Motivo del último fallo del PAG, para diagnosticar en producción (sin la consulta).
let ultimoFallo: string | null = null;
export const motivoFalloPAG = () => ultimoFallo;

export async function buscarPAG(
  consulta: string,
  ambito: AmbitoPAG = "estado",
): Promise<ResultadoPAG[]> {
  ultimoFallo = null;
  try {
    await abrirSesion();
    const filtros: Record<string, string> = {
      pag_descripcion: consulta,
      pag_orders: "relevanciatramites",
    };
    if (ambito === "estado") filtros.pag_ambito = "1";
    if (ambito === "autonomico") {
      filtros.pag_ambito = "2";
      filtros.pag_comunidadAutonoma = COMUNITAT_VALENCIANA;
    }
    if (ambito === "local") {
      filtros.pag_ambito = "3";
      filtros.pag_comunidadAutonoma = COMUNITAT_VALENCIANA;
    }
    const url = `${FRAGMENTO}?${new URLSearchParams(filtros)}`;
    const ajax = { "x-requested-with": "XMLHttpRequest", referer: PAGINA };
    let res = await pedir(url, ajax);
    // Si la CDN sirvió de caché, la sesión no valía: una nueva y otro intento.
    if (/hit/i.test(res.headers.get("x-cache") ?? "")) {
      await abrirSesion(true);
      res = await pedir(url, ajax);
    }
    if (!res.ok) throw new Error(`PAG respondió ${res.status}`);
    const html = await res.text();
    const lista = extraerResultados(html, 10);
    if (!lista.length) {
      ultimoFallo = `sin fichas en el fragmento (${html.length} bytes, x-cache ${res.headers.get("x-cache") ?? "-"})`;
      console.warn(`pag: ${ultimoFallo}`);
      return [];
    }
    // Primero las que ya encajan por título; se completan como mucho cinco y
    // se devuelven las tres primeras que sigan encajando con su descripción.
    const porTitulo = lista.filter((r) => pertinente(r, consulta));
    const candidatas = (porTitulo.length ? porTitulo : lista).slice(0, 5);
    const ricas = await enriquecer(candidatas);
    // Primero las que llevan la raíz principal en el título; después, por
    // cuántas raíces de la consulta contienen.
    const [principal, ...resto] = raices(consulta);
    const puntuacion = (r: ResultadoPAG) => {
      const titulo = normalizarTexto(r.titulo);
      const texto = normalizarTexto(`${r.titulo} ${r.descripcion ?? ""}`);
      return (
        (principal && titulo.includes(principal) ? 10 : 0) +
        [principal, ...resto].filter((raiz) => raiz && texto.includes(raiz)).length
      );
    };
    const finales = ricas
      .filter((r) => pertinente(r, consulta))
      .sort((a, b) => puntuacion(b) - puntuacion(a))
      .slice(0, 3);
    if (!finales.length) {
      ultimoFallo = `${lista.length} fichas, ninguna pertinente`;
      console.warn(`pag: ${ultimoFallo}`);
    }
    return finales;
  } catch (e) {
    // Solo el motivo, nunca la consulta.
    ultimoFallo = (e as Error).message;
    console.warn(`pag: sin resultados (${ultimoFallo})`);
    sesionAbierta = 0;
    return [];
  }
}

// Pasa la hoja de escenarios contra el servidor local y compara el resultado.
//
//   bun scripts/probar.ts                        contra http://localhost:3000/brujula-b
//   BASE=https://build.barraca.house/brujula-b bun scripts/probar.ts
//
// Cada fila dice qué ids espera (vacío = fuera de catálogo), qué debe aparecer
// en «Y después» y, para las de validación, el código HTTP. La columna
// «origen» cuenta quién respondió: frases (buscador), ia (modelo) o respaldo
// (el modelo falló y respondió el buscador: con ia-local, falta una fixture).
import { resolve } from "node:path";

type Escenario = {
  n: number | string;
  texto: string;
  espera?: string[];
  despues?: string[];
  estado?: number;
};

const BASE = process.env.BASE ?? "http://localhost:3000/brujula-b";
const escenarios: Escenario[] = await Bun.file(
  resolve(import.meta.dir, "escenarios.json"),
).json();

let fallos = 0;
for (const e of escenarios) {
  const texto = e.texto === "<2500>" ? "a".repeat(2500) : e.texto;
  const res = await fetch(`${BASE}/api/tramite`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ texto }),
  });
  const datos = (await res.json().catch(() => ({}))) as {
    entradas?: { id: string; relacionados: string[] }[];
    fueraCatalogo?: boolean;
    origen?: string;
  };
  const ids = (datos.entradas ?? []).map((x) => x.id);
  const esperaba = e.estado
    ? `HTTP ${e.estado}`
    : e.espera?.length
      ? e.espera.join(", ")
      : "fuera de catálogo";

  let ok: boolean;
  if (e.estado) ok = res.status === e.estado;
  else {
    const espera = e.espera ?? [];
    const primero = espera.length
      ? ids[0] === espera[0]
      : datos.fueraCatalogo === true;
    const resto = espera.slice(1).every((id) => ids.includes(id));
    const despues = (e.despues ?? []).every((id) =>
      datos.entradas?.[0]?.relacionados.includes(id),
    );
    ok = res.ok && primero && resto && despues;
  }
  if (!ok) fallos++;

  const origen = e.estado ? `http ${res.status}` : (datos.origen ?? `http ${res.status}`);
  const aviso = origen === "respaldo" ? "  ⚠ respondió el buscador, no el modelo" : "";
  console.log(
    `${ok ? "OK   " : "FALLO"} #${String(e.n).padEnd(3)} ${origen.padEnd(8)} ${JSON.stringify(e.texto)} → ${ids.join(", ") || (e.estado ? "" : "fuera de catálogo")}${ok ? "" : `   (esperaba ${esperaba})`}${aviso}`,
  );
}

console.log(`\n${escenarios.length - fallos}/${escenarios.length} escenarios correctos`);
process.exit(fallos ? 1 : 0);

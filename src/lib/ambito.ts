export type Ambito = "local" | "autonomico" | "nacional";
export type AclaracionAmbito = { opciones: Ambito[]; ayuda?: boolean };
const normalizar = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function ambitoExplicito(texto: string): Ambito | undefined {
  const t = normalizar(texto);
  const encontrados: Ambito[] = [];
  if (/\b(ayuntamiento|ajuntament|municipal|municipio|local|town council|city council)\b/.test(t)) encontrados.push("local");
  if (/\b(generalitat|autonomic[oa]?|autonomico|regional|labora|sip)\b/.test(t)) encontrados.push("autonomico");
  if (/\b(dgt|nacional|national|estatal|estado|estat|sepe|dni|irpf|fnmt|clave|seguridad social|seguretat social|direccion general de trafico|direccio general de transit)\b/.test(t)) encontrados.push("nacional");
  return encontrados.length === 1 ? encontrados[0] : undefined;
}

export function interpretarAmbito(texto: string): Ambito | "desconocido" | undefined {
  const t = normalizar(texto).replace(/[¿?¡!.,]/g, "").trim();
  if (/^(no (lo |ho )?se|no estoy segur[oa]|no estic segur[ae]?|i don'?t know|not sure)$/.test(t)) return "desconocido";
  if (t.split(/\s+/).length > 12 || /\b(quiero|necesito|vull|necessite|renew|renovar|i need|i want)\b/.test(t)) return;
  return ambitoExplicito(t);
}

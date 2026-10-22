import type { Resultado } from "./catalogo";

// El resumen que Brújula lee en voz alta. Se compone solo con texto del
// catálogo: como en la pantalla, el modelo nunca redacta la respuesta.
export function resumenVoz(resultado: Resultado): string {
  const entrada = resultado.entradas[0];
  if (!entrada)
    return "No he encontrado ese trámite en el catálogo. Escríbelo en el buscador o mira en la sede oficial; el enlace te lo dejo en pantalla.";

  const partes: string[] = [];
  if (resultado.confianza === "baja")
    partes.push("No estoy del todo seguro de que sea esto, pero miro.");

  partes.push(`Te corresponde: ${entrada.titulo}.`);

  const pasos = entrada.pasos;
  if (pasos.length === 1) partes.push(`Un solo paso: ${pasos[0]}`);
  else if (pasos.length > 1) {
    partes.push(`Son ${pasos.length} pasos. El primero: ${primero(pasos[0])}`);
    partes.push(`El segundo: ${primero(pasos[1])}.`);
  }

  partes.push(
    entrada.plazo
      ? `El plazo: ${entrada.plazo}`
      : "No hay plazo fijo: se puede pedir en cualquier momento.",
  );

  partes.push("Te dejo la documentación y el enlace a la sede en pantalla. Pulsa el micrófono si quieres que sigamos.");
  return partes.join(" ");
}

// Recorta un paso a una frase razonable para leer en voz alta.
const primero = (paso: string) => {
  const corto = paso.length > 140 ? `${paso.slice(0, 140).trimEnd()}…` : paso;
  return corto.charAt(0).toLowerCase() + corto.slice(1);
};

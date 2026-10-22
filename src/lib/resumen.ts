import type { Resultado } from "./catalogo";

// Lo que Brújula lee en voz alta. Es, tal cual, lo que devuelve la API
// (/api/tramite): título, todos los pasos en su orden, documentación, plazo y
// organismo. Nada se inventa ni se resume: el catálogo manda, como en pantalla.
export function resumenVoz(resultado: Resultado): string {
  const entrada = resultado.entradas[0];
  if (!entrada)
    return "No he encontrado ese trámite en el catálogo. Escríbelo en el buscador o mira en la sede oficial; el enlace te lo dejo en pantalla.";

  const partes: string[] = [];
  if (resultado.confianza === "baja")
    partes.push("No estoy del todo seguro de que sea esto, pero miro.");

  partes.push(
    `${entrada.tipo === "ayuda" ? "La ayuda" : "El trámite"} que te corresponde es: ${entrada.titulo}.`,
  );

  entrada.pasos.forEach((paso, i) => {
    partes.push(`Paso ${i + 1}: ${paso}.`);
  });

  if (entrada.documentacion.length)
    partes.push(`Vas a necesitar: ${lista(entrada.documentacion)}.`);

  partes.push(
    entrada.plazo
      ? `Atención al plazo: ${entrada.plazo}.`
      : "No hay plazo fijo: se puede pedir en cualquier momento.",
  );

  partes.push(
    `Lo tramita ${entrada.organismo}. El enlace a la sede y más detalles te los dejo en pantalla.`,
  );
  return partes.join(" ");
}

// Una lista leída con naturalidad: "a, b y c".
const lista = (elementos: string[]) => {
  if (elementos.length <= 1) return elementos[0] ?? "";
  return `${elementos.slice(0, -1).join(", ")} y ${elementos[elementos.length - 1]}`;
};

import type { Metadata } from "next";
import { VistaB } from "@/components/propuestas/VistaB";

export const metadata: Metadata = { title: "B · Conversación | Brújula" };

export default function Page() {
  return <VistaB />;
}

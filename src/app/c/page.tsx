import type { Metadata } from "next";
import { VistaC } from "@/components/propuestas/VistaC";

export const metadata: Metadata = { title: "Brújula · Tu guía de trámites" };

export default function Page() {
  return <VistaC />;
}

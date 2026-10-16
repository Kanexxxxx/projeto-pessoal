import { notFound } from "next/navigation";
import { slugValido } from "@/servidor/hosts";

export const dynamic = "force-dynamic";

export default async function PaginaLoja({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugValido(slug)) notFound();
  // A loja ainda não é buscada no banco (T06). Até lá, nenhuma loja existe.
  notFound();
}

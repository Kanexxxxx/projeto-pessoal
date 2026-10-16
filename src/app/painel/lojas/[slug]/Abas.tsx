"use client";

import { usePathname } from "next/navigation";

export function Abas({ slug, gestao }: { slug: string; gestao: boolean }) {
  const caminho = usePathname();
  const base = `/lojas/${slug}`;
  const abas = [
    { href: base, rotulo: "Resumo" },
    { href: `${base}/agenda`, rotulo: "Agenda" },
    ...(gestao
      ? [
          { href: `${base}/servicos`, rotulo: "Serviços" },
          { href: `${base}/profissionais`, rotulo: "Profissionais e horários" },
          { href: `${base}/bloqueios`, rotulo: "Folgas e bloqueios" },
          { href: `${base}/site`, rotulo: "Site" },
          { href: `${base}/acessos`, rotulo: "Acessos" },
        ]
      : []),
  ];
  return (
    <nav aria-label="Seções da loja" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-(--borda)">
        {abas.map((a) => {
          const atual = a.href === base ? caminho === base : caminho.startsWith(a.href);
          return (
            <li key={a.href}>
              <a
                href={a.href}
                aria-current={atual ? "page" : undefined}
                className={`-mb-px inline-block border-b-2 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--destaque) ${
                  atual ? "border-(--destaque) font-medium" : "border-transparent text-(--suave) hover:text-(--texto)"
                }`}
              >
                {a.rotulo}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

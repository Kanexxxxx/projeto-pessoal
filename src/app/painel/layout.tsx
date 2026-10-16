import { config } from "@/servidor/config";

export const dynamic = "force-dynamic";

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { marca } = config();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-(--borda) px-4 py-3">
        <a href="/" className="font-semibold tracking-tight">
          {marca} <span className="font-normal text-(--suave)">· painel</span>
        </a>
      </header>
      <div className="flex flex-1 flex-col px-4 py-10">{children}</div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ReceiptImporter } from "@/components/receipt-importer";
import { getCurrentUser } from "@/lib/current-user";

export default async function ReceiptPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return <div className="min-h-screen pb-24 md:pb-0"><Navbar /><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Digitalização assistida</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Transforme a nota em inteligência de compra.</h1><p className="mt-4 max-w-3xl text-slate-600">Mapeie produtos, quantidade e valores para comparar o que foi pago com os catálogos monitorados.</p><div className="mt-8"><ReceiptImporter /></div></main></div>;
}

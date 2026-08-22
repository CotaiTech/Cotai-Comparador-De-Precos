"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, ExternalLink, FileScan, QrCode, ShoppingCart } from "lucide-react";
import { parseReceiptText, ParsedReceiptItem } from "@/lib/receipt-parser";
import { formatCurrency } from "@/lib/format";

const cartStorageKey = "compra-certa-cart";

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => { detect(source: ImageBitmap): Promise<Array<{ rawValue: string }>> };

export function ReceiptImporter() {
  const [imageUrl, setImageUrl] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [text, setText] = useState("");
  const [items, setItems] = useState<ParsedReceiptItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setReceiptUrl("");
    setMessage("Foto carregada. Revise os itens pelo texto da nota abaixo.");

    try {
      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) return;
      const bitmap = await createImageBitmap(file);
      const codes = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
      const value = codes.find((code) => /^https?:\/\//.test(code.rawValue))?.rawValue;
      if (value) {
        setReceiptUrl(value);
        setMessage("QR Code da nota identificado. Você pode abrir o documento fiscal e copiar os itens para revisão.");
      }
    } catch {
      setMessage("Foto carregada. O QR Code não pôde ser lido neste navegador; use a revisão por texto.");
    }
  }

  function analyze() {
    const parsed = parseReceiptText(text);
    setItems(parsed);
    setMessage(parsed.length > 0 ? `${parsed.length} itens identificados. Revise antes de importar.` : "Não encontramos linhas com produto e preço. Use uma linha por item, como: Arroz 5kg R$ 25,90.");
  }

  function importItems() {
    const current = JSON.parse(localStorage.getItem(cartStorageKey) ?? "[]") as Array<{ id: string; query: string; quantity: number; latestKnownPrice: number }>;
    const next = [...current];
    for (const item of items) {
      const existing = next.find((entry) => entry.query.toLowerCase() === item.name.toLowerCase());
      if (existing) existing.quantity += Math.max(1, Math.round(item.quantity));
      else next.unshift({ id: `receipt-${Date.now()}-${next.length}`, query: item.name, quantity: Math.max(1, Math.round(item.quantity)), latestKnownPrice: item.unitPrice });
    }
    localStorage.setItem(cartStorageKey, JSON.stringify(next));
    setMessage("Itens importados para Minha lista. Agora você pode comparar o que foi comprado.");
  }

  return <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">
    <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Camera className="h-5 w-5" /></div><h2 className="mt-5 text-2xl font-semibold">Foto do cupom fiscal</h2><p className="mt-2 text-sm leading-6 text-slate-500">Envie uma foto nítida. O navegador tentará identificar o QR Code da NFC-e; a extração visual completa por OCR ainda está em fase beta.</p><label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-5 font-semibold text-emerald-800"><FileScan className="h-5 w-5" />Selecionar foto<input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" /></label>{imageUrl ? <Image unoptimized src={imageUrl} width={800} height={600} alt="Prévia da nota fiscal" className="mt-5 max-h-80 w-full rounded-2xl bg-slate-100 object-contain" /> : null}{receiptUrl ? <a href={receiptUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"><span className="flex items-center gap-2"><QrCode className="h-4 w-4" />Abrir NFC-e identificada</span><ExternalLink className="h-4 w-4" /></a> : null}</section>
    <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm"><h2 className="text-2xl font-semibold">Revisão assistida</h2><p className="mt-2 text-sm text-slate-500">Cole o texto da nota ou digite os itens. O CotaÍ identifica linhas que terminam em um valor.</p><textarea value={text} onChange={(event) => setText(event.target.value)} rows={9} placeholder={"Arroz Tipo 1 5kg R$ 25,90\nFeijão Carioca 2 x 7,99 R$ 15,98\nÓleo de Soja 900ml R$ 8,49"} className="mt-5 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /><button onClick={analyze} className="mt-3 w-full rounded-2xl bg-slate-950 px-5 py-3.5 font-semibold text-white">Mapear produtos e valores</button>{message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800">{message}</p> : null}{items.length > 0 ? <div className="mt-5 space-y-2">{items.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"><div><p className="font-medium">{item.name}</p><p className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p></div><p className="font-semibold">{formatCurrency(item.total)}</p></div>)}<button onClick={importItems} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 font-semibold text-white"><ShoppingCart className="h-5 w-5" />Importar para Minha lista</button></div> : null}</section>
  </div>;
}

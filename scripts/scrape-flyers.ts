import { scrapeBahamasFlyers, scrapeBhFlyers } from "@/scrapers/flyers";
import { scrapeSupermercadoEscolaProducts } from "@/scrapers/supermercado-escola";
import { db as prisma } from "@/lib/db";

const args = process.argv.slice(2);
const storeIndex = args.indexOf("--store");
const selectedStore = storeIndex >= 0 ? args[storeIndex + 1] : undefined;
const concurrencyIndex = args.indexOf("--concurrency");
const maxPagesIndex = args.indexOf("--max-pages");

function readPositiveInteger(index: number) {
  if (index < 0) {
    return undefined;
  }

  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Expected a positive integer after ${args[index]}.`);
  }

  return value;
}

async function main() {
  const escolaOptions = {
    concurrency: readPositiveInteger(concurrencyIndex),
    maxPages: readPositiveInteger(maxPagesIndex),
  };
  const scrapers = [
    {
      key: "escola",
      label: "Supermercado Escola",
      scrape: () => scrapeSupermercadoEscolaProducts(escolaOptions),
    },
    { key: "bh", label: "Supermercados BH", scrape: scrapeBhFlyers },
    { key: "bahamas", label: "Bahamas", scrape: scrapeBahamasFlyers },
  ].filter((entry) => !selectedStore || entry.key === selectedStore);

  if (scrapers.length === 0) {
    throw new Error("Use --store escola, --store bh ou --store bahamas.");
  }

  for (const entry of scrapers) {
    const products = await entry.scrape();
    const flyers = new Set(products.map((product) => product.productUrl)).size;
    console.log(`${entry.label}: ${products.length} produto(s) atualizados no banco a partir de ${flyers} fonte(s).`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

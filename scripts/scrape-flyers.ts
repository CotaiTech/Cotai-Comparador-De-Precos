import { scrapeBahamasFlyers, scrapeBhFlyers } from "@/scrapers/flyers";
import { scrapeSupermercadoEscolaProducts } from "@/scrapers/supermercado-escola";

const args = process.argv.slice(2);
const storeIndex = args.indexOf("--store");
const selectedStore = storeIndex >= 0 ? args[storeIndex + 1] : undefined;

async function main() {
  const scrapers = [
    { key: "escola", label: "Supermercado Escola", scrape: scrapeSupermercadoEscolaProducts },
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

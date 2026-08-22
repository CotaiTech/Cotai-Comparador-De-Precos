import { scrapeBahamasFlyers, scrapeBhFlyers } from "@/scrapers/flyers";

const args = process.argv.slice(2);
const storeIndex = args.indexOf("--store");
const selectedStore = storeIndex >= 0 ? args[storeIndex + 1] : undefined;
const printJson = args.includes("--json");

async function main() {
  const scrapers = [
    { key: "bh", label: "Supermercados BH", scrape: scrapeBhFlyers },
    { key: "bahamas", label: "Bahamas", scrape: scrapeBahamasFlyers },
  ].filter((entry) => !selectedStore || entry.key === selectedStore);

  if (scrapers.length === 0) {
    throw new Error("Use --store bh ou --store bahamas.");
  }

  for (const entry of scrapers) {
    const products = await entry.scrape();
    if (printJson) {
      console.log(JSON.stringify({ store: entry.key, products }, null, 2));
      continue;
    }

    const flyers = new Set(products.map((product) => product.productUrl)).size;
    console.log(`${entry.label}: ${products.length} produtos reais extraídos de ${flyers} folheto(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

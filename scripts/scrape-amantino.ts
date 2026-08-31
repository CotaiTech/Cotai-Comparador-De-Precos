import { scrapeAllAmantinoSeededProducts, scrapeAmantinoProducts } from "@/scrapers/amantino";
import { db as prisma } from "@/lib/db";

const args = process.argv.slice(2);
const queryIndex = args.indexOf("--query");
const promotionsOnly = args.includes("--promocoes");
const resume = args.includes("--resume");

async function main() {
  if (queryIndex >= 0 && args[queryIndex + 1]) {
    const query = args[queryIndex + 1];
    const products = await scrapeAmantinoProducts({ query });
    console.log(`Amantino: ${products.length} produto(s) atualizados para "${query}".`);
    return;
  }

  if (promotionsOnly) {
    const promotions = await scrapeAmantinoProducts({ promotionsOnly: true });
    console.log(`Amantino: ${promotions.length} promoção(ões) atualizadas.`);
    return;
  }

  const products = await scrapeAllAmantinoSeededProducts({ resume });
  console.log(`Amantino: ${products.length} produto(s) atualizados no banco.`);
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

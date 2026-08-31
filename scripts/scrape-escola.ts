import { scrapeSupermercadoEscolaProducts } from "@/scrapers/supermercado-escola";
import { db as prisma } from "@/lib/db";

const args = process.argv.slice(2);
const queryIndex = args.indexOf("--query");
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
  const query = queryIndex >= 0 ? args[queryIndex + 1] : undefined;
  const concurrency = readPositiveInteger(concurrencyIndex);
  const maxPages = readPositiveInteger(maxPagesIndex);
  const products = await scrapeSupermercadoEscolaProducts({ query, concurrency, maxPages });

  console.log(
    query
      ? `Supermercado Escola: ${products.length} produto(s) atualizados para "${query}".`
      : `Supermercado Escola: ${products.length} produto(s) atualizados no banco.`
  );
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

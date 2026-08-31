import { scrapeSupermercadoEscolaProducts } from "@/scrapers/supermercado-escola";
import { db as prisma } from "@/lib/db";

const args = process.argv.slice(2);
const queryIndex = args.indexOf("--query");

async function main() {
  const query = queryIndex >= 0 ? args[queryIndex + 1] : undefined;
  const products = await scrapeSupermercadoEscolaProducts({ query });

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
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { Product } from "@/providers/types";

type CategoryState = {
  key: string;
  label: string;
  status: "running" | "succeeded" | "failed";
  startedAt?: string;
  finishedAt?: string;
  productCount?: number;
  error?: SerializedError;
};

type ScraperState = {
  scraperKey: string;
  updatedAt: string;
  categories: Record<string, CategoryState>;
};

type SerializedError = {
  name?: string;
  message: string;
  stack?: string;
};

type ProgressOptions = {
  resume?: boolean;
  runDir?: string;
};

type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

const DEFAULT_RUN_DIR = ".scraper-runs";

function resolveRunDir(runDir?: string) {
  return path.resolve(process.cwd(), runDir ?? process.env.SCRAPER_RUN_DIR ?? DEFAULT_RUN_DIR);
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readState(statePath: string, scraperKey: string): Promise<ScraperState> {
  try {
    const rawState = await readFile(statePath, "utf8");
    const parsed = JSON.parse(rawState) as ScraperState;

    if (parsed.scraperKey === scraperKey && parsed.categories) {
      return parsed;
    }
  } catch {
    // Missing or invalid state should not block a scraper run.
  }

  return {
    scraperKey,
    updatedAt: new Date().toISOString(),
    categories: {},
  };
}

export async function createScraperProgress(scraperKey: string, options: ProgressOptions = {}) {
  const runDir = resolveRunDir(options.runDir);
  const statePath = path.join(runDir, `${scraperKey}-state.json`);
  const eventsPath = path.join(runDir, `${scraperKey}-events.jsonl`);
  await mkdir(runDir, { recursive: true });

  const state = options.resume
    ? await readState(statePath, scraperKey)
    : {
        scraperKey,
        updatedAt: new Date().toISOString(),
        categories: {},
      };

  async function persistState() {
    state.updatedAt = new Date().toISOString();
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  }

  async function appendEvent(event: Record<string, unknown>) {
    await appendFile(
      eventsPath,
      `${JSON.stringify({
        scraperKey,
        at: new Date().toISOString(),
        ...event,
      })}\n`
    );
  }

  return {
    statePath,
    eventsPath,
    isCompleted(categoryKey: string) {
      return state.categories[categoryKey]?.status === "succeeded";
    },
    async startCategory(categoryKey: string, label: string, index: number, total: number) {
      state.categories[categoryKey] = {
        key: categoryKey,
        label,
        status: "running",
        startedAt: new Date().toISOString(),
      };
      await persistState();
      await appendEvent({ type: "category-started", categoryKey, label, index, total });
    },
    async succeedCategory(categoryKey: string, label: string, productCount: number) {
      state.categories[categoryKey] = {
        ...(state.categories[categoryKey] ?? { key: categoryKey, label }),
        status: "succeeded",
        finishedAt: new Date().toISOString(),
        productCount,
      };
      await persistState();
      await appendEvent({ type: "category-succeeded", categoryKey, label, productCount });
    },
    async failCategory(
      categoryKey: string,
      label: string,
      error: unknown,
      productCount?: number
    ) {
      const serializedError = serializeError(error);
      state.categories[categoryKey] = {
        ...(state.categories[categoryKey] ?? { key: categoryKey, label }),
        status: "failed",
        finishedAt: new Date().toISOString(),
        productCount,
        error: serializedError,
      };
      await persistState();
      await appendEvent({
        type: "category-failed",
        categoryKey,
        label,
        productCount,
        error: serializedError,
      });
    },
    async writeFailureSnapshot(
      categoryKey: string,
      label: string,
      products: Product[],
      error: unknown
    ) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${scraperKey}-${timestamp}-${categoryKey.replace(/[^a-z0-9-]+/gi, "-")}.json`;
      const snapshotPath = path.join(runDir, filename);
      await writeFile(
        snapshotPath,
        `${JSON.stringify(
          {
            scraperKey,
            categoryKey,
            label,
            failedAt: new Date().toISOString(),
            error: serializeError(error),
            products,
          },
          null,
          2
        )}\n`
      );
      await appendEvent({
        type: "category-failure-snapshot",
        categoryKey,
        label,
        productCount: products.length,
        snapshotPath,
      });
      return snapshotPath;
    },
  };
}

export async function withScraperRetry<T>(
  label: string,
  operation: () => Promise<T>,
  options: RetryOptions = {}
) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 5_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      const waitMs = Math.min(60_000, baseDelayMs * 2 ** (attempt - 1));
      console.warn(
        `${label} failed; retrying in ${waitMs}ms (${attempt}/${maxAttempts})...`
      );
      await delay(waitMs);
    }
  }

  throw new Error(`${label} retry loop exhausted.`);
}

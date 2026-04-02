import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use DB_PATH if set (production), otherwise fall back to prisma/dev.db (development)
const dbPath = process.env.DB_PATH
  ? process.env.DB_PATH
  : path.join(__dirname, "prisma", "dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "file:" + dbPath,
  },
});

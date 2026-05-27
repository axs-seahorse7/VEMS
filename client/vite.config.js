import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from "fs";                              // ← add this
import { fileURLToPath } from "url";                           // ← add this
import { dirname, resolve } from "path"

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const { version } = JSON.parse(
  readFileSync(resolve(__dirname, "./package.json"), "utf-8")  // ← use resolve for safety
);

console.log(">>> Building with version:", version); // confirm in terminal


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
  },
})

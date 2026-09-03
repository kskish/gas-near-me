// import react from '@vitejs/plugin-react'
// import { defineConfig } from 'vite'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/gas-api": {
        target: "https://www.gasquebec.ca",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gas-api/, ""),
      },
    },
  },
});
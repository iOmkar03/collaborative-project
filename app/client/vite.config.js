import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(
        path.resolve(__dirname, "E:/MERN/Projests/FInlaYearProject/server.key"),
      ),
      cert: fs.readFileSync(
        path.resolve(
          __dirname,
          "E:/MERN/Projests/FInlaYearProject/server.cert",
        ),
      ),
    },
    host: "0.0.0.0", // Expose to local network
    port: 5173, // Use the port of your choice
  },
});

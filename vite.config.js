import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identificador único de cada build: la app lo incrusta (__BUILD_ID__) y el mismo
// valor se publica como /version.json. UpdateBanner compara ambos periódicamente
// para avisar de que hay una versión nueva desplegada sin obligar a recargar.
const buildId = String(Date.now())

const emitVersionJson = () => ({
  name: 'emit-version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId }) })
  },
})

export default defineConfig({
  plugins: [react(), emitVersionJson()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    port: 3000,
    open: true
  }
})

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // O Vite resolve os aliases do `tsconfig.json` (`@/*`) nativamente — o plugin
  // `vite-tsconfig-paths`, que o `backend` ainda usa, virou `tsconfigPaths`.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    // Só o que é TypeScript puro: `src/utils/` e `src/types/`. Componente, hook e
    // tela dependem de React Native e do `expo-location`, e testá-los aqui exigiria
    // o ambiente de render que o MVP não tem.
    include: ['src/**/*.spec.ts'],
  },
});
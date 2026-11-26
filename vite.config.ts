import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function collectHtmlInputs(rootDir: string): Record<string, string> {
  const inputs: Record<string, string> = {
    main: path.resolve(rootDir, 'index.html'),
  };
  const pagesDir = path.resolve(rootDir, 'pages');
  if (!fs.existsSync(pagesDir)) {
    return inputs;
  }
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const rel = path.relative(rootDir, full).replace(/\.html$/, '').replace(/[\\/]/g, '_');
        inputs[rel] = full;
      }
    }
  };
  walk(pagesDir);
  return inputs;
}

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'copy-static-pwa-assets',
        apply: 'build' as const,
        closeBundle(error?: Error): void {
          if (error) return;
          const distDir = path.resolve(__dirname, 'dist');
          if (!fs.existsSync(distDir)) return;

          const copyDirs = ['css', 'assets'];
          for (const dir of copyDirs) {
            const src = path.resolve(__dirname, dir);
            const dest = path.resolve(distDir, dir);
            if (fs.existsSync(src)) {
              fs.cpSync(src, dest, {recursive: true, force: true});
            }
          }

          const staticFiles = [
            'js/main.js',
            'js/tool-core.js',
            'manifest.json',
            'sw.js',
          ];
          for (const rel of staticFiles) {
            const src = path.resolve(__dirname, rel);
            const dest = path.resolve(distDir, rel);
            if (fs.existsSync(src)) {
              fs.mkdirSync(path.dirname(dest), {recursive: true});
              fs.copyFileSync(src, dest);
            }
          }
        },
      },
    ],
    optimizeDeps: {
      exclude: ['@imgly/background-removal'],
    },
    build: {
      rollupOptions: {
        input: collectHtmlInputs(__dirname),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

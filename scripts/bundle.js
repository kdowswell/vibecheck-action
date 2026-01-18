const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, '../src/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      outfile: path.join(__dirname, '../dist/index.js'),
      external: [
        // Don't bundle native modules
        'fsevents',
      ],
    });
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();

const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, '../dist/index.js')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: path.join(__dirname, '../dist/index.js'),
      allowOverwrite: true,
      external: [
        // Don't bundle native modules
        'fsevents',
        // ESM-only packages
        '@github/copilot-sdk',
      ],
    });
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();

/******************************************************************************/


import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';


/******************************************************************************/


/* The build environment that we are targeting. */
const build_env = process.env.BUILD_ENV ?? 'development';

/* Evaluates if the environment target is configured for deployment. */
const is_production = build_env === 'production';

/* Files mentioned here are not inlined into build bundles; this generally only
 * applies to the code in the core library, which is client and worker agnostic.
 *
 * References to the files are kept as is, and since the output folder is kept
 * in the same file layout as the source folders are, when the compiled code is
 * used, it picks up the proper file automatically. */
const internalExternal = [
  '../core/index.js'
];

/* Set up the optimization plugins that should only be injected into the build
 * pipeline when creating production assets. */
const optimizationPlugins = is_production === true ? [
  terser({
    toplevel: true,
    compress: {
      passes: 2,
      drop_console: true
    },
    format: {
      comments: 'some'
    }
  })
] : [];


/******************************************************************************/


export default [
  /* The core module contains all code that is common to the Client and Worker;
   * there is nothing contained in here that is either browser or worker
   * specific. */
  {
    input: 'src/core/index.js',
    output: {
      file: 'dist/core/index.js',
      format: 'esm'
    },
    plugins: [
      resolve(),
      commonjs(),
      ...optimizationPlugins
    ]
  },

  /* The client module contains all code that is intended to be used in the
   * browser by client-side code. */
  {
    input: 'src/client/index.js',
    external: internalExternal,
    output: {
      file: 'dist/client/index.js',
      format: 'esm'
    },
    plugins: [
      resolve({
        browser: true
      }),
      commonjs(),
      ...optimizationPlugins
    ]
  },

  /* The worker module contains all code that is intended to be used in worker
   * code. */
  {
    input: 'src/worker/index.js',
    external: internalExternal,
    output: {
      file: 'dist/worker/index.js',
      format: 'esm'
    },
    plugins: [
      resolve({
        exportConditions: ['worker', 'import']
      }),
      commonjs(),
      ...optimizationPlugins
    ]
  }
];


/******************************************************************************/

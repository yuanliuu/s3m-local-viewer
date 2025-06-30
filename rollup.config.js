import pkg from './package.json'
import terser from '@rollup/plugin-terser'
import copy from 'rollup-plugin-copy'

export default {
  input: 'src/js/app.js',
  output: {
    file: pkg.main,
    format: 'umd',
  },
  plugins: [
    terser(),
    copy({
      targets: [
        {
          src: 'src/index.html',
          dest: 'dist',
        },
        {
          src: 'src/js/libs/*',
          dest: 'dist/js/libs',
        },
      ],
      verbose: true,
      hook: 'writeBundle',
    }),
  ],
}

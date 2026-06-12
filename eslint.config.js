import baseConfig from '@system-ui-js/development-base/eslint.config.js'

const ignores = [
  'node_modules/',
  'dist/',
  'build/',
  'coverage/',
  '.specify/',
  '.opencode/',
  '*.min.js'
]

const resolvedBaseConfig = Array.isArray(baseConfig) ? baseConfig : [baseConfig]

export default [{ ignores }, ...resolvedBaseConfig]

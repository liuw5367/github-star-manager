import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  typescript: true,
  ignores: ['prd.md', 'github-star-manager.html'],
  rules: {
    'test/no-import-node-test': 'off',
    'ts/no-use-before-define': 'off',
  },
})

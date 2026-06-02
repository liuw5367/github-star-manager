import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  typescript: true,
  ignores: ['prd.md', 'github-star-manager.html'],
  rules: {
    'ts/no-use-before-define': 'off',
  },
})

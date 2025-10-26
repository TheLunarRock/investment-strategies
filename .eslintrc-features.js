module.exports = {
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/features/*',
            from: './src/features/*/components',
            except: ['./src/features/*/index.ts'],
            message: 'フィーチャー境界違反: components は index.ts 経由でのみアクセス可能'
          },
          {
            target: './src/features/*',
            from: './src/features/*/hooks',
            except: ['./src/features/*/index.ts'],
            message: 'フィーチャー境界違反: hooks は公開禁止（内部使用のみ）'
          },
          {
            target: './src/features/*',
            from: './src/features/*/utils',
            except: ['./src/features/*/index.ts'],
            message: 'フィーチャー境界違反: utils は index.ts 経由でのみアクセス可能'
          },
          {
            target: './src/features/*',
            from: './src/features/*/store',
            except: ['./src/features/*/index.ts'],
            message: 'フィーチャー境界違反: store は内部使用のみ'
          },
          {
            target: './src/features/*',
            from: './src/features/*/api',
            except: ['./src/features/*/index.ts'],
            message: 'フィーチャー境界違反: api は index.ts 経由でのみアクセス可能'
          }
        ]
      }
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../*/components/*', '../*/hooks/*', '../*/utils/*', '../*/store/*'],
            message: 'フィーチャー境界違反: 相対パスでの他フィーチャー参照は禁止'
          }
        ]
      }
    ]
  }
};
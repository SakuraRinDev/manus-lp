# AI モデル設定

## 使用サービス

[OpenRouter](https://openrouter.ai/) 経由で AI モデルを呼び出し。

## モデル

### プライマリ: Google Gemma 3 27B

```javascript
MODEL_NAME: 'google/gemma-3-27b-it:free'
```

- 無料枠で利用可能
- マルチモーダル対応（テキスト + 画像）
- 日本語対応

### フォールバック: GPT-4o

```javascript
MODEL_NAME_LEGACY: 'openai/gpt-4o'
```

- 高精度判定が必要な場合
- 比較テスト用

## API 設定

### スクリプトプロパティ

```
プロパティ名: OPENROUTER_API_KEY
値: sk-or-v1-xxxxx
```

### リクエスト形式

```javascript
{
  model: 'google/gemma-3-27b-it:free',
  messages: [
    { role: 'system', content: '...' },
    { role: 'user', content: [...] }
  ],
  response_format: { type: 'json_object' }
}
```

### レスポンス形式

```json
{
  "is_compliant": true,
  "risk_level": "LOW",
  "category": "NONE",
  "reason": "問題なし"
}
```

## テスト関数

| 関数 | 内容 |
|------|------|
| `testCheckSingleRow` | 選択行を Gemma 3 で判定 |
| `testCheckSingleRowLegacy` | 選択行を GPT-4o で判定 |
| `compareModels` | 両モデルで比較判定 |

## 制限

- 画像: 10MB 以下
- URL コンテンツ: 1500 文字まで
- レート: 1 req/sec（待機処理あり）

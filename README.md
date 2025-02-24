# ボードゲームソムリエのサイハラさん

ボードゲームソムリエの賽原（サイハラ）さんは、あなたのボードゲーム選びをサポートするチャットボットアプリケーションです。プレイ人数とプレイ時間に基づいて、最適なボードゲームを提案します。

## デモ

https://boardgame-sommelier.com

## 主な機能

- プレイ人数とプレイ時間に基づいたボードゲームの推薦
- リアルタイムチャット機能
- 推奨質問の提供
- レスポンシブデザイン
- メッセージ制限機能（5回まで）
- ストリーミングレスポンス
- YouTube動画の埋め込み表示

## 技術スタック

- フロントエンド
  - HTML5
  - CSS3（レスポンシブデザイン）
  - JavaScript（Vanilla JS）
  - marked.js（マークダウンレンダリング）

- バックエンド
  - Python 3.11
  - Flask
  - Dify API（チャットエンジン）

- インフラ
  - Google Cloud Run
  - Docker

## 必要条件

- Python 3.11以上
- Poetry 1.7.1以上
- Docker（デプロイ時）
- Google Cloud Platform アカウント（デプロイ時）
- Dify API キー

## ローカル開発環境のセットアップ

1. リポジトリのクローン：
   ```bash
   git clone https://github.com/agi-sari/boardgame-sommelier.git
   cd boardgame-sommelier
   ```

2. 環境変数の設定：
   ```bash
   cp .env.example .env
   ```
   `.env`ファイルを編集して、必要な環境変数を設定：
   - `DIFY_API_KEY`
   - `DIFY_API_BASE_URL`
   - その他必要な環境変数

3. Poetry環境のセットアップ：
   ```bash
   poetry install
   ```

4. アプリケーションの起動：
   ```bash
   poetry run python app.py
   ```
   アプリケーションは http://localhost:8080 で起動します。

## デプロイ方法

### 事前準備

1. Google Cloud SDKのインストールと設定：
   ```bash
   # Google Cloud SDKのインストール（macOS）
   brew install google-cloud-sdk

   # 認証の設定
   gcloud auth login
   gcloud config set project [YOUR_PROJECT_ID]
   ```

2. 環境変数の設定：
   - `GCP_PROJECT_ID`：Google Cloudプロジェクトのid
   - `GCP_REGION`：デプロイするリージョン（デフォルト: asia-northeast1）
   - `SERVICE_NAME`：Cloud Runのサービス名

3. Dockerのセットアップ：
   ```bash
   # Dockerのインストール（macOS）
   brew install docker
   
   # Docker Desktopの起動
   open -a Docker
   ```

### ビルドとデプロイ

#### M1/M2 Mac（Apple Silicon）での注意点
M1/M2 Macでは、デフォルトでARM64アーキテクチャのイメージがビルドされますが、Cloud Runは現在AMD64アーキテクチャのみをサポートしています。以下の手順で正しくビルドとデプロイを行います：

1. Docker BuildxのセットアップとAMD64用ビルド：
   ```bash
   # Buildxビルダーの作成
   docker buildx create --use

   # AMD64アーキテクチャ用のイメージをビルドしてプッシュ
   docker buildx build --platform linux/amd64 -t gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} . --push
   ```

2. Cloud Runへのデプロイ：
   ```bash
   gcloud run deploy ${SERVICE_NAME} \
     --image gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} \
     --platform managed \
     --region ${GCP_REGION} \
     --project ${GCP_PROJECT_ID} \
     --allow-unauthenticated \
     --set-env-vars="DIFY_API_KEY=${DIFY_API_KEY},DIFY_API_BASE_URL=${DIFY_API_BASE_URL}"
   ```

#### Intel Macまたはその他のAMD64システムでの手順
通常のDockerビルドとデプロイが可能です：

```bash
# イメージのビルド
docker build -t gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} .

# イメージのプッシュ
docker push gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME}

# Cloud Runへのデプロイ
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} \
  --platform managed \
  --region ${GCP_REGION} \
  --project ${GCP_PROJECT_ID} \
  --allow-unauthenticated \
  --set-env-vars="DIFY_API_KEY=${DIFY_API_KEY},DIFY_API_BASE_URL=${DIFY_API_BASE_URL}"
```

### デプロイの確認
デプロイが完了すると、以下のようなURLが表示されます：
```
Service URL: https://${SERVICE_NAME}-xxxxx-xx.${REGION}.run.app
```

### トラブルシューティング

#### ビルド関連
1. **アーキテクチャの問題**
   エラーメッセージ：
   ```
   ERROR: Cloud Run does not support image: Container manifest type must support amd64/linux
   ```
   解決策：上記のM1/M2 Mac用の手順を使用してAMD64アーキテクチャ用にビルドしてください。

2. **イメージのプッシュ失敗**
   ```bash
   # 認証の再実行
   gcloud auth configure-docker
   
   # キャッシュのクリア
   docker builder prune
   ```

3. **ビルドキャッシュの問題**
   ```bash
   # ビルドキャッシュのクリア
   docker buildx prune
   ```

#### デプロイ関連
1. **環境変数の問題**
   - Cloud Run管理画面で環境変数が正しく設定されているか確認
   - 必要に応じて手動で環境変数を更新

2. **リソースの制限**
   - メモリ制限に達する場合は、Cloud Run管理画面でリソース設定を調整

3. **ログの確認**
   ```bash
   # Cloud Runのログを確認
   gcloud run services logs read ${SERVICE_NAME}
   ```

### 独自ドメインの設定（お名前.com使用）

1. お名前.comでドメインを取得

2. Google Cloud Runのドメイン検証：
   ```bash
   # ドメイン所有権の検証を開始
   gcloud domains verify [YOUR_DOMAIN]
   
   # 表示されたTXTレコードをお名前.comのDNS設定に追加
   # 例：
   # TYPE: TXT
   # NAME: @
   # VALUE: google-site-verification=xxxxxxxxxxxxxxxx
   # TTL: 3600
   
   # 検証の完了を確認（完了まで数分かかる場合があります）
   gcloud domains list-verification
   ```

3. Google Cloud Runのドメインマッピング設定：
   ```bash
   # ベータコンポーネントのインストール
   gcloud components install beta

   # リージョンの設定
   gcloud config set run/region asia-northeast1

   # ドメインマッピングの作成
   gcloud beta run domain-mappings create \
     --service [SERVICE_NAME] \
     --domain [YOUR_DOMAIN]
   ```

4. お名前.comでのDNSレコード設定：
   - お名前.comの管理画面にログイン
   - 「DNSレコード設定」を選択
   - レコードを設定する
     - Aレコード、AAAAレコードの追加
5. DNSとSSL証明書の設定確認：
   ```bash
   # DNSの伝播確認
   dig [YOUR_DOMAIN]

   # ドメインマッピングの状態確認
   gcloud beta run domain-mappings describe --domain [YOUR_DOMAIN]
   ```

   注意点：
   - DNSの伝播には5-30分程度かかる場合があります
   - SSL証明書の発行には15-30分程度かかります
   - 証明書発行中は`CertificatePending`状態が表示されます

6. 最終確認：
   ```bash
   # HTTPSアクセスの確認
   curl https://[YOUR_DOMAIN]
   ```

   すべての設定が完了すると、ブラウザで`https://[YOUR_DOMAIN]`にアクセスできるようになります。

## ライセンス

MIT License

## 作者
アギ：https://zenn.dev/ghillie

## 環境変数

`.env`ファイルで設定可能な環境変数：

### Dify API設定
- `DIFY_API_KEY`：Dify APIキー（必須）
- `DIFY_API_BASE_URL`：Dify APIのベースURL

### アプリケーション設定
- `PORT`：アプリケーションポート（デフォルト: 8080）
- `HOST`：ホストアドレス（デフォルト: 0.0.0.0）

### デプロイ設定
- `GCP_PROJECT_ID`：Google Cloudプロジェクトのid（必須）
- `GCP_REGION`：デプロイするリージョン（デフォルト: asia-northeast1）
- `SERVICE_NAME`：Cloud Runのサービス名

## Dify DSLファイルの活用

dify_dsl_filesには、Dify用のDSLファイルが含まれています。これらのファイルを使用して、ボードゲームソムリエのチャットフローとYouTubeのスクレイピング用Difyアプリを作成できます。

### 含まれるDSLファイル

1. **Boardgame Sommelier Chatflow.yml**
   - ボードゲームソムリエのチャットフローを定義したDSLファイルです。
   - プレイ人数やプレイ時間に基づいて、最適なボードゲームを提案するフローを実装しています。

2. **YouTube Search API Tool.yml**
   - YouTubeのスクレイピングを行うためのDSLファイルです。
   - YouTube APIを利用して、特定のキーワードに基づく動画検索を行います。
      - DIfyの環境変数にYouTube APIキーを設定してください。

### DSLファイルの使用方法

1. Difyプラットフォームにログインし、ワークフローのインポート機能を使用して、上記のDSLファイルをインポートします。
2. アプリを公開します。
3. 作成したアプリのAPIリファレンスにアクセスし、APIキーを取得します。
4. APIキーを本プロジェクトの環境変数に設定します。

これらのDSLファイルを活用することで、アプリケーションの機能を拡張し、より多様な情報を提供することが可能になります。
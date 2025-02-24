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

### Google Cloud Runへのデプロイ

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

4. デプロイスクリプトの実行：
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
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
   - A、AAAA等のレコードを設定
      - 設定後、反映に数分かかります

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
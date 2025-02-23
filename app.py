from flask import Flask, render_template, request, jsonify, Response, stream_with_context
import os
import requests
import json
import logging
import html
from dotenv import load_dotenv

load_dotenv()

# ロギングの設定
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

DIFY_API_KEY = os.getenv('DIFY_API_KEY')
DIFY_API_BASE_URL = os.getenv('DIFY_API_BASE_URL', 'https://api.dify.ai/v1')

logger.info(f"Using API base URL: {DIFY_API_BASE_URL}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    if not DIFY_API_KEY:
        logger.error("DIFY_API_KEY is not set")
        return Response(
            'data: {"type": "error", "content": "DIFY_API_KEY is not set"}\n\n',
            mimetype='text/event-stream'
        )

    try:
        data = request.json
        if not data or 'message' not in data:
            logger.error("Invalid request data")
            return Response(
                'data: {"type": "error", "content": "Invalid request data"}\n\n',
                mimetype='text/event-stream'
            )

        headers = {
            'Authorization': f'Bearer {DIFY_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        chat_data = {
            'query': data.get('message'),
            'inputs': {
                'num_players': data.get('num_players'),
                'play_time': data.get('play_time')
            },
            'user': 'web-user',
            'response_mode': 'streaming'
        }

        # 会話IDが存在する場合は追加
        conversation_id = data.get('conversation_id')
        if conversation_id:
            chat_data['conversation_id'] = conversation_id

        logger.debug(f"Sending request to API with data: {chat_data}")

        def generate():
            try:
                session = requests.Session()
                session.trust_env = False
                
                response = session.post(
                    f'{DIFY_API_BASE_URL}/chat-messages',
                    headers=headers,
                    json=chat_data,
                    stream=True,
                    timeout=30,
                    verify=True
                )
                
                logger.debug(f"API response status code: {response.status_code}")
                
                if response.status_code != 200:
                    error_message = f"API request failed with status {response.status_code}"
                    try:
                        error_data = response.json()
                        if 'message' in error_data:
                            error_message = error_data['message']
                        logger.error(f"API error response: {error_data}")
                    except:
                        logger.error("Failed to parse error response")
                    yield f'data: {{"type": "error", "content": "{error_message}"}}\n\n'
                    return

                conversation_id = None
                for line in response.iter_lines():
                    if line:
                        line = line.decode('utf-8')
                        logger.debug(f"Received line from API: {line}")
                        if line.startswith('data: '):
                            try:
                                data = json.loads(line[6:])
                                # 会話IDを取得
                                if not conversation_id and 'conversation_id' in data:
                                    conversation_id = data['conversation_id']
                                if data['event'] == 'message':
                                    # レスポンスの内容をエスケープ
                                    content = data.get("answer", "").replace('"', '\\"').replace('\n', '\\n')
                                    yield f'data: {{"type": "message", "content": "{content}"}}\n\n'
                                elif data['event'] == 'message_end':
                                    # 会話IDを含めてメッセージ終了を通知
                                    yield f'data: {{"type": "end", "conversation_id": "{conversation_id}"}}\n\n'
                                elif data['event'] == 'error':
                                    logger.error(f"API event error: {data['message']}")
                                    error_content = data.get("message", "").replace('"', '\\"').replace('\n', '\\n')
                                    yield f'data: {{"type": "error", "content": "{error_content}"}}\n\n'
                            except json.JSONDecodeError as e:
                                logger.error(f"Failed to parse API response: {e}")
                                yield f'data: {{"type": "error", "content": "Failed to parse API response"}}\n\n'
            except requests.Timeout:
                logger.error("API request timed out")
                yield f'data: {{"type": "error", "content": "API request timed out"}}\n\n'
            except requests.RequestException as e:
                logger.error(f"Failed to connect to API: {e}")
                yield f'data: {{"type": "error", "content": "Failed to connect to API: {str(e)}"}}\n\n'
            finally:
                if 'session' in locals():
                    session.close()

        return Response(stream_with_context(generate()), mimetype='text/event-stream')
    except Exception as e:
        logger.exception("Unexpected error occurred")
        return Response(
            f'data: {{"type": "error", "content": "Server error: {str(e)}"}}\n\n',
            mimetype='text/event-stream'
        )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)), debug=True) 
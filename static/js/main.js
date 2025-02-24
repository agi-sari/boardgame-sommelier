document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const resetButton = document.getElementById('reset-button');
    const numPlayers = document.getElementById('num_players');
    const playTime = document.getElementById('play_time');
    const questionButtons = document.querySelectorAll('.question-btn');
    const suggestedQuestions = document.getElementById('suggested-questions');

    let messageCount = 0;
    const MESSAGE_LIMIT = 5;

    // 要素の存在確認とデバッグログ
    console.log('DOM Elements:', {
        chatMessages: !!chatMessages,
        userInput: !!userInput,
        sendButton: !!sendButton,
        resetButton: !!resetButton,
        numPlayers: !!numPlayers,
        playTime: !!playTime,
        questionButtons: questionButtons.length,
        suggestedQuestions: !!suggestedQuestions
    });

    let isFirstMessage = true;
    let currentConversationId = null;
    let isWaitingResponse = false;

    // marked.jsの設定
    marked.setOptions({
        breaks: true,  // 改行を有効にする
        gfm: true      // GitHub Flavored Markdownを有効にする
    });

    // リンクのレンダリング設定をカスタマイズ
    const renderer = new marked.Renderer();
    marked.use({ renderer });

    function convertYouTubeLinks(text) {
        // YouTubeのURLを検出する正規表現
        const youtubeRegex = /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(?:&\S*)?|https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/g;
        
        return text.replace(youtubeRegex, (match, v1, v2) => {
            const videoId = v1 || v2;
            return `<div class="youtube-embed"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
        });
    }

    function addMessage(message, isUser = false) {
        console.log('Adding message:', { isUser, messageLength: message.length });
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        
        if (isUser) {
            messageDiv.innerHTML = `<div class="message-content"><p>${message.replace(/\n/g, '<br>')}</p></div>`;
        } else {
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.innerHTML = `
                <div class="agent-header">
                    <img src="/static/images/saihara.png" alt="賽原" class="agent-icon">
                    <span class="agent-name">サイハラ</span>
                </div>
                <div>${marked.parse(message)}</div>
            `;
            messageDiv.appendChild(messageContent);
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    function addThinkingMessage() {
        console.log('Adding thinking message');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message thinking-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <img src="/static/images/saihara.png" alt="賽原" class="agent-icon">
                <div class="thinking">考えています...</div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    function updateMessage(messageDiv, content) {
        console.log('Updating message:', { contentLength: content.length });
        const messageContent = messageDiv.querySelector('.message-content div:last-child');
        if (messageContent) {
            // YouTube URLをiframeに変換してからマークダウンをパース
            const processedContent = convertYouTubeLinks(content);
            messageContent.innerHTML = marked.parse(processedContent);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function resetChat() {
        console.log('Resetting chat');
        const initialMessage = document.querySelector('.initial-message');
        chatMessages.innerHTML = '';
        if (initialMessage) {
            chatMessages.appendChild(initialMessage);
        }
        suggestedQuestions.style.display = 'block';
        numPlayers.disabled = false;
        playTime.disabled = false;
        isFirstMessage = true;
        currentConversationId = null;
        messageCount = 0;
        enableInputs();
    }

    function disableInputs() {
        if (messageCount >= MESSAGE_LIMIT) {
            userInput.disabled = true;
        }
        sendButton.disabled = true;
        questionButtons.forEach(button => button.disabled = true);
    }

    function enableInputs() {
        if (messageCount >= MESSAGE_LIMIT) return;
        if (isWaitingResponse) {
            userInput.disabled = false;
            sendButton.disabled = true;
            questionButtons.forEach(button => button.disabled = true);
        } else {
            userInput.disabled = false;
            sendButton.disabled = false;
            questionButtons.forEach(button => button.disabled = false);
        }
    }

    function handleFirstMessage() {
        if (isFirstMessage) {
            console.log('Handling first message');
            suggestedQuestions.style.display = 'none';
            numPlayers.disabled = true;
            playTime.disabled = true;
            isFirstMessage = false;
        }
    }

    async function sendMessage(message) {
        if (isWaitingResponse) {
            console.log('Already waiting for response');
            return;
        }

        if (messageCount >= MESSAGE_LIMIT) {
            alert('メッセージ制限に達しました。リセットボタンを押して新しい会話を始めてください。');
            return;
        }

        if (!numPlayers.value || !playTime.value) {
            addMessage('プレイ人数とプレイ時間を教えてください！');
            return;
        }

        if (message.length > 100) {
            alert('メッセージは100文字以内で入力してください。');
            return;
        }

        isWaitingResponse = true;
        disableInputs();

        messageCount++;
        if (messageCount >= MESSAGE_LIMIT) {
            disableInputs();
        }

        console.log('Sending message:', { 
            messageLength: message.length,
            numPlayers: numPlayers.value,
            playTime: playTime.value,
            conversationId: currentConversationId,
            messageCount: messageCount,
            isWaitingResponse: isWaitingResponse
        });

        addMessage(message, true);
        userInput.value = '';
        handleFirstMessage();

        const thinkingMessage = addThinkingMessage();

        const data = {
            message: message,
            num_players: numPlayers.value,
            play_time: playTime.value
        };

        if (currentConversationId) {
            data.conversation_id = currentConversationId;
        }

        try {
            console.log('Sending request to server');
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('Response received, starting stream processing');
            thinkingMessage.remove();

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseDiv = null;
            let fullMessage = '';

            try {
                while (true) {
                    const {done, value} = await reader.read();
                    
                    if (done) {
                        console.log('Stream complete');
                        break;
                    }

                    // チャンクをデコード
                    const text = decoder.decode(value);
                    console.log('Received chunk:', { length: text.length });

                    // データ行を処理
                    const lines = text.split('\n');
                    for (const line of lines) {
                        if (!line.trim() || !line.startsWith('data: ')) continue;

                        try {
                            const data = JSON.parse(line.slice(6));
                            console.log('Processing data:', { type: data.type });

                            if (data.type === 'message' && data.content) {
                                // 生の\nを実際の改行に変換
                                const processedContent = data.content.replace(/\\n/g, '\n');
                                
                                if (!responseDiv) {
                                    // 最初のメッセージを作成
                                    fullMessage = processedContent;
                                    responseDiv = addMessage(fullMessage);
                                } else {
                                    // メッセージを追加
                                    fullMessage += processedContent;
                                    updateMessage(responseDiv, fullMessage);
                                }
                            } else if (data.type === 'end') {
                                if (data.conversation_id) {
                                    currentConversationId = data.conversation_id;
                                }
                                // 最終的なメッセージを確実に表示
                                if (responseDiv && fullMessage) {
                                    // メッセージ制限に達した場合、追加のメッセージを付け加える
                                    if (messageCount >= MESSAGE_LIMIT) {
                                        fullMessage += '\n\n---\n<span class="limit-message">※一度にやりとりできる会話の上限回数に達しました。リセットボタンを押してください。</span>';
                                    }
                                    updateMessage(responseDiv, fullMessage);
                                }
                                isWaitingResponse = false;
                                if (messageCount < MESSAGE_LIMIT) {
                                    enableInputs();
                                }
                            } else if (data.type === 'error') {
                                console.error('Server error:', data.content);
                                addMessage('すみません、うまくお答えできませんでした。リセットしてもう一度試していただけますか？');
                                isWaitingResponse = false;
                                if (messageCount < MESSAGE_LIMIT) {
                                    enableInputs();
                                }
                            }
                        } catch (e) {
                            console.error('Failed to parse message:', e, line);
                            isWaitingResponse = false;
                            if (messageCount < MESSAGE_LIMIT) {
                                enableInputs();
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error in stream processing:', error);
                if (responseDiv) {
                    // エラー時は既存のメッセージを保持
                    updateMessage(responseDiv, fullMessage + '\n\n(エラーが発生しました)');
                } else {
                    addMessage('すみません、うまくお答えできませんでした。リセットしてもう一度試していただけますか？');
                }
                isWaitingResponse = false;
                if (messageCount < MESSAGE_LIMIT) {
                    enableInputs();
                }
            }

        } catch (error) {
            console.error('Error in sendMessage:', error);
            thinkingMessage.remove();
            addMessage('すみません、うまくお答えできませんでした。リセットしてもう一度試していただけますか？');
            isWaitingResponse = false;
            if (messageCount < MESSAGE_LIMIT) {
                enableInputs();
            }
        }
    }

    // イベントリスナーの設定
    console.log('Setting up event listeners');

    sendButton.addEventListener('click', () => {
        console.log('Send button clicked');
        const message = userInput.value.trim();
        if (message) {
            sendMessage(message);
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter key pressed');
            const message = userInput.value.trim();
            if (message) {
                sendMessage(message);
            }
        }
    });

    resetButton.addEventListener('click', () => {
        console.log('Reset button clicked');
        resetChat();
    });

    questionButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            console.log('Question button clicked:', { index, text: button.textContent });
            sendMessage(button.textContent);
        });
    });

    // ユーザー入力の文字数制限
    userInput.addEventListener('input', () => {
        const maxLength = 100;
        const currentLength = userInput.value.length;
        if (currentLength > maxLength) {
            userInput.style.color = 'red';
            sendButton.disabled = true;
        } else {
            userInput.style.color = '';
            sendButton.disabled = false;
        }
    });
}); 
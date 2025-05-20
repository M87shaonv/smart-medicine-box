import json
import requests
from flask import Flask, request, Response, abort, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# 下面的代码是调用siliconflow的API
AI_API_KEY = 密钥
AI_API_URL = URL
VALID_TOKEN = "test123"


@app.route('/chat', methods=['POST'])
def chat_stream():
    # 鉴权验证
    token = request.headers.get('Authorization')

    if token != VALID_TOKEN:
        abort(401, description="Unauthorized")

    if request.method != 'POST':
        abort(405, description="Method Not Allowed")

    # 获取请求数据
    data = request.json
    app.logger.info(f"Received data: {data}")
    # 调用DeepSeek API
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            AI_API_URL,
            headers=headers,
            json=data,
            stream=True
        )
        response.raise_for_status()

        def generate():
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        json_str = decoded_line[6:].strip()
                        try:
                            chunk_data = json.loads(json_str)
                            content = chunk_data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                            # 过滤掉 content 为 null 或空的情况
                            if content is None or not content.strip():
                                continue
                            # 逐字符返回
                            for char in content:
                                yield json.dumps({"content": char}) + "\n"
                        except:
                            continue

        app.logger.info(f"DeepSeek API response content: {response.text}")  # 打印响应内容
        response.raise_for_status()  # 检查HTTP错误
        return Response(
            generate(),  # 生成器实现持续数据流
            content_type='application/x-ndjson',  # 标准流式格式
            headers={
                'Transfer-Encoding': 'chunked',  # 启用HTTP分块传输
                'X-Accel-Buffering': 'no'  # 禁用Nginx缓冲
            }
        )

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
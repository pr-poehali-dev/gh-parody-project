import json
import os
import base64
import uuid
import re
from datetime import datetime

import boto3


def handler(event: dict, context) -> dict:
    '''
    Business: Загружает файлы пользователя в облачное хранилище S3 и возвращает публичную ссылку.
    Args: event с httpMethod, body (JSON: filename, content_base64, content_type)
    Returns: HTTP-ответ с URL загруженного файла
    '''
    method = event.get('httpMethod', 'GET')

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
        }

    body = json.loads(event.get('body') or '{}')
    filename = body.get('filename', 'file')
    content_type = body.get('content_type', 'application/octet-stream')
    content_base64 = body.get('content_base64', '')

    if not content_base64:
        return {
            'statusCode': 400,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Файл не передан'}),
        }

    file_bytes = base64.b64decode(content_base64)

    if len(file_bytes) > 15 * 1024 * 1024:
        return {
            'statusCode': 400,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Файл больше 15 МБ'}),
        }

    safe_name = re.sub(r'[^\w.\-]', '_', filename)[-60:]
    key = f"uploads/{uuid.uuid4().hex[:8]}_{safe_name}"

    access_key = os.environ['AWS_ACCESS_KEY_ID']

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=access_key,
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

    s3.put_object(
        Bucket='files',
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )

    url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps({
            'url': url,
            'filename': filename,
            'size': len(file_bytes),
            'content_type': content_type,
            'uploaded_at': datetime.utcnow().isoformat(),
        }),
    }

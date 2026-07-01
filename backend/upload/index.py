import json
import os
import base64
import uuid
import re

import boto3


def handler(event: dict, context) -> dict:
    """
    Загружает файл в S3 и возвращает публичную CDN-ссылку.
    Принимает POST с JSON: filename, content_type, content_base64.
    Лимит: ~4 МБ на файл (ограничение тела запроса облачной функции).
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

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
    safe = re.sub(r'[^\w.\-]', '_', filename)[-80:]
    key = f"uploads/{uuid.uuid4().hex[:10]}_{safe}"

    access_key = os.environ['AWS_ACCESS_KEY_ID']
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=access_key,
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=content_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"
    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'body': json.dumps({
            'url': cdn_url,
            'filename': filename,
            'size': len(file_bytes),
            'content_type': content_type,
        }),
    }

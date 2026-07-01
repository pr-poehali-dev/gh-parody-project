import json
import os
import uuid
import re

import boto3
from botocore.config import Config


def make_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
    )


def ensure_bucket_cors(s3) -> dict:
    """Устанавливает CORS на бакет чтобы браузер мог делать PUT напрямую."""
    cors_config = {
        'CORSRules': [{
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            'AllowedOrigins': ['*'],
            'ExposeHeaders': ['ETag'],
            'MaxAgeSeconds': 86400,
        }]
    }
    try:
        s3.put_bucket_cors(Bucket='files', CORSConfiguration=cors_config)
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def handler(event: dict, context) -> dict:
    """
    Два режима:
    - GET /?action=set_cors  — устанавливает CORS на бакет (запустить один раз)
    - POST                    — генерирует presigned URL для прямой загрузки из браузера
    """
    resp_cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': resp_cors, 'body': ''}

    s3 = make_s3()
    access_key = os.environ['AWS_ACCESS_KEY_ID']

    # ── установка CORS на бакет ───────────────────────────────────────────────
    qs = event.get('queryStringParameters') or {}
    if qs.get('action') == 'set_cors':
        result = ensure_bucket_cors(s3)
        return {
            'statusCode': 200,
            'headers': {**resp_cors, 'Content-Type': 'application/json'},
            'body': json.dumps(result),
        }

    # ── генерация presigned URL ───────────────────────────────────────────────
    body = json.loads(event.get('body') or '{}')
    filename = body.get('filename', 'file')
    content_type = body.get('content_type', 'application/octet-stream')

    safe_name = re.sub(r'[^\w.\-]', '_', filename)[-80:]
    key = f"uploads/{uuid.uuid4().hex[:10]}_{safe_name}"

    upload_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': 'files', 'Key': key, 'ContentType': content_type},
        ExpiresIn=7200,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"

    return {
        'statusCode': 200,
        'headers': {**resp_cors, 'Content-Type': 'application/json'},
        'body': json.dumps({
            'upload_url': upload_url,
            'cdn_url': cdn_url,
            'key': key,
            'filename': filename,
            'content_type': content_type,
        }),
    }
import json
import os
import uuid
import re

import boto3
from botocore.config import Config


def handler(event: dict, context) -> dict:
    """
    Генерирует presigned URL для прямой загрузки файла из браузера в S3.
    Принимает: filename, content_type. Возвращает: upload_url, cdn_url, key.
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

    safe_name = re.sub(r'[^\w.\-]', '_', filename)[-80:]
    key = f"uploads/{uuid.uuid4().hex[:10]}_{safe_name}"

    access_key = os.environ['AWS_ACCESS_KEY_ID']

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=access_key,
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
    )

    upload_url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': 'files',
            'Key': key,
            'ContentType': content_type,
        },
        ExpiresIn=3600,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'body': json.dumps({
            'upload_url': upload_url,
            'cdn_url': cdn_url,
            'key': key,
            'filename': filename,
            'content_type': content_type,
        }),
    }

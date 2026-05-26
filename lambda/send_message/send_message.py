import json
import logging
import os
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ['TABLE_NAME']
MAX_TEXT_LEN = 1000

_dynamodb_endpoint = os.environ.get('DYNAMODB_ENDPOINT')
dynamodb = boto3.resource('dynamodb', endpoint_url=_dynamodb_endpoint or None)
table = dynamodb.Table(TABLE_NAME)


def handler(event, context):
    rc = event['requestContext']
    connection_id = rc['connectionId']
    domain = rc['domainName']
    stage = rc['stage']

    # Parse and validate body
    try:
        body = json.loads(event.get('body') or '{}')
    except (json.JSONDecodeError, TypeError):
        return {'statusCode': 400, 'body': 'Missing or invalid text'}

    text = body.get('text')
    if not text or not isinstance(text, str) or not text.strip():
        return {'statusCode': 400, 'body': 'Missing or invalid text'}
    if len(text) > MAX_TEXT_LEN:
        return {'statusCode': 400, 'body': 'Missing or invalid text'}

    # Look up sender's callsign — cannot trust the client-supplied value
    try:
        response = table.get_item(Key={'connectionId': connection_id})
        sender = response.get('Item')
    except Exception as e:
        logger.error(f'GetItem failed: {e}')
        return {'statusCode': 500, 'body': 'Internal server error'}

    if not sender:
        return {'statusCode': 400, 'body': 'Unknown sender'}

    callsign = sender['callsign']
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    payload = {
        'type': 'message',
        'callsign': callsign,
        'text': text,
        'timestamp': now,
    }

    # Scan all active connections (with pagination)
    try:
        connections = _scan_connections()
    except Exception as e:
        logger.error(f'DynamoDB scan failed: {e}')
        return {'statusCode': 500, 'body': 'Internal server error'}

    # Fan-out to every connection including the sender
    endpoint_url = f'https://{domain}/{stage}'
    apigw = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)
    data = json.dumps(payload).encode('utf-8')

    for conn in connections:
        cid = conn['connectionId']
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=data)
        except apigw.exceptions.GoneException:
            logger.info(f'Removing stale connection {cid}')
            table.delete_item(Key={'connectionId': cid})
        except Exception as e:
            logger.error(f'Failed to send to {cid}: {e}')

    return {'statusCode': 200, 'body': 'Message sent'}


def _scan_connections():
    items = []
    kwargs = {'ProjectionExpression': 'connectionId'}
    while True:
        response = table.scan(**kwargs)
        items.extend(response['Items'])
        if 'LastEvaluatedKey' not in response:
            break
        kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    return items

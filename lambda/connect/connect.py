import json
import logging
import os
import re
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

CALLSIGN_RE = re.compile(r'^[a-zA-Z0-9_]{1,20}$')
TABLE_NAME = os.environ['TABLE_NAME']

_dynamodb_endpoint = os.environ.get('DYNAMODB_ENDPOINT')
dynamodb = boto3.resource('dynamodb', endpoint_url=_dynamodb_endpoint or None)
table = dynamodb.Table(TABLE_NAME)


def handler(event, context):
    rc = event['requestContext']
    connection_id = rc['connectionId']
    domain = rc['domainName']
    stage = rc['stage']

    params = event.get('queryStringParameters') or {}
    callsign = params.get('callsign', '').strip()

    if not callsign or not CALLSIGN_RE.match(callsign):
        return {'statusCode': 400, 'body': 'Invalid or missing callsign'}

    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    try:
        table.put_item(Item={
            'connectionId': connection_id,
            'callsign': callsign,
            'connectedAt': now,
        })
    except Exception as e:
        logger.error(f'DynamoDB PutItem failed: {e}')
        return {'statusCode': 500, 'body': 'Internal server error'}

    # Broadcast user_joined to all existing connections (best-effort)
    _broadcast(domain, stage, exclude_id=connection_id, payload={
        'type': 'system',
        'event': 'user_joined',
        'callsign': callsign,
        'timestamp': now,
    })

    return {'statusCode': 200, 'body': 'Connected'}


def _broadcast(domain, stage, payload, exclude_id=None):
    try:
        connections = _scan_connections()
    except Exception as e:
        logger.error(f'Scan failed during broadcast: {e}')
        return

    endpoint_url = f'https://{domain}/{stage}'
    apigw = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)
    data = json.dumps(payload).encode('utf-8')

    for conn in connections:
        cid = conn['connectionId']
        if cid == exclude_id:
            continue
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=data)
        except apigw.exceptions.GoneException:
            logger.info(f'Removing stale connection {cid}')
            table.delete_item(Key={'connectionId': cid})
        except Exception as e:
            logger.error(f'Failed to notify {cid}: {e}')


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

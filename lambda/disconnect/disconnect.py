import json
import logging
import os
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ['TABLE_NAME']

_dynamodb_endpoint = os.environ.get('DYNAMODB_ENDPOINT')
dynamodb = boto3.resource('dynamodb', endpoint_url=_dynamodb_endpoint or None)
table = dynamodb.Table(TABLE_NAME)


def handler(event, context):
    rc = event['requestContext']
    connection_id = rc['connectionId']
    domain = rc['domainName']
    stage = rc['stage']

    # Fetch callsign before deleting so we can broadcast "user_left"
    try:
        response = table.get_item(Key={'connectionId': connection_id})
        callsign = response.get('Item', {}).get('callsign', 'unknown')
    except Exception as e:
        logger.error(f'GetItem failed: {e}')
        callsign = 'unknown'

    try:
        table.delete_item(Key={'connectionId': connection_id})
    except Exception as e:
        logger.error(f'DeleteItem failed: {e}')
        return {'statusCode': 500, 'body': 'Internal server error'}

    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # Broadcast user_left to remaining connections (best-effort)
    _broadcast(domain, stage, payload={
        'type': 'system',
        'event': 'user_left',
        'callsign': callsign,
        'timestamp': now,
    })

    return {'statusCode': 200, 'body': 'Disconnected'}


def _broadcast(domain, stage, payload):
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

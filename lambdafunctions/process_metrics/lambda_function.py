import boto3
import json
import os

from collections import Counter
from datetime import datetime, timedelta
from collections import Counter, defaultdict, OrderedDict
from botocore.exceptions import ClientError

sqs_client = boto3.client('sqs')
dynamodb_client = boto3.resource('dynamodb')
cognito_client = boto3.client('cognito-idp', region_name='us-east-2')

SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL")
DYNAMODB_TABLE_NAME = os.getenv("DYNAMODB_TABLE_NAME")
USER_POOL_ID = os.getenv('USER_POOL_ID')

# event: {'version': '0', 'id': '676750f8-14df-4734-bf2e-8a04c72c570c', 
# 'detail-type': 'Scheduled Event', 'source': 'aws.scheduler', 
# 'account': '863518439994', 'time': '2024-12-05T00:47:16Z', 'region': 'us-east-1', 
# 'resources': ['arn:aws:scheduler:us-east-1:863518439994:schedule/default/Invoke_ProcessMetrics'], 
# 'detail': '{}'}

def check_user_exists(user_id: str) -> bool:
    try:
        response = cognito_client.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=user_id
        )
        return True
    except ClientError as e:
        print("client error:", e)
        return False


def pull_from_sqs() -> list[dict]:
    message_bodies = []

    while True:
        messages_to_delete = []

        try:
            response = sqs_client.receive_message(
                QueueUrl=SQS_QUEUE_URL,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=15
            )
            
            if 'Messages' not in response:
                break

            for message in response['Messages']:
                message_bodies.append(json.loads(message['Body']))
                
                record = {'Id': message['MessageId'], 'ReceiptHandle': message['ReceiptHandle']}
                messages_to_delete.append(record)

            if messages_to_delete:
                sqs_client.delete_message_batch(
                    QueueUrl=SQS_QUEUE_URL,
                    Entries=messages_to_delete
                )
        except Exception as e:
            print("Exception occured:", e)

    return message_bodies

def batch_write_metrics(messages: list[dict]):
    table = dynamodb_client.Table("UserMetrics")
    with table.batch_writer() as batch:
        for item in messages:
            batch.put_item(Item={
                "UserId": item["UserId"],
                "timestamp": item["timestamp"],
                "code_language": item["code_language"],
                "bytes": item["bytes"],
                "feature": item["feature"]
            })

def lambda_handler(event, context):
    print("event:", event)

    response = {
        'statusCode': 200,
        "headers": {
            'Access-Control-Allow-Origin': '*',
            "Content-Type": "application/json"
        },
    }

    if 'source' in event and event['source'] == 'aws.scheduler':
        # If the invoker of this Lambda function was an EventBridge scheduler,
        # then we must pull every message from the SQS queue and batch write them all
        # into DynamoDB UserMetrics table.
        try:
            batch_write_metrics(pull_from_sqs())
            return response
        except Exception as e:
            print("Exception:", e)
            response['statusCode'] = 500
            response['body'] = json.dumps('Something went wrong')
            return response
    else:
        userId = event['queryStringParameters']['id']

        if not check_user_exists(userId):
            response['statusCode'] = 404
            return response

        table = dynamodb_client.Table(DYNAMODB_TABLE_NAME)
        queryResponse = table.query(
            KeyConditionExpression="UserId = :userId",
            ExpressionAttributeValues={
                ":userId": userId
            })
        items = queryResponse.get("Items", [])

        languages = [item["code_language"] for item in items if "code_language" in item]
        features_by_day = defaultdict(list)
        total_bytes = sum(int(item["bytes"]) for item in items if "bytes" in item)

        current_time = datetime.utcnow()

        for item in items:
            if "feature" in item and "timestamp" in item:
                timestamp = int(item["timestamp"])
                feature = item["feature"]

                item_time = datetime.utcfromtimestamp(timestamp)

                if (current_time - item_time).days <= 7:
                    day_of_week = item_time.strftime('%a') 
                    features_by_day[day_of_week].append(feature)

        features_summary = {
                day: dict(Counter(features)) for day, features in features_by_day.items()
            }

        ordered_days = [(current_time - timedelta(days=i)).strftime('%a') for i in range(7)]

        ordered_features_summary = OrderedDict(
            (day, features_summary.get(day, {})) for day in ordered_days
        )

        language_counts = dict(Counter(languages))

        response['body'] = json.dumps({
            "code_languages": language_counts,
            "data_written": total_bytes,
            "requests": ordered_features_summary
        })

        return response

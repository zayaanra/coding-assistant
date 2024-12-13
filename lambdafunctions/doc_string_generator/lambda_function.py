import boto3
import os
import json
import time

from typing import Optional

sagemaker_endpoint = os.getenv("SAGEMAKER_ENDPOINT")
sqs = boto3.client('sqs')
METRICS_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/863518439994/MetricsDump"

class DocstringGenerator:
    def __init__(self, endpoint_name: str, region_name: Optional[str] = None):
        """
        Initialize the docstring generator with a SageMaker endpoint
        """
        self.endpoint_name = endpoint_name
        self.runtime = boto3.client('sagemaker-runtime', region_name=region_name)
    
    def generate_docstring(self, code_snippet: str, debug: bool = True) -> str:
        """
        Generate a docstring for the given code snippet
        
        Args:
            code_snippet: Python code to document
            debug: Whether to print debug information
            
        Returns:
            Generated docstring
        """

        prompt = f"""Generate a Python docstring for the following function. The docstring should describe:
1. The purpose of the function.
2. Its input arguments and their types.
3. The return value and its type.

Code:
{code_snippet}

Example:
'''
def add_numbers(a: int, b: int) -> int:
    \"\"\"Adds two integers.

    Args:
        a (int): The first integer.
        b (int): The second integer.

    Returns:
        int: The sum of the two integers.
    \"\"\"
'''

Docstring:"""



        # Define generation parameters
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 256,
                "temperature": 0.3,
                "top_p": 0.90,
                "do_sample": True
            }
        }
        
        if debug:
            print("\nSending request with payload:")
            print(json.dumps(payload, indent=2))
        
        try:
            # Invoke the endpoint
            response = self.runtime.invoke_endpoint(
                EndpointName=self.endpoint_name,
                ContentType='application/json',
                Body=json.dumps(payload)
            )
            
            # Read the response body
            response_body = response['Body'].read().decode()
            
            if debug:
                print("\nRaw response:")
                print(response_body)
            
            # Try to parse the response
            try:
                response_json = json.loads(response_body)
                if isinstance(response_json, list):
                    return response_json[0]
                elif isinstance(response_json, dict):
                    return response_json.get('generated_text', response_json)
                else:
                    return response_body
            except json.JSONDecodeError:
                # If response is not JSON, return it as is
                return response_body.strip()
            
        except Exception as e:
            if debug:
                print(f"\nError details: {str(e)}")
            raise

def send_metrics_to_sqs(message_body):
    try:
        response = sqs.send_message(
            QueueUrl=METRICS_QUEUE_URL,
            MessageBody=json.dumps(message_body)
        )

        print("Message sent successfully:", response)

    except Exception as e:
        print("Error sending message:", str(e))


def lambda_handler(event, context):

    # Initialize the generator with your endpoint
    generator = DocstringGenerator(
        endpoint_name=sagemaker_endpoint
    )

    print(event)
    code_snippet = event['code_snippet']


    try:
        print(event)
        doc_string = generator.generate_docstring(code_snippet, debug=True)
        print("\nGenerated docstring:")
        print(doc_string)

    except Exception as e:
        print(f"\nError generating docstring: {str(e)}")
        return {
            "statusCode": 400,
            "error": "Error generating docstring: str(e)"
        }

    result_dict = {"doc_string": doc_string}

    message_body = {
        "UserId": str(event["userId"]),
        "code_language": event["code_language"],
        "timestamp": int(time.time()),
        "bytes": len(doc_string.encode('utf8')),
        "feature": "doc_string"
    }
    send_metrics_to_sqs(message_body)
    
    # send_metrics_to_sqs(message_body)

    response = {
        "statusCode": 200,
        "body": json.dumps(result_dict)
    }

    return response


import boto3
import os
import json
from typing import Optional
import time

sagemaker_endpoint = os.getenv("SAGEMAKER_ENDPOINT")
QUEUE_URL = os.getenv("QUEUE_URL")
sqs = boto3.client('sqs')

class CodeRefactorer:
    def __init__(self, endpoint_name: str, region_name: Optional[str] = None):
        """
        Initialize the code refactorer with a SageMaker endpoint
        """
        self.endpoint_name = endpoint_name
        self.runtime = boto3.client('sagemaker-runtime', region_name=region_name)
    
    def refactor_code(self, code_snippet: str, debug: bool = True) -> str:
        """
        Refactor the given Python code snippet
        
        Args:
            code_snippet: Python code to refactor
            debug: Whether to print debug information
            
        Returns:
            Refactored Python code
        """
        # Prepare the prompt
        prompt = f"""Refactor the following Python code to improve its readability, performance, and maintainability. 
- Simplify complex logic.
- Ensure adherence to Python's best practices (PEP 8).
- Remove unnecessary code and optimize for efficiency.
- Add meaningful comments where appropriate.

Code to refactor:
{code_snippet}

Refactored code:"""

        
        # Define generation parameters
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 512,  # Increased limit for larger refactored code
                "temperature": 0.3,    # Lower temperature for more deterministic results
                "top_p": 0.95,
                "do_sample": False
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
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message_body)
        )
        print("Message sent successfully:", response)
    except Exception as e:
        print("Error sending message:", str(e))
    

def lambda_handler(event, context):
    # Initialize the refactorer with your endpoint
    refactorer = CodeRefactorer(
        endpoint_name=sagemaker_endpoint
    )

    # Extract code snippet from the event
    print(event)
    code_snippet = event['code_snippet']

    try:
        refactored_code = refactorer.refactor_code(code_snippet, debug=True)
        print("\nRefactored code:")
        print(refactored_code)

        message_body = {
            "UserId": str(event["userId"]),
            "code_language": event["code_language"],
            "timestamp": int(time.time()),
            "bytes": len(refactored_code.encode('utf8')),
            "feature": "refactor_code"
        }
        send_metrics_to_sqs(message_body)

        # Prepare the response
        response = {
            "statusCode": 200,
            "body": json.dumps({"refactored_code": refactored_code})
        }
    except Exception as e:
        print(f"\nError refactoring code: {str(e)}")
        
        response = {
            "statusCode": 500,
            "body": "Error"
        }

    

    return response

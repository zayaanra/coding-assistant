import boto3
import os
import json
import time

from typing import Optional


sagemaker_endpoint = os.getenv("SAGEMAKER_ENDPOINT")
METRICS_QUEUE_URL = os.getenv("METRICS_QUEUE_URL")
sqs = boto3.client('sqs')

class CodeAssistant:
    def __init__(self, endpoint_name: str, region_name: Optional[str] = None):
        """
        Initialize the code assistant with a SageMaker endpoint
        """
        self.endpoint_name = endpoint_name
        self.runtime = boto3.client('sagemaker-runtime', region_name=region_name)
    
    def complete_code(self, code_snippet: str, max_tokens: int = 512, temperature: float = 0.1, debug: bool = True) -> str:
        """
        Generate code completion for the given code snippet
        
        Args:
            code_snippet: Partial Python code to complete
            max_tokens: Maximum number of tokens to generate
            temperature: Controls randomness (0.0 = deterministic, 1.0 = very creative)
            debug: Whether to print debug information
            
        Returns:
            Generated code completion
        """
        # Prepare the prompt
        #prompt = f"""You are given a code snippet.

#Provide a single code completion suggestion. Your answer should only be the code completion suggestion and nothing else:

#{code_snippet}

 #Suggested completion: """
        
        # Define generation parameters
        payload = {
            "inputs": code_snippet,
            "parameters": {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "top_p": 0.9,
                "do_sample": True,
                "stop": ["```", "def ", "class "]  # Stop generation at these tokens
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

    def suggest_multiple_completions(
        self, 
        code_snippet: str, 
        num_suggestions: int = 3, 
        temperature: float = 0.8,
        debug: bool = True
    ) -> list:
        """
        Generate multiple different code completions for the given snippet
        
        Args:
            code_snippet: Partial Python code to complete
            num_suggestions: Number of different completions to generate
            temperature: Controls randomness of generations
            debug: Whether to print debug information
            
        Returns:
            List of generated completions
        """
        completions = []
        for i in range(num_suggestions):
            try:
                completion = self.complete_code(
                    code_snippet, 
                    temperature=temperature,
                    debug=debug
                )
                completions.append(completion)
            except Exception as e:
                print(f"Error generating completion {i+1}: {str(e)}")
                
        return completions

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
    assistant = CodeAssistant(
        endpoint_name=sagemaker_endpoint
    )
    
    # Example 1: Complete a function
    code_snippet = event['code_snippet']

    try:
        completion_string = assistant.complete_code(code_snippet)
        print("\nGenerated completion:")
        result_dict = {"completion_string": completion_string}

        response = {
            "statusCode": 200,
            "body": json.dumps(result_dict)
        }

        message_body = {
            "UserId": str(event["userId"]),
            "code_language": event["code_language"],
            "bytes": len(completion_string.encode('utf8')),
            "timestamp": int(time.time()),
            "feature": "code_completion"
        }
        send_metrics_to_sqs(message_body)

    except Exception as e:
        completion_string = ""
        print(f"\nError generating completion: {str(e)}")

        response = {
            "statusCode": 500,
            "body": "Error"
        }

    return response


    


import os
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from botocore.client import Config


def get_s3_client():
    """Initialize and return a boto3 S3 client using env credentials."""
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_region = os.getenv("AWS_REGION", "ap-south-1")

    if not aws_access_key or not aws_secret_key:
        raise EnvironmentError(
            "AWS credentials not set. Please add AWS_ACCESS_KEY_ID and "
            "AWS_SECRET_ACCESS_KEY to your .env file."
        )

    return boto3.client(
        "s3",
        region_name=aws_region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        config=Config(signature_version="s3v4"),
        endpoint_url=f"https://s3.{aws_region}.amazonaws.com",
    )


def generate_presigned_post(filename: str, content_type: str, expires_in: int = 3600) -> dict:
    """
    Generate a pre-signed POST URL so the frontend can upload directly to S3.

    Args:
        filename:     The object key (path) inside the bucket, e.g. "uploads/notes.pdf"
        content_type: MIME type of the file, e.g. "application/pdf"
        expires_in:   URL expiry in seconds (default 1 hour)

    Returns:
        {
            "url":    "https://<bucket>.s3.amazonaws.com/",
            "fields": { ... signed form fields ... },
            "s3_uri": "s3://<bucket>/<filename>"
        }

    Raises:
        EnvironmentError: if AWS credentials are missing
        RuntimeError:     on any AWS / network error
    """
    bucket = os.getenv("AWS_S3_BUCKET_NAME")
    if not bucket:
        raise EnvironmentError(
            "AWS_S3_BUCKET_NAME is not set in your .env file."
        )

    try:
        s3 = get_s3_client()
        presigned = s3.generate_presigned_post(
            Bucket=bucket,
            Key=filename,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, 500 * 1024 * 1024],  # max 500 MB
            ],
            ExpiresIn=expires_in,
        )
        return {
            "url": presigned["url"],
            "fields": presigned["fields"],
            "s3_uri": f"s3://{bucket}/{filename}",
        }

    except NoCredentialsError:
        raise EnvironmentError("AWS credentials are invalid or missing.")
    except ClientError as e:
        raise RuntimeError(f"AWS error: {e.response['Error']['Message']}")

def upload_fileobj_to_s3(file_obj, filename: str, content_type: str) -> str:
    """
    Upload a file object directly to S3 from the backend.
    
    Args:
        file_obj:     A file-like object (e.g. UploadFile.file)
        filename:     Object key, e.g. "uploads/notes.pdf"
        content_type: MIME type of the file
        
    Returns:
        The S3 URI, e.g. "s3://<bucket>/<filename>"
    """
    bucket = os.getenv("AWS_S3_BUCKET_NAME")
    if not bucket:
        raise EnvironmentError("AWS_S3_BUCKET_NAME is not set in your .env file.")

    try:
        s3 = get_s3_client()
        s3.upload_fileobj(
            Fileobj=file_obj,
            Bucket=bucket,
            Key=filename,
            ExtraArgs={"ContentType": content_type}
        )
        return f"s3://{bucket}/{filename}"

    except NoCredentialsError:
        raise EnvironmentError("AWS credentials are invalid or missing.")
    except ClientError as e:
        raise RuntimeError(f"AWS error: {e.response['Error']['Message']}")

def delete_s3_object(s3_uri: str):
    """
    Delete an object from S3 using its s3_uri (e.g. s3://bucket/uploads/file.pdf).
    """
    if not s3_uri or not s3_uri.startswith("s3://"):
        return
        
    try:
        parts = s3_uri.replace("s3://", "").split("/")
        bucket = parts[0]
        key = "/".join(parts[1:])
        
        s3 = get_s3_client()
        s3.delete_object(Bucket=bucket, Key=key)
        print(f"Deleted S3 object: {key}")
    except Exception as e:
        print(f"Failed to delete from S3 ({s3_uri}): {e}")

def generate_presigned_get(s3_uri: str, original_filename: str = None, expires_in: int = 3600) -> str:
    """
    Generate a pre-signed GET URL for downloading an object from S3.
    Optionally sets the ResponseContentDisposition to force a download with the original filename.
    """
    if not s3_uri or not s3_uri.startswith("s3://"):
        return None
        
    try:
        parts = s3_uri.replace("s3://", "").split("/")
        bucket = parts[0]
        key = "/".join(parts[1:])
        
        s3 = get_s3_client()
        
        params = {"Bucket": bucket, "Key": key}
        
        if original_filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{original_filename}"'
            
        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params=params,
            ExpiresIn=expires_in
        )
        return url
    except Exception as e:
        print(f"Failed to generate presigned GET URL for {s3_uri}: {e}")
        return None

import jwt
from core.config import settings

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImlhdCI6MTc3MjI3OTMyMiwiZXhwIjoxNzc0ODcxMzIyfQ.DZtE8Vz2I77Fr9lZWWwjRl4nH-_6v9DpJqbsCfGrtFQ"
print("Decoding token...")
try:
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    print("Success! Payload:", payload)
except Exception as e:
    print("Failed!", type(e).__name__, str(e))

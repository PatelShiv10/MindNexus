from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import jwt

from .config import settings
from .database import get_db

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """
    JWT Bearer dependency — equivalent to middleware/auth.js.

    Decodes the token, fetches the user from MongoDB, and returns
    the user document (without password field).

    Usage in routes:
        current_user: dict = Depends(get_current_user)
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        print("Auth failed: Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        print(f"Auth failed: InvalidTokenError - {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized, token failed",
        )

    user_id = payload.get("id")
    if not user_id:
        print("Auth failed: No user_id in payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized, invalid token payload",
        )

    user = await db["users"].find_one(
        {"_id": ObjectId(user_id)},
        {"password": 0},  # exclude password — same as .select('-password')
    )

    if not user:
        print(f"Auth failed: User not found for ID: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized, user not found",
        )

    # Normalise ObjectId → string so it's JSON-serialisable
    user["id"] = str(user["_id"])
    return user

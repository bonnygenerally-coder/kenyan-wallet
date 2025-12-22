from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
from jose import jwt, JWTError

# Load environment variables
ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection with Atlas support
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'dolaglobo_mmf')

# Create MongoDB client with proper settings for Atlas
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
)
db = client[db_name]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'dolaglobo-secret-key-2024-prod')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Interest Rate Configuration
ANNUAL_INTEREST_RATE = 0.15  # 15% p.a.
DAILY_INTEREST_RATE = ANNUAL_INTEREST_RATE / 365

# Create the main app
app = FastAPI(title="Dolaglobo Finance MMF API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Pydantic Models
class UserCreate(BaseModel):
    phone: str
    pin: str
    name: str

class UserLogin(BaseModel):
    phone: str
    pin: str

class UserResponse(BaseModel):
    id: str
    phone: str
    name: str
    created_at: datetime

class AccountResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    total_interest_earned: float
    daily_interest: float
    estimated_annual_yield: float
    last_interest_date: Optional[datetime] = None

class TransactionCreate(BaseModel):
    amount: float
    type: str  # deposit, withdrawal

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    type: str
    amount: float
    status: str
    description: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class DepositRequest(BaseModel):
    amount: float

class WithdrawRequest(BaseModel):
    amount: float

# Helper Functions
def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": user_id, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Routes
@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    # Validate phone format (Kenyan format)
    phone = user_data.phone.strip()
    if not phone.startswith('+254') and not phone.startswith('0'):
        raise HTTPException(status_code=400, detail="Invalid phone format. Use +254 or 0 prefix")
    
    # Normalize phone number
    if phone.startswith('0'):
        phone = '+254' + phone[1:]
    
    # Check PIN length
    if len(user_data.pin) != 4 or not user_data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")
    
    # Check if user exists
    existing = await db.users.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "phone": phone,
        "name": user_data.name,
        "pin_hash": hash_pin(user_data.pin),
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    # Create account
    account = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "balance": 0.0,
        "total_interest_earned": 0.0,
        "last_interest_date": None,
        "created_at": datetime.utcnow()
    }
    await db.accounts.insert_one(account)
    
    # Generate token
    token = create_access_token(user_id)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            phone=phone,
            name=user_data.name,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    phone = login_data.phone.strip()
    if phone.startswith('0'):
        phone = '+254' + phone[1:]
    
    user = await db.users.find_one({"phone": phone})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
    
    if not verify_pin(login_data.pin, user["pin_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
    
    token = create_access_token(user["id"])
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            phone=user["phone"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

# Account Routes
@api_router.get("/account", response_model=AccountResponse)
async def get_account(user = Depends(get_current_user)):
    account = await db.accounts.find_one({"user_id": user["id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    balance = account["balance"]
    daily_interest = balance * DAILY_INTEREST_RATE
    annual_yield = balance * ANNUAL_INTEREST_RATE
    
    return AccountResponse(
        id=account["id"],
        user_id=account["user_id"],
        balance=balance,
        total_interest_earned=account["total_interest_earned"],
        daily_interest=daily_interest,
        estimated_annual_yield=annual_yield,
        last_interest_date=account.get("last_interest_date")
    )

@api_router.post("/deposit")
async def create_deposit(deposit: DepositRequest, user = Depends(get_current_user)):
    if deposit.amount < 50:
        raise HTTPException(status_code=400, detail="Minimum deposit is KES 50")
    
    # Create pending transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "deposit",
        "amount": deposit.amount,
        "status": "pending",
        "description": f"Deposit via M-Pesa Paybill 4114517",
        "created_at": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    return {
        "message": "Deposit initiated",
        "transaction_id": transaction["id"],
        "instructions": {
            "step1": "Go to M-Pesa on your phone",
            "step2": "Select 'Lipa na M-Pesa'",
            "step3": "Select 'Pay Bill'",
            "step4": "Enter Business Number: 4114517",
            "step5": f"Enter Account Number: {user['phone']}",
            "step6": f"Enter Amount: KES {deposit.amount:,.0f}",
            "step7": "Enter your M-Pesa PIN and confirm"
        },
        "paybill": "4114517",
        "account_number": user["phone"],
        "amount": deposit.amount
    }

@api_router.post("/deposit/confirm/{transaction_id}")
async def confirm_deposit(transaction_id: str, user = Depends(get_current_user)):
    """Mock endpoint to simulate M-Pesa confirmation"""
    transaction = await db.transactions.find_one({
        "id": transaction_id,
        "user_id": user["id"],
        "type": "deposit",
        "status": "pending"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction status
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )
    
    # Update account balance
    await db.accounts.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": transaction["amount"]}}
    )
    
    account = await db.accounts.find_one({"user_id": user["id"]})
    
    return {
        "message": "Deposit confirmed successfully",
        "amount": transaction["amount"],
        "new_balance": account["balance"]
    }

@api_router.post("/withdraw")
async def create_withdrawal(withdraw: WithdrawRequest, user = Depends(get_current_user)):
    if withdraw.amount < 50:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is KES 50")
    
    account = await db.accounts.find_one({"user_id": user["id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if account["balance"] < withdraw.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "withdrawal",
        "amount": withdraw.amount,
        "status": "processing",
        "description": f"Withdrawal to M-Pesa {user['phone']}",
        "created_at": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    # Deduct balance immediately for MVP
    await db.accounts.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": -withdraw.amount}}
    )
    
    # Mark as completed (mock)
    await db.transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )
    
    return {
        "message": f"KES {withdraw.amount:,.0f} sent to {user['phone']}",
        "transaction_id": transaction["id"],
        "amount": withdraw.amount,
        "destination": user["phone"]
    }

@api_router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(user = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    
    return [TransactionResponse(
        id=t["id"],
        user_id=t["user_id"],
        type=t["type"],
        amount=t["amount"],
        status=t["status"],
        description=t["description"],
        created_at=t["created_at"]
    ) for t in transactions]

@api_router.post("/interest/calculate")
async def calculate_interest(user = Depends(get_current_user)):
    """Calculate and credit daily interest (for demo purposes)"""
    account = await db.accounts.find_one({"user_id": user["id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if account["balance"] <= 0:
        return {"message": "No balance to earn interest", "interest": 0}
    
    interest = account["balance"] * DAILY_INTEREST_RATE
    
    # Update account
    await db.accounts.update_one(
        {"user_id": user["id"]},
        {
            "$inc": {
                "balance": interest,
                "total_interest_earned": interest
            },
            "$set": {"last_interest_date": datetime.utcnow()}
        }
    )
    
    # Create interest transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "interest",
        "amount": interest,
        "status": "completed",
        "description": "Daily interest earned",
        "created_at": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    return {
        "message": "Interest credited",
        "interest": interest,
        "new_balance": account["balance"] + interest
    }

@api_router.get("/user/profile")
async def get_profile(user = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        phone=user["phone"],
        name=user["name"],
        created_at=user["created_at"]
    )

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Dolaglobo Finance MMF"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

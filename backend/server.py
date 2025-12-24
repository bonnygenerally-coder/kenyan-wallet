from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
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
from enum import Enum

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
ADMIN_SECRET_KEY = os.environ.get('ADMIN_JWT_SECRET', 'dolaglobo-admin-secret-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Interest Rate Configuration
ANNUAL_INTEREST_RATE = 0.15  # 15% p.a.
DAILY_INTEREST_RATE = ANNUAL_INTEREST_RATE / 365

# Create the main app
app = FastAPI(title="Dolaglobo Finance MMF API")

# Create routers
api_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin")

security = HTTPBearer()

# Enums
class AdminRole(str, Enum):
    VIEW_ONLY = "view_only"
    TRANSACTION_MANAGER = "transaction_manager"
    SUPER_ADMIN = "super_admin"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Pydantic Models - User
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
    type: str

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

# Pydantic Models - Admin
class AdminCreate(BaseModel):
    email: str
    password: str
    name: str
    role: AdminRole = AdminRole.VIEW_ONLY

class AdminLogin(BaseModel):
    email: str
    password: str

class AdminResponse(BaseModel):
    id: str
    email: str
    name: str
    role: AdminRole
    created_at: datetime

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str
    admin: AdminResponse

class TransactionStatusUpdate(BaseModel):
    status: TransactionStatus
    note: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class DashboardStats(BaseModel):
    total_aum: float
    total_customers: int
    active_customers: int
    pending_transactions: int
    daily_deposits: float
    daily_withdrawals: float
    total_interest_paid: float

class AuditLogEntry(BaseModel):
    id: str
    admin_id: str
    admin_name: str
    action: str
    target_type: str
    target_id: str
    details: dict
    timestamp: datetime

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, is_admin: bool = False) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    secret = ADMIN_SECRET_KEY if is_admin else SECRET_KEY
    to_encode = {"sub": user_id, "exp": expire, "is_admin": is_admin}
    return jwt.encode(to_encode, secret, algorithm=ALGORITHM)

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

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        is_admin = payload.get("is_admin", False)
        if admin_id is None or not is_admin:
            raise HTTPException(status_code=401, detail="Invalid admin token")
        admin = await db.admins.find_one({"id": admin_id})
        if admin is None:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid admin token")

def require_role(allowed_roles: List[AdminRole]):
    async def role_checker(admin = Depends(get_current_admin)):
        if admin["role"] not in [role.value for role in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return admin
    return role_checker

async def create_audit_log(admin_id: str, admin_name: str, action: str, target_type: str, target_id: str, details: dict):
    audit_entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
        "timestamp": datetime.utcnow()
    }
    await db.audit_logs.insert_one(audit_entry)
    return audit_entry

# ============== USER AUTH ROUTES ==============
@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    phone = user_data.phone.strip()
    if not phone.startswith('+254') and not phone.startswith('0'):
        raise HTTPException(status_code=400, detail="Invalid phone format. Use +254 or 0 prefix")
    
    if phone.startswith('0'):
        phone = '+254' + phone[1:]
    
    if len(user_data.pin) != 4 or not user_data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")
    
    existing = await db.users.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "phone": phone,
        "name": user_data.name,
        "pin_hash": hash_pin(user_data.pin),
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    await db.users.insert_one(user)
    
    account = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "balance": 0.0,
        "total_interest_earned": 0.0,
        "last_interest_date": None,
        "created_at": datetime.utcnow()
    }
    await db.accounts.insert_one(account)
    
    token = create_access_token(user_id)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(id=user_id, phone=phone, name=user_data.name, created_at=user["created_at"])
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
        user=UserResponse(id=user["id"], phone=user["phone"], name=user["name"], created_at=user["created_at"])
    )

# ============== USER ACCOUNT ROUTES ==============
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
    """Customer confirms they've made M-Pesa payment - sets to pending_verification for admin approval"""
    transaction = await db.transactions.find_one({
        "id": transaction_id,
        "user_id": user["id"],
        "type": "deposit",
        "status": "pending"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Set to pending_verification - admin must approve before balance is credited
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "status": "pending_verification",
            "customer_confirmed_at": datetime.utcnow(),
            "mpesa_confirmation": True
        }}
    )
    
    return {
        "message": "Payment confirmation received. Awaiting admin verification.",
        "status": "pending_verification",
        "amount": transaction["amount"],
        "note": "Your deposit will reflect in your account once verified by admin (usually within 24 hours)."
    }

@api_router.get("/deposit/status/{transaction_id}")
async def get_deposit_status(transaction_id: str, user = Depends(get_current_user)):
    """Check deposit verification status"""
    transaction = await db.transactions.find_one({
        "id": transaction_id,
        "user_id": user["id"],
        "type": "deposit"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    status_messages = {
        "pending": "Waiting for your M-Pesa confirmation",
        "pending_verification": "Payment received, awaiting admin verification",
        "completed": "Deposit verified and credited to your account",
        "failed": "Deposit verification failed",
        "cancelled": "Deposit was cancelled"
    }
    
    return {
        "transaction_id": transaction["id"],
        "status": transaction["status"],
        "message": status_messages.get(transaction["status"], "Unknown status"),
        "amount": transaction["amount"],
        "created_at": transaction["created_at"]
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
    
    await db.accounts.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": -withdraw.amount}}
    )
    
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
    account = await db.accounts.find_one({"user_id": user["id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if account["balance"] <= 0:
        return {"message": "No balance to earn interest", "interest": 0}
    
    interest = account["balance"] * DAILY_INTEREST_RATE
    
    await db.accounts.update_one(
        {"user_id": user["id"]},
        {
            "$inc": {"balance": interest, "total_interest_earned": interest},
            "$set": {"last_interest_date": datetime.utcnow()}
        }
    )
    
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

# ============== ADMIN AUTH ROUTES ==============
@admin_router.post("/auth/register", response_model=AdminTokenResponse)
async def admin_register(admin_data: AdminCreate):
    # Check if admin exists
    existing = await db.admins.find_one({"email": admin_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first admin (make them super admin)
    admin_count = await db.admins.count_documents({})
    role = AdminRole.SUPER_ADMIN if admin_count == 0 else admin_data.role
    
    admin_id = str(uuid.uuid4())
    admin = {
        "id": admin_id,
        "email": admin_data.email.lower(),
        "name": admin_data.name,
        "password_hash": hash_password(admin_data.password),
        "role": role.value,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    await db.admins.insert_one(admin)
    
    token = create_access_token(admin_id, is_admin=True)
    
    return AdminTokenResponse(
        access_token=token,
        token_type="bearer",
        admin=AdminResponse(
            id=admin_id,
            email=admin["email"],
            name=admin["name"],
            role=role,
            created_at=admin["created_at"]
        )
    )

@admin_router.post("/auth/login", response_model=AdminTokenResponse)
async def admin_login(login_data: AdminLogin):
    admin = await db.admins.find_one({"email": login_data.email.lower()})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not admin.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = create_access_token(admin["id"], is_admin=True)
    
    return AdminTokenResponse(
        access_token=token,
        token_type="bearer",
        admin=AdminResponse(
            id=admin["id"],
            email=admin["email"],
            name=admin["name"],
            role=AdminRole(admin["role"]),
            created_at=admin["created_at"]
        )
    )

@admin_router.get("/auth/me", response_model=AdminResponse)
async def get_admin_profile(admin = Depends(get_current_admin)):
    return AdminResponse(
        id=admin["id"],
        email=admin["email"],
        name=admin["name"],
        role=AdminRole(admin["role"]),
        created_at=admin["created_at"]
    )

# ============== ADMIN DASHBOARD ROUTES ==============
@admin_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(admin = Depends(get_current_admin)):
    # Total AUM (Assets Under Management)
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]
    aum_result = await db.accounts.aggregate(pipeline).to_list(1)
    total_aum = aum_result[0]["total"] if aum_result else 0
    
    # Total customers
    total_customers = await db.users.count_documents({})
    
    # Active customers (with balance > 0)
    active_customers = await db.accounts.count_documents({"balance": {"$gt": 0}})
    
    # Pending transactions
    pending_transactions = await db.transactions.count_documents({"status": "pending"})
    
    # Today's transactions
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Daily deposits
    deposit_pipeline = [
        {"$match": {"type": "deposit", "status": "completed", "created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    deposit_result = await db.transactions.aggregate(deposit_pipeline).to_list(1)
    daily_deposits = deposit_result[0]["total"] if deposit_result else 0
    
    # Daily withdrawals
    withdrawal_pipeline = [
        {"$match": {"type": "withdrawal", "status": "completed", "created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    withdrawal_result = await db.transactions.aggregate(withdrawal_pipeline).to_list(1)
    daily_withdrawals = withdrawal_result[0]["total"] if withdrawal_result else 0
    
    # Total interest paid
    interest_pipeline = [
        {"$match": {"type": "interest"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    interest_result = await db.transactions.aggregate(interest_pipeline).to_list(1)
    total_interest_paid = interest_result[0]["total"] if interest_result else 0
    
    return DashboardStats(
        total_aum=total_aum,
        total_customers=total_customers,
        active_customers=active_customers,
        pending_transactions=pending_transactions,
        daily_deposits=daily_deposits,
        daily_withdrawals=daily_withdrawals,
        total_interest_paid=total_interest_paid
    )

@admin_router.get("/dashboard/charts")
async def get_dashboard_charts(admin = Depends(get_current_admin)):
    # Transaction trends (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": seven_days_ago}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "type": "$type"
            },
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.date": 1}}
    ]
    daily_data = await db.transactions.aggregate(daily_pipeline).to_list(100)
    
    # Customer growth (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    growth_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    growth_data = await db.users.aggregate(growth_pipeline).to_list(100)
    
    return {
        "transaction_trends": daily_data,
        "customer_growth": growth_data
    }

# ============== ADMIN TRANSACTION ROUTES ==============
@admin_router.get("/transactions")
async def get_all_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    status: Optional[str] = None,
    customer_search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin = Depends(get_current_admin)
):
    query = {}
    
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    
    if date_from:
        try:
            query["created_at"] = {"$gte": datetime.fromisoformat(date_from)}
        except:
            pass
    if date_to:
        try:
            if "created_at" in query:
                query["created_at"]["$lte"] = datetime.fromisoformat(date_to)
            else:
                query["created_at"] = {"$lte": datetime.fromisoformat(date_to)}
        except:
            pass
    
    # If searching by customer
    user_ids = []
    if customer_search:
        users = await db.users.find({
            "$or": [
                {"name": {"$regex": customer_search, "$options": "i"}},
                {"phone": {"$regex": customer_search, "$options": "i"}}
            ]
        }).to_list(100)
        user_ids = [u["id"] for u in users]
        if user_ids:
            query["user_id"] = {"$in": user_ids}
        else:
            return {"transactions": [], "total": 0, "page": page, "limit": limit}
    
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * limit
    
    transactions = await db.transactions.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user data
    enriched = []
    for t in transactions:
        user = await db.users.find_one({"id": t["user_id"]})
        account = await db.accounts.find_one({"user_id": t["user_id"]})
        enriched.append({
            **t,
            "_id": str(t.get("_id", "")),
            "customer_name": user["name"] if user else "Unknown",
            "customer_phone": user["phone"] if user else "Unknown",
            "account_balance": account["balance"] if account else 0
        })
    
    return {
        "transactions": enriched,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@admin_router.get("/transactions/{transaction_id}")
async def get_transaction_detail(transaction_id: str, admin = Depends(get_current_admin)):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    user = await db.users.find_one({"id": transaction["user_id"]})
    account = await db.accounts.find_one({"user_id": transaction["user_id"]})
    
    # Get all transactions for this user
    user_transactions = await db.transactions.find(
        {"user_id": transaction["user_id"]}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "transaction": {
            **transaction,
            "_id": str(transaction.get("_id", "")),
            "customer_name": user["name"] if user else "Unknown",
            "customer_phone": user["phone"] if user else "Unknown"
        },
        "customer": {
            "id": user["id"] if user else None,
            "name": user["name"] if user else "Unknown",
            "phone": user["phone"] if user else "Unknown",
            "created_at": user["created_at"] if user else None
        },
        "account": {
            "balance": account["balance"] if account else 0,
            "total_interest_earned": account["total_interest_earned"] if account else 0
        },
        "transaction_history": [{
            **t,
            "_id": str(t.get("_id", ""))
        } for t in user_transactions]
    }

@admin_router.put("/transactions/{transaction_id}/status")
async def update_transaction_status(
    transaction_id: str,
    update: TransactionStatusUpdate,
    admin = Depends(require_role([AdminRole.TRANSACTION_MANAGER, AdminRole.SUPER_ADMIN]))
):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    old_status = transaction["status"]
    
    # Update transaction
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "status": update.status.value,
            "status_note": update.note,
            "updated_at": datetime.utcnow(),
            "updated_by": admin["id"]
        }}
    )
    
    # Handle balance adjustments for status changes
    account = await db.accounts.find_one({"user_id": transaction["user_id"]})
    
    if transaction["type"] == "deposit":
        if old_status == "pending" and update.status == TransactionStatus.COMPLETED:
            # Credit the balance
            await db.accounts.update_one(
                {"user_id": transaction["user_id"]},
                {"$inc": {"balance": transaction["amount"]}}
            )
        elif old_status == "completed" and update.status in [TransactionStatus.FAILED, TransactionStatus.CANCELLED]:
            # Reverse the credit
            await db.accounts.update_one(
                {"user_id": transaction["user_id"]},
                {"$inc": {"balance": -transaction["amount"]}}
            )
    
    # Create audit log
    await create_audit_log(
        admin_id=admin["id"],
        admin_name=admin["name"],
        action="update_transaction_status",
        target_type="transaction",
        target_id=transaction_id,
        details={
            "old_status": old_status,
            "new_status": update.status.value,
            "note": update.note
        }
    )
    
    return {"message": "Transaction status updated", "new_status": update.status.value}

# ============== ADMIN CUSTOMER ROUTES ==============
@admin_router.get("/customers")
async def get_all_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    admin = Depends(get_current_admin)
):
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    skip = (page - 1) * limit
    
    users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with account data
    enriched = []
    for u in users:
        account = await db.accounts.find_one({"user_id": u["id"]})
        tx_count = await db.transactions.count_documents({"user_id": u["id"]})
        enriched.append({
            "id": u["id"],
            "name": u["name"],
            "phone": u["phone"],
            "created_at": u["created_at"],
            "is_active": u.get("is_active", True),
            "balance": account["balance"] if account else 0,
            "total_interest_earned": account["total_interest_earned"] if account else 0,
            "transaction_count": tx_count
        })
    
    return {
        "customers": enriched,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@admin_router.get("/customers/{customer_id}")
async def get_customer_detail(customer_id: str, admin = Depends(get_current_admin)):
    user = await db.users.find_one({"id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    account = await db.accounts.find_one({"user_id": customer_id})
    transactions = await db.transactions.find(
        {"user_id": customer_id}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "customer": {
            "id": user["id"],
            "name": user["name"],
            "phone": user["phone"],
            "created_at": user["created_at"],
            "is_active": user.get("is_active", True)
        },
        "account": {
            "id": account["id"] if account else None,
            "balance": account["balance"] if account else 0,
            "total_interest_earned": account["total_interest_earned"] if account else 0,
            "last_interest_date": account.get("last_interest_date") if account else None
        },
        "transactions": [{
            **t,
            "_id": str(t.get("_id", ""))
        } for t in transactions],
        "stats": {
            "total_deposits": sum(t["amount"] for t in transactions if t["type"] == "deposit" and t["status"] == "completed"),
            "total_withdrawals": sum(t["amount"] for t in transactions if t["type"] == "withdrawal" and t["status"] == "completed"),
            "total_interest": sum(t["amount"] for t in transactions if t["type"] == "interest"),
            "transaction_count": len(transactions)
        }
    }

@admin_router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: str,
    update: CustomerUpdate,
    admin = Depends(require_role([AdminRole.TRANSACTION_MANAGER, AdminRole.SUPER_ADMIN]))
):
    user = await db.users.find_one({"id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {}
    if update.name:
        update_data["name"] = update.name
    if update.phone:
        phone = update.phone.strip()
        if phone.startswith('0'):
            phone = '+254' + phone[1:]
        update_data["phone"] = phone
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one({"id": customer_id}, {"$set": update_data})
        
        # Create audit log
        await create_audit_log(
            admin_id=admin["id"],
            admin_name=admin["name"],
            action="update_customer",
            target_type="customer",
            target_id=customer_id,
            details={"updates": update_data}
        )
    
    return {"message": "Customer updated successfully"}

# ============== ADMIN AUDIT LOG ROUTES ==============
@admin_router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin = Depends(require_role([AdminRole.SUPER_ADMIN]))
):
    total = await db.audit_logs.count_documents({})
    skip = (page - 1) * limit
    
    logs = await db.audit_logs.find({}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "logs": [{
            **log,
            "_id": str(log.get("_id", ""))
        } for log in logs],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

# ============== HEALTH CHECK ==============
@api_router.get("/health")
async def health_check():
    try:
        await db.command('ping')
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "disconnected"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "Dolaglobo Finance MMF",
        "database": db_status
    }

# Include routers
app.include_router(api_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    try:
        await db.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        # Create indexes for better performance
        await db.users.create_index("phone", unique=True)
        await db.users.create_index("id", unique=True)
        await db.admins.create_index("email", unique=True)
        await db.admins.create_index("id", unique=True)
        await db.transactions.create_index("user_id")
        await db.transactions.create_index("created_at")
        await db.accounts.create_index("user_id", unique=True)
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("MongoDB connection closed")

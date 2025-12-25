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
    PENDING_VERIFICATION = "pending_verification"
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
    pending_verifications: int
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

# Statement Request Models
class StatementStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    SENT = "sent"
    REJECTED = "rejected"

class StatementRequest(BaseModel):
    months: int = Field(..., ge=1, le=12, description="Number of months (1-12)")
    email: Optional[str] = None  # Optional email to send statement to

class StatementRequestResponse(BaseModel):
    id: str
    user_id: str
    months: int
    start_date: datetime
    end_date: datetime
    status: str
    email: Optional[str]
    created_at: datetime

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
    """Create withdrawal request - requires admin approval"""
    if withdraw.amount < 50:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is KES 50")
    
    account = await db.accounts.find_one({"user_id": user["id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if account["balance"] < withdraw.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Deduct balance immediately to prevent overdraw
    await db.accounts.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": -withdraw.amount}}
    )
    
    # Create pending withdrawal transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "withdrawal",
        "amount": withdraw.amount,
        "status": "pending_verification",  # Requires admin approval
        "description": f"Withdrawal to M-Pesa {user['phone']}",
        "mpesa_number": user["phone"],
        "created_at": datetime.utcnow(),
        "customer_requested_at": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    return {
        "message": "Withdrawal request submitted",
        "transaction_id": transaction["id"],
        "amount": withdraw.amount,
        "destination": user["phone"],
        "status": "pending_verification",
        "note": "Your withdrawal is being processed and will be sent to your M-Pesa within 24 hours after admin verification."
    }

@api_router.get("/withdraw/status/{transaction_id}")
async def get_withdrawal_status(transaction_id: str, user = Depends(get_current_user)):
    """Check withdrawal status"""
    transaction = await db.transactions.find_one({
        "id": transaction_id,
        "user_id": user["id"],
        "type": "withdrawal"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    status_messages = {
        "pending_verification": "Your withdrawal is pending admin verification",
        "processing": "Your withdrawal is being processed",
        "completed": "Withdrawal sent to your M-Pesa",
        "failed": "Withdrawal failed - funds returned to your account",
        "cancelled": "Withdrawal was cancelled - funds returned to your account"
    }
    
    return {
        "transaction_id": transaction["id"],
        "status": transaction["status"],
        "message": status_messages.get(transaction["status"], "Unknown status"),
        "amount": transaction["amount"],
        "destination": transaction.get("mpesa_number"),
        "created_at": transaction["created_at"],
        "completed_at": transaction.get("completed_at")
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

# Interest calculation is now admin-only - see /api/admin/distribute-interest
# Customers can only view their estimated interest on the account endpoint

# ============== CUSTOMER STATEMENT REQUESTS ==============
@api_router.post("/statements/request")
async def request_statement(request: StatementRequest, user = Depends(get_current_user)):
    """Customer requests an account statement for 1-12 months"""
    if request.months < 1 or request.months > 12:
        raise HTTPException(status_code=400, detail="Months must be between 1 and 12")
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=request.months * 30)
    
    statement_request = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "months": request.months,
        "start_date": start_date,
        "end_date": end_date,
        "status": "pending",
        "email": request.email or None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.statement_requests.insert_one(statement_request)
    
    return {
        "message": "Statement request submitted successfully",
        "request_id": statement_request["id"],
        "months": request.months,
        "status": "pending",
        "note": "Your statement will be generated and sent within 24-48 hours"
    }

@api_router.get("/statements/requests")
async def get_my_statement_requests(user = Depends(get_current_user)):
    """Get all statement requests for the current user"""
    requests = await db.statement_requests.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).to_list(50)
    
    return [{
        "id": r["id"],
        "months": r["months"],
        "start_date": r["start_date"],
        "end_date": r["end_date"],
        "status": r["status"],
        "email": r.get("email"),
        "created_at": r["created_at"],
        "sent_at": r.get("sent_at"),
        "admin_note": r.get("admin_note")
    } for r in requests]

@api_router.get("/statements/request/{request_id}")
async def get_statement_request_status(request_id: str, user = Depends(get_current_user)):
    """Get status of a specific statement request"""
    request = await db.statement_requests.find_one({
        "id": request_id,
        "user_id": user["id"]
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Statement request not found")
    
    return {
        "id": request["id"],
        "months": request["months"],
        "start_date": request["start_date"],
        "end_date": request["end_date"],
        "status": request["status"],
        "email": request.get("email"),
        "created_at": request["created_at"],
        "sent_at": request.get("sent_at"),
        "admin_note": request.get("admin_note")
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
    
    # Pending transactions (both pending and pending_verification)
    pending_transactions = await db.transactions.count_documents({
        "status": {"$in": ["pending", "pending_verification"]}
    })
    
    # Pending verifications (deposits awaiting admin approval)
    pending_verifications = await db.transactions.count_documents({"status": "pending_verification"})
    
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
        pending_verifications=pending_verifications,
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
    new_status = update.status.value
    
    # Update transaction
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "status": new_status,
            "status_note": update.note,
            "updated_at": datetime.utcnow(),
            "updated_by": admin["id"],
            "verified_by": admin["name"] if new_status == "completed" else None,
            "verified_at": datetime.utcnow() if new_status == "completed" else None
        }}
    )
    
    # Handle balance adjustments for status changes
    if transaction["type"] == "deposit":
        # Approve pending_verification deposit - credit the balance
        if old_status == "pending_verification" and new_status == "completed":
            await db.accounts.update_one(
                {"user_id": transaction["user_id"]},
                {"$inc": {"balance": transaction["amount"]}}
            )
            logger.info(f"Deposit {transaction_id} verified by {admin['name']}, credited {transaction['amount']}")
        
        # Also handle legacy pending -> completed
        elif old_status == "pending" and new_status == "completed":
            await db.accounts.update_one(
                {"user_id": transaction["user_id"]},
                {"$inc": {"balance": transaction["amount"]}}
            )
        
        # Reverse credit if completed deposit is cancelled/failed
        elif old_status == "completed" and new_status in ["failed", "cancelled"]:
            await db.accounts.update_one(
                {"user_id": transaction["user_id"]},
                {"$inc": {"balance": -transaction["amount"]}}
            )
            logger.info(f"Deposit {transaction_id} reversed by {admin['name']}, debited {transaction['amount']}")
    
    elif transaction["type"] == "withdrawal":
        # If withdrawal is failed/cancelled, return funds to customer
        if old_status in ["processing", "pending"] and new_status in ["failed", "cancelled"]:
            await db.accounts.update_one(
                {"user_id": transaction["user_id"]},
                {"$inc": {"balance": transaction["amount"]}}
            )
            logger.info(f"Withdrawal {transaction_id} cancelled by {admin['name']}, returned {transaction['amount']}")
    
    # Create audit log
    await create_audit_log(
        admin_id=admin["id"],
        admin_name=admin["name"],
        action="update_transaction_status",
        target_type="transaction",
        target_id=transaction_id,
        details={
            "old_status": old_status,
            "new_status": new_status,
            "amount": transaction["amount"],
            "customer_id": transaction["user_id"],
            "note": update.note
        }
    )
    
    return {
        "message": "Transaction status updated",
        "old_status": old_status,
        "new_status": new_status,
        "amount": transaction["amount"]
    }

# ============== ADMIN BALANCE ADJUSTMENT ==============
class BalanceAdjustment(BaseModel):
    amount: float
    type: str  # "credit" or "debit"
    reason: str

@admin_router.post("/customers/{customer_id}/adjust-balance")
async def adjust_customer_balance(
    customer_id: str,
    adjustment: BalanceAdjustment,
    admin = Depends(require_role([AdminRole.SUPER_ADMIN]))
):
    """Super Admin can manually adjust customer balance"""
    user = await db.users.find_one({"id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    account = await db.accounts.find_one({"user_id": customer_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if adjustment.type not in ["credit", "debit"]:
        raise HTTPException(status_code=400, detail="Type must be 'credit' or 'debit'")
    
    if adjustment.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # For debit, check sufficient balance
    if adjustment.type == "debit" and account["balance"] < adjustment.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance for debit")
    
    # Calculate adjustment
    amount_change = adjustment.amount if adjustment.type == "credit" else -adjustment.amount
    
    # Update balance
    await db.accounts.update_one(
        {"user_id": customer_id},
        {"$inc": {"balance": amount_change}}
    )
    
    # Create a transaction record for audit trail
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "type": f"admin_{adjustment.type}",
        "amount": adjustment.amount,
        "status": "completed",
        "description": f"Admin {adjustment.type}: {adjustment.reason}",
        "created_at": datetime.utcnow(),
        "completed_at": datetime.utcnow(),
        "admin_id": admin["id"],
        "admin_name": admin["name"]
    }
    await db.transactions.insert_one(transaction)
    
    # Create audit log
    await create_audit_log(
        admin_id=admin["id"],
        admin_name=admin["name"],
        action=f"balance_{adjustment.type}",
        target_type="customer",
        target_id=customer_id,
        details={
            "amount": adjustment.amount,
            "type": adjustment.type,
            "reason": adjustment.reason,
            "old_balance": account["balance"],
            "new_balance": account["balance"] + amount_change
        }
    )
    
    updated_account = await db.accounts.find_one({"user_id": customer_id})
    
    return {
        "message": f"Balance {adjustment.type}ed successfully",
        "amount": adjustment.amount,
        "new_balance": updated_account["balance"],
        "transaction_id": transaction["id"]
    }

# ============== ADMIN INTEREST DISTRIBUTION ==============
class InterestDistribution(BaseModel):
    customer_id: Optional[str] = None  # If None, distribute to all customers
    custom_rate: Optional[float] = None  # Override daily rate if provided

@admin_router.post("/distribute-interest")
async def distribute_interest(
    distribution: InterestDistribution = None,
    admin = Depends(require_role([AdminRole.SUPER_ADMIN]))
):
    """
    Distribute daily interest to customers.
    Super Admin only.
    - If customer_id is provided, distribute only to that customer
    - If customer_id is None, distribute to ALL customers with positive balance
    - Uses daily rate (15% annual / 365 days) unless custom_rate is provided
    """
    daily_rate = DAILY_INTEREST_RATE
    if distribution and distribution.custom_rate:
        daily_rate = distribution.custom_rate
    
    results = {
        "total_distributed": 0,
        "customers_credited": 0,
        "transactions": []
    }
    
    # Build query
    if distribution and distribution.customer_id:
        # Single customer
        accounts = await db.accounts.find({
            "user_id": distribution.customer_id,
            "balance": {"$gt": 0}
        }).to_list(1)
    else:
        # All customers with positive balance
        accounts = await db.accounts.find({"balance": {"$gt": 0}}).to_list(1000)
    
    for account in accounts:
        interest = account["balance"] * daily_rate
        
        if interest <= 0:
            continue
        
        # Update account
        await db.accounts.update_one(
            {"user_id": account["user_id"]},
            {
                "$inc": {"balance": interest, "total_interest_earned": interest},
                "$set": {"last_interest_date": datetime.utcnow()}
            }
        )
        
        # Create transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": account["user_id"],
            "type": "interest",
            "amount": interest,
            "status": "completed",
            "description": f"Daily interest ({daily_rate * 365 * 100:.1f}% p.a.)",
            "created_at": datetime.utcnow(),
            "distributed_by": admin["id"]
        }
        await db.transactions.insert_one(transaction)
        
        results["total_distributed"] += interest
        results["customers_credited"] += 1
        results["transactions"].append({
            "user_id": account["user_id"],
            "interest": interest,
            "new_balance": account["balance"] + interest
        })
    
    # Create audit log
    await create_audit_log(
        admin_id=admin["id"],
        admin_name=admin["name"],
        action="distribute_interest",
        target_type="system",
        target_id="all" if not (distribution and distribution.customer_id) else distribution.customer_id,
        details={
            "daily_rate": daily_rate,
            "annual_rate": daily_rate * 365,
            "total_distributed": results["total_distributed"],
            "customers_credited": results["customers_credited"]
        }
    )
    
    return {
        "message": f"Interest distributed to {results['customers_credited']} customer(s)",
        "total_distributed": results["total_distributed"],
        "customers_credited": results["customers_credited"],
        "daily_rate": daily_rate,
        "annual_rate": daily_rate * 365
    }

@admin_router.post("/distribute-interest/{customer_id}")
async def distribute_interest_to_customer(
    customer_id: str,
    custom_rate: Optional[float] = None,
    admin = Depends(require_role([AdminRole.TRANSACTION_MANAGER, AdminRole.SUPER_ADMIN]))
):
    """
    Distribute interest to a specific customer.
    Transaction Manager or Super Admin.
    """
    user = await db.users.find_one({"id": customer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    account = await db.accounts.find_one({"user_id": customer_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if account["balance"] <= 0:
        raise HTTPException(status_code=400, detail="Customer has no balance to earn interest")
    
    daily_rate = custom_rate if custom_rate else DAILY_INTEREST_RATE
    interest = account["balance"] * daily_rate
    
    # Update account
    await db.accounts.update_one(
        {"user_id": customer_id},
        {
            "$inc": {"balance": interest, "total_interest_earned": interest},
            "$set": {"last_interest_date": datetime.utcnow()}
        }
    )
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "type": "interest",
        "amount": interest,
        "status": "completed",
        "description": f"Daily interest ({daily_rate * 365 * 100:.1f}% p.a.)",
        "created_at": datetime.utcnow(),
        "distributed_by": admin["id"]
    }
    await db.transactions.insert_one(transaction)
    
    # Create audit log
    await create_audit_log(
        admin_id=admin["id"],
        admin_name=admin["name"],
        action="distribute_interest",
        target_type="customer",
        target_id=customer_id,
        details={
            "daily_rate": daily_rate,
            "interest_amount": interest,
            "customer_name": user["name"],
            "old_balance": account["balance"],
            "new_balance": account["balance"] + interest
        }
    )
    
    return {
        "message": f"Interest distributed to {user['name']}",
        "customer_id": customer_id,
        "customer_name": user["name"],
        "interest": interest,
        "new_balance": account["balance"] + interest,
        "daily_rate": daily_rate
    }

# ============== ADMIN STATEMENT REQUESTS ==============
@admin_router.get("/statements")
async def get_all_statement_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    admin = Depends(get_current_admin)
):
    """Get all statement requests for admin review"""
    query = {}
    if status:
        query["status"] = status
    
    total = await db.statement_requests.count_documents(query)
    skip = (page - 1) * limit
    
    requests = await db.statement_requests.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user data
    enriched = []
    for r in requests:
        user = await db.users.find_one({"id": r["user_id"]})
        account = await db.accounts.find_one({"user_id": r["user_id"]})
        enriched.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "customer_name": user["name"] if user else "Unknown",
            "customer_phone": user["phone"] if user else "Unknown",
            "customer_balance": account["balance"] if account else 0,
            "months": r["months"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "status": r["status"],
            "email": r.get("email"),
            "created_at": r["created_at"],
            "processed_by": r.get("processed_by"),
            "processed_at": r.get("processed_at"),
            "sent_at": r.get("sent_at"),
            "admin_note": r.get("admin_note")
        })
    
    return {
        "requests": enriched,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@admin_router.get("/statements/pending")
async def get_pending_statement_requests(admin = Depends(get_current_admin)):
    """Get count and list of pending statement requests"""
    pending_count = await db.statement_requests.count_documents({"status": "pending"})
    processing_count = await db.statement_requests.count_documents({"status": "processing"})
    
    pending = await db.statement_requests.find({"status": "pending"}).sort("created_at", 1).limit(10).to_list(10)
    
    enriched = []
    for r in pending:
        user = await db.users.find_one({"id": r["user_id"]})
        enriched.append({
            "id": r["id"],
            "customer_name": user["name"] if user else "Unknown",
            "customer_phone": user["phone"] if user else "Unknown",
            "months": r["months"],
            "created_at": r["created_at"]
        })
    
    return {
        "pending_count": pending_count,
        "processing_count": processing_count,
        "pending_requests": enriched
    }

@admin_router.get("/statements/{request_id}")
async def get_statement_request_detail(request_id: str, admin = Depends(get_current_admin)):
    """Get details of a specific statement request including transaction data"""
    request = await db.statement_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Statement request not found")
    
    user = await db.users.find_one({"id": request["user_id"]})
    account = await db.accounts.find_one({"user_id": request["user_id"]})
    
    # Get transactions for the period
    transactions = await db.transactions.find({
        "user_id": request["user_id"],
        "created_at": {"$gte": request["start_date"], "$lte": request["end_date"]}
    }).sort("created_at", -1).to_list(1000)
    
    # Calculate summary
    deposits = sum(t["amount"] for t in transactions if t["type"] == "deposit" and t["status"] == "completed")
    withdrawals = sum(t["amount"] for t in transactions if t["type"] == "withdrawal" and t["status"] == "completed")
    interest = sum(t["amount"] for t in transactions if t["type"] == "interest")
    
    return {
        "request": {
            "id": request["id"],
            "months": request["months"],
            "start_date": request["start_date"],
            "end_date": request["end_date"],
            "status": request["status"],
            "email": request.get("email"),
            "created_at": request["created_at"]
        },
        "customer": {
            "id": user["id"] if user else None,
            "name": user["name"] if user else "Unknown",
            "phone": user["phone"] if user else "Unknown",
            "current_balance": account["balance"] if account else 0,
            "total_interest_earned": account["total_interest_earned"] if account else 0
        },
        "summary": {
            "total_deposits": deposits,
            "total_withdrawals": withdrawals,
            "total_interest": interest,
            "net_change": deposits - withdrawals + interest,
            "transaction_count": len(transactions)
        },
        "transactions": [{
            "id": t["id"],
            "type": t["type"],
            "amount": t["amount"],
            "status": t["status"],
            "description": t.get("description", ""),
            "created_at": t["created_at"]
        } for t in transactions]
    }

class StatementAction(BaseModel):
    action: str  # "process", "complete", "send", "reject"
    note: Optional[str] = None
    email_sent_to: Optional[str] = None

@admin_router.post("/statements/{request_id}/action")
async def process_statement_request(
    request_id: str,
    action_data: StatementAction,
    admin = Depends(require_role([AdminRole.TRANSACTION_MANAGER, AdminRole.SUPER_ADMIN]))
):
    """Process a statement request (mark as processing, complete, send, or reject)"""
    request = await db.statement_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Statement request not found")
    
    valid_actions = ["process", "complete", "send", "reject"]
    if action_data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")
    
    update_data = {
        "updated_at": datetime.utcnow(),
        "processed_by": admin["id"],
        "admin_name": admin["name"]
    }
    
    if action_data.action == "process":
        update_data["status"] = "processing"
        update_data["processed_at"] = datetime.utcnow()
        message = "Statement request marked as processing"
    elif action_data.action == "complete":
        update_data["status"] = "completed"
        update_data["completed_at"] = datetime.utcnow()
        message = "Statement marked as completed"
    elif action_data.action == "send":
        update_data["status"] = "sent"
        update_data["sent_at"] = datetime.utcnow()
        update_data["email_sent_to"] = action_data.email_sent_to or request.get("email")
        message = f"Statement sent to customer"
    elif action_data.action == "reject":
        update_data["status"] = "rejected"
        update_data["rejected_at"] = datetime.utcnow()
        message = "Statement request rejected"
    
    if action_data.note:
        update_data["admin_note"] = action_data.note
    
    await db.statement_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    # Create audit log
    await create_audit_log(
        admin_id=admin["id"],
        admin_name=admin["name"],
        action=f"statement_{action_data.action}",
        target_type="statement_request",
        target_id=request_id,
        details={
            "action": action_data.action,
            "customer_id": request["user_id"],
            "months": request["months"],
            "note": action_data.note
        }
    )
    
    return {
        "message": message,
        "request_id": request_id,
        "new_status": update_data["status"]
    }

# ============== ADMIN PENDING VERIFICATIONS ==============
@admin_router.get("/pending-verifications")
async def get_pending_verifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin = Depends(get_current_admin)
):
    """Get all transactions pending admin verification"""
    query = {"status": "pending_verification"}
    
    total = await db.transactions.count_documents(query)
    skip = (page - 1) * limit
    
    transactions = await db.transactions.find(query).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)
    
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

@admin_router.post("/transactions/{transaction_id}/verify")
async def verify_deposit(
    transaction_id: str,
    approve: bool = True,
    note: Optional[str] = None,
    admin = Depends(require_role([AdminRole.TRANSACTION_MANAGER, AdminRole.SUPER_ADMIN]))
):
    """Quick verify or reject a pending deposit"""
    transaction = await db.transactions.find_one({
        "id": transaction_id,
        "status": "pending_verification"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Pending transaction not found")
    
    if approve:
        # Approve - credit the balance
        new_status = "completed"
        await db.accounts.update_one(
            {"user_id": transaction["user_id"]},
            {"$inc": {"balance": transaction["amount"]}}
        )
        message = f"Deposit of KES {transaction['amount']:,.2f} verified and credited"
    else:
        # Reject
        new_status = "failed"
        message = f"Deposit of KES {transaction['amount']:,.2f} rejected"
    
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "status": new_status,
            "status_note": note or ("Verified by admin" if approve else "Rejected by admin"),
            "verified_by": admin["name"],
            "verified_at": datetime.utcnow(),
            "updated_by": admin["id"]
        }}
    )
    
    # Create audit log
    await create_audit_log(
        admin_id=admin["id"],
        admin_name=admin["name"],
        action="verify_deposit" if approve else "reject_deposit",
        target_type="transaction",
        target_id=transaction_id,
        details={
            "approved": approve,
            "amount": transaction["amount"],
            "customer_id": transaction["user_id"],
            "note": note
        }
    )
    
    return {
        "message": message,
        "status": new_status,
        "transaction_id": transaction_id
    }

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

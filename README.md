# Dolaglobo Finance - Kenyan Wallet MMF App

A mobile-first Money Market Fund application for Kenyan retail investors, built with Expo (React Native) and FastAPI.

## Features

### Customer App
- 📱 Sign up with phone number and PIN
- 💰 View balance, daily interest, and estimated yield
- 📥 Deposit via M-Pesa Paybill (pending admin verification)
- 📤 Withdraw to M-Pesa (pending admin approval)
- 📊 View transaction history
- 📄 Request account statements (1-12 months)

### Admin Dashboard
- 📊 Dashboard with AUM, customer count, and metrics
- ✅ Verify pending deposits
- 💸 Approve/reject withdrawals
- 🔄 Reverse failed withdrawals (Super Admin)
- 📈 Distribute interest to customers
- 📄 Process statement requests
- 👥 Customer management
- 📝 Audit logs

## Tech Stack

- **Frontend**: Expo (React Native) with expo-router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **State Management**: Zustand
- **UI**: Custom React Native components with red admin theme

## Deployment on Render

### Prerequisites
- GitHub account
- MongoDB Atlas cluster
- Render account

### Environment Variables (Set in Render)

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for user JWT tokens |
| `ADMIN_JWT_SECRET` | Secret key for admin JWT tokens |

### Deploy Steps

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Full app push for Render deployment"
   git remote add origin https://github.com/YOUR_USERNAME/kenyan-wallet.git
   git push -u origin main
   ```

2. **Create Render Web Service**:
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repo
   - Configure:
     - **Build Command**: `cd frontend && npm install && npx expo export --platform web && cd ../backend && pip install -r requirements.txt`
     - **Start Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Add environment variables

3. **Set MongoDB Atlas**:
   - Add your IP to MongoDB Atlas whitelist (or 0.0.0.0/0 for all)
   - Set `MONGO_URI` in Render environment variables

### API Endpoints

#### Customer Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with phone/PIN

#### Customer Account
- `GET /api/account` - Get balance and interest info
- `POST /api/deposit` - Initiate deposit
- `POST /api/deposit/confirm/{id}` - Confirm M-Pesa payment
- `POST /api/withdraw` - Request withdrawal
- `GET /api/transactions` - Get transaction history

#### Admin Auth
- `POST /api/admin/auth/register` - Register admin
- `POST /api/admin/auth/login` - Admin login

#### Admin Operations
- `GET /api/admin/dashboard/stats` - Dashboard metrics
- `GET /api/admin/pending-verifications` - Pending deposits
- `POST /api/admin/transactions/{id}/verify` - Approve/reject deposit
- `GET /api/admin/pending-withdrawals` - Pending withdrawals
- `POST /api/admin/withdrawals/{id}/approve` - Approve withdrawal
- `POST /api/admin/withdrawals/{id}/reject` - Reject withdrawal
- `POST /api/admin/withdrawals/{id}/reverse` - Reverse withdrawal (Super Admin)
- `POST /api/admin/distribute-interest` - Distribute interest to all
- `GET /api/admin/statements` - Statement requests
- `POST /api/admin/statements/{id}/action` - Process statement

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
npx expo start --web
```

## Admin Credentials (Default)

Create via `/api/admin/auth/register` endpoint. First registered admin becomes Super Admin.

## License

MIT License - Dolaglobo Finance

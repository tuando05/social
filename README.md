# Paper App Starter (React + Express + TypeScript)

Paper là starter kit full-stack cho ứng dụng mạng xã hội, gồm frontend React và backend Express, cùng dùng TypeScript.

## Công nghệ chính

### Frontend (`/frontend`)
- React 19 + Vite
- TypeScript
- Tailwind CSS v4 + Shadcn/UI
- TanStack Query
- Clerk (auth)
- Uploadthing

### Backend (`/backend`)
- Express 5
- Prisma 7 + PostgreSQL (Supabase)
- Clerk SDK + Webhook (Svix)
- Uploadthing
- Swagger/OpenAPI

## Cấu trúc thư mục

```text
.
|- backend/
|- frontend/
`- README.md
```

## Cài đặt nhanh

### 1. Chuẩn bị biến môi trường

Tạo file `.env` từ file mẫu:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Điền đầy đủ key theo provider (Supabase, Clerk, Uploadthing, Pusher).

### 2. Cài dependencies

```bash
cd backend
npm install

cd ..\frontend
npm install
```

### 3. Khởi tạo database

```bash
cd ..\backend
npm run prisma:generate
npm run db:push
```

### 4. Chạy local (2 terminal)

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Scripts thường dùng

### Backend
- `npm run dev`: chạy backend dev
- `npm run build`: build TypeScript
- `npm run start`: chạy bản build
- `npm run db:push`: sync schema
- `npm run db:seed`: seed dữ liệu mẫu
- `npm run test`: chạy test

### Frontend
- `npm run dev`: chạy frontend dev
- `npm run build`: build frontend
- `npm run lint`: kiểm tra eslint
- `npm run preview`: preview bản build

## Tài liệu chi tiết

- Backend: xem `backend/README.md`
- Frontend: xem `frontend/README.md`

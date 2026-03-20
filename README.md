# Social App Starter (React + Express + TypeScript)

Dự án này là bộ khung (starter kit) cho một ứng dụng mạng xã hội hiện đại, sử dụng full-stack TypeScript với các công cụ mạnh mẽ nhất.

## 🚀 Công nghệ sử dụng

### Frontend (Thư mục /frontend)

- Framework: React + Vite
- Styling: Tailwind CSS v4 + Shadcn/UI
- Ngôn ngữ: TypeScript
- State Management: TanStack Query (React Query)
- Authentication: Clerk
- Realtime: Pusher Client
- File Upload: Uploadthing
- Testing: Vitest

### Backend (Thư mục /backend)

- Framework: Express.js
- Database ORM: Prisma 7 + Supabase (PostgreSQL)
- Driver Adapter: @prisma/adapter-pg (Bắt buộc cho Prisma 7 trên Node.js)
- Authentication: Clerk Node SDK
- Webhooks: Svix (xác thực Clerk Webhooks)
- Realtime: Pusher Server
- File Upload: Uploadthing
- API Docs: Swagger UI
- Testing: Vitest + Supertest

## 🛠 Hướng dẫn cài đặt

### 1. Chuẩn bị biến môi trường

Mỗi thư mục /frontend và /backend đều cần file .env.

Tại thư mục /backend: Tạo file .env từ .env.example và điền các thông tin từ:

- Supabase (Sử dụng cổng 6543 cho DATABASE_URL và 5432 cho DIRECT_URL)
- Clerk Dashboard (Secret Key và Webhook Secret)
- Uploadthing (Secret và App Id)
- Pusher (App Id, Key, Secret, Cluster)

### 2. Cài đặt Dependencies

Mở 2 terminal riêng biệt:

Terminal 1 (Backend):

```bash
cd backend
npm install
npm run prisma:generate
```

Terminal 2 (Frontend):

```bash
cd frontend
npm install
```

### 3. Đồng bộ Database

Khi đã có Database URL trong file .env của backend, thực hiện đẩy cấu trúc bảng lên Supabase:

```bash
cd backend
npm run db:push
```

### 4. Khởi chạy dự án

Chạy cả hai cùng lúc để bắt đầu code:

- Backend: cd backend && npm run dev (Chạy tại port 5000)
- Frontend: cd frontend && npm run dev (Chạy tại port 5173/5174)

## 🔒 Lưu ý quan trọng

### 🎨 Tailwind CSS v4 và Shadcn/UI

- Dự án sử dụng Tailwind CSS v4. Cấu hình chính nằm trong src/index.css sử dụng các chỉ thị @theme.
- Shadcn/UI đã được cấu hình với path alias @/. Để thêm component mới, hãy dùng lệnh:

```bash
npx shadcn@latest add [component-name]
```

### 🗄 Prisma 7 và Driver Adapter

- Prisma 7 yêu cầu khởi tạo với Driver Adapter. Chúng ta sử dụng @prisma/adapter-pg.
- Cấu hình khởi tạo nằm tại src/lib/prisma.ts. Nếu bạn thay đổi model, hãy nhớ chạy npx prisma generate.

### 🔄 Clerk Webhooks

- Để đồng bộ User từ Clerk về Database, bạn cần cấu hình URL Webhook trên Clerk Dashboard trỏ về endpoint: [YOUR_DOMAIN]/api/webhooks/clerk.
- Sử dụng ngrok để test webhook ở môi trường local.

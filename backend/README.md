# Paper Backend

Backend API cho dự án Paper, xây dựng bằng Express + Prisma + TypeScript.

## Yêu cầu

- Node.js 20+
- PostgreSQL (khuyến nghị Supabase)

## Cấu hình môi trường

1. Tạo file `.env` từ mẫu:

```bash
copy .env.example .env
```

2. Cập nhật các biến quan trọng:

- `PORT`
- `FRONTEND_ORIGIN`
- `DATABASE_URL`
- `DIRECT_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `UPLOADTHING_TOKEN` (ưu tiên)

## Chạy local

```bash
npm install
npm run prisma:generate
npm run db:push
npm run dev
```

Server mặc định chạy tại `http://localhost:5000`.

## Scripts

- `npm run dev`: chạy dev với nodemon
- `npm run build`: build TypeScript
- `npm run start`: chạy bản build trong `dist`
- `npm run prisma:generate`: generate Prisma client
- `npm run db:push`: đẩy schema lên DB
- `npm run db:seed`: seed dữ liệu mẫu
- `npm run db:backfill-usernames`: backfill username cho user cũ
- `npm run test`: chạy test 1 lần
- `npm run test:watch`: chạy test chế độ watch

## API Docs

- Swagger UI: `http://localhost:5000/api/docs`
- OpenAPI JSON: `http://localhost:5000/api/docs/json`

## Postman

Import 2 file trong thư mục `postman/`:

- `paper-backend.postman_collection.json`
- `paper-backend.postman_environment.json`

Sau đó thiết lập biến môi trường trong Postman:

- `baseUrl`
- `clerkToken`
- `targetUserId`
- `postId`

## Ghi chú

- Hầu hết endpoint user-facing yêu cầu Bearer token từ Clerk.
- Webhook Clerk: `POST /api/webhooks/clerk`
- Uploadthing endpoint base: `/api/uploadthing`
- `UPLOADTHING_SECRET` vẫn được hỗ trợ để tương thích ngược.

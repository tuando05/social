# Paper Frontend

Frontend cho dự án Paper, xây dựng bằng React + Vite + TypeScript.

## Công nghệ chính

- React 19
- Vite 8
- TypeScript
- Tailwind CSS v4 + Shadcn/UI
- TanStack Query
- Clerk (authentication)
- Uploadthing

## Cấu hình môi trường

1. Tạo file `.env` từ mẫu:

```bash
copy .env.example .env
```

2. Cập nhật các biến cần thiết:

- `VITE_CLERK_PUBLISHABLE_KEY`: publishable key từ Clerk Dashboard
- `VITE_API_URL`: URL backend API (ví dụ: `http://localhost:5000`)

## Chạy local

```bash
npm install
npm run dev
```

App mặc định chạy tại `http://localhost:5173`.

## Scripts

- `npm run dev`: chạy môi trường dev
- `npm run build`: build production
- `npm run lint`: kiểm tra eslint
- `npm run preview`: chạy preview bản build

## Build production

```bash
npm run build
npm run preview
```

## Cấu trúc đáng chú ý

- `src/components`: UI components theo feature
- `src/contexts`: theme và i18n
- `src/hooks`: custom hooks (API, local storage, profile)
- `src/lib`: helper utilities
- `src/types`: type dùng chung cho API

## Ghi chú

- Frontend dùng Clerk để quản lý phiên đăng nhập.
- Data fetching và cache được quản lý bởi TanStack Query.
- Theme và ngôn ngữ được lưu qua localStorage.

# Backend Quick Start

## Run

1. Install packages:
   - npm install
2. Generate Prisma client:
   - npm run prisma:generate
3. Push schema to database:
   - npm run db:push
4. Optional seed data:
   - npm run db:seed
5. Start dev server:
   - npm run dev

## API Docs

- Swagger UI: http://localhost:5000/api/docs
- OpenAPI JSON: http://localhost:5000/api/docs/json

## Postman

Import both files in postman/:

- social-backend.postman_collection.json
- social-backend.postman_environment.json

Then set:

- clerkToken: your Clerk Bearer token
- targetUserId, postId for route variables

## Notes

- All user-facing routes require auth.
- Webhook endpoint:
  - POST /api/webhooks/clerk
- Uploadthing endpoint base:
  - /api/uploadthing
- Uploadthing env:
   - Prefer `UPLOADTHING_TOKEN`.
   - Legacy `UPLOADTHING_SECRET` is still accepted as fallback in this project.

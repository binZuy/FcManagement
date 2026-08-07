This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3005](http://localhost:3005) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database (Prisma + Supabase)

Schema quản lý bằng Prisma, không dùng `prisma migrate` (không có thư mục `prisma/migrations`) — dùng `db push` để đồng bộ schema trực tiếp.

### 1. Cấu hình kết nối

Copy `.env.example` thành `.env.local` và điền 2 biến sau (lấy từ Supabase Dashboard → Project Settings → Database → Connection string):

- `DATABASE_URL` — connection pooler (port 6543, `pgbouncer=true`), dùng cho app lúc runtime.
- `DIRECT_URL` — direct connection (port 5432, không qua pooler), dùng cho Prisma CLI (`db push`, `db seed`). CLI đọc URL này qua `prisma.config.ts`, không đọc từ `datasource` trong `schema.prisma`.

### 2. Đồng bộ schema lên database

Chạy lệnh này mỗi khi sửa `prisma/schema.prisma` (thêm/sửa model, field...):

```bash
npx prisma db push
```

Lệnh này tạo/cập nhật bảng trong DB theo đúng schema hiện tại. Dùng cho cả lần đầu setup DB mới lẫn các thay đổi sau này.

### 3. Generate Prisma Client

Cần chạy lại sau khi đổi schema (đã tự động chạy trong `npm run build` / `postinstall`, nhưng khi dev cần chạy tay nếu vừa `db push`):

```bash
npx prisma generate
```

### 4. Seed dữ liệu ban đầu

Seed hiện tại chỉ thêm email trong biến `ADMIN_EMAIL` (.env.local) vào bảng whitelist (`AllowedEmail`) để tài khoản đó có thể đăng nhập và tự động lên quyền ADMIN ở lần login đầu:

```bash
npx prisma db seed
```

### 5. Thứ tự chạy khi setup DB mới (project Supabase mới / đổi region)

```bash
npx prisma generate   # generate client theo schema hiện tại
npx prisma db push    # tạo bảng trên DB mới
npx prisma db seed    # thêm admin whitelist
```

Sau đó **khởi động lại `npm run dev`** — biến môi trường trong `.env.local` chỉ được đọc lúc process Next.js khởi động, sửa `.env.local` không tự áp dụng cho dev server đang chạy.

> Lưu ý: đổi region Supabase không hỗ trợ "move" tại chỗ — phải tạo project mới ở region khác rồi chạy lại các bước trên vào DB mới, dữ liệu cũ (nếu cần giữ) phải tự dump/restore bằng `pg_dump`/`psql`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

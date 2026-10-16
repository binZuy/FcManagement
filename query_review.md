# 📋 Danh Sách Query Cần Review — FC-Man

> Bỏ qua các vấn đề liên quan đến `auth()`. Chỉ tập trung vào Prisma queries trên từng màn hình.

---

## 1. Dashboard (`/`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/page.tsx)

### Q1.1 — Lấy tất cả trận DONE để đếm win/lose (line 35-38)
```ts
prisma.matchSession.findMany({
  where: { status: MatchStatus.DONE, result: { not: null } },
  select: { result: true },
});
```
- **Vấn đề:** Fetch toàn bộ rows rồi `.filter()` trên JS để đếm WIN. Khi có 500+ trận DONE → trả về 500 rows chỉ để đếm.
- **Gợi ý:** Thay bằng 2 `count()`:
```ts
const [winCount, totalWithResult] = await Promise.all([
  prisma.matchSession.count({ where: { status: 'DONE', result: 'WIN' } }),
  prisma.matchSession.count({ where: { status: 'DONE', result: { not: null } } }),
]);
```

---

### Q1.2 — Upcoming match: nested include 3 cấp (line 39-47)
```ts
prisma.matchSession.findFirst({
  where: { status: MatchStatus.UPCOMING },
  include: {
    attendances: {
      include: { member: { include: { user: { select: { name: true, image: true } } } } },
    },
  },
  orderBy: { matchDate: "asc" },
});
```
- **Vấn đề:** Include 3 cấp `matchSession → attendances → member → user`. Lấy **tất cả** attendances của trận. Trên UI chỉ hiển thị 4 avatar + count.
- **Gợi ý:** Chỉ cần `take: 4` cho avatar, và dùng `_count` cho tổng số:
```ts
prisma.matchSession.findFirst({
  where: { status: MatchStatus.UPCOMING },
  include: {
    attendances: {
      include: { member: { include: { user: { select: { name: true, image: true } } } } },
      take: 4,
    },
    _count: { select: { attendances: true } },
  },
  orderBy: { matchDate: "asc" },
});
```

---

### Q1.3 — Top 3 chuyên cần: orderBy relation count (line 48-62)
```ts
prisma.member.findMany({
  where: { status: "ACTIVE" },
  include: {
    user: { select: { name: true, image: true } },
    _count: { select: { attendances: { where: { status: "ATTENDED" } } } },
  },
  orderBy: { attendances: { _count: "desc" } },
  take: 3,
});
```
- **Vấn đề:** Prisma phải aggregate count tất cả attendances cho **mọi** active member rồi mới sort → chậm dần khi member & attendance tăng.
- **Mức độ:** ⚠️ Trung bình — `take: 3` giới hạn kết quả nhưng DB vẫn phải scan all. Chưa cần sửa ngay nếu < 50 members.

---

### Q1.4 — Open payment sessions: lấy tất cả records (line 63-70)
```ts
prisma.paymentSession.findMany({
  where: { status: "OPEN" },
  include: {
    paymentRecords: {
      select: { status: true, amountRequired: true, amountPaid: true },
    },
  },
});
```
- **Vấn đề:** Lấy **tất cả** paymentRecords trong mọi session OPEN. Chỉ cần tổng aggregated (đã thu / cần thu).
- **Gợi ý:** Dùng raw SQL aggregate hoặc chấp nhận nếu số session OPEN ít (1-3).

---

## 2. Matches List (`/matches`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/matches/page.tsx)

### Q2.1 — List view: fetch tất cả matches + sort JS (line 38-54)
```ts
const rawMatches = await prisma.matchSession.findMany({
  where: dateQuery ? { matchDate: dateQuery } : undefined,
  include: { _count: { select: { attendances: true } } },
  orderBy: { matchDate: "desc" },
});

// Sort trên JS
matches = rawMatches.sort((a, b) => {
  if (a.status === "UPCOMING" && b.status !== "UPCOMING") return -1;
  ...
});
```
- **Vấn đề 1:** Khi **không có filter `month`** → lấy **TẤT CẢ** matches, không limit.
- **Vấn đề 2:** Sort trên JS thay vì DB. Prisma hỗ trợ multi-field orderBy.
- **Gợi ý:**
```ts
const rawMatches = await prisma.matchSession.findMany({
  where: dateQuery ? { matchDate: dateQuery } : undefined,
  include: { _count: { select: { attendances: true } } },
  orderBy: [{ status: "asc" }, { matchDate: "desc" }],
  take: month ? undefined : 50,
});
```

---

## 3. Match Detail (`/matches/[id]`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/matches/[id]/page.tsx)

### Q3.1 — Nested include 3 cấp (line 34-49)
```ts
prisma.matchSession.findUnique({
  where: { id },
  include: {
    attendances: {
      include: {
        member: {
          include: { user: { select: { name: true, image: true } } },
        },
      },
      orderBy: { member: { user: { name: "asc" } } },
    },
    paymentSessions: {
      select: { id: true, title: true, status: true },
    },
  },
});
```
- **Vấn đề:** Nested 3 cấp (match → attendances → member → user). Lấy tất cả attendances.
- **Mức độ:** 🟢 OK hiện tại — mỗi trận tối đa 20-30 attendances. `paymentSessions` đã select nhẹ.

---

## 4. Match Edit (`/matches/[id]/edit`) — Client Component

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/matches/[id]/edit/page.tsx)

### Q4.1 — API `/api/members` lấy tất cả members (line 98)
```ts
fetch(`/api/members`)
// → API: prisma.member.findMany({ include: { user } })
```
- **Vấn đề:** Lấy **tất cả** members kể cả INACTIVE/SUSPENDED. Chỉ cần ACTIVE.
- **Gợi ý:**
```ts
fetch(`/api/members?status=ACTIVE`)
```

---

### Q4.2 — API `/api/matches/[id]` GET — nested include nặng (API route)
```ts
// File: src/app/api/matches/[id]/route.ts (line 22-35)
prisma.matchSession.findUnique({
  where: { id },
  include: {
    attendances: {
      include: { member: { include: { user: { select: { name: true, image: true } } } } },
    },
    paymentSessions: {
      include: { _count: { select: { paymentRecords: true } } },
    },
  },
});
```
- **Vấn đề:** Edit page không cần `paymentSessions` → include thừa.
- **Gợi ý:** Tách endpoint hoặc thêm query param `?include=attendances` để chỉ lấy data cần thiết.

---

### Q4.3 — Component 934 dòng, re-render toàn bộ khi tick checkbox
- **Vấn đề:** Mỗi checkbox tick → `setAttendances({ ...attendances, [member.id]: ... })` → **spread toàn bộ map** → re-render **toàn bộ 934 dòng**.
- **Gợi ý:** Tách thành sub-components + `React.memo()`:
  - `AttendanceItem` (mỗi member 1 component, memo)
  - `DrinksItem` (mỗi member 1 component, memo)

---

## 5. Members List (`/members`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/members/page.tsx)

### Q5.1 — Lấy tất cả members + count relation (line 11-22)
```ts
prisma.member.findMany({
  include: {
    user: { select: { name: true, email: true, image: true, phone: true } },
    _count: {
      select: {
        attendances: true,
        paymentRecords: { where: { status: "PAID" } },
      },
    },
  },
  orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
});
```
- **Vấn đề:** Không có limit/pagination. `_count paymentRecords(PAID)` buộc DB aggregate mỗi member.
- **Mức độ:** ⚠️ Trung bình — OK dưới 50 members. Nên thêm pagination khi scale.

---

## 6. Member Detail (`/members/[id]`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/members/[id]/page.tsx)

### Q6.1 — Lấy TẤT CẢ attendances (line 51-68)
```ts
prisma.member.findUnique({
  where: { id },
  include: {
    user: { select: { id: true, name: true, email: true, image: true, phone: true } },
    attendances: {
      select: {
        id: true, status: true,
        match: { select: { id: true, title: true, matchDate: true, result: true, location: true } },
      },
      orderBy: { match: { matchDate: "desc" } },
    },
    paymentRecords: {
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      select: { status: true },
    },
  },
});
```
- **Vấn đề:** `attendances` không có `take` → lấy **toàn bộ** lịch sử. Member đá 200 trận → 200 rows + 200 match JOINs.
- **Gợi ý:** Thêm `take: 50` cho attendances, hiển thị nút "Xem thêm" nếu cần.

---

## 7. Payments List (`/payments`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/payments/page.tsx)

### Q7.1 — Lấy TẤT CẢ members rồi filter debt trên JS (line 12-22)
```ts
prisma.member.findMany({
  include: {
    user: { select: { name: true, email: true, image: true } },
    paymentRecords: {
      where: { status: { in: [RecordStatus.PENDING, RecordStatus.OVERDUE] } },
      select: { status: true, amountRequired: true, amountPaid: true },
    },
  },
});
```
Sau đó JS:
```ts
const debtMembers = memberStats.filter((m) => m.debt > 0).sort((a, b) => b.debt - a.debt);
```
- **Vấn đề:** Lấy **tất cả** members (kể cả không nợ, kể cả INACTIVE) rồi filter JS. Sort cũng trên JS.
- **Gợi ý:** Filter ở DB level:
```ts
prisma.member.findMany({
  where: {
    paymentRecords: {
      some: { status: { in: ["PENDING", "OVERDUE"] } },
    },
  },
  include: { ... },
});
```

---

## 8. Payment Detail (`/payments/[id]`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/payments/[id]/page.tsx)

### Q8.1 — Lấy TẤT CẢ paymentRecords + nested include session→match (line 24-38)
```ts
prisma.member.findUnique({
  where: { id },
  include: {
    user: { select: { name: true, email: true, image: true, phone: true } },
    paymentRecords: {
      include: {
        session: { include: { match: true } },  // ← full match object
        sepayTx: true,                           // ← full sepayTx object
      },
      orderBy: { createdAt: "desc" },
    },
  },
});
```
- **Vấn đề 1:** `session: { include: { match: true } }` — lấy **toàn bộ** match object. Chỉ cần `title` và `matchDate`.
- **Vấn đề 2:** `sepayTx: true` — lấy toàn bộ transaction object kể cả `rawPayload` (JSON lớn). Chỉ cần vài field hiển thị.
- **Vấn đề 3:** Không có `take` → lấy tất cả records.
- **Gợi ý:**
```ts
paymentRecords: {
  include: {
    session: {
      select: { title: true, code: true, dueDate: true },  // ← bỏ include match
    },
    sepayTx: {
      select: { gateway: true, transactionDate: true },     // ← chỉ cần gateway
    },
  },
  orderBy: { createdAt: "desc" },
  take: 50,
},
```

---

## 9. Payment Session Detail (`/payments/session/[id]`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/payments/session/[id]/page.tsx)

### Q9.1 — Lấy match kèm tất cả attendances + tất cả paymentRecords (line 20-36)
```ts
prisma.paymentSession.findUnique({
  where: { id },
  include: {
    match: {
      include: { attendances: true },  // ← TẤT CẢ attendances, chỉ cần guestCount
    },
    paymentRecords: {
      include: {
        member: { include: { user: { select: { name: true, email: true, image: true } } } },
        sepayTx: true,  // ← full object kể cả rawPayload
      },
      orderBy: [...],
    },
  },
});
```
- **Vấn đề 1:** `match.attendances: true` lấy toàn bộ attendance records. Chỉ cần `guestCount`, `drinksGuestCount`, `isDrinks`, `feeAssigned`, `drinksFeeAssigned`, `memberId`.
- **Vấn đề 2:** `sepayTx: true` lấy full object kể cả `rawPayload` JSON. Chỉ cần `gateway`.
- **Gợi ý:**
```ts
match: {
  include: {
    attendances: {
      select: {
        memberId: true, guestCount: true, drinksGuestCount: true,
        isDrinks: true, feeAssigned: true, drinksFeeAssigned: true,
      },
    },
  },
},
paymentRecords: {
  include: {
    member: { include: { user: { select: { name: true, email: true, image: true } } } },
    sepayTx: { select: { gateway: true } },
  },
},
```

---

### Q9.2 — Thiếu `auth()` check
- **Vấn đề:** Page này không gọi `auth()` → có thể truy cập mà không cần đăng nhập.
- **Gợi ý:** Thêm auth check (dù bạn nói bỏ qua auth — vấn đề này là bug bảo mật, khác với optimization).

---

## 10. Transactions (`/transactions`)

**File:** [page.tsx](file:///home/hungls/Desktop/duynm/fc-man/src/app/(dashboard)/transactions/page.tsx)

### Q10.1 — Hardcoded limit 100, không pagination (line 9-12)
```ts
prisma.sepayTransaction.findMany({
  orderBy: { createdAt: "desc" },
  take: 100,
});
```
- **Mức độ:** 🟢 OK hiện tại — có limit. Cần pagination khi > 100 transactions.

---

## 11. API Route: Match Update (`PATCH /api/matches/[id]`)

**File:** [route.ts](file:///home/hungls/Desktop/duynm/fc-man/src/app/api/matches/[id]/route.ts)

### Q11.1 — Update attendance lần lượt bằng Promise.all (line 138-172)
```ts
await Promise.all(active.map(a => {
  return prisma.matchAttendance.update({
    where: { id: a.id },
    data: { matchResultForMember, feeAssigned, drinksFeeAssigned },
  });
}));
```
- **Vấn đề:** Với 20 attendances → **20 UPDATE queries chạy song song**. Mỗi query 1 round-trip tới DB.
- **Gợi ý:** Dùng `prisma.$transaction()` batch hoặc raw SQL `UPDATE ... CASE WHEN`:
```ts
await prisma.$transaction(
  active.map(a => prisma.matchAttendance.update({
    where: { id: a.id },
    data: { ... },
  }))
);
```

---

### Q11.2 — POST finalize match: đọc match 2 lần + nhiều update riêng lẻ (line 187-302)
```ts
// Đọc match lần 1 (line 195-203)
const match = await prisma.matchSession.findUnique({ ... });
// Update status (line 207)
await prisma.matchSession.update({ ... });
// Tạo paymentSession (line 212-221)
await prisma.paymentSession.create({ ... });
// Promise.all: update attendance + create/update paymentRecord cho mỗi member (line 240-297)
await Promise.all(active.map(async (a) => {
  const attendanceUpdate = prisma.matchAttendance.update({ ... });
  const recordOperation = prisma.paymentRecord.create/update({ ... });
  return Promise.all([attendanceUpdate, recordOperation]);
}));
```
- **Vấn đề:** Với 20 members → **1 read + 1 update match + 1 create session + 40 update/create (20 attendance + 20 record) = ~43 queries**.
- **Gợi ý:** Wrap tất cả writes trong 1 `$transaction()`:
```ts
await prisma.$transaction(async (tx) => {
  await tx.matchSession.update({ ... });
  const paySession = await tx.paymentSession.create({ ... });
  // batch updates...
});
```

---

## Bảng Tổng Hợp — Sắp xếp theo mức ưu tiên

| Ưu tiên | ID | Màn hình | Vấn đề tóm tắt |
|---|---|---|---|
| 🔴 Cao | Q4.3 | Match Edit | Component 934 dòng, re-render toàn bộ mỗi checkbox |
| 🔴 Cao | Q11.2 | API Finalize | ~43 queries riêng lẻ khi chốt sổ |
| 🔴 Cao | Q11.1 | API Update | 20 UPDATE queries song song không batch |
| 🟠 TB | Q1.1 | Dashboard | findMany tất cả trận DONE chỉ để đếm |
| 🟠 TB | Q1.2 | Dashboard | Lấy tất cả attendances chỉ hiển thị 4 avatar |
| 🟠 TB | Q2.1 | Matches List | Không limit khi không filter, sort trên JS |
| 🟠 TB | Q7.1 | Payments List | Lấy tất cả members rồi filter JS |
| 🟠 TB | Q8.1 | Payment Detail | Include full match + full sepayTx (kèm rawPayload) |
| 🟠 TB | Q9.1 | Session Detail | Include full attendances + full sepayTx |
| 🟡 Thấp | Q4.1 | Match Edit | API lấy tất cả members kể cả INACTIVE |
| 🟡 Thấp | Q4.2 | Match Edit | API include paymentSessions thừa |
| 🟡 Thấp | Q6.1 | Member Detail | Attendances không limit |
| 🟡 Thấp | Q5.1 | Members List | Không pagination |
| 🟡 Thấp | Q9.2 | Session Detail | Thiếu auth check (bug bảo mật) |
| 🟢 OK | Q1.3 | Dashboard | orderBy count — chấp nhận được |
| 🟢 OK | Q1.4 | Dashboard | Open sessions — ít data |
| 🟢 OK | Q3.1 | Match Detail | Nested 3 cấp — data nhỏ |
| 🟢 OK | Q10.1 | Transactions | Có limit 100 — OK |

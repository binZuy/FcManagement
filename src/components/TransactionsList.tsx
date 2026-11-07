"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  Layers,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";

export interface BundleItemDetail {
  id: string;
  recordId: string;
  sessionCode: string;
  sessionTitle: string;
  sessionType: string;
  matchId?: string | null;
  matchDate?: string | null;
  amountRequired: number;
  amountPaid: number;
  status: string;
  note: string | null;
}

export interface BundleDetail {
  id: string;
  bundleCode: string;
  totalAmount: number;
  status: string;
  paidAt?: string | null;
  createdAt?: string | null;
  items: BundleItemDetail[];
}

export interface SessionDetail {
  code: string;
  title: string;
  type: string;
  matchId?: string | null;
  matchDate?: string | null;
  amountRequired: number;
  amountPaid: number;
  status: string;
  note: string | null;
}

export interface TransactionRowData {
  id: string;
  sepayId: string;
  gateway: string;
  accountNumber: string | null;
  transferAmount: number;
  content: string | null;
  referenceCode: string | null;
  transactionDate: string;
  createdAt: string;
  isMatched: boolean;
  matchedMemberId: string | null;
  matchedMemberCode: string | null;
  matchedSessionCode: string | null;
  matchedBundleCode: string | null;
  member: {
    id: string;
    code: string;
    name: string | null;
    image: string | null;
  } | null;
  bundle: BundleDetail | null;
  session: SessionDetail | null;
}

interface TransactionsListProps {
  initialTransactions: TransactionRowData[];
}

export function TransactionsList({ initialTransactions }: TransactionsListProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "MATCHED" | "UNMATCHED" | "BUNDLE">("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllWithBundles = () => {
    const idsWithBundle = initialTransactions
      .filter((t) => t.bundle || t.session)
      .map((t) => t.id);
    setExpandedIds(new Set(idsWithBundle));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filter & Search logic
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return initialTransactions.filter((tx) => {
      // 1. Filter tab
      if (filterType === "MATCHED" && !tx.isMatched) return false;
      if (filterType === "UNMATCHED" && tx.isMatched) return false;
      if (filterType === "BUNDLE" && !tx.bundle && !tx.matchedBundleCode) return false;

      // 2. Search query
      if (!q) return true;

      const memberName = tx.member?.name?.toLowerCase() || "";
      const memberCode = (tx.member?.code || tx.matchedMemberCode || "").toLowerCase();
      const content = (tx.content || "").toLowerCase();
      const refCode = (tx.referenceCode || "").toLowerCase();
      const bundleCode = (tx.bundle?.bundleCode || tx.matchedBundleCode || "").toLowerCase();
      const sessionCode = (tx.session?.code || tx.matchedSessionCode || "").toLowerCase();
      const sepayId = tx.sepayId.toLowerCase();

      // Check item titles in bundle
      const bundleItemsMatch = tx.bundle?.items.some((item) =>
        item.sessionTitle.toLowerCase().includes(q) || item.sessionCode.toLowerCase().includes(q)
      );

      return (
        memberName.includes(q) ||
        memberCode.includes(q) ||
        content.includes(q) ||
        refCode.includes(q) ||
        bundleCode.includes(q) ||
        sessionCode.includes(q) ||
        sepayId.includes(q) ||
        !!bundleItemsMatch
      );
    });
  }, [initialTransactions, search, filterType]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Controls Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "260px", flex: "1 1 300px", maxWidth: "450px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-foreground)",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên TV, mã TV, mã bundle, nội dung..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "8px",
              background: "rgba(17, 24, 39, 0.7)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs & Expand/Collapse */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              background: "rgba(17, 24, 39, 0.8)",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              gap: "2px",
            }}
          >
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "MATCHED", label: "Đã khớp" },
              { id: "UNMATCHED", label: "Chưa khớp" },
              { id: "BUNDLE", label: "Có Bundle" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: filterType === tab.id ? "var(--primary)" : "transparent",
                  color: filterType === tab.id ? "#052e16" : "var(--muted-foreground)",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick toggle all */}
          <button
            onClick={expandedIds.size > 0 ? collapseAll : expandAllWithBundles}
            className="btn btn-secondary"
            style={{
              padding: "6px 12px",
              fontSize: "0.78rem",
              fontWeight: 600,
              borderRadius: "8px",
              background: "rgba(30, 41, 59, 0.7)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Layers size={14} />
            {expandedIds.size > 0 ? "Thu gọn chi tiết" : "Mở chi tiết các Bundle"}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "32px", paddingRight: 0 }}></th>
                <th>Thành viên</th>
                <th>Số tiền CK</th>
                <th>Khớp Bundle / Trận</th>
                <th>Nội dung chuyển khoản</th>
                <th>Cổng</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const member = tx.member;
                const memberName = member?.name;
                const memberImage = member?.image;
                const memberCode = member?.code || tx.matchedMemberCode;
                const isExpanded = expandedIds.has(tx.id);
                const hasDetails = !!tx.bundle || !!tx.session;
                const bundle = tx.bundle;
                const bundleItemsCount = bundle?.items?.length ?? 0;

                return (
                  <TableRowWithDetails
                    key={tx.id}
                    tx={tx}
                    member={member}
                    memberName={memberName}
                    memberImage={memberImage}
                    memberCode={memberCode}
                    isExpanded={isExpanded}
                    hasDetails={hasDetails}
                    bundle={bundle}
                    bundleItemsCount={bundleItemsCount}
                    onToggle={() => toggleExpand(tx.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <ArrowLeftRight size={48} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>
              {search || filterType !== "ALL"
                ? "Không tìm thấy giao dịch nào phù hợp bộ lọc"
                : "Chưa có giao dịch nào"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TableRowWithDetails({
  tx,
  member,
  memberName,
  memberImage,
  memberCode,
  isExpanded,
  hasDetails,
  bundle,
  bundleItemsCount,
  onToggle,
}: {
  tx: TransactionRowData;
  member: any;
  memberName?: string | null;
  memberImage?: string | null;
  memberCode?: string | null;
  isExpanded: boolean;
  hasDetails: boolean;
  bundle: BundleDetail | null;
  bundleItemsCount: number;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        style={{
          background: isExpanded ? "rgba(34, 197, 94, 0.04)" : "transparent",
          cursor: hasDetails ? "pointer" : "default",
          transition: "background 0.15s ease",
        }}
        onClick={(e) => {
          // If clicked on an interactive link, don't toggle
          if ((e.target as HTMLElement).closest("a, button")) return;
          if (hasDetails) onToggle();
        }}
      >
        {/* Cột Expand Chevron */}
        <td style={{ width: "32px", paddingRight: 0, textAlign: "center" }}>
          {hasDetails && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: isExpanded ? "var(--primary)" : "var(--muted-foreground)",
                borderRadius: "4px",
              }}
              title={isExpanded ? "Thu gọn chi tiết" : "Xem chi tiết các trận"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </td>

        {/* Cột 1: Tên thành viên & Avatar */}
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {memberImage ? (
              <img
                src={memberImage}
                alt=""
                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : memberName ? (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {memberName[0]?.toUpperCase()}
              </div>
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <HelpCircle size={18} style={{ color: "var(--muted-foreground)" }} />
              </div>
            )}

            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--card-foreground)" }}>
                {memberName ?? (memberCode ? `Mã: ${memberCode}` : "Chưa xác định TV")}
              </div>
              {memberCode && (
                <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>
                  Mã TV: {memberCode}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Cột 2: Số tiền chuyển */}
        <td>
          <span style={{ fontWeight: 800, color: "#4ade80", fontSize: "0.95rem" }}>
            +{formatCurrency(tx.transferAmount)}
          </span>
        </td>

        {/* Cột 3: Trạng thái & Bundle / Phiên */}
        <td>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {(() => {
              const isUnderpaid =
                !tx.isMatched &&
                ((bundle && tx.transferAmount < bundle.totalAmount - 1) ||
                 (tx.session && tx.transferAmount < tx.session.amountRequired - 1));

              if (isUnderpaid) {
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#f97316",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "#f97316",
                        fontWeight: 700,
                      }}
                    >
                      Thiếu tiền (Chờ duyệt)
                    </span>
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: tx.isMatched ? "var(--primary)" : "#facc15",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: tx.isMatched ? "var(--primary)" : "#facc15",
                      fontWeight: 700,
                    }}
                  >
                    {tx.isMatched ? "Đã khớp" : "Chưa khớp"}
                  </span>
                </div>
              );
            })()}

            {/* Bundle badge */}
            {(bundle || tx.matchedBundleCode) && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: isExpanded ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
                  color: "#4ade80",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "fit-content",
                  transition: "all 0.15s ease",
                }}
                title="Bấm để xem danh sách các trận trong bundle này"
              >
                <Package size={12} />
                <span>Bundle: {bundle?.bundleCode || tx.matchedBundleCode}</span>
                {bundleItemsCount > 0 && (
                  <span
                    style={{
                      background: "rgba(34, 197, 94, 0.25)",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                    }}
                  >
                    {bundleItemsCount} trận
                  </span>
                )}
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            )}

            {/* Single Session badge */}
            {(tx.session || tx.matchedSessionCode) && !bundle && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
                  color: "#60a5fa",
                  fontWeight: 600,
                  width: "fit-content",
                }}
              >
                <span>Phiên: {tx.session?.code || tx.matchedSessionCode}</span>
              </div>
            )}
          </div>
        </td>

        {/* Cột 4: Nội dung CK */}
        <td style={{ maxWidth: "220px" }}>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--muted-foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={tx.content ?? ""}
          >
            {tx.content ?? "—"}
          </div>
          {tx.referenceCode && (
            <div style={{ fontSize: "0.7rem", color: "rgba(148, 163, 184, 0.6)", marginTop: "2px" }}>
              Mã GD: {tx.referenceCode}
            </div>
          )}
        </td>

        {/* Cột 5: Ngân hàng cổng */}
        <td>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--card-foreground)" }}>
            {tx.gateway}
          </div>
        </td>

        {/* Cột 6: Thời gian */}
        <td style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
          {formatDateTime(tx.transactionDate)}
        </td>
      </tr>

      {/* DÒNG CHI TIẾT EXPANDED (HIỂN THỊ CÁC TRẬN CỦA BUNDLE) */}
      {isExpanded && (
        <tr>
          <td
            colSpan={7}
            style={{
              padding: "0 16px 16px 16px",
              background: "rgba(34, 197, 94, 0.02)",
              borderBottom: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <div
              style={{
                borderRadius: "10px",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                padding: "16px",
                marginTop: "6px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Header chi tiết Bundle */}
              {bundle ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "12px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: "#4ade80",
                        }}
                      >
                        <Package size={18} />
                        Chi tiết các trận trong Bundle: <span>{bundle.bundleCode}</span>
                      </div>

                      {/* Status badge */}
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background:
                            bundle.status === "PAID"
                              ? "rgba(34, 197, 94, 0.15)"
                              : bundle.status === "PENDING"
                              ? "rgba(250, 204, 21, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          color:
                            bundle.status === "PAID"
                              ? "#4ade80"
                              : bundle.status === "PENDING"
                              ? "#facc15"
                              : "#f87171",
                          border: `1px solid ${
                            bundle.status === "PAID"
                              ? "rgba(34, 197, 94, 0.3)"
                              : bundle.status === "PENDING"
                              ? "rgba(250, 204, 21, 0.3)"
                              : "rgba(239, 68, 68, 0.3)"
                          }`,
                        }}
                      >
                        {bundle.status === "PAID"
                          ? "ĐÃ THANH TOÁN"
                          : bundle.status === "PENDING"
                          ? "CHỜ THANH TOÁN"
                          : bundle.status === "EXPIRED"
                          ? "HẾT HẠN (ĐÃ TỰ ĐỘNG KHỚP KHI CK)"
                          : bundle.status}
                      </span>
                    </div>

                    {/* Số tiền bundle vs Số tiền thực CK */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "0.85rem" }}>
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Tổng bundle: </span>
                        <strong style={{ color: "var(--card-foreground)" }}>
                          {formatCurrency(bundle.totalAmount)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Thực nhận: </span>
                        <strong style={{ color: "#4ade80" }}>
                          +{formatCurrency(tx.transferAmount)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Cảnh báo chênh lệch nếu số tiền chuyển != tổng bundle */}
                  {Math.abs(tx.transferAmount - bundle.totalAmount) > 100 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background:
                          tx.transferAmount > bundle.totalAmount
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgba(245, 158, 11, 0.1)",
                        border: `1px solid ${
                          tx.transferAmount > bundle.totalAmount
                            ? "rgba(59, 130, 246, 0.25)"
                            : "rgba(245, 158, 11, 0.25)"
                        }`,
                        fontSize: "0.78rem",
                        color:
                          tx.transferAmount > bundle.totalAmount ? "#93c5fd" : "#fcd34d",
                        marginBottom: "12px",
                      }}
                    >
                      <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        {tx.transferAmount > bundle.totalAmount ? (
                          <>
                            <strong>Lưu ý:</strong> Số tiền thành viên chuyển khoản (
                            <strong>{formatCurrency(tx.transferAmount)}</strong>) nhiều hơn tổng tiền của bundle này (
                            <strong>{formatCurrency(bundle.totalAmount)}</strong>) là{" "}
                            <strong>+{formatCurrency(tx.transferAmount - bundle.totalAmount)}</strong>.
                            Hệ thống chỉ tự động đánh dấu hoàn thành cho các trận đã được gộp trong bundle này.
                          </>
                        ) : (
                          <>
                            <strong>CẢNH BÁO CHUYỂN THIẾU TIỀN:</strong> Số tiền thành viên chuyển khoản (
                            <strong>{formatCurrency(tx.transferAmount)}</strong>) ít hơn tổng tiền bundle (
                            <strong>{formatCurrency(bundle.totalAmount)}</strong>) là{" "}
                            <strong style={{ color: "#ef4444" }}>
                              -{formatCurrency(bundle.totalAmount - tx.transferAmount)}
                            </strong>
                            . Hệ thống <strong>không tự động gạch nợ</strong> mà đã chuyển sang chế độ{" "}
                            <strong>chờ Admin xác nhận thủ công</strong>.
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bảng danh sách các trận trong Bundle */}
                  {bundle.items && bundle.items.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.82rem",
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600 }}>STT</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600 }}>Trận đấu / Phiên thu</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600 }}>Mã phiên</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600 }}>Ngày đá</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600 }}>Số tiền trận</th>
                            <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600 }}>Trạng thái</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted-foreground)", fontWeight: 600 }}>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bundle.items.map((item, idx) => (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                              }}
                            >
                              <td style={{ padding: "8px", color: "var(--muted-foreground)" }}>{idx + 1}</td>
                              <td style={{ padding: "8px", fontWeight: 600, color: "var(--card-foreground)" }}>
                                {item.matchId ? (
                                  <Link
                                    href={`/matches/${item.matchId}`}
                                    style={{
                                      color: "var(--card-foreground)",
                                      textDecoration: "none",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <span>{item.sessionTitle}</span>
                                    <ExternalLink size={12} style={{ color: "var(--muted-foreground)", opacity: 0.7 }} />
                                  </Link>
                                ) : (
                                  <span>{item.sessionTitle}</span>
                                )}
                              </td>
                              <td style={{ padding: "8px", fontFamily: "monospace", color: "#93c5fd" }}>
                                {item.sessionCode}
                              </td>
                              <td style={{ padding: "8px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                                {item.matchDate ? formatDate(item.matchDate) : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: "#4ade80",
                                }}
                              >
                                {formatCurrency(item.amountRequired)}
                              </td>
                              <td style={{ padding: "8px", textAlign: "center" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background:
                                      item.status === "PAID"
                                        ? "rgba(34, 197, 94, 0.15)"
                                        : "rgba(239, 68, 68, 0.15)",
                                    color: item.status === "PAID" ? "#4ade80" : "#f87171",
                                  }}
                                >
                                  {item.status === "PAID" ? (
                                    <>
                                      <CheckCircle2 size={12} /> Đã thu
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={12} /> Chưa thu
                                    </>
                                  )}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  fontSize: "0.75rem",
                                  color: item.note ? "#facc15" : "var(--muted-foreground)",
                                }}
                              >
                                {item.note || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                            <td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700, color: "var(--card-foreground)" }}>
                              Tổng cộng ({bundle.items.length} trận trong bundle này):
                            </td>
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "right",
                                fontWeight: 800,
                                fontSize: "0.92rem",
                                color: "#4ade80",
                              }}
                            >
                              {formatCurrency(bundle.totalAmount)}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", padding: "12px 0" }}>
                      Không có thông tin chi tiết các trận trong bundle này (có thể bundle đã bị hủy hoặc tạo rỗng).
                    </div>
                  )}
                </div>
              ) : tx.session ? (
                /* Chi tiết cho giao dịch khớp trực tiếp 1 phiên (legacy / direct record) */
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                      paddingBottom: "8px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#60a5fa" }}>
                      Chi tiết phiên thu: {tx.session.title} ({tx.session.code})
                    </div>
                    <div>
                      Số tiền: <strong style={{ color: "#4ade80" }}>{formatCurrency(tx.session.amountRequired)}</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", display: "flex", gap: "20px" }}>
                    <div>Ngày đá: {tx.session.matchDate ? formatDate(tx.session.matchDate) : "—"}</div>
                    <div>Trạng thái: <span style={{ color: "#4ade80", fontWeight: 600 }}>{tx.session.status}</span></div>
                    {tx.session.note && <div>Ghi chú: <span style={{ color: "#facc15" }}>{tx.session.note}</span></div>}
                  </div>
                </div>
              ) : (
                <div style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                  Chưa tìm thấy chi tiết bundle hoặc phiên tương ứng.
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


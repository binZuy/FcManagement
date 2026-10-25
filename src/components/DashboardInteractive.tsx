"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Users, CalendarDays, Trophy, Activity, Award, Star, 
  Send, Trash2, AtSign, MessageCircle, Image as ImageIcon,
  ChevronRight, X, Clock, MapPin, CheckCircle2, Flame
} from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/utils";
import { showToast } from "@/components/Toast";

interface FriendlyMatchItem {
  id: string;
  title: string;
  matchDate: string | Date;
  opponentName: string | null;
  result: string | null;
}

interface MonthMatchItem {
  id: string;
  title: string;
  matchDate: string | Date;
  matchType: string;
  result: string | null;
}

interface MemberMention {
  id: string;
  name: string;
  code: string;
  image?: string | null;
  jerseyNumber?: number | null;
}

interface CommentItem {
  id: string;
  matchId: string;
  userId?: string | null;
  guestName?: string | null;
  content: string;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
  } | null;
}

interface DashboardInteractiveProps {
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalMatches: number;
    matchesDone: number;
    winRate: number;
    friendlyWins: number;
    friendlyDraws: number;
    friendlyLosses: number;
    friendlyTotal: number;
    matchesThisMonth: number;
    friendlyMatchesList: FriendlyMatchItem[];
    thisMonthMatchesList: MonthMatchItem[];
  };
  lastDoneMatch: {
    id: string;
    title: string;
    matchDate: string | Date;
    opponentName?: string | null;
    motmMember?: {
      id: string;
      code: string;
      jerseyNumber?: number | null;
      user: {
        name: string | null;
        image: string | null;
      };
    } | null;
    motmNote?: string | null;
    photos: string[];
    comments: CommentItem[];
  } | null;
  allMembers: MemberMention[];
  currentUser: {
    id: string;
    name?: string | null;
    image?: string | null;
    role: string;
  } | null;
}

export function DashboardInteractive({
  stats,
  lastDoneMatch,
  allMembers,
  currentUser,
}: DashboardInteractiveProps) {
  // Modal stats state
  const [activeModal, setActiveModal] = useState<"members" | "matches" | "winRate" | "month" | null>(null);

  // Comment state
  const [comments, setComments] = useState<CommentItem[]>(lastDoneMatch?.comments || []);
  const [commentInput, setCommentInput] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Khởi tạo tên Guest từ localStorage
  useEffect(() => {
    if (!currentUser) {
      const saved = localStorage.getItem("fc_guest_name");
      if (saved) setGuestName(saved);
    }
  }, [currentUser]);

  // Handle Input comment & @mention
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentInput(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1 && lastAtPos === cursor - 1) {
      setShowMentionPopup(true);
      setMentionQuery("");
    } else if (lastAtPos !== -1 && !textBeforeCursor.slice(lastAtPos).includes(" ")) {
      setShowMentionPopup(true);
      setMentionQuery(textBeforeCursor.slice(lastAtPos + 1).toLowerCase());
    } else {
      setShowMentionPopup(false);
    }
  };

  const handleSelectMention = (member: MemberMention) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = commentInput.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = commentInput.slice(cursor);

    const displayName = member.name || member.code;
    const newText = commentInput.slice(0, lastAtPos) + `@${displayName} ` + textAfterCursor;
    setCommentInput(newText);
    setShowMentionPopup(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = lastAtPos + displayName.length + 2;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  const filteredMembers = allMembers.filter(m => 
    (m.name?.toLowerCase().includes(mentionQuery) || m.code.toLowerCase().includes(mentionQuery))
  ).slice(0, 6);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastDoneMatch) return;
    const trimmed = commentInput.trim();
    if (!trimmed) return;

    if (!currentUser && !guestName.trim()) {
      showToast.error("Vui lòng nhập tên của bạn để bình luận!");
      return;
    }

    if (!currentUser && guestName.trim()) {
      localStorage.setItem("fc_guest_name", guestName.trim());
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/matches/${lastDoneMatch.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          guestName: currentUser ? undefined : guestName.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi khi gửi bình luận");
      }

      const resData = await res.json();
      setComments((prev) => [resData.data, ...prev]);
      setCommentInput("");
      showToast.success("Đã đăng bình luận!");
    } catch (err: any) {
      showToast.error(err.message || "Lỗi gửi bình luận");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
    try {
      const res = await fetch(`/api/matches/${lastDoneMatch?.id}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Lỗi khi xóa");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast.success("Đã xóa bình luận");
    } catch (err: any) {
      showToast.error(err.message || "Lỗi");
    }
  };

  // Render text with bold @mentions
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(@[\p{L}\p{N}_-]+(?:\s[\p{L}\p{N}_-]+)?)/gu);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} style={{ color: "var(--primary)", fontWeight: 700, background: "rgba(34,197,94,0.15)", padding: "1px 6px", borderRadius: "4px" }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 4 STAT CARDS COMPACT CHO MOBILE & DESKTOP */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)", 
          gap: "10px",
        }}
        className="dashboard-stats-grid"
      >
        {/* Card 1: Thành viên */}
        <div 
          onClick={() => setActiveModal("members")}
          className="stat-card"
          style={{ 
            padding: "12px 14px", 
            cursor: "pointer", 
            transition: "transform 0.15s ease",
            borderRadius: "12px",
            background: "linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.8))",
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted-foreground)" }}>Thành viên</span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(34, 197, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={14} color="#22c55e" />
            </div>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1.1 }}>
            {stats.activeMembers}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#22c55e", marginTop: "4px", display: "flex", alignItems: "center", gap: "2px" }}>
            {stats.totalMembers} tổng TV · <span style={{ textDecoration: "underline" }}>Chi tiết</span>
          </div>
        </div>

        {/* Card 2: Tổng số trận */}
        <div 
          onClick={() => setActiveModal("matches")}
          className="stat-card"
          style={{ 
            padding: "12px 14px", 
            cursor: "pointer", 
            transition: "transform 0.15s ease",
            borderRadius: "12px",
            background: "linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.8))",
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted-foreground)" }}>Tổng số trận</span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(96, 165, 250, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarDays size={14} color="#60a5fa" />
            </div>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1.1 }}>
            {stats.totalMatches}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#60a5fa", marginTop: "4px", display: "flex", alignItems: "center", gap: "2px" }}>
            {stats.matchesDone} đã hoàn thành · <span style={{ textDecoration: "underline" }}>Xem</span>
          </div>
        </div>

        {/* Card 3: Tỷ lệ thắng (CHỈ GIAO HỮU) */}
        <div 
          onClick={() => setActiveModal("winRate")}
          className="stat-card"
          style={{ 
            padding: "12px 14px", 
            cursor: "pointer", 
            transition: "transform 0.15s ease",
            borderRadius: "12px",
            background: "linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.8))",
            border: "1px solid rgba(250,204,21,0.2)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#facc15" }}>Thắng giao hữu</span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(250, 204, 21, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trophy size={14} color="#facc15" />
            </div>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#facc15", lineHeight: 1.1 }}>
            {stats.winRate}%
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
            {stats.friendlyWins}W-{stats.friendlyDraws}D-{stats.friendlyLosses}L ({stats.friendlyTotal} trận)
          </div>
        </div>

        {/* Card 4: Trận trong tháng này */}
        <div 
          onClick={() => setActiveModal("month")}
          className="stat-card"
          style={{ 
            padding: "12px 14px", 
            cursor: "pointer", 
            transition: "transform 0.15s ease",
            borderRadius: "12px",
            background: "linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.8))",
            border: "1px solid rgba(167,139,250,0.2)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a78bfa" }}>Trận tháng này</span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(167, 139, 250, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={14} color="#a78bfa" />
            </div>
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#a78bfa", lineHeight: 1.1 }}>
            {stats.matchesThisMonth}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", marginTop: "4px" }}>
            Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()} · <span style={{ textDecoration: "underline" }}>Xem</span>
          </div>
        </div>
      </div>

      {/* SECTION: MOTM (MAN OF THE MATCH) & KỶ NIỆM & BÌNH LUẬN TRẬN GẦN NHẤT */}
      {lastDoneMatch && (
        <div 
          className="glass-card" 
          style={{ 
            borderRadius: "16px",
            padding: "16px", 
            display: "flex", 
            flexDirection: "column", 
            gap: "14px",
            border: "1px solid rgba(250,204,21,0.25)",
            background: "linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9))",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
          }}
        >
          {/* Header MOTM */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: 8, 
                background: "linear-gradient(135deg, #facc15, #ca8a04)", 
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(250,204,21,0.4)"
              }}>
                <Star size={18} color="#000" fill="#000" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#facc15", display: "flex", alignItems: "center", gap: "6px" }}>
                  MOTM ⭐
                </h3>
                <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                  {lastDoneMatch.title} ({formatDate(lastDoneMatch.matchDate)})
                </div>
              </div>
            </div>

            <Link 
              href={`/matches/${lastDoneMatch.id}`}
              style={{ fontSize: "0.75rem", color: "#60a5fa", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px", fontWeight: 600 }}
            >
              Chi tiết trận <ChevronRight size={14} />
            </Link>
          </div>

          {/* MOTM Player Card */}
          {lastDoneMatch.motmMember ? (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px", 
              background: "linear-gradient(135deg, rgba(250,204,21,0.1), rgba(0,0,0,0.25))", 
              padding: "12px 14px", 
              borderRadius: "12px", 
              border: "1px solid rgba(250,204,21,0.3)" 
            }}>
              {/* Avatar */}
              {lastDoneMatch.motmMember.user.image ? (
                <img 
                  src={lastDoneMatch.motmMember.user.image} 
                  alt="" 
                  style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #facc15", objectFit: "cover" }} 
                />
              ) : (
                <div style={{ 
                  width: 48, height: 48, borderRadius: "50%", 
                  background: "linear-gradient(135deg, #facc15, #eab308)", 
                  color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", 
                  fontWeight: 800, fontSize: "1.2rem", border: "2px solid #fef08a" 
                }}>
                  {lastDoneMatch.motmMember.user.name?.[0]?.toUpperCase() ?? "★"}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 800, fontSize: "1rem", color: "#f8fafc" }}>
                    {lastDoneMatch.motmMember.user.name}
                  </span>
                  {lastDoneMatch.motmMember.jerseyNumber && (
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#facc15", background: "rgba(250,204,21,0.15)", padding: "1px 6px", borderRadius: "4px" }}>
                      #{lastDoneMatch.motmMember.jerseyNumber}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#fef08a", marginTop: "2px", fontStyle: "italic" }}>
                  "{lastDoneMatch.motmNote || "Cầu thủ xuất sắc nhất trận đấu 🔥"}"
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: "10px 14px", 
              borderRadius: "10px", 
              background: "rgba(255,255,255,0.03)", 
              border: "1px dashed rgba(255,255,255,0.1)",
              fontSize: "0.8rem", 
              color: "var(--muted-foreground)",
              textAlign: "center"
            }}>
              Chưa bình chọn MOTM cho trận này
            </div>
          )}

          {/* Ảnh kỷ niệm (nếu có) */}
          {lastDoneMatch.photos && lastDoneMatch.photos.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted-foreground)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                <ImageIcon size={14} /> Khoảnh khắc trận đấu ({lastDoneMatch.photos.length})
              </div>
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                {lastDoneMatch.photos.map((photo, pIdx) => (
                  <img
                    key={pIdx}
                    src={photo}
                    alt="Kỷ niệm trận đấu"
                    onClick={() => setActivePhotoModal(photo)}
                    style={{
                      width: 90,
                      height: 65,
                      borderRadius: "8px",
                      objectFit: "cover",
                      cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.15)",
                      flexShrink: 0
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* BÌNH LUẬN TRỰC TIẾP DƯỚI MOTM */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--card-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageCircle size={15} color="var(--primary)" /> Bình luận ({comments.length})
              </span>
            </div>

            {/* Form nhập comment */}
            <form onSubmit={handleSendComment} style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
              {!currentUser && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Tên của bạn (Guest)..."
                    style={{
                      padding: "6px 10px",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--border)",
                      color: "var(--card-foreground)",
                      width: "180px",
                    }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                    (Tự lưu tên trên máy)
                  </span>
                </div>
              )}

              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={commentInput}
                  onChange={handleCommentChange}
                  placeholder={currentUser ? `Bình luận dưới tên ${currentUser.name}...` : "Viết bình luận..."}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "0.82rem",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid var(--border)",
                    color: "var(--card-foreground)",
                    resize: "none",
                    outline: "none",
                  }}
                />

                {/* Mention Suggestion Popup */}
                {showMentionPopup && filteredMembers.length > 0 && (
                  <div style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    marginBottom: "4px",
                    background: "#0f172a",
                    border: "1px solid rgba(34,197,94,0.3)",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    maxHeight: "180px",
                    overflowY: "auto",
                    width: "220px",
                    zIndex: 50,
                  }}>
                    <div style={{ padding: "4px 8px", fontSize: "0.7rem", color: "var(--muted-foreground)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      Chọn thành viên để tag:
                    </div>
                    {filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMention(m)}
                        style={{
                          padding: "6px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.15)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "white", fontWeight: 700 }}>
                          {m.name?.[0]?.toUpperCase() ?? m.code[0]}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <strong>{m.name || m.code}</strong>
                          {m.jerseyNumber && <span style={{ color: "var(--muted-foreground)", marginLeft: "4px" }}>#{m.jerseyNumber}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentInput.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: isSubmittingComment || !commentInput.trim() ? 0.5 : 1
                  }}
                >
                  <Send size={13} /> {isSubmittingComment ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto", marginTop: "4px" }}>
              {comments.map((c) => {
                const authorName = c.user?.name || c.guestName || "Thành viên";
                const isAuthorAdmin = c.user?.role === "ADMIN";
                const canDelete = currentUser?.role === "ADMIN";

                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: isAuthorAdmin ? "linear-gradient(135deg, #facc15, #ca8a04)" : "#334155",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isAuthorAdmin ? "#0f172a" : "white", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0
                    }}>
                      {authorName[0]?.toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.78rem", color: isAuthorAdmin ? "#facc15" : "#e2e8f0" }}>
                            {authorName}
                          </span>
                          {isAuthorAdmin && (
                            <span style={{ fontSize: "0.65rem", padding: "1px 4px", borderRadius: "3px", background: "rgba(250,204,21,0.2)", color: "#facc15", fontWeight: 700 }}>
                              Admin
                            </span>
                          )}
                          <span style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginLeft: "4px" }}>
                            · {formatDateTime(c.createdAt)}
                          </span>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                            title="Xóa bình luận"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "3px", wordBreak: "break-word" }}>
                        {renderFormattedText(c.content)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {comments.length === 0 && (
                <div style={{ textAlign: "center", padding: "12px", color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
                  Chưa có bình luận nào. Hãy là người đầu tiên chúc mừng MOTM! 💬
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÓNG TO ẢNH */}
      {activePhotoModal && (
        <div 
          onClick={() => setActivePhotoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px"
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img src={activePhotoModal} alt="" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "10px", objectFit: "contain" }} />
            <button
              onClick={() => setActivePhotoModal(null)}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#ef4444",
                color: "white",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT KHI CLICK VÀO STATS CARDS */}
      {activeModal && (
        <div
          onClick={() => setActiveModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 90,
            padding: "16px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "20px",
              width: "100%",
              maxWidth: "420px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--card-foreground)" }}>
                {activeModal === "members" && "👥 Thống Kê Thành Viên"}
                {activeModal === "matches" && "⚽ Thống Kê Các Trận Đấu"}
                {activeModal === "winRate" && "🏆 Danh Sách Trận Giao Hữu"}
                {activeModal === "month" && `📅 Trận Đấu Tháng ${new Date().getMonth() + 1}`}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeModal === "members" && (
                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(34,197,94,0.1)", borderRadius: "8px" }}>
                    <span>Đang hoạt động:</span>
                    <strong style={{ color: "#22c55e" }}>{stats.activeMembers} thành viên</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
                    <span>Tổng thành viên:</span>
                    <strong>{stats.totalMembers}</strong>
                  </div>
                  <Link href="/members" className="btn btn-secondary" style={{ marginTop: "8px", textAlign: "center", justifyContent: "center" }}>
                    Xem danh sách đội bóng →
                  </Link>
                </div>
              )}

              {activeModal === "matches" && (
                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(96,165,250,0.1)", borderRadius: "8px" }}>
                    <span>Tổng số trận đã tạo:</span>
                    <strong style={{ color: "#60a5fa" }}>{stats.totalMatches} trận</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(34,197,94,0.1)", borderRadius: "8px" }}>
                    <span>Trận đã hoàn thành:</span>
                    <strong style={{ color: "#22c55e" }}>{stats.matchesDone} trận</strong>
                  </div>
                  <Link href="/matches" className="btn btn-secondary" style={{ marginTop: "8px", textAlign: "center", justifyContent: "center" }}>
                    Xem lịch sử thi đấu →
                  </Link>
                </div>
              )}

              {activeModal === "winRate" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                    Tỷ lệ thắng chỉ tính cho các trận Giao Hữu (Đối ngoại):
                  </div>
                  {stats.friendlyMatchesList.map((m) => {
                    const isWin = m.result === "WIN";
                    const isDraw = m.result === "DRAW";
                    const color = isWin ? "#22c55e" : isDraw ? "#facc15" : "#ef4444";
                    const text = isWin ? "THẮNG" : isDraw ? "HÒA" : "THUA";

                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f8fafc" }}>
                            {m.title} {m.opponentName ? `vs ${m.opponentName}` : ""}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>
                            {formatDate(m.matchDate)}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", background: `${color}20`, color, border: `1px solid ${color}40` }}>
                          {text}
                        </span>
                      </div>
                    );
                  })}
                  {stats.friendlyMatchesList.length === 0 && (
                    <div style={{ textAlign: "center", padding: "16px", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                      Chưa có trận giao hữu nào có kết quả
                    </div>
                  )}
                </div>
              )}

              {activeModal === "month" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                    Các trận đã đá trong tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}:
                  </div>
                  {stats.thisMonthMatchesList.map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f8fafc" }}>{m.title}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>
                          {formatDateTime(m.matchDate)} · {m.matchType === "INTERNAL" ? "Nội bộ" : "Giao hữu"}
                        </div>
                      </div>
                      {m.result && (
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: m.result === "WIN" ? "#22c55e" : "#facc15" }}>
                          {m.result}
                        </span>
                      )}
                    </div>
                  ))}
                  {stats.thisMonthMatchesList.length === 0 && (
                    <div style={{ textAlign: "center", padding: "16px", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                      Tháng này chưa có trận nào hoàn thành
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="btn btn-secondary"
              style={{ padding: "8px", fontSize: "0.82rem", justifyContent: "center" }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

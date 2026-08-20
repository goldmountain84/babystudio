"use client";

// 어드민 콘솔 공통 셸 (S12-쉘) — 모듈 내비 + RBAC (SH-01) + 역할 전환(데모)
// 실서비스: SSO + 2FA 강제. 역할 전환기는 데모에서 RBAC 동작을 보여주기 위한 장치.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminProvider, useAdmin } from "@/lib/adminStore";
import { ROLE_ACCESS, type AdminRole } from "@/lib/adminData";

const MODULES = [
  { href: "/admin", label: "대시보드", id: "S12-A" },
  { href: "/admin/prompts", label: "프롬프트 컨트롤 ★", id: "S12-B" },
  { href: "/admin/themes", label: "테마 CMS", id: "S12-C" },
  { href: "/admin/experiments", label: "실험", id: "S12-D" },
  { href: "/admin/moderation", label: "모더레이션", id: "S12-E" },
  { href: "/admin/users", label: "사용자·CS", id: "S12-F" },
  { href: "/admin/revenue", label: "매출·원가", id: "S12-G" },
];

const ROLES: AdminRole[] = ["리드", "운영자", "모더레이터", "CS"];

function moduleOf(pathname: string): string {
  // 가장 구체적인(긴) 모듈 prefix 매칭
  const sorted = [...MODULES].sort((a, b) => b.href.length - a.href.length);
  return (
    sorted.find((m) =>
      m.href === "/admin" ? pathname === "/admin" : pathname.startsWith(m.href)
    )?.href ?? "/admin"
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hydrated, role, actor, setRole } = useAdmin();

  const allowed = ROLE_ACCESS[role];
  const currentModule = moduleOf(pathname);
  const forbidden = hydrated && !allowed.includes(currentModule);
  const visibleModules = MODULES.filter((m) => allowed.includes(m.href));

  return (
    <div className="min-h-screen bg-[#F7F3F1]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-ink px-6 py-2.5 md:px-10">
        <span className="mr-3 text-[13px] font-extrabold text-white">
          ⚙ ADMIN{" "}
          <span className="font-medium text-white/50">· BabyStudio 운영 콘솔</span>
        </span>
        {(hydrated ? visibleModules : MODULES).map((m) => {
          const active = m.href === currentModule;
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                active
                  ? "bg-rose text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {m.label}
            </Link>
          );
        })}
        {/* 역할 전환 (데모 전용 — 실서비스는 SSO 클레임) */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10.5px] text-white/45">역할:</span>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10.5px] font-bold transition-colors ${
                role === r
                  ? "bg-white/90 text-ink"
                  : "text-white/55 hover:bg-white/10 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
          <span className="ml-2 hidden text-[10.5px] text-white/45 lg:inline">
            {actor}
            {role === "리드" ? " (승인 권한)" : ""} · 데모: SSO/2FA 생략
          </span>
        </div>
      </div>

      {forbidden ? (
        <main className="mx-auto max-w-[560px] px-6 py-24 text-center">
          <p className="text-5xl">🚫</p>
          <p className="mt-4 text-[17px] font-extrabold">
            403 — 접근 권한이 없습니다
          </p>
          <p className="mt-2 text-[13px] text-sub">
            현재 역할 <b>{role}</b>은(는) 이 모듈에 접근할 수 없어요. 역할에
            없는 모듈은 탭이 렌더링되지 않으며, URL 직접 접근도 차단됩니다
            (SH-01). 접근 시도는 감사로그에 기록됩니다.
          </p>
          <Link href="/admin" className="cta mt-6">
            대시보드로 이동
          </Link>
        </main>
      ) : (
        children
      )}
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <Shell>{children}</Shell>
    </AdminProvider>
  );
}

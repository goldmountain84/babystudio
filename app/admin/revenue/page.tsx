"use client";

// S12-G 매출·원가 분석 — 퍼널·테마 손익·코호트

const FUNNEL = [
  { step: "방문", v: 48200 },
  { step: "가입", v: 6120 },
  { step: "학습 완료", v: 4470 },
  { step: "첫 생성", v: 4110 },
  { step: "첫 결제", v: 453 },
];

const THEME_PNL = [
  { name: "돌잔치 한복", runs: 1840, revenue: 4120000, cost: 782000 },
  { name: "백일상 전통", runs: 1520, revenue: 3260000, cost: 641000 },
  { name: "케이크 스매시", runs: 980, revenue: 1890000, cost: 402000 },
  { name: "천사 날개 (무료 훅)", runs: 2210, revenue: 340000, cost: 212000 },
  { name: "첫눈 (시즌)", runs: 310, revenue: 480000, cost: 195000 },
];

const COHORT = [
  { week: "7/28", w0: 100, w1: 46, w2: 31, w3: 24 },
  { week: "8/04", w0: 100, w1: 51, w2: 34, w3: 26 },
  { week: "8/11", w0: 100, w1: 49, w2: 36, w3: null },
  { week: "8/18", w0: 100, w1: 53, w2: null, w3: null },
];

const KRW = (n: number) => `₩${(n / 10000).toFixed(0)}만`;

export default function Revenue() {
  const maxFunnel = FUNNEL[0].v;
  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[16px] font-extrabold">💰 매출·원가 분석</h1>
        <span className="text-[11.5px] text-sub">
          KPI(기획서 §8)와 1:1 매핑 · 무료 사용자 원가는 CAC로 분류 · 영상 원가 별도 경보선
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* 퍼널 */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">전환 퍼널 (최근 30일)</b>
          <div className="mt-3 flex flex-col gap-2">
            {FUNNEL.map((f, i) => {
              const prev = i > 0 ? FUNNEL[i - 1].v : f.v;
              return (
                <div key={f.step} className="flex items-center gap-3 text-[12px]">
                  <span className="w-[72px] font-bold">{f.step}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-cream">
                    <i
                      className="block h-full rounded-r bg-rose"
                      style={{ width: `${Math.max(2, (f.v / maxFunnel) * 100)}%`, opacity: 0.45 + (i / FUNNEL.length) * 0.55 }}
                    />
                  </div>
                  <b className="num w-[70px] text-right">{f.v.toLocaleString()}</b>
                  <span className="num w-[58px] text-right text-[11px] text-sub">
                    {i > 0 ? `${Math.round((f.v / prev) * 100)}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="num mt-2.5 text-[11px] text-sub">
            가입 전환 12.7% (목표 12% ✓) · 가입→첫 생성 67% (목표 70%) · 무료→유료 7.4% (목표 8%)
          </p>
        </section>

        {/* 코호트 */}
        <section className="overflow-x-auto rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">주간 가입 코호트 리텐션 (%)</b>
          <table className="atable mt-3">
            <thead><tr><th>가입 주</th><th>W0</th><th>W+1</th><th>W+2</th><th>W+3</th></tr></thead>
            <tbody>
              {COHORT.map((c) => (
                <tr key={c.week}>
                  <td className="num font-bold">{c.week}</td>
                  {[c.w0, c.w1, c.w2, c.w3].map((v, i) => (
                    <td key={i} className="num">
                      {v === null ? (
                        <span className="text-[#c5bac2]">—</span>
                      ) : (
                        <span
                          className="inline-block rounded px-2 py-0.5"
                          style={{ background: `rgba(232,97,140,${(v / 100) * 0.5})` }}
                        >
                          {v}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2.5 text-[11px] text-sub">
            W+1 리텐션 상승 추세 — D-day CRM 저니 도입(08-04) 효과로 추정. 기념일 리마인드가 재방문 1순위 트리거.
          </p>
        </section>
      </div>

      {/* 테마 손익 */}
      <section className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white p-5">
        <b className="text-[13px]">테마별 손익 (최근 30일) — 테마가 곧 상품</b>
        <table className="atable mt-3">
          <thead>
            <tr><th>테마</th><th>실행</th><th>매출</th><th>생성 원가</th><th>마진</th><th>마진율</th></tr>
          </thead>
          <tbody>
            {THEME_PNL.map((t) => {
              const margin = t.revenue - t.cost;
              const rate = Math.round((margin / t.revenue) * 100);
              return (
                <tr key={t.name}>
                  <td><b>{t.name}</b></td>
                  <td className="num">{t.runs.toLocaleString()}</td>
                  <td className="num">{KRW(t.revenue)}</td>
                  <td className="num">{KRW(t.cost)}</td>
                  <td className="num font-bold">{KRW(margin)}</td>
                  <td className="num">
                    <span className={`vs ${rate >= 70 ? "vs-live" : rate >= 40 ? "vs-review" : "vs-archived"}`}>{rate}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2.5 text-[11px] text-sub">
          무료 훅 테마(천사 날개)는 저마진이 정상 — CAC 계정. 시즌 테마는 초기 원가 높음(외부 API) → 물량 확보 시 LoRA 전환 판단(IN-06).
        </p>
      </section>
    </main>
  );
}

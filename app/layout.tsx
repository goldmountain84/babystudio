import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import SiteNav from "@/components/SiteNav";
import JobBar from "@/components/JobBar";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "BabyStudio.ai — 스튜디오 안 가도, 우리 아기 인생 화보",
  description:
    "아기 사진 5장이면 충분해요. AI가 백일상부터 돌잔치 한복까지, 전문 스튜디오급 사진과 움직이는 영상을 만들어드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${notoSans.variable} ${notoSerif.variable} antialiased`}>
        <StoreProvider>
          <SiteNav />
          {children}
          <JobBar />
        </StoreProvider>
      </body>
    </html>
  );
}

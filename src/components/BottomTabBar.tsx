"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TabIcon, type TabIconKey } from "@/components/icons";
import { triggerHaptic } from "@/lib/haptics";

type Tab = {
  href: string;
  label: string;
  icon: TabIconKey;
  /** 홈만 정확히 일치로 판정한다. 나머지는 하위 경로까지 활성. */
  exact: boolean;
  /** 가운데 강조(FAB형) 탭 여부. */
  center: boolean;
};

/* as const 를 유지하는 이유: href 가 리터럴로 남아야 typedRoutes 를 켰을 때
   오타난 경로가 타입 에러로 잡힌다. Tab[] 로 넓히면 그 검사가 사라진다. */
const TABS = [
  { href: "/", label: "홈", icon: "home", exact: true, center: false },
  { href: "/dresser", label: "드레스룸", icon: "dresser", exact: false, center: false },
  { href: "/create", label: "생성", icon: "create", exact: false, center: true },
  { href: "/closet", label: "옷장", icon: "closet", exact: false, center: false },
  { href: "/my", label: "마이", icon: "my", exact: false, center: false },
] as const satisfies readonly Tab[];

function isActive(pathname: string, tab: Tab): boolean {
  if (tab.exact) return pathname === tab.href;
  // startsWith(href) 만 쓰면 /createx 같은 경로까지 활성으로 잡힌다.
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        // 홈 인디케이터 영역 확보. viewport 의 viewportFit: "cover" 가 있어야 값이 잡힌다.
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(255,255,255,.75)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        borderTop: "1px solid rgba(255,255,255,.9)",
        boxShadow: "0 -8px 24px -12px rgba(74,144,194,.25)",
      }}
    >
      {/* 모바일 웹 전용 제품이라 탭바는 항상 떠 있다. 넓은 화면에서 늘어지지
          않도록 본문(main)과 같은 max-w-md 로 묶는다. */}
      <ul className="mx-auto flex w-full max-w-md items-end">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab);

          if (tab.center) {
            return (
              <li key={tab.href} className="flex flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => triggerHaptic("light")}
                  className={`mx-1 my-1 flex min-h-12 flex-1 flex-col items-center justify-end gap-1 pb-1 text-[10.5px] ${
                    active ? "font-extrabold text-coral-ink" : "font-semibold text-ink-soft"
                  }`}
                >
                  {/* 탭바 위로 살짝 띄워 도려낸 듯한 인상을 준다.
                      아이콘 색은 .btn-coral 의 color:#fff 를 currentColor 로 상속. */}
                  <span className="btn-coral press -mt-5 flex h-12 w-12 items-center justify-center rounded-full ring-4 ring-white/70">
                    <TabIcon name={tab.icon} active className="h-6 w-6" />
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                onClick={() => triggerHaptic("light")}
                className={`mx-1 my-1 flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 text-[10.5px] press ${
                  active ? "bg-skyx/15 font-extrabold text-coral-ink" : "font-semibold text-ink-faint"
                }`}
              >
                <TabIcon
                  name={tab.icon}
                  active={active}
                  className={`h-[22px] w-[22px] transition-transform motion-reduce:transition-none ${
                    active ? "-translate-y-0.5 scale-110" : ""
                  }`}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomTabBar;

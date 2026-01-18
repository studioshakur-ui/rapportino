import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function RevealOnScroll({ children, className }: Props): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);

  const reduceMotion = useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setOn(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e && e.isIntersecting) setOn(true);
      },
      { root: null, threshold: 0.18 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  return (
    <div ref={ref} className={className}>
      <style>{`
        @keyframes coreMaskIn {
          0% { -webkit-mask-position: 0% 0%; mask-position: 0% 0%; opacity: 0.55; transform: translateY(10px); }
          100% { -webkit-mask-position: 100% 0%; mask-position: 100% 0%; opacity: 1; transform: translateY(0); }
        }
        .coreReveal {
          -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 78%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 78%, rgba(0,0,0,0) 100%);
          -webkit-mask-size: 220% 100%;
          mask-size: 220% 100%;
          -webkit-mask-position: 0% 0%;
          mask-position: 0% 0%;
          opacity: 0.55;
          transform: translateY(10px);
        }
        .coreRevealOn {
          animation: coreMaskIn 900ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      <div className={on ? "coreReveal coreRevealOn" : "coreReveal"}>{children}</div>
    </div>
  );
}

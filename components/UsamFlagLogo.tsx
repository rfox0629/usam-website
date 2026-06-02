const font = { oswald: "'Oswald', sans-serif" };

type UsamFlagLogoProps = {
  size?: "nav" | "footer" | "icon";
};

const sizeStyles = {
  footer: {
    frame: "h-[22px] w-[54px] rounded-[4px]",
    label: "pl-[6px] pr-[5px] text-[9px]",
    stripeGap: "gap-[3px]",
    stripeWidth: "w-[16px]",
  },
  icon: {
    frame: "h-[26px] w-[64px] rounded-[5px]",
    label: "pl-[7px] pr-[6px] text-[10px]",
    stripeGap: "gap-[3px]",
    stripeWidth: "w-[19px]",
  },
  nav: {
    frame: "h-[25px] w-[62px] rounded-[5px]",
    label: "pl-[7px] pr-[6px] text-[10px]",
    stripeGap: "gap-[3px]",
    stripeWidth: "w-[18px]",
  },
} as const;

export function UsamFlagLogo({ size = "nav" }: UsamFlagLogoProps) {
  const styles = sizeStyles[size];

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center overflow-hidden border border-usam-gold/55 bg-[rgba(13,13,13,0.88)] text-white shadow-[0_0_18px_rgba(var(--usam-gold-rgb),0.12)] ${styles.frame}`}
    >
      <span
        className={`flex h-full items-center border-r border-white/18 font-semibold uppercase leading-none tracking-[0.13em] ${styles.label}`}
        style={{ fontFamily: font.oswald }}
      >
        USAM
      </span>
      <span className={`flex flex-1 flex-col justify-center ${styles.stripeGap}`}>
        <span className={`block h-px bg-white/92 ${styles.stripeWidth}`} />
        <span className={`block h-px bg-white/78 ${styles.stripeWidth}`} />
        <span className={`block h-px bg-white/58 ${styles.stripeWidth}`} />
      </span>
    </span>
  );
}

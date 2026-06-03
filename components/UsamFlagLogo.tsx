const font = { oswald: "'Oswald', sans-serif" };

type UsamFlagLogoProps = {
  size?: "nav" | "footer" | "icon";
};

const sizeStyles = {
  footer: {
    frame: "h-[22px] w-[61px] rounded-[4px]",
    label: "pl-[7px] text-[11px]",
    stripeGap: "gap-[2px]",
    stripeHeight: "h-[2px]",
    stripeWidth: "w-[20px]",
  },
  icon: {
    frame: "h-[28px] w-[78px] rounded-[5px]",
    label: "pl-[9px] text-[15px]",
    stripeGap: "gap-[3px]",
    stripeHeight: "h-[2px]",
    stripeWidth: "w-[26px]",
  },
  nav: {
    frame: "h-[27px] w-[76px] rounded-[5px]",
    label: "pl-[9px] text-[15px]",
    stripeGap: "gap-[3px]",
    stripeHeight: "h-[2px]",
    stripeWidth: "w-[25px]",
  },
} as const;

export function UsamFlagLogo({ size = "nav" }: UsamFlagLogoProps) {
  const styles = sizeStyles[size];

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-between overflow-hidden border border-white/90 bg-[var(--usam-black)] text-white ${styles.frame}`}
    >
      <span
        className={`flex h-full items-center font-bold uppercase leading-none tracking-[0.04em] ${styles.label}`}
        style={{ fontFamily: font.oswald }}
      >
        USAM
      </span>
      <span className={`flex shrink-0 flex-col justify-center pr-[7px] ${styles.stripeGap}`}>
        <span className={`block bg-white ${styles.stripeHeight} ${styles.stripeWidth}`} />
        <span className={`block bg-white ${styles.stripeHeight} ${styles.stripeWidth}`} />
        <span className={`block bg-white ${styles.stripeHeight} ${styles.stripeWidth}`} />
        <span className={`block bg-white ${styles.stripeHeight} ${styles.stripeWidth}`} />
      </span>
    </span>
  );
}

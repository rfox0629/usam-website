const font = { oswald: "'Oswald', sans-serif" };

type UsamFlagLogoProps = {
  size?: "nav" | "footer" | "icon";
};

const sizeStyles = {
  footer: {
    frame: "h-[24px] w-[70px] rounded-[4px]",
    label: "text-[13px]",
    stripeGap: "gap-[2.2px]",
    stripeHeight: "h-[2.4px]",
    stripeInset: "pl-[1px] pr-[6px]",
  },
  icon: {
    frame: "h-[31px] w-[90px] rounded-[5px]",
    label: "text-[18px]",
    stripeGap: "gap-[2.5px]",
    stripeHeight: "h-[2.6px]",
    stripeInset: "pl-[1px] pr-[7px]",
  },
  nav: {
    frame: "h-[30px] w-[87px] rounded-[5px]",
    label: "text-[18px]",
    stripeGap: "gap-[2.5px]",
    stripeHeight: "h-[2.6px]",
    stripeInset: "pl-[1px] pr-[7px]",
  },
} as const;

export function UsamFlagLogo({ size = "nav" }: UsamFlagLogoProps) {
  const styles = sizeStyles[size];

  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 grid-cols-2 items-center overflow-hidden border-[1.1px] border-white/90 bg-[var(--usam-black)] text-white ${styles.frame}`}
    >
      <span
        className={`flex h-full items-center justify-center font-extrabold uppercase leading-none tracking-[0.01em] ${styles.label}`}
        style={{ fontFamily: font.oswald, fontWeight: 800 }}
      >
        USAM
      </span>
      <span className={`flex h-full flex-col justify-center ${styles.stripeGap} ${styles.stripeInset}`}>
        <span className={`block w-full bg-white ${styles.stripeHeight}`} />
        <span className={`block w-full bg-white ${styles.stripeHeight}`} />
        <span className={`block w-full bg-white ${styles.stripeHeight}`} />
        <span className={`block w-full bg-white ${styles.stripeHeight}`} />
      </span>
    </span>
  );
}

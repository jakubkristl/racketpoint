type BrandLogoProps = {
  subtitle?: string;
  compact?: boolean;
};

function BrandLogo({ subtitle = 'Racketpoint Premium Storefront', compact = false }: BrandLogoProps) {
  return (
    <div className={compact ? 'brand-lockup compact' : 'brand-lockup'}>
      <img
        className="brand-mark"
        src="/branding/logo-icon.svg"
        alt="Racketpoint.bg logo"
        width={compact ? 44 : 56}
        height={compact ? 44 : 56}
      />
      <div className="brand-wording">
        <img className="brand-wordmark" src="/branding/logo-horizontal.svg" alt="Racketpoint.bg" />
        <p className="brand-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export default BrandLogo;

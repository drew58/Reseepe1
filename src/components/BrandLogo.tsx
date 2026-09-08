type BrandLogoProps = {
  className?: string;
};

const BrandLogo = ({ className = "" }: BrandLogoProps) => (
  <span className={className} aria-label="RESEEPE">
    <span className="text-brand-green">RE</span>
    <span className="text-brand-orange">SEE</span>
    <span className="text-brand-green">PE</span>
  </span>
);

export default BrandLogo;
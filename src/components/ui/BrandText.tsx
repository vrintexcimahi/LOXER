interface BrandTextProps {
  className?: string;
  lightBlueClassName?: string;
  whiteXClassName?: string;
}

export default function BrandText({
  className = '',
  lightBlueClassName = 'text-cyan-400',
  whiteXClassName = 'text-white',
}: BrandTextProps) {
  return (
    <span className={className}>
      <span className={lightBlueClassName}>LO</span>
      <span className={whiteXClassName}>X</span>
      <span className={lightBlueClassName}>ER</span>
    </span>
  );
}

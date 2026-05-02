export function BrandWordmark() {
  const brandIUrl = `${import.meta.env.BASE_URL}icons/brand-i.svg`;

  return (
    <span className="brand-wordmark" aria-label="IronLog">
      <img
        className="brand-letter-icon"
        src={brandIUrl}
        width="216"
        height="352"
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable="false"
      />
      <span aria-hidden="true">ronLog</span>
    </span>
  );
}

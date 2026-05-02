export function ActionButton({ icon: Icon, label, detail, onClick }) {
  return (
    <button className="action-button" type="button" onClick={onClick}>
      <span className="action-icon">{Icon && <Icon size={22} />}</span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

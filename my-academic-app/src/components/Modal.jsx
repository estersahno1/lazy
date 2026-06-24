function Modal({ open, onClose, title, children, size }) {
  if (!open) return null;

  const sizeClass = size ? ` modal--${size}` : '';

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal__header">
          <h2 id="modal-title" className="modal__title">
            {title}
          </h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="סגור">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

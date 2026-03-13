import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}) {
  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h3 id="confirm-dialog-title" className={styles.title}>{title}</h3>
        <p id="confirm-dialog-message" className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.confirmBtn} ${tone === 'danger' ? styles.danger : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

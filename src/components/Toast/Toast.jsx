import styles from './Toast.module.css';

export default function Toast({ message, type = 'info' }) {
  return (
    <div className={`${styles.toast} ${styles[type]}`} role="status">
      <i className={`fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
      <span>{message}</span>
    </div>
  );
}

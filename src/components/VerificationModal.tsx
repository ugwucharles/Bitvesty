import React from 'react';
import styles from './modal.module.css';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Action Required</h3>
        <p className={styles.body}>{message ?? 'This account is not activated/verified. Please activate the user before proceeding with a deposit.'}</p>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default VerificationModal;

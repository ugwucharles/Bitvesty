"use client";
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany'];

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/context/UsersContext';
import PageLoader from '@/components/PageLoader';
import {
  TrendingUp,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Phone,
  Mail,
  IdCard,
  Upload,
  CheckCircle2,
  LogIn,
  UserPlus,
  MapPin,
  Calendar,
  Globe,
  FileText,
} from 'lucide-react';
import { getHomePathForRole } from '@/lib/routes';
import styles from './login.module.css';

type IdType = 'drivers_license' | 'passport' | 'national_id' | 'other';

type IdFieldKey =
  | 'licenseNumber'
  | 'fullName'
  | 'state'
  | 'expiryDate'
  | 'passportNumber'
  | 'nationality'
  | 'countryOfIssue'
  | 'nationalIdNumber'
  | 'country'
  | 'documentName'
  | 'documentNumber';

interface IdFieldConfig {
  key: IdFieldKey;
  label: string;
  placeholder: string;
  type?: 'text' | 'date';
  icon: React.ComponentType<any>;
}

const ID_TYPE_CONFIG: Record<
  IdType,
  { label: string; uploadLabel: string; uploadHint: string; fields: IdFieldConfig[]; primaryKey: IdFieldKey }
> = {
  drivers_license: {
    label: "Driver's License",
    uploadLabel: "Upload Driver's License",
    uploadHint: 'Front of license · PNG or JPG up to 10MB',
    primaryKey: 'licenseNumber',
    fields: [
      { key: 'licenseNumber', label: 'License Number', placeholder: 'e.g. D1234567', icon: IdCard },
      { key: 'fullName', label: 'Full Name (as on license)', placeholder: 'Legal name on document', icon: User },
      { key: 'state', label: 'Issuing State / Region', placeholder: 'e.g. California', icon: MapPin },
      { key: 'expiryDate', label: 'Expiry Date', placeholder: '', type: 'date', icon: Calendar },
    ],
  },
  passport: {
    label: 'Passport',
    uploadLabel: 'Upload Passport Photo Page',
    uploadHint: 'Bio page with photo · PNG or JPG up to 10MB',
    primaryKey: 'passportNumber',
    fields: [
      { key: 'passportNumber', label: 'Passport Number', placeholder: 'e.g. AB1234567', icon: IdCard },
      { key: 'fullName', label: 'Full Name', placeholder: 'Name as shown on passport', icon: User },
      { key: 'nationality', label: 'Nationality', placeholder: 'e.g. United States', icon: Globe },
      { key: 'countryOfIssue', label: 'Country of Issue', placeholder: 'e.g. United States', icon: MapPin },
      { key: 'expiryDate', label: 'Expiry Date', placeholder: '', type: 'date', icon: Calendar },
    ],
  },
  national_id: {
    label: 'National ID',
    uploadLabel: 'Upload National ID',
    uploadHint: 'Front of ID card · PNG or JPG up to 10MB',
    primaryKey: 'nationalIdNumber',
    fields: [
      { key: 'nationalIdNumber', label: 'National ID Number', placeholder: 'e.g. 123456789012', icon: IdCard },
      { key: 'fullName', label: 'Full Name', placeholder: 'Name as shown on ID', icon: User },
      { key: 'country', label: 'Country of Issue', placeholder: 'e.g. United Kingdom', icon: Globe },
    ],
  },
  other: {
    label: 'Other Document',
    uploadLabel: 'Upload Document',
    uploadHint: 'Clear photo of document · PNG or JPG up to 10MB',
    primaryKey: 'documentNumber',
    fields: [
      { key: 'documentName', label: 'Document Name', placeholder: 'e.g. Residence Permit', icon: FileText },
      { key: 'documentNumber', label: 'Document Number', placeholder: 'Reference or ID number', icon: IdCard },
      { key: 'fullName', label: 'Full Name', placeholder: 'Name on document', icon: User },
    ],
  },
};

const EMPTY_ID_FIELDS: Record<IdFieldKey, string> = {
  licenseNumber: '',
  fullName: '',
  state: '',
  expiryDate: '',
  passportNumber: '',
  nationality: '',
  countryOfIssue: '',
  nationalIdNumber: '',
  country: '',
  documentName: '',
  documentNumber: '',
};

export default function LoginPage() {
  const { login, isLoggedIn, isLoading, user } = useAuth();
  const { registerUser } = useUsers();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [idFile, setIdFile] = useState<File | null>(null);
  const [idType, setIdType] = useState<IdType | ''>('');
  const [idFields, setIdFields] = useState<Record<IdFieldKey, string>>(EMPTY_ID_FIELDS);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isLoggedIn && user) {
      router.replace(getHomePathForRole(user.role));
    }
  }, [isLoggedIn, isLoading, user, router]);

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError('');
    setSuccess('');
  };

  const validateNumeric = (value: string) => /^\d+$/.test(value);

  const handleIdTypeChange = (nextType: IdType | '') => {
    setIdType(nextType);
    setIdFields(EMPTY_ID_FIELDS);
    setIdFile(null);
    setError('');
  };

  const updateIdField = (key: IdFieldKey, value: string) => {
    // Sanitize numeric fields (allow only digits)
    const numericKeys = ['licenseNumber','passportNumber','nationalIdNumber','documentNumber','phone'];
    if (numericKeys.includes(key)) {
      const digitsOnly = value.replace(/\D+/g, '');
      setIdFields((prev) => ({ ...prev, [key]: digitsOnly }));
      return;
    }
    // Sanitize letter-only fields (allow only letters and spaces)
    const letterKeys = ['fullName','state','country','nationality','countryOfIssue','documentName'];
    if (letterKeys.includes(key)) {
      const lettersOnly = value.replace(/[^A-Za-z\s]/g, '');
      setIdFields((prev) => ({ ...prev, [key]: lettersOnly }));
      return;
    }
    // Default handling for other fields
    setIdFields((prev) => ({ ...prev, [key]: value }));
  };

  const resetSignupForm = () => {
    setIdFields(EMPTY_ID_FIELDS);
    setIdFile(null);
    setIdType('');
    setUsername('');
    setEmail('');
    setPhone('');
    setPassword('');
  };

  const validateIdFields = (): string | null => {
    if (!idType) return 'Select an ID type';

    const config = ID_TYPE_CONFIG[idType];

    for (const field of config.fields) {
      const value = idFields[field.key].trim();
      if (!value) return `${field.label} is required`;
    }

    if (!idFile) return `Please upload your ${config.label.toLowerCase()} document`;

    return null;
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate numeric and letter fields
    const numericKeys = ['licenseNumber','passportNumber','nationalIdNumber','documentNumber','phone'];
    for (const key of numericKeys) {
      const val = idFields[key as IdFieldKey];
      if (val && !/^\d+$/.test(val)) {
        const label = ID_TYPE_CONFIG[idType as IdType].fields.find(f => f.key === key)?.label || key;
        return setError(`${label} must contain only numbers`);
      }
    }
    const letterKeys = ['fullName','state','country','nationality','countryOfIssue','documentName'];
    for (const key of letterKeys) {
      const val = idFields[key as IdFieldKey];
      if (val && /[^A-Za-z\s]/.test(val)) {
        const label = ID_TYPE_CONFIG[idType as IdType].fields.find(f => f.key === key)?.label || key;
        return setError(`${label} must contain only letters`);
      }
    }

    const config = ID_TYPE_CONFIG[idType as IdType];
    const primaryId = idFields[config.primaryKey].trim();

    setIsSubmitting(true);

    const doRegister = (idDocumentUrl?: string) => {
      const result = registerUser({
        id: primaryId,
        username,
        email,
        phone,
        password,
        idType: idType as string,
        idFields: { ...idFields },
        idDocumentUrl,
      });
      if (result.success) {
        setSuccess('Registration successful! Await admin activation.');
        resetSignupForm();
      } else {
        setError(result.error || 'Registration failed');
      }
      setIsSubmitting(false);
    };

    if (idFile) {
      const reader = new FileReader();
      reader.readAsDataURL(idFile);
      reader.onload = () => {
        doRegister(typeof reader.result === 'string' ? reader.result : undefined);
      };
      reader.onerror = () => doRegister(undefined);
    } else {
      doRegister(undefined);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = login(username, password);
    if (result.success && result.user) {
      router.replace(getHomePathForRole(result.user.role));
    } else {
      setError(result.error || 'Login failed');
    }
    setIsSubmitting(false);
  };

  if (isLoading || (isLoggedIn && user)) {
    return <PageLoader message="Checking session..." />;
  }

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} animate-slide-up`}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <TrendingUp size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 className={styles.logoText}>Bit<span>Vesty</span></h1>
          <p className={styles.logoSub}>Smart AI Trading Platform</p>
        </div>

        <div className={styles.modeTabs}>
          <div
            className={`${styles.modeTabIndicator} ${mode === 'signup' ? styles.modeTabIndicatorSignup : ''}`}
          />
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'login' ? styles.modeTabActive : ''}`}
            onClick={() => switchMode('login')}
          >
            <LogIn size={15} />
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'signup' ? styles.modeTabActive : ''}`}
            onClick={() => switchMode('signup')}
          >
            <UserPlus size={15} />
            Register
          </button>
        </div>

        {error && (
          <div className={`${styles.errorAlert} animate-fade-in`}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className={`${styles.successAlert} animate-fade-in`}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {mode === 'signup' ? (
          <form onSubmit={handleSignup} className={styles.loginForm} key="signup">
            <div className={styles.formSection}>
              <div className={styles.formSectionHeader}>
                <span>Identity Verification</span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="idType">ID Type</label>
                <div className={styles.inputWrapper}>
                  <select
                    id="idType"
                    value={idType}
                    onChange={(e) => handleIdTypeChange(e.target.value as IdType | '')}
                    disabled={isSubmitting}
                  >
                    <option value="" disabled>Select ID type</option>
                    <option value="drivers_license">Driver&apos;s License</option>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {idType && (
                <div className={`${styles.idFieldsGroup} animate-fade-in`}>
                  <p className={styles.idTypeBadge}>{ID_TYPE_CONFIG[idType].label} details</p>

                  {ID_TYPE_CONFIG[idType].fields.map((field) => {
                    const Icon = field.icon;
                    return (
                      <div className={styles.inputGroup} key={field.key}>
                        <label htmlFor={field.key}>{field.label}</label>
                        <div className={styles.inputWrapper}>
                          <Icon size={18} className={styles.inputIcon} />
                          {field.key === 'state' ? (
                            <select
                              id={field.key}
                              value={idFields[field.key]}
                              onChange={(e) => updateIdField(field.key, e.target.value)}
                              required
                              disabled={isSubmitting}
                              className={styles.inputWrapper}
                            >
                              <option value="" disabled>Select Country</option>
                              {COUNTRIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <input
  id={field.key}
  type={field.type ?? 'text'}
  placeholder={field.placeholder}
  value={idFields[field.key]}
  onChange={(e) => updateIdField(field.key, e.target.value)}
  required
  disabled={isSubmitting}
  {...(field.key === 'licenseNumber' || field.key === 'passportNumber' || field.key === 'nationalIdNumber' || field.key === 'documentNumber' ? { inputMode: 'numeric', pattern: "\\d*" } : {})}
  {...(['fullName','state','country','nationality','countryOfIssue','documentName'].includes(field.key) ? { pattern: "[A-Za-z\\s]*" } : {})}
/>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className={styles.inputGroup}>
                    <label>{ID_TYPE_CONFIG[idType].uploadLabel}</label>
                    <div className={styles.fileUpload}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                        disabled={isSubmitting}
                        required
                      />
                      <Upload size={22} className={styles.fileUploadIcon} />
                      <p className={styles.fileUploadText}>
                        <strong>Click to upload</strong> or drag and drop
                      </p>
                      <p className={styles.fileUploadHint}>{ID_TYPE_CONFIG[idType].uploadHint}</p>
                      {idFile && (
                        <p className={styles.fileName}>{idFile.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formSection}>
              <div className={styles.formSectionHeader}>
                <span>Account Details</span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="signup-username">Username</label>
                <div className={styles.inputWrapper}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    id="signup-username"
                    type="text"
                    placeholder="e.g. trader01"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email">Email</label>
                <div className={styles.inputWrapper}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="phone">Phone</label>
                <div className={styles.inputWrapper}>
                  <Phone size={18} className={styles.inputIcon} />
                  <input
                    id="phone"
                    type="text"
                    placeholder="Digits only"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={isSubmitting}
                    inputMode="numeric"
                    pattern="\d*"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="signup-password">Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className={styles.actionBtn} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className={styles.loaderSpinner} />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className={styles.toggleLink}>
              <span>Already have an account?</span>
              <button type="button" onClick={() => switchMode('login')}>Sign In</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className={styles.loginForm} key="login">
            <div className={styles.inputGroup}>
              <label htmlFor="login-username">Username</label>
              <div className={styles.inputWrapper}>
                <User size={18} className={styles.inputIcon} />
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="login-password">Password</label>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className={styles.actionBtn} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className={styles.loaderSpinner} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className={styles.toggleLink}>
              <span>Don&apos;t have an account?</span>
              <button type="button" onClick={() => switchMode('signup')}>Register</button>
            </div>
          </form>
        )}

        <div className={styles.cardFooter}>
            <p>Secure · Real-time</p>
        </div>
      </div>
    </div>
  );
}

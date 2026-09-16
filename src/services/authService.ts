import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/documents.readonly');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuthListener = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might need refresh or re-login for Drive access
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleAccount = async (): Promise<{ user: User; accessToken?: string } | null> => {
  try {
    isSigningIn = true;
    const loginProvider = new GoogleAuthProvider();
    // Use basic authentication scopes first for highest compatibility
    loginProvider.addScope('email');
    loginProvider.addScope('profile');
    loginProvider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, loginProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: credential?.accessToken || undefined };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('cancelled-popup-request')
    ) {
      console.info('Người dùng đã chủ động đóng cửa sổ đăng nhập Google.');
      return null;
    }

    if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
      console.warn('Google Auth Popup bị chặn bởi trình duyệt/iframe.');
      throw new Error('POPUP_BLOCKED: Cửa sổ đăng nhập Google Pop-up bị trình duyệt hoặc khung xem trước (iframe) chặn.');
    }

    if (errorCode === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
      console.warn('Tên miền ứng dụng chưa nằm trong Authorized Domains của Firebase Auth.');
      throw new Error('UNAUTHORIZED_DOMAIN: Tên miền ứng dụng chưa được cấu hình ủy quyền (Authorized Domain) trong Firebase Console.');
    }

    if (errorCode === 'auth/operation-not-allowed' || errorMsg.includes('operation-not-allowed')) {
      console.warn('Phương thức Google Sign-In chưa được bật trong Firebase Auth.');
      throw new Error('OPERATION_NOT_ALLOWED: Phương thức đăng nhập Google chưa bật trong cấu hình Firebase.');
    }

    console.error('Lỗi đăng nhập tài khoản Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      console.warn('Không lấy được OAuth Access Token từ Google');
      return null;
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    // Handle user closing popup or cancelling popup gracefully
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/popup-blocked' ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('cancelled-popup-request')
    ) {
      console.info('Người dùng đã đóng hoặc hủy cửa sổ đăng nhập Google.');
      return null;
    }

    console.error('Lỗi đăng nhập Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

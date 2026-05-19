/*
  Firebase設定ファイル

  1. Firebase ConsoleでWebアプリを追加
  2. 表示された firebaseConfig を下の値に貼り付け
  3. Firestore Database / Storage / Authentication(匿名) を有効化
  4. GitHub Pagesへアップロード

  ADMIN_PIN は仲間内向けの簡易ロックです。
  フロントエンド内に入るため、本格的なセキュリティにはなりません。
*/
window.CHILL_SMOKE_CONFIG = {
  ADMIN_PIN: "change-me",

  FIREBASE_CONFIG: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },

  FIRESTORE_COLLECTION: "products",
  STORAGE_FOLDER: "chill-smoke-archive"
};

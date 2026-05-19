/*
  Firebase設定ファイル

  1. Firebase ConsoleでWebアプリを追加
  2. 表示された firebaseConfig を下の値に貼り付け
  3. Firestore Database / Storage / Authentication(匿名) を有効化
  4. GitHub Pagesへアップロード

  ADMIN_PIN は仲間内向けの簡易ロックです。
  フロントエンド内に入るため、本格的なセキュリティにはなりません。
*/
const firebaseConfig = {
  apiKey: "AIzaSyAmSyHfjfSjle3JrSv48P1emDWu1w91mA4",
  authDomain: "chillsmokebooksystem.firebaseapp.com",
  projectId: "chillsmokebooksystem",
  storageBucket: "chillsmokebooksystem.firebasestorage.app",
  messagingSenderId: "934573767642",
  appId: "1:934573767642:web:d7dbb09c40a6579e161ee3",
  measurementId: "G-Z7TPVZMWHP"
};
const ADMIN_PIN = "8229";

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
apiKey: "AIzaSyD0arngOXOjvuo6L5VfU6V_Yk8No9em8P0",
authDomain: "mfreit-1.firebaseapp.com",
projectId: "mfreit-1",
storageBucket: "mfreit-1.firebasestorage.app",
messagingSenderId: "1000855155493",
appId: "1:1000855155493:web:69e85b6921ae0dadee60cc"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
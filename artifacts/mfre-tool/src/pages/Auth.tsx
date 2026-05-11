import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
export default function Auth() {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [phone, setPhone] = useState("");
const [otp, setOtp] = useState("");
const [confirmationResult, setConfirmationResult] = useState(null);
const [mode, setMode] = useState("login");
const [error, setError] = useState("");
const handleEmail = async (isSignup: boolean) => {
try {
if (isSignup) {
await createUserWithEmailAndPassword(auth, email, password);
} else {
await signInWithEmailAndPassword(auth, email, password);
}
} catch (e: any) {
setError(e.message);
}
};
const handleGoogle = async () => {
try {
await signInWithPopup(auth, googleProvider);
} catch (e: any) {
setError(e.message);
}
};
const handleSendOTP = async () => {
try {
const recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
const result = await signInWithPhoneNumber(auth, phone, recaptcha);
setConfirmationResult(result);
} catch (e: any) {
setError(e.message);
}
};
const handleVerifyOTP = async () => {
try {
await confirmationResult.confirm(otp);
} catch (e: any) {
setError(e.message);
}
};
return (
<div style={{ maxWidth: 400, margin: "100px auto", padding: 24 }}>
<h2>{mode === "login" ? "Login" : "Sign Up"}</h2>
{error && <p style={{ color: "red" }}>{error}</p>}
<input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ display: "block", width: "100%", marginBottom: 8 }} />
<input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: "block", width: "100%", marginBottom: 8 }} />
<button onClick={() => handleEmail(mode === "signup")} style={{ width: "100%", marginBottom: 8 }}>
{mode === "login" ? "Login" : "Sign Up"} with Email
</button>
<button onClick={handleGoogle} style={{ width: "100%", marginBottom: 8 }}>Continue with Google</button>
<hr />
<input placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} style={{ display: "block", width: "100%", marginBottom: 8 }} />
{!confirmationResult ? (
<button onClick={handleSendOTP} style={{ width: "100%" }}>Send OTP</button>
) : (
<>
<input placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} style={{ display: "block", width: "100%", marginBottom: 8 }} />
<button onClick={handleVerifyOTP} style={{ width: "100%" }}>Verify OTP</button>
</>
)}
<div id="recaptcha-container"></div>
<p style={{ marginTop: 16, cursor: "pointer", color: "blue" }} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
{mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Login"}
</p>
</div>
);
}
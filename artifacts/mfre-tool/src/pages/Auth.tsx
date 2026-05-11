import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
type Mode = "login" | "signup" | "phone";
export default function Auth() {
const [mode, setMode] = useState<Mode>("login");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [phone, setPhone] = useState("");
const [otp, setOtp] = useState("");
const [confirmationResult, setConfirmationResult] = useState<any>(null);
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);
const handleEmail = async () => {
setLoading(true);
setError("");
try {
if (mode === "signup") {
await createUserWithEmailAndPassword(auth, email, password);
} else {
await signInWithEmailAndPassword(auth, email, password);
}
window.location.href = "/";
} catch (e: any) {
setError(e.message.replace("Firebase: ", ""));
}
setLoading(false);
};
const handleGoogle = async () => {
setError("");
try {
await signInWithPopup(auth, googleProvider);
window.location.href = "/";
} catch (e: any) {
setError(e.message.replace("Firebase: ", ""));
}
};
const handleSendOTP = async () => {
setLoading(true);
setError("");
try {
const recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
const result = await signInWithPhoneNumber(auth, phone, recaptcha);
setConfirmationResult(result);
} catch (e: any) {
setError(e.message.replace("Firebase: ", ""));
}
setLoading(false);
};
const handleVerifyOTP = async () => {
setLoading(true);
setError("");
try {
await confirmationResult.confirm(otp);
window.location.href = "/";
} catch (e: any) {
setError(e.message.replace("Firebase: ", ""));
}
setLoading(false);
};
return (
<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f5" }}>
<div style={{ background: "white", borderRadius: 16, padding: 40, width: "100%", maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
<h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>MFREIT</h1>
<p style={{ color: "#71717a", marginBottom: 28 }}>{mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create an account" : "Sign in with phone"}</p>
    {error && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

    {mode !== "phone" && (
      <>
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: "10px 14px", marginBottom: 12, borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 15, boxSizing: "border-box" }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ display: "block", width: "100%", padding: "10px 14px", marginBottom: 16, borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 15, boxSizing: "border-box" }}
        />
        <button
          onClick={handleEmail}
          disabled={loading}
          style={{ width: "100%", padding: "11px", background: "#18181b", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#e4e4e7" }} />
          <span style={{ color: "#a1a1aa", fontSize: 13 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e4e4e7" }} />
        </div>

        <button
          onClick={handleGoogle}
          style={{ width: "100%", padding: "11px", background: "white", color: "#18181b", border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}
        >
          Continue with Google
        </button>
        <button
          onClick={() => setMode("phone")}
          style={{ width: "100%", padding: "11px", background: "white", color: "#18181b", border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}
        >
          Continue with Phone
        </button>
      </>
    )}

    {mode === "phone" && (
      <>
        {!confirmationResult ? (
          <>
            <input
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ display: "block", width: "100%", padding: "10px 14px", marginBottom: 12, borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 15, boxSizing: "border-box" }}
            />
            <button
              onClick={handleSendOTP}
              disabled={loading}
              style={{ width: "100%", padding: "11px", background: "#18181b", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "#71717a", marginBottom: 12, fontSize: 14 }}>Enter the code sent to {phone}</p>
            <input
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              style={{ display: "block", width: "100%", padding: "10px 14px", marginBottom: 12, borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 15, boxSizing: "border-box", letterSpacing: 6, textAlign: "center" }}
            />
            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              style={{ width: "100%", padding: "11px", background: "#18181b", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </>
        )}
        <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 14 }}>← Back</button>
      </>
    )}

    {mode !== "phone" && (
      <p style={{ textAlign: "center", color: "#71717a", fontSize: 14 }}>
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: "#18181b", fontWeight: 600, cursor: "pointer" }}>
          {mode === "login" ? "Sign up" : "Sign in"}
        </span>
      </p>
    )}

    <div id="recaptcha-container"></div>
  </div>
</div>
);
}
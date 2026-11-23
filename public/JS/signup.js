// signup.js
// Toast
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// SIGNUP HANDLER
document.getElementById("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const submit = document.getElementById("submitButton");

  if (password !== confirmPassword) {
    showToast("Passwords do not match", "error");
    return;
  }

  submit.disabled = true;
  submit.textContent = "Creating account...";

  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();

  if (data.error) {
    showToast(data.error, "error");
    submit.disabled = false;
    submit.textContent = "Sign Up";
    return;
  }

  const user = data.user;

  // SAVE USER
  localStorage.setItem("user", JSON.stringify(user));

  // SAVE PROFILE (REPLACE old)
  localStorage.setItem("productivity_hub_user_data", JSON.stringify({
    name: user.name,
    bio: "Keep up the amazing work! 🌟",
    avatarColor: 0,
    profilePicture: null,
    streak: 0,
    badges: [],
    xp: 0,
    pomodoroCount: 0
  }));

  showToast("Account created! 🌸", "success");

  setTimeout(() => {
    window.location.href = "home.html";
  }, 1500);
});

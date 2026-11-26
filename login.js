
document.getElementById("loginForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { data, error } = await db.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert("로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.");
    console.error(error);
    return;
  }

  alert("로그인되었습니다.");

  location.href = "mypage.html";
});

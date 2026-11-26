
async function checkLogin() {
  const { data: { user }, error } = await db.auth.getUser();

  if (error) {
    console.error(error);
    return;
  }

  if (user) {
    location.replace("mypage.html");
  }
}

checkLogin();


document.getElementById("signupForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const password = document.getElementById("signupPassword").value;
  const passwordCheck = document.getElementById("signupPasswordCheck").value;

  if (password !== passwordCheck) {
    alert("비밀번호가 서로 일치하지 않습니다.");
    return;
  }

  const { data, error } = await db.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        name: name,
        phone: phone
      }
    }
  });

  if (error) {
    alert("회원가입 실패: " + error.message);
    console.error(error);
    return;
  }

  alert("회원가입이 완료되었습니다.");

  if (data.session) {
    location.href = "mypage.html";
  } else {
    alert("이메일 인증이 필요합니다. 이메일을 확인해 주세요.");
    location.href = "index.html";
  }
});

(() => {
  const form = document.querySelector("#sellerResetPasswordForm");
  if (!form) return;
  const phoneInput = form.elements.resetPhone;
  const controls = document.createElement("div");
  controls.className = "form-row";
  controls.innerHTML = '<label>휴대전화 인증번호<input type="text" name="resetVerificationCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="인증번호 6자리" /></label><div class="account-actions"><button type="button" class="ghost-btn" data-reset-code-request>인증번호 받기</button><button type="button" class="ghost-btn" data-reset-code-verify disabled>인증 확인</button></div>';
  form.querySelector('button[type="submit"]').before(controls);
  const codeInput = form.elements.resetVerificationCode;
  const requestButton = controls.querySelector("[data-reset-code-request]");
  const verifyButton = controls.querySelector("[data-reset-code-verify]");
  let generation = 0;
  let verificationId = "";
  let proof = null;
  let requestedPhone = "";
  let retryAt = 0;
  const phone = () => String(phoneInput.value || "").replace(/\D/g, "");
  const clear = () => {
    generation++;
    verificationId = "";
    requestedPhone = "";
    proof = null;
    retryAt = 0;
    codeInput.value = "";
    requestButton.disabled = false;
    verifyButton.disabled = true;
  };
  phoneInput.addEventListener("input", clear);
  form.addEventListener("reset", clear);
  window.PickSellerRecovery = {
    payloadFor(value) {
      if (!proof || proof.phone !== String(value || "").replace(/\D/g, "") || Date.now() >= proof.expiresAt) return null;
      return { phoneVerificationId: proof.id, phoneVerificationToken: proof.token };
    },
  };
  requestButton.addEventListener("click", async () => {
    const requested = phone();
    if (!/^01[016789]\d{7,8}$/.test(requested)) return setResetPasswordMessage("등록된 휴대전화번호를 확인해주세요.", "error");
    if (Date.now() < retryAt) return setResetPasswordMessage("잠시 후 인증번호를 다시 요청해주세요.", "error");
    const current = ++generation;
    proof = null;
    verificationId = "";
    requestButton.disabled = verifyButton.disabled = true;
    try {
      const result = await apiJson("/api/quote-phone-verifications/request", {
        method: "POST", showLoading: false, body: JSON.stringify({ phone: requested }),
      });
      if (current !== generation || requested !== phone()) return;
      retryAt = Date.now() + Math.max(0, Number(result?.retryAfter || 0)) * 1000;
      if (!result?.ok) return setResetPasswordMessage(result?.message || "인증번호를 보내지 못했습니다.", "error");
      verificationId = result.verificationId;
      requestedPhone = requested;
      codeInput.value = "";
      verifyButton.disabled = false;
      setResetPasswordMessage(result.message || "인증번호를 발송했습니다.");
      codeInput.focus();
    } catch {
      if (current === generation) setResetPasswordMessage("인증번호를 보내지 못했습니다.", "error");
    } finally {
      if (current === generation) requestButton.disabled = false;
    }
  });
  verifyButton.addEventListener("click", async () => {
    const current = generation;
    const id = verificationId;
    const code = codeInput.value.trim();
    if (!id || requestedPhone !== phone() || !/^\d{6}$/.test(code)) return setResetPasswordMessage("인증번호 6자리를 입력해주세요.", "error");
    requestButton.disabled = verifyButton.disabled = true;
    try {
      const result = await apiJson("/api/quote-phone-verifications/verify", {
        method: "POST", showLoading: false,
        body: JSON.stringify({ verificationId: id, phone: requestedPhone, code }),
      });
      if (current !== generation || id !== verificationId || requestedPhone !== phone()) return;
      if (!result?.ok) return setResetPasswordMessage(result?.message || "인증번호를 확인해주세요.", "error");
      const lifetime = Number(result.tokenExpiresIn);
      if (!result.verificationToken || !Number.isFinite(lifetime) || lifetime <= 0) return setResetPasswordMessage("인증정보를 다시 요청해주세요.", "error");
      proof = { id, token: result.verificationToken, phone: requestedPhone, expiresAt: Date.now() + lifetime * 1000 };
      codeInput.value = "";
      setResetPasswordMessage("휴대전화 인증이 완료되었습니다.");
    } catch {
      if (current === generation) setResetPasswordMessage("인증번호를 확인하지 못했습니다.", "error");
    } finally {
      if (current === generation) {
        requestButton.disabled = false;
        verifyButton.disabled = Boolean(proof);
      }
    }
  });
})();

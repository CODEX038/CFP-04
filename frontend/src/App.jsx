  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setError("Please fill in all fields."); return;
    }
    setLoading(true); clear();
    try {
      // login() now returns the full user object with verification flags
      const loggedInUser = await login(loginForm.email, loginForm.password);

      // Check verification using the returned user object (not localStorage)
      if (!loggedInUser?.emailVerified) {
        return navigate("/verify/email", { state: { email: loginForm.email } });
      }
      if (!loggedInUser?.phoneVerified) {
        return navigate("/verify/phone");
      }

      navigate("/app");
    } catch (e) {
      setError(e.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

export const valid = {
  twoFaMethods: ["email", "authenticator"],
  loginMethods: ["password", "passkey"],
};

export const validate = {
  user: {
    email: (value) => {
      if (!value) return false;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailPattern.test(value);
    },
    password: (value) => {
      if (!value) return false;
      const passwordRegex = /^.{16,256}$/;
      return passwordRegex.test(value);
    },
    name: (value) => {
      if (!value) return false;
      const nameRegex = /^[a-zA-Z\s]+$/;
      return nameRegex.test(value.trim()) && value.trim() !== "";
    },
    surname: (value) => {
      if (!value) return false;
      const surnameRegex = /^[a-zA-Z\s]+$/;
      return surnameRegex.test(value.trim()) && value.trim() !== "";
    },
    requirements: {
      password:
        "Password must be 16-256 chars",
    },
  },
  chat: {
    name: (value) => {
      if (!value) return false;
      const trimmed = value.trim();
      return trimmed.length >= 3 && trimmed.length <= 50;
    },
    requirements: {
      name: "Chat name must be 3-50 characters long.",
    },
  },
  handle: (value) => {
    if (!value) return false;
    const handleRegex =
      /^(?=.{3,15}$)(?!.*_{2,})[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/;
    return handleRegex.test(value);
  },
  requirements: {
    handle:
      "Handle must be 3-15 characters, lowercase letters, numbers, underscores, cannot start or end with underscore, no consecutive underscores.",
  },
  twofa: {
    code: (value) => {
      if (!value) return false;
      const codeRegex = /^\d{6}$/;
      return codeRegex.test(value);
    },
    requirements: {
      code: "Code must be exactly 6 digits.",
    },
  },
};

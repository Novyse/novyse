

const validate = {
  email: (value) => {
    if (!value) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  },
  password: (value) => {
    if (!value) return false;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[a-zA-Z0-9@$!%*?&]{8,128}$/;
    return passwordRegex.test(value);
  },
  handle: (value) => {
    if (!value) return false;
    const handleRegex = /^(?!.*_{2,})[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/;
    return handleRegex.test(value);
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
    password: "Password must be 8-128 chars, include upper/lowercase, a number and a special character (@, $, !, %, *, ?, &)"
  }
};

export default validate;

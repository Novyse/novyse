import { useState } from "react";

import gateway from "@/src/utils/backend-services/api-gateway";
import { validate } from "@/src/utils/welcome/validator";

const useOTP = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handles the verification of the OTP code.
   * @param {String} token
   * @param {Number} code
   * @returns {Boolean} true if verified, false otherwise
   */
  const handleVerifyOtp = async (token, code) => {
    setError(null);
    setIsLoading(true);

    if (!validate.twofa.code(code)) {
      setError(validate.twofa.requirements.code);
      return false;
    }

    try {
      const verified = await gateway.auth.verifyTwofaCode(token, code);
      if (verified) {
        return true;
      } else {
        setError("OTP code is not valid. Please try again.");
        return false;
      }
    } catch (apiError) {
      // Code 400 means the code was incorrect, other codes indicate a different error
      if (apiError.status === 400) {
        setError("OTP code is not valid. Please try again.");
        return false;
      }
      setError("An error occurred during verification. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    setError,
    handleVerifyOtp,
  };
};

export default useOTP;

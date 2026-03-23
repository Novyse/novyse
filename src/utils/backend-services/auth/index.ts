import { signUpOpaque } from "./signup/opaque";
import { signInOpaque } from "./signin/opaque";
import { signUpPasskey } from "./signup/passkey";
import { signInPasskey } from "./signin/passkey";
import { qrcode } from "./qrcode";

import { logout } from "./logout";

export const auth = {
  signup: {
    opaque: signUpOpaque,
    passkey: signUpPasskey,
  },
  signin: {
    opaque: signInOpaque,
    passkey: signInPasskey,
  },
  qrcode: qrcode,
  logout: logout,
};

export default auth;

import { signUpOpaque } from "./signup/opaque";
import { signInOpaque } from "./signin/opaque";
import { signUpPasskey } from "./signup/passkey";
import { signInPasskey } from "./signin/passkey";
import { qrcode } from "./qrcode";
import { logout } from "./logout";

import { apikey } from "./apikey";
import { passkey } from "./settings/passkey";
import { opaque } from "./settings/opaque";
import { session } from "./settings/session";

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
  apikey: apikey,
  settings: {
    passkey: passkey,
    opaque: opaque,
    session: session,
  },
};

export default auth;

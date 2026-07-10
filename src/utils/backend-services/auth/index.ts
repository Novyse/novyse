import { signUpOpaque } from "./signup/opaque";
import { signInOpaque } from "./signin/opaque";
import { qrcode } from "./qrcode";
import { logout } from "./logout";

import { apikey } from "./apikey";

import { opaque } from "./settings/opaque";
import { session } from "./settings/session";
import { deleteAccount } from "./account";

export const auth = {
  signup: {
    opaque: signUpOpaque,
  },
  signin: {
    opaque: signInOpaque,
  },
  qrcode: qrcode,
  logout: logout,
  apikey: apikey,
  account: {
    delete: deleteAccount,
  },
  settings: {
    opaque: opaque,
    session: session,
  },
};

export default auth;

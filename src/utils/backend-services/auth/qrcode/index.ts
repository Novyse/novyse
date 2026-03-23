import { newQRCodeAuth } from './new';
import { getQRCodeStatus } from './status';
import { authenticateQRCode } from './authenticate';

export const qrcode = {
    new: newQRCodeAuth,
    status: getQRCodeStatus,
    authenticate: authenticateQRCode,
};

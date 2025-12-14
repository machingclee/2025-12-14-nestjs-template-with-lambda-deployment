import { SetMetadata } from '@nestjs/common';
import MetaDataKey from './MetaDataKey';

export const Transactional = () => {
    return SetMetadata(MetaDataKey.TRANSACTION_KEY, true);
};


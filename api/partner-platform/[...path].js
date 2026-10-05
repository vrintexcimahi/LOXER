import { createCloudTenantHandler } from '../../server/tenancy/cloud.js';

const handler = createCloudTenantHandler(process.env);
export default handler;

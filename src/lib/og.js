// OG/social images must be absolute URLs, but the canonical domain only
// serves the current build once production deploys. Derive the origin from
// the Vercel project so preview deployments advertise their own copy.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const ogOrigin = vercelHost ? `https://${vercelHost}` : 'https://opencoven.ai';
export const ogImage = `${ogOrigin}/og.png`;

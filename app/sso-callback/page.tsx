import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Clerk OAuth flows redirect here after the provider callback.
// AuthenticateWithRedirectCallback completes the sign-in/sign-up
// and then forwards the user to the redirectUrlComplete that was
// set when authenticateWithRedirect was called.
export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}

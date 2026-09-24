import { AuthError, type User } from '@supabase/auth-js';


/* 
Application Auth errors, for UX reasons.
The native supabase AuthError is big and unwieldy, so it's better to define our own.
*/ 
export enum AppAuthError {
    Ok,
    Unknown,

    // Account / identity
    AlreadyExists,
    NotFound,
    InvalidCredentials,
    EmailNotConfirmed,
    PhoneNotConfirmed,
  
    OtpExpired,
    InvalidInput,
    WeakPassword,
    SamePassword,
    SessionExpired,
    ReauthenticationRequired,
    ReauthenticationFailed,
    ProviderDisabled,
    ProviderVerificationRequired,
    IdentityError,
    MfaRequired,
    MfaFailed,
    MfaExpired,
    MfaConfigurationError,
    RateLimited,
    Unauthorized,
    Forbidden,
    ConfigurationError,
    TemporaryFailure,
    ServerError,
}

/* 
Condenses the "native" AuthError type into an application AuthErrorType
*/
export function toAppAuthError(error: AuthError|null): AppAuthError {
    if (!error){
        return AppAuthError.Ok;   
    }
  switch (error.code) {
    // Account already exists
    case 'email_exists':
    case 'user_already_exists':
    case 'phone_exists':
    case 'identity_already_exists':
    case 'mfa_verified_factor_exists':
    case 'mfa_factor_name_conflict':
    case 'saml_idp_already_exists':
    case 'sso_domain_already_exists':
      return AppAuthError.AlreadyExists

    // User / resource not found
    case 'user_not_found':
    case 'identity_not_found':
    case 'mfa_factor_not_found':
    case 'invite_not_found':
    case 'sso_provider_not_found':
    case 'saml_idp_not_found':
      return AppAuthError.NotFound

    // Invalid credentials
    case 'invalid_credentials':
      return AppAuthError.InvalidCredentials

    // Verification
    case 'email_not_confirmed':
      return AppAuthError.EmailNotConfirmed

    case 'phone_not_confirmed':
      return AppAuthError.PhoneNotConfirmed

    case 'otp_expired':
      return AppAuthError.OtpExpired

    // Input / validation
    case 'validation_failed':
    case 'email_address_invalid':
    case 'bad_json':
      return AppAuthError.InvalidInput

    case 'weak_password':
      return AppAuthError.WeakPassword

    case 'same_password':
      return AppAuthError.SamePassword

    // Session
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_already_used':
    case 'refresh_token_not_found':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'saml_relay_state_expired':
    case 'saml_relay_state_not_found':
      return AppAuthError.SessionExpired

    // Reauthentication
    case 'reauthentication_needed':
      return AppAuthError.ReauthenticationRequired

    case 'reauthentication_not_valid':
      return AppAuthError.ReauthenticationFailed

    // Providers
    case 'provider_disabled':
    case 'oauth_provider_not_supported':
    case 'email_provider_disabled':
    case 'phone_provider_disabled':
    case 'otp_disabled':
    case 'anonymous_provider_disabled':
    case 'saml_provider_disabled':
    case 'mfa_phone_enroll_not_enabled':
    case 'mfa_phone_verify_not_enabled':
    case 'mfa_totp_enroll_not_enabled':
    case 'mfa_totp_verify_not_enabled':
    case 'mfa_web_authn_enroll_not_enabled':
    case 'mfa_web_authn_verify_not_enabled':
      return AppAuthError.ProviderDisabled

    case 'provider_email_needs_verification':
      return AppAuthError.ProviderVerificationRequired

    // Identity / OAuth
    case 'email_conflict_identity_not_deletable':
    case 'single_identity_not_deletable':
    case 'user_sso_managed':
    case 'bad_oauth_callback':
    case 'bad_oauth_state':
      return AppAuthError.IdentityError

    // MFA
    case 'insufficient_aal':
      return AppAuthError.MfaRequired

    case 'mfa_verification_failed':
    case 'mfa_verification_rejected':
      return AppAuthError.MfaFailed

    case 'mfa_challenge_expired':
      return AppAuthError.MfaExpired

    case 'too_many_enrolled_mfa_factors':
    case 'mfa_ip_address_mismatch':
      return AppAuthError.MfaConfigurationError

    // Rate limiting
    case 'over_email_send_rate_limit':
    case 'over_sms_send_rate_limit':
    case 'over_request_rate_limit':
      return AppAuthError.RateLimited

    // Authorization
    case 'no_authorization':
      return AppAuthError.Unauthorized

    case 'not_admin':
    case 'user_banned':
      return AppAuthError.Forbidden

    // Configuration
    case 'email_address_not_authorized':
    case 'captcha_failed':
    case 'hook_payload_invalid_content_type':
    case 'hook_payload_over_size_limit':
    case 'hook_timeout':
    case 'hook_timeout_after_retry':
    case 'saml_assertion_no_email':
    case 'saml_assertion_no_user_id':
    case 'saml_entity_id_mismatch':
    case 'saml_metadata_fetch_failed':
      return AppAuthError.ConfigurationError

    // Temporary failures
    case 'request_timeout':
    case 'conflict':
    case 'sms_send_failed':
      return AppAuthError.TemporaryFailure

    // Server
    case 'unexpected_failure':
      return AppAuthError.ServerError

    // Protocol / token errors
    case 'bad_code_verifier':
    case 'bad_jwt':
    case 'unexpected_audience':
      return AppAuthError.InvalidInput

    // Future/unknown Supabase error codes
    default:
      return AppAuthError.Unknown
  }
}


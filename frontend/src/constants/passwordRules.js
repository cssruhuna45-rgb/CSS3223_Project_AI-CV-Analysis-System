// What the server actually requires of a password, in one place.
//
// These mirror the backend's own validation and must not get ahead of
// it: a form that promises a stricter rule than the API enforces tells
// the user something untrue, and one that promises a looser rule gets
// them a rejection they could not have predicted.
//
// Registration  RegisterRequest:      @Size(min = 6)
// Password reset ResetPasswordRequest: @Size(min = 6, max = 72)
//
// The minimum is the same on both, so the guidance below is shared.
// The maximum is NOT: registration declares none, which is why only
// the reset form states an upper bound. See the note in
// docs/API_SPECIFICATION.md if that is ever made consistent.
export const PASSWORD_MIN_LENGTH = 6;

// Reset only. BCrypt ignores anything past 72 bytes, which is where
// this limit comes from.
export const PASSWORD_RESET_MAX_LENGTH = 72;

/** Guidance for creating an account. */
export const PASSWORD_HINT_REGISTER = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;

/** Guidance for choosing a replacement password. */
export const PASSWORD_HINT_RESET =
  `Use ${PASSWORD_MIN_LENGTH}–${PASSWORD_RESET_MAX_LENGTH} characters.`;

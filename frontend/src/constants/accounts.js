// Where each kind of account lands, and the user object every page
// reads. Login, Register, the navbar and the route guards all asked
// "recruiter or not?" separately; with approval and an admin role
// there are four answers, so they are decided once, here.

export function isApprovedRecruiter(user) {
  return user?.role === 'recruiter' && user?.approvalStatus === 'approved';
}

export function homePathFor(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'recruiter') {
    return isApprovedRecruiter(user) ? '/dashboard' : '/pending';
  }
  return '/home';
}

// The shape stored in localStorage, built from the server's UserDto.
// The role and approval status always come from the server: letting
// the browser choose them would hand anyone the recruiter dashboard.
export function toStoredUser(serverUser, fallbackName = '', fallbackEmail = '') {
  const role = serverUser?.role || 'candidate';
  return {
    name: serverUser?.name || fallbackName,
    email: serverUser?.email || fallbackEmail,
    role,
    // A recruiter with no status is assumed to be waiting, never
    // approved: the waiting page asks the server, the dashboard would
    // just be refused.
    approvalStatus: serverUser?.approvalStatus || (role === 'recruiter' ? 'pending' : 'approved'),
  };
}

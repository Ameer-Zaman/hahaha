/**
 * Administration directory.
 *
 * `staff` lists published staff members only — empty until the team approves names.
 * Live online / on-duty status is NEVER stored here; it comes from the status integration
 * (see integrations.staffStatusEndpoint) and is shown only when that integration answers.
 *
 * Shape (listed in this order on the page):
 * {
 *   id: 'slug',                 // must match the id the status integration returns
 *   name: 'Display name',
 *   role: 'Role title',         // e.g. 'Founder', 'Head admin', 'Moderator'
 *   portrait: '/media/staff/slug.jpg', // portrait photo or in-game character shot, ~800×1000
 * }
 */
export const staff = []

/** How many "to be announced" cards to show while `staff` is empty. */
export const staffSlots = 4

/* Types for the parts of roles.mjs UISandbox reads. The .mjs stays as it came
 * from Ideelab/uicockpit (SOURCE.md). */
export type RoleId = 'brand' | 'onBrand' | 'page' | 'surface' | 'ink' | 'inkMuted' | 'line'
  | 'success' | 'warning' | 'danger' | 'fontHeading' | 'fontBody' | 'focus'
  | 'elevation' | 'lineHeight' | 'letterSpacing' | 'fontWeight' | 'borderWidth' | 'space' | 'radius' | 'baseText'
export type RoleKind = 'colour' | 'font' | 'ratio' | 'number' | 'length'
export interface RoleDef { id: RoleId; label: string; kind: RoleKind; what: string; derived?: boolean }
/** kit → role → the variable that does that job, or another way it is set
 *  (`choice`, `derives`, `inherits`, `needsBuild` …), or null for none. */
export type RoleMap = Record<string, Partial<Record<RoleId, { var?: string; also?: string[] } & Record<string, unknown> | null>>>
export const ROLES: RoleDef[]
export const MAP: RoleMap
export const KIND: Record<RoleId, RoleKind>

# Copilot Instructions

## Project Guidelines
- Avoid resetting the entire form in useEffect; use functional updates and avoid dynamic keys to prevent focus loss.
- Prefer fixing invalid $select fields in SharePoint queries first; one bad field causes 400 and breaks AssignedTo expansion. Use minimal safe selects and only add fields that exist.
- Normalize Department comparisons (e.g., toLowerCase().trim()) to avoid mismatches when filtering escalation targets.
- Run the relevant build/test command to inspect logs and fix errors after every code change.
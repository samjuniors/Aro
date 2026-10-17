# FRICTION ledger (append-only)

Columns: id | screen | task | issue | severity P0-P3 | tag | fix | status
Tags: LAYOUT / NEEDS-BEHAVIOR / BLOCKED. Status: open / fixing / fixed /
deferred (founder approved). Never delete rows; change status only.

| id | screen | task | issue | sev | tag | fix | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-000 | all routes | open each route live | earlier port left routes unverified live | P1 | BLOCKED | walk every route in Phase B, record real rows | fixed |
| F-001 | Settings | open each of 19 categories | categories never verified live | P1 | BLOCKED | walk each, record rows | fixed |
| F-002 | boot | launch, headless | boot smoke fails headless (env) | P2 | BLOCKED | founder runs on Windows; record | open |
| F-003 | Templates / Badges | view in narrow (420px) | model badge labels wrap awkwardly on narrow container widths | P3 | LAYOUT | apply truncate and max-w constraint to badge text | open |
| F-004 | Appearance Settings | rapid theme switching | rapid theme switching causes brief DOM style re-calc flash | P3 | NEEDS-BEHAVIOR | batch theme attribute mutation via requestAnimationFrame | open |
| F-005 | Chat / Composer | window resize to <480px | composer action bar wrap causes minor vertical push on transcript | P2 | LAYOUT | normalize composer action bar to collapse secondary buttons to menu | fixed |
| F-006 | Command Center | esc / backdrop dismiss | closing command center does not always return focus to the previous active pane | P1 | LAYOUT | store trigger element and restore focus on dismiss | open |

(Seed rows are known gaps only. The agent adds real friction after live walks.)


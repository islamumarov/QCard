// SWE "level" the candidate targets at the start of a session. Where the
// methodology sets the STRUCTURE of an answer, the level sets the BAR that
// answer is judged against — the scope, ambiguity, leadership, and ownership a
// candidate at this level must demonstrate. Mirrors methodologies.ts exactly.
import type { LevelId } from "./types";

export interface Level {
  id: LevelId;
  title: string; // "Senior Software Engineer (L5)"
  shortLabel: string; // "L5" — for the compact pill row
  name: string; // "L5 — Senior SWE" — chip/intro label
  scopeBlurb: string; // one-liner for the chooser
  numeric: number; // 3..7, for band math
  // The scope/ambiguity/leadership bar this level must demonstrate.
  expectationBar: string;
  // Concrete expectations injected into prompts (refined research).
  expectations: string[];
  // Extra emphasis injected into the interviewer's system prompt.
  interviewerCalibration: string;
  // The leveling bar injected into the feedback rubric.
  feedbackCalibration: string;
}

export const LEVELS: Record<LevelId, Level> = {
  L3: {
    id: "L3",
    title: "Software Engineer II (L3) — entry-level / new grad",
    shortLabel: "L3",
    name: "L3 — SWE II",
    scopeBlurb: "Reliably completes well-scoped tasks within a team. Bar: execution & ownership, not project scope.",
    numeric: 3,
    expectationBar:
      "Execution-and-collaboration bar. The candidate must show they can be TRUSTED to take a defined task to done and own the result (including failures) — reliability and personal ownership are what separate L3 from a candidate who merely participated. Do NOT require project ownership, cross-team alignment, mentoring others, or strategy — those are L4/L5 bars.",
    expectations: [
      "Autonomy: reliably completes clearly-scoped tasks and small features and asks for help appropriately. Needs guidance on how problems are framed/prioritized but no hand-holding on execution. Bar = 'trustworthy to finish a defined task and own the result,' NOT owning an ambiguous project end-to-end (that is L4).",
      "Handling ambiguity (task-level only): when requirements are underspecified at the task level, clarifies the ask, makes a reasonable assumption, and moves (bias to action) instead of freezing. Not expected to navigate strategic/organizational ambiguity.",
      "Ownership / accountability: takes responsibility for their own work including bugs and missed edge cases, follows through to completion, and owns mistakes without deflecting. Small-scope initiative (fixing a flaky test, improving docs, filing a bug they found) is a positive signal but not required at large scope.",
      "Emergent leadership without authority (core named attribute, small-scope bar): one credible example of stepping up in a group — drove a small decision, unblocked a teammate, coordinated a class/intern project — even with no title. Also values the inverse: stepping BACK and letting someone else lead when appropriate. A single credible small example clears the bar; sustained cross-team influence is an L4+ signal. Do not under-weight this just because the scale is small.",
      "Collaboration & teamwork: low-friction teammate who communicates clearly, shares context, and works smoothly with others. Heavily weighted at L3 because most of an L3's value is delivered inside a team.",
      "Intellectual humility / coachability: receives feedback well, changes course based on it, admits what they don't know, shows learning velocity. Explicitly screened by Google as a core Googleyness trait — a concrete instance of receiving feedback and visibly changing is near-required.",
      "Conflict navigation (interpersonal scope): handles a disagreement with a teammate or code reviewer constructively — listens, uses data/reasoning, reaches resolution without escalation drama. Bar is interpersonal, not org-level.",
      "Mentorship: NOT expected at L3 — being mentorABLE and helping peers informally is the relevant signal. Mentoring juniors becomes an expectation at L4.",
      "Googleyness / culture fit (scored by every interviewer): bias to action, comfort with task-level ambiguity, collaborative instinct, user/mission orientation, conscientiousness, integrity. Behavioral red flags — arrogance, blaming others, defensiveness, dishonesty, lack of self-awareness — are disqualifying regardless of coding strength.",
    ],
    interviewerCalibration:
      "Probe for a SINGLE credible, owned example per theme — depth over breadth or scale. Internship, school/club, or first-job scope is fully acceptable. Drill into 'what did YOU specifically do' (separate the 'I' from the 'we'), 'how did you decide,' and 'what did you learn.' To clear the L3 bar a candidate must show: (1) they take a defined task to completion reliably and own the outcome including failures; (2) bias to action under TASK-level ambiguity — clarified or assumed and moved rather than freezing; (3) genuine coachability — a concrete instance of receiving feedback and visibly changing course; (4) one example of emergent leadership at small scope (stepped up, unblocked someone, drove a small decision without a title) — bonus credit if they also show the maturity to step BACK and let someone else lead; (5) clean collaboration and constructive handling of an interpersonal disagreement using reasoning/data. Treat emergent leadership as a real scored attribute, but score whether they ever stepped up at all, NOT scale. Do NOT hold them to end-to-end project ownership, cross-team alignment, mentoring, or strategy — those over-level. Below-bar signals: blaming teammates/managers for failures; defensiveness or inability to name a real mistake; no example of ever taking initiative; freezing in ambiguity ('I waited to be told'); dismissiveness of feedback; or 'I' that is really 'we' with no traceable personal contribution. Any arrogance, dishonesty, or lack of self-awareness is a hard miss even with polished stories. Push for specificity and a concrete result; vagueness should lower confidence, not pass by default.",
    feedbackCalibration:
      "Score against an EXECUTION-and-collaboration bar, not a leadership-and-scope bar. Do NOT penalize an L3 answer for lacking org impact, cross-team influence, mentorship, or strategy — those are above-level. MEETS BAR: a concrete, first-person story showing reliable completion of a defined task, clear ownership of the result (including owning a mistake), bias to action under local ambiguity, evident coachability/humility, and clean teamwork — small stakes (internship/school/first-job) are fine; the candidate should also clear the emergent-leadership theme with at least one small example of stepping up (absence of ANY initiative example is a gap, small scale is not). BELOW BAR: vague or all-'we' stories with no traceable personal action; blaming others or deflecting from failure; defensiveness or no real mistake/learning; passivity or freezing under ambiguity; dismissing feedback; or any arrogance/dishonesty/self-awareness red flag (these cap the score regardless of polish). EXCEEDS BAR (frame as 'trending toward L4'): clear emergent leadership beyond the minimum (drove a decision or aligned a group without authority, and showed judgment to step back), structured trade-off reasoning, and self-aware reflection on what they'd do differently. Coach toward specificity, first-person ownership, and a crisp result; reward authenticity over rehearsed buzzwords.",
  },

  L4: {
    id: "L4",
    title: "SWE III (L4) — Mid-Level Software Engineer",
    shortLabel: "L4",
    name: "L4 — SWE III",
    scopeBlurb: "Owns a feature/component end-to-end with limited supervision. Bar: independent feature ownership.",
    numeric: 4,
    expectationBar:
      "Independent-feature-ownership bar (~2-5 years experience). The candidate must show they drove a non-trivial, already-scoped feature/component mostly on their own, navigated ambiguity inside that scope, and produced a concrete result with clearly attributable personal contribution. The problem is typically framed by someone else; defining WHICH problem to solve and cross-team alignment are L5 signals, not required here.",
    expectations: [
      "Autonomy: operates independently on medium-scope work already framed for them — given a problem (not a task list), breaks the feature into tasks, makes reasonable in-scope tradeoffs, and unblocks themselves without a senior defining the path. Defining WHICH problem to solve is an L5 signal.",
      "Ownership / conscientiousness: end-to-end responsibility for a feature or component including the unglamorous parts (testing, on-call follow-up, cleanup), and proactively fixes problems 'even when it isn't officially their job' — at component scope, not team scope.",
      "Handling ambiguity (bounded): comfortable with moderate ambiguity WITHIN a defined feature — unclear or shifting requirements, a bug with no obvious cause — and re-plans without being told. Not yet expected to generate project scope from a fuzzy problem (that is the L5 bar).",
      "Emergent leadership / influence without authority: Google's 'emergent leadership' — steps up in the moment (leads a small incident response, drives a code-review norm, persuades a peer with data rather than title). Influence is local (a few teammates, one project), not cross-team alignment.",
      "Mentorship (emergent / bonus): helps L3s and interns when the opportunity arises — onboarding, code-review feedback, pairing. Counts fully toward the bar when present, but its ABSENCE alone does not sink an otherwise-strong candidate (systematic mentorship is more an L5 expectation).",
      "Collaboration & communication: works smoothly across PMs, designers, and engineers; communicates status and tradeoffs clearly; handles disagreement professionally and reaches resolution within the team.",
      "Conflict navigation: resolves peer-level technical or interpersonal conflict directly and constructively (disagree-and-commit, finding the shared goal); de-escalates rather than blames. Not expected to mediate cross-team or political conflict.",
      "Learning from failure & intellectual humility: openly owns mistakes, extracts a concrete lesson, and changes behavior; admitting being wrong is a strength. (Explicitly part of Google's L4 Googleyness bar.)",
      "Strategic thinking (bounded): user-focused, pragmatic judgment about WHAT to build within their feature and WHY; sees one level beyond the immediate task. Long-horizon roadmap and project-definition thinking is an L5 signal.",
    ],
    interviewerCalibration:
      "Probe for INDEPENDENT OWNERSHIP at feature/component scope and EMERGENT leadership — not formal or cross-team leadership. The L4 bar is cleared when the candidate drove a non-trivial, already-scoped piece of work mostly on their own, navigated ambiguity inside that scope, and produced a concrete result with clearly attributable personal contribution. At L4 the problem is typically framed by someone else and the candidate executes it well — do NOT require them to have defined the project from a fuzzy problem (that is the L5 stretch). Push relentlessly on 'what did YOU specifically do?' and 'what would you do differently?' — isolate the individual's actions from the team's. Drill into one ambiguous or failed situation: a clear bar-clearer adapts, re-plans, and owns the outcome (including mistakes) with a real lesson; intellectual humility and bias-to-action should appear naturally. For influence, accept LOCAL influence-without-authority (convinced a peer with data, led a small incident, set a review norm) — do NOT require cross-team alignment or roadmap-setting. For mentorship, mentoring an intern/L3 or improving a process clears it and counts fully, but its ABSENCE alone should not sink an otherwise-strong candidate. BELOW BAR: rambling/vague narratives with no specifics; stories where the candidate only executed tasks handed to them under close direction (L3 signal); blaming teammates/managers/process without self-reflection; inability to name their own decisions or tradeoffs; needing someone else to resolve every conflict or ambiguity. ABOVE BAR (note as L5-leaning, do not penalize): defining project scope from fuzzy problems, driving alignment across multiple teams, setting technical direction, systematically growing several engineers, owning a multi-feature roadmap. Calibrate to roughly 2-5 years of experience: solid, specific, self-driven feature ownership is the core test.",
    feedbackCalibration:
      "Score against an INDEPENDENT-FEATURE-OWNERSHIP bar, not a leadership bar. MEETS BAR: at least one story showing the candidate independently drove a feature/component framed for them, handled moderate ambiguity within that scope, made and justified tradeoffs, and delivered a concrete outcome — with clear separation of personal contribution from the team's, plus ownership, humility, and learning from setbacks. Local influence-without-authority ('emergent leadership') counts fully; mentoring a junior counts fully but is not required. BELOW BAR: answers stay at task-execution level (work scoped AND closely supervised by others — an L3 signal); vague/rambling/omits specific actions; blames others or shows no self-reflection on failures; conflicts and ambiguity always resolved by someone else; no initiative beyond assigned work. Penalize generic 'we' narratives and stories with no result or lesson. Do NOT penalize for not defining the project themselves or not influencing across teams — those are above-level. EXCEEDS BAR (credit as L5 readiness, never required to pass L4): defining project scope from a fuzzy problem, driving cross-team alignment, setting technical direction or a multi-feature roadmap, raising a team's quality bar, systematically mentoring multiple engineers, navigating organizational/political conflict. Weight specificity, attributable personal agency, and genuine reflection most; weight breadth of org impact least at this level. Do not inflate: confident delivery of a feature-scope story with real ownership is a pass even without grand strategic scope.",
  },

  L5: {
    id: "L5",
    title: "Senior Software Engineer (L5)",
    shortLabel: "L5",
    name: "L5 — Senior SWE",
    scopeBlurb: "Owns a team-level outcome end-to-end and influences without authority. Bar: team-scope ownership.",
    numeric: 5,
    expectationBar:
      "Team-level ownership bar with influence-without-authority as the load-bearing dimension. The candidate must independently frame an ambiguous problem and drive a multi-person effort to a measurable TEAM-level outcome end-to-end, influencing peers without formal authority, with clear personal agency. A fully-owned single-TEAM outcome clears the bar — cross-team reach strengthens the case but is NOT required (requiring a second team risks down-leveling a legitimate L5).",
    expectations: [
      "Autonomy: operates with minimal direction — takes a vaguely-scoped problem and turns it into a defined project, plan, and execution path without being told the steps. Does not wait to be assigned work.",
      "Scope of impact: PRIMARY scope is the whole team — owns and drives a team-level outcome end-to-end (a service designed, a launch led, a roadmap gap closed), broader than the single feature owned at L4. Cross-team/cross-functional influence is a strength and an up-signal toward L6, but a strong, fully-owned team-level outcome on its own clears L5; do not require a second team to be touched.",
      "Ambiguity: thrives when requirements are unclear or shifting; proactively frames the problem and makes a defensible decision with incomplete information, re-planning as new information emerges. Shows judgment about WHEN to decide versus when to escalate — appropriate escalation is fine; the anti-signal is passive 'escalate and wait' paralysis.",
      "Leadership & influence WITHOUT authority (the defining L5 signal): gets peers (and where relevant other teams) aligned and moving through technical credibility, persuasion, and a written proposal — not a title or mandate.",
      "Driving alignment: builds consensus across stakeholders, surfaces and reconciles competing priorities, and gets a decision made and committed to — owning the outcome end-to-end, not just their slice.",
      "Mentorship: actively levels up L3/L4 engineers (design reviews, unblocking, raising the quality bar). Demonstrated mentoring activity is the bar; pointing to mentees who measurably grew is a plus (up-signal), not a hard requirement.",
      "Conflict navigation: resolves technical and interpersonal disagreement professionally, disagrees-and-commits, repairs working relationships, never trashes past teammates/managers — handled as a collaborator, not a hero or a victim.",
      "Sustained, strategic ownership: demonstrates L5-caliber impact consistently (typically across multiple review cycles), connects technical choices to business/user outcomes, and anticipates failure modes and second-order effects rather than just shipping.",
    ],
    interviewerCalibration:
      "Probe for genuine ownership of ambiguity and influence without authority — alongside the technical rounds this is a primary signal for L5 vs down-leveled-to-L4. For each story push on: Who framed the problem? (L5 must have framed or re-framed it themselves, not received it fully specified.) How big was the blast radius? (Clears the bar when the candidate fully OWNED a team-level outcome end-to-end; cross-team/cross-functional reach is a bonus and an up-signal toward L6, NOT a requirement — do not down-level a strong single-team owner for lacking a second team. Misses only when impact stops at the candidate's own task or single feature.) How did they get others to move? (Clears when alignment came from technical credibility, a written proposal, and persuasion; misses when it relied on a manager assigning the work or the candidate doing it all alone.) Drill into a real disagreement or shifting-requirements moment: what did they decide with incomplete information, and how did they judge when to decide versus when to escalate? (Appropriate escalation is fine; the anti-signal is 'I escalated and waited.') Separate 'we' from 'I.' Down-level signals (L4): only solo execution with no influence on others, problems always handed pre-scoped, no concrete mentorship activity, passive 'escalate and wait,' blaming others for conflict. Up-level signals toward L6 (note, do NOT require): genuine multi-team/org-wide scope, navigating organizational/political friction across many teams, setting multi-team technical strategy, sponsoring others who grew — credit but never penalize an L5 candidate for lacking them.",
    feedbackCalibration:
      "Score against a TEAM-LEVEL ownership bar with influence-without-authority as the load-bearing dimension. MEETS BAR: at least one strong story where the candidate independently framed an ambiguous problem, drove a multi-person effort to a measurable team-level outcome end-to-end, influenced peers (and where relevant other teams) without formal authority, and shows concrete mentorship activity and professional conflict handling; personal role and decisions are clear and impact compounds beyond a single feature. A fully-owned single-TEAM outcome with clear personal influence MEETS the bar — cross-team reach strengthens but is not required. BELOW BAR (L4-ish): solid execution but the problem was always pre-scoped, impact stops at the individual's own task/feature, 'leadership' is just doing more work rather than moving others, no real mentorship activity, or the ambiguity answer is passive escalate-and-wait. Penalize vague 'we' narratives where individual contribution is unrecoverable, blaming teammates/managers, and one-time flukes presented as sustained impact. EXCEEDS BAR (L6-leaning, do not require): genuine multi-team/org-wide impact, alignment driven through organizational/political friction across many teams, ownership of multi-team strategy, sponsorship of engineers who measurably grew. Weight Action highest (the decisions and influence the candidate personally drove), then Result (quantified, durable outcome), then Situation framing and explicit Learnings.",
  },

  L6: {
    id: "L6",
    title: "Staff Software Engineer (L6)",
    shortLabel: "L6",
    name: "L6 — Staff SWE",
    scopeBlurb: "Sustained, sponsored impact across multiple teams or an org. Bar: org-radius direction-setting.",
    numeric: 6,
    expectationBar:
      "Org/multi-team SCOPE is the single non-negotiable: sustained influence at multi-team/org radius that sets durable technical direction (a platform several teams adopt, a direction the org follows) over multiple quarters. Title-free influence matters but is NOT by itself the differentiator — L5s already influence without authority at team scope; what makes it L6 is the RADIUS and the sustained/sponsored nature, not the absence of a title.",
    expectations: [
      "SCOPE IS THE PRIMARY L6 SIGNAL: impact spans multiple teams or an organization (or a major cross-cutting system/platform multiple teams depend on and adopt), with outcomes measurable at that radius. The L5-to-L6 jump is fundamentally a scope jump from team-level ownership to sustained multi-team/org-level direction-setting — not a one-off project that happened to touch other teams.",
      "Sustained and sponsored, not a single hero project: L6-grade impact shows up as a pattern of org-level outcomes over multiple quarters (a platform several teams adopted, a technical direction the org follows, a standard others build to) — recognized, repeated influence rather than one lucky big win.",
      "Operates with high autonomy on ambiguous, open-ended problems: defines the problem and strategy (not just the solution), turning a vague mandate or org pain point into a scoped, sequenced plan others rally behind.",
      "Influences at ORG RADIUS — and crucially without relying on authority. (Title-free influence itself is expected from L5; what makes it L6 is that it spans multiple teams/an org and sets durable direction.) Aligns engineers, PMs, UX, and other orgs through vision, data, and persuasion.",
      "Drives alignment and builds consensus across organizations, including resolving cross-org conflict and engineering-vs-product misalignment, and communicates effectively up to senior leadership.",
      "Makes and defends unpopular-but-correct technical/strategic decisions, manages the risk of large changes (e.g. legacy overhauls/migrations), and owns the consequences.",
      "Mentors at scale and grows future leaders — develops senior engineers (L4/L5) and tech leads, multiplying others' effectiveness, not just onboarding juniors.",
      "Strategic, multi-quarter/multi-year thinking: sets long-term technical vision, connects technical decisions to business and org outcomes, anticipates second-order effects.",
      "Attributes impact to their own influence ('what changed because of me, at org scale') rather than narrating team effort — and frames failure/conflict with ownership and learning, not blame.",
    ],
    interviewerCalibration:
      "The single non-negotiable L6 signal is SCOPE: sustained influence at multi-team/org radius that sets durable technical direction. Title-free influence matters but is NOT by itself a level differentiator — L5s already influence without authority at team/adjacent-team scope, so do not credit 'I had no formal authority' as L6 evidence unless the radius is org-level and the impact persisted. Probe past the headline: 'What was the org-level radius — how many teams adopted or depended on this?', 'Was this a one-off cross-team project or did you set a direction the org kept following?', 'What was YOUR specific contribution vs. the team's?', 'Who disagreed across org lines and how did you actually win them over?', 'How did you decide this was the right problem to own?'. CLEARS THE BAR: personally initiated or unblocked a cross-team/cross-org effort whose impact is measurable at org radius and persisted beyond the project; aligned skeptical stakeholders in OTHER orgs or senior leaders via data and persuasion; made a hard, unpopular call and owned the outcome; mentored engineers who themselves grew into leaders; structured ambiguity rather than waiting it out. MISSES THE BAR (caps at L5): impact confined to a single team or one short cross-team project; 'leadership' that is just being assigned tech lead; influence that depended on authority or a manager backing them; the only distinguishing claim is 'I had no authority' (that is L5-normal); effort/execution with no isolatable org-level delta; vague 'we'; resolving conflict only by escalating. RED FLAGS that sink any level: blaming past teammates/employers/managers; heroics over collaboration; inability to name a real failure or a view they were persuaded to change. Watch for level-inflation theater — grand-sounding scope that collapses under drill-down; demand the concrete mechanism of influence, the specific resistance overcome, AND the radius/duration of the impact.",
    feedbackCalibration:
      "Score against ORG/MULTI-TEAM SCOPE as the single non-negotiable, with sustained/sponsored impact and title-free influence-AT-THAT-RADIUS as supporting evidence (not a co-equal gate). MEETS BAR (L6): at least one strong, drill-down-surviving example where the candidate (a) drove impact across multiple teams or an org with outcomes measurable at that radius, (b) set or shaped direction that persisted beyond a single project, and (c) can articulate a concrete delta attributable to them ('what changed because of me, at org scale'), plus credible signals on at least two of {structuring ambiguity by defining the problem, building cross-org consensus / resolving conflict, mentoring senior engineers into leaders, multi-quarter strategic framing}. Do NOT treat 'influenced without formal authority' as sufficient by itself — that is expected from L5; require the org-level radius. BELOW BAR (reads as L5 or lower): impact stays within one team or one isolated cross-team project; relies on assigned authority or manager backing; effort/execution with no isolatable org-level personal delta; conflict handled only by escalation; ambiguity resolved for them; persistent vague 'we'. EXCEEDS BAR (trending L7): influence is org-wide-to-company-wide; sets technical direction multiple orgs depend on; changes how the org operates or decides (not just ships an outcome); develops other staff-level leaders; reframes the strategy itself. Weight by specificity, verifiability, AND radius/duration — one deeply substantiated, sustained multi-team story outscores several broad claims. Deduct hard for blame, heroics-over-collaboration, or no genuine failure/learning story regardless of stated scope.",
  },

  L7: {
    id: "L7",
    title: "Senior Staff Software Engineer (L7)",
    shortLabel: "L7",
    name: "L7 — Senior Staff SWE",
    scopeBlurb: "Sets multi-org technical direction without authority, as a sustained pattern. Bar: multi-org scope.",
    numeric: 7,
    expectationBar:
      "MULTI-ORG scope and influence without authority, as a sustained pattern. The candidate must be the central actor driving a strategy/program adopted by MULTIPLE ORGANIZATIONS that did not report to them, over a multi-quarter-to-multi-year horizon. 'Multiple orgs' is NOT 'multiple teams within one org' (that is L6). Do NOT require whole-engineering-org / division-wide direction — that is L8; several dependent orgs is the L7 ceiling expectation, not company-wide.",
    expectations: [
      "Scope of impact: drives outcomes at org-to-multi-org scale (org level trending toward company-wide), typically influencing dozens to ~100+ engineers across SEVERAL organizations. Expected to be the named technical owner of a platform/program/strategy that multiple orgs adopt or depend on. Single-org-only impact reads as L6. Upper boundary: direction-setting for the WHOLE engineering org / a full product division is L8 (Principal), not L7 — do not require it and do not credit it as merely L7.",
      "Autonomy: operates with near-total self-direction. Identifies and frames the most important problems themselves (creates scope rather than receiving it), works with minimal oversight, and makes sense of chaos without guidance from above.",
      "Handling ambiguity: defines WHICH ambiguous problems are worth solving across multiple orgs. Sets direction, sequencing, and decision-ownership where requirements, owners, and even the goal are unclear, and gets multiple independent teams/orgs moving coherently.",
      "Leadership & influence without authority (the core L7 signal): drives alignment across dozens of people and MULTIPLE ORGS that do not report to them, purely through technical credibility, framing, and trust. Promo evidence typically requires documented instances of leading without authority — influence that relied on a manager's mandate or escalation does not count.",
      "Driving alignment: builds cross-ORG consensus on contested technical strategy, resolves competing priorities between independent orgs, and gets teams that don't share a near reporting line to converge on a shared plan and own their parts of it (not nominal agreement, and not just multiple teams inside one org).",
      "Mentorship & talent multiplication: grows other senior engineers, including sponsoring and developing Staff (L6) engineers and tech leads ('mentor-of-mentors'). Impact is increasingly measured through the leaders and capability created. Mentorship limited to junior ICs does not clear the bar.",
      "Strategic thinking: sets multi-year technical strategy connected to business objectives, anticipates second-order consequences, and makes durable architectural/directional bets that multiple orgs organize around. Partners with PMs, eng leadership, and sometimes external stakeholders.",
      "Sustained track record & sponsorship: a repeated pattern of org-spanning impact (typically a few such artifacts, not one standout). Promotion is multi-year and sponsorship-gated; L7 is rare (fewer than ~5% of engineers, typically 12-15+ years' experience) — consistency and durability matter as much as peak impact.",
    ],
    interviewerCalibration:
      "Probe for MULTI-ORG scope and influence WITHOUT authority. The bar: the candidate is the central actor (clear personal agency, not 'we'), driving a strategy or program adopted by MULTIPLE ORGANIZATIONS that did not report to them, over a multi-quarter-to-multi-year horizon. Critically distinguish 'multiple orgs' from 'multiple teams within one org' — the latter is L6. Also distinguish from the level above: setting direction for an entire product division / the whole engineering org is L8; L7 is several orgs depending on what the candidate owns, not the whole company. Use follow-ups that force differentiation from L6: 'How many distinct orgs were affected, and did any report to you or your manager?', 'Who disagreed at the leadership/peer-Staff level, and how did you move them WITHOUT a mandate or escalation?', 'What specifically did YOU decide that other teams were relying on?', 'How did you choose this problem over others — who told you to work on it?', 'How did you grow other senior/Staff engineers through this?'. CLEARS the bar: candidate framed the ambiguous problem themselves, aligned several INDEPENDENT orgs through technical credibility and negotiation (not mandate or escalation), navigated executive/peer-Staff conflict, created leverage through other leaders (including Staff-level), and shows a repeated pattern. MISSES the bar (reads as L6 or below): impact bounded to one org even if it touched several teams, even if technically excellent; influence that depended on a manager's authority or a mandate; conflict resolved by escalation rather than the candidate's own influence; 'we' with no identifiable personal decision; one-off project rather than a sustained pattern; mentorship limited to junior ICs. Penalize BOTH directions of inflation: a big-sounding single-org project does not clear L7; conversely, do not demand whole-company/L8-scale direction to pass — several dependent orgs is sufficient.",
    feedbackCalibration:
      "Score against MULTI-ORG scope, influence without authority, and a sustained pattern. EXCEEDS bar: candidate set technical direction that several orgs depended on, drove contested cross-ORG alignment purely through credibility and negotiation, navigated executive/peer-Staff conflict to a durable outcome, multiplied impact by growing Staff-level engineers, and evidenced more than one such artifact — clear personal agency throughout. (Do not require whole-engineering-org / division-wide direction — that is L8; several dependent orgs is the L7 ceiling expectation, not company-wide.) MEETS bar: clear multi-org impact with the candidate as primary driver, demonstrable influence without authority on at least one major effort, real ambiguity they framed themselves, and credible strategic/multi-year thinking. BELOW bar (L6 or lower): impact confined to a single org (even if it spanned multiple teams within it); influence relied on positional authority, a mandate, or escalation; vague ownership ('we') with no identifiable personal decision; a single notable project rather than a repeated pattern; ambiguity handed to them pre-scoped; mentorship limited to onboarding juniors. When scoring, explicitly name the gap to L7 (e.g., 'strong execution but single-org scope — multiple teams is not multiple orgs,' or 'led the project via manager authority, not cross-org influence'). Reward concrete scope quantification (named orgs, not just 'many teams'), named stakeholders/conflicts, and second-order/strategic reasoning; discount buzzwords without mechanism. If a candidate genuinely set direction for an entire division/company, flag it as potential L8 evidence rather than capping the read at L7.",
  },
};

export const DEFAULT_LEVEL: LevelId = "L4";

export const LEVEL_LIST: Level[] = [LEVELS.L3, LEVELS.L4, LEVELS.L5, LEVELS.L6, LEVELS.L7];

export function isLevelId(v: unknown): v is LevelId {
  return v === "L3" || v === "L4" || v === "L5" || v === "L6" || v === "L7";
}

export function getLevel(id?: string | null): Level {
  return isLevelId(id) ? LEVELS[id] : LEVELS[DEFAULT_LEVEL];
}

// Numeric band value (L3 -> 3 ... L7 -> 7) for question-band math.
export function numericLevel(id?: string | null): number {
  return getLevel(id).numeric;
}

// Bullet list of the level's expectations, for embedding in a prompt.
export function expectationsBlock(l: Level): string {
  return l.expectations.map((e) => `- ${e}`).join("\n");
}
